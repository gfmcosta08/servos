# Análise: Erro ao Criar Usuário no Servos

## Resumo da última interação

### Cronologia do problema
1. **Sintoma:** "Erro ao criar conta. Tente novamente." ao registrar nova paróquia
2. **Diagnóstico inicial:** Variáveis de ambiente (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL) e URLs no Supabase
3. **Configuração feita:** 4 variáveis no Vercel, Site URL e Redirect URLs no Supabase
4. **Erro real exposto:** `[DEBUG] Database error saving new user`
5. **Causa identificada:** Trigger `handle_new_user` bloqueado ao inserir em `public.users` — política RLS `users_insert` exige `id = auth.uid()`, mas durante o trigger `auth.uid()` retorna NULL
6. **Correção aplicada:** SQL para recriar a policy `users_insert` com `TO authenticated`
7. **Status:** Debug removido, commit feito; push e teste final podem não ter sido concluídos (timeout)

---

## Análise técnica

### Fluxo de registro (nova paróquia)
```
1. registerWithNewParishAction() recebe formData
2. createAdminClient() insere paróquia em parishes (bypassa RLS)
3. supabase.auth.signUp() com options.data: { name, role, parish_id }
4. Supabase Auth insere em auth.users
5. Trigger on_auth_user_created dispara
6. handle_new_user() tenta INSERT em public.users
7. RLS aplica policy users_insert → FALHA se auth.uid() = NULL
```

### Por que o trigger falha com RLS?
- O trigger roda no contexto do **supabase_auth_admin** (serviço de Auth do Supabase)
- Nesse contexto, `auth.uid()` retorna **NULL** (não há sessão JWT do usuário)
- A policy `users_insert` exige `id = auth.uid()` → `id = NULL` é sempre falso
- O INSERT é bloqueado → "Database error saving new user"

### Solução correta
O trigger já usa `SECURITY DEFINER`, o que deveria fazer a função rodar com privilégios do dono (postgres) e **bypassar RLS**. Se ainda falha, possíveis causas:

1. **Dono da função não é superuser** — em alguns setups do Supabase, a função pode ter sido criada por um role sem bypass de RLS
2. **search_path** — a função pode precisar de `SET search_path = public` para evitar problemas de resolução de nomes
3. **Policy "TO authenticated"** — a correção aplicada pode não ter sido suficiente; o trigger roda como `supabase_auth_admin`, não como `authenticated`

---

## Plano de ação para correção

### Etapa 1: Garantir que o trigger bypassa RLS (prioridade alta)

Execute no **Supabase → SQL Editor**:

```sql
-- 1. Recriar a função com owner explícito e search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, parish_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOLUNTEER'),
    (NEW.raw_user_meta_data->>'parish_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Garantir que a função pertence a um role com privilégios (postgres)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3. Se postgres não existir, tente supabase_admin (em projetos Supabase)
-- ALTER FUNCTION public.handle_new_user() OWNER TO supabase_admin;
```

Se `OWNER TO postgres` der erro (role inexistente), use `supabase_admin` ou remova a linha e mantenha apenas `SET search_path = public`.

### Etapa 2: Policy alternativa (se Etapa 1 não resolver)

Adicione uma policy que permita o insert quando o contexto é o Auth:

```sql
-- Remover a policy atual
DROP POLICY IF EXISTS "users_insert" ON users;

-- Policy 1: usuário autenticado criando próprio perfil (fluxo normal pós-confirmação)
CREATE POLICY "users_insert_self" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy 2: permitir insert do trigger (auth admin usa role que pode precisar de bypass)
-- O SECURITY DEFINER já deveria cobrir isso; use apenas se a Etapa 1 falhar
-- CREATE POLICY "users_insert_trigger" ON users
--   FOR INSERT
--   TO supabase_auth_admin
--   WITH CHECK (true);
```

**Nota:** A policy `users_insert_trigger` para `supabase_auth_admin` pode ser necessária em alguns projetos. Descomente apenas se o erro persistir.

### Etapa 3: Limpar paróquias órfãs

```sql
DELETE FROM parishes
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE users.parish_id = parishes.id
);
```

### Etapa 4: Diagnóstico (se ainda falhar)

1. **Logs do Supabase**
   - Supabase Dashboard → Logs → Postgres Logs
   - Filtrar por erro ou por `handle_new_user`
   - Ver mensagem exata do PostgreSQL

2. **Debug temporário no código** (apenas para diagnóstico)

Em `lib/actions/auth.ts`, na linha ~98, altere temporariamente:

```typescript
if (authError) {
  await adminClient.from('parishes').delete().eq('id', parish.id)
  // DEBUG: expor erro real (remover após diagnóstico)
  const debugMsg = authError.message
  return { success: false, error: `[DEBUG] ${debugMsg}` }
}
```

Faça deploy, tente registrar, copie a mensagem exata e remova o debug.

3. **Verificar trigger no banco**

```sql
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

Deve retornar 1 linha. Se vazio, execute o `database.sql` completo novamente.

### Etapa 5: Checklist de produção

- [ ] Variáveis no Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- [ ] Supabase → Authentication → URL Configuration: Site URL = `https://servos.vercel.app`, Redirect URLs incluem `https://servos.vercel.app/**`
- [ ] Trigger `on_auth_user_created` existe e chama `handle_new_user`
- [ ] Função `handle_new_user` com `SECURITY DEFINER` e `SET search_path = public`
- [ ] Paróquias órfãs removidas (slug livre para novo cadastro)
- [ ] Projeto duplicado `servos-pe5j` no Vercel pode ser deletado (cosmético)

---

## Referências

- [Supabase: Database error saving new user](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB)
- [Stack Overflow: Trigger on auth.users](https://stackoverflow.com/questions/78996250/supabase-cannot-add-users-use-a-signup-form-when-a-trigger-function-is-listen)
- O trigger roda como `supabase_auth_admin`; funções que acessam `public` precisam de `SECURITY DEFINER`
