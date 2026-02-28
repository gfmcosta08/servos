# Scripts SQL para Supabase

Execute no **Supabase → SQL Editor**.

---

## Erro ao criar conta (entrar em paróquia)?

Se aparecer "Erro ao criar conta. Tente novamente." ao se candidatar a uma paróquia existente, execute **`scripts/fix-registro-join.sql`** no Supabase SQL Editor.

---

## Opção rápida (recomendado)

**Um único arquivo com tudo:**

1. Abra `scripts/EXECUTAR-NO-SUPABASE.sql`
2. Selecione todo o conteúdo (Ctrl+A) e copie (Ctrl+C)
3. Cole no Supabase → SQL Editor
4. Clique em **Run**

---

## Migração: múltiplos ministérios por usuário

Para habilitar seleção de múltiplos ministérios no cadastro e regras de acesso restrito:

1. Execute **`scripts/migration-user-ministries.sql`** no Supabase SQL Editor
2. Depois execute **`scripts/fix-registro-join.sql`** (atualiza o trigger para `ministry_ids`)

---

## Opção por partes (arquivos separados)

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `migration-user-approval.sql` | Fluxo de aprovação: status PENDING/APPROVED/REJECTED |
| 2 | `fix-register-trigger.sql` | Corrige erro ao criar conta (requer migration-user-approval antes) |
| 3 | `migration-ministry-roles.sql` | Funções por ministério (Leitor, Comentador) e vagas por horário |
| 4 | `migration-coordinator-permissions.sql` | Coordenador por ministério (quem pode criar escalas e horários) |
| 5 | `migration-user-ministries.sql` | Lista de ministérios por usuário e restrição de acesso |

Abra cada arquivo, selecione todo o conteúdo (Ctrl+A) e copie (Ctrl+C). Cole no Supabase SQL Editor e execute na ordem.

---

## Por que as alterações não aparecem online?

As mudanças precisam de **duas etapas**:

1. **Banco (Supabase):** Rodar os scripts SQL acima
2. **Código (Vercel):** Fazer `git push` para disparar o deploy

Se você não fez push, o site continua com a versão antiga. O Vercel só atualiza quando há novo commit no repositório.

**Para publicar:**
```bash
git add .
git commit -m "feat: funções por ministério e coordenador por ministério"
git push
```

Depois aguarde o deploy no Vercel (1–3 minutos).
