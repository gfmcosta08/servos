# Arquivo de Continuidade – Servos

Documento para retomada do projeto, handover ou contexto para novos desenvolvedores/agentes.

---

## Estado atual (fev/2025)

### Problema conhecido: "Erro ao criar conta" ao entrar em paróquia existente

**Causa:** O trigger `handle_new_user` roda como `supabase_auth_admin`. Com `SECURITY DEFINER`, a função deve rodar como o owner (`postgres`) para bypassar RLS. Se o owner não for postgres ou houver erro no INSERT (ex.: `ministry_id` vazio), o signUp falha.

**Correção:** Execute `scripts/fix-registro-join.sql` no Supabase SQL Editor. O script:
1. Recria o trigger com tratamento seguro de `ministry_id` vazio
2. Define `OWNER TO postgres` para bypass de RLS

**Diagnóstico:** Em `lib/actions/auth.ts` há `console.error` que loga o erro real. Verifique os logs do Vercel ou Supabase para a mensagem exata.

### O que está implementado e funcionando

- **Autenticação:** Login, registro (nova paróquia ou entrar em existente), recuperação de senha
- **Fluxo de aprovação:** Usuários que entram em paróquia existente ficam com `status = PENDING` até aprovação
- **Páginas de status:** `/aguardando-aprovacao` e `/conta-rejeitada` para usuários pendentes/rejeitados
- **Middleware:** Bloqueia acesso quando `status = PENDING` ou `REJECTED`
- **Voluntários:** Seção "Aguardando aprovação" com ações Aprovar, Aprovar como coordenador, Rejeitar
- **Coordenador por ministério:** Pode aprovar candidatos do seu ministério
- **Funções por ministério:** Leitor, Comentador, etc. com quantidades por horário
- **Dashboard:** Badge de pendentes no menu e alerta clicável
- **Escalas:** Criação de horários com funções inline, toggle de inscrição

### Banco de dados (migrações já executadas)

- Tipo `user_status` (PENDING, APPROVED, REJECTED)
- Coluna `users.status`
- Coluna `users.ministry_preference_id`
- Tabela `ministry_coordinators`
- Tabela `ministry_roles` e `time_slot_roles`
- View `time_slots_with_counts`
- Trigger `handle_new_user` com lógica de status e ministry_preference_id

---

## Arquivos importantes

| Arquivo | Função |
|---------|--------|
| `database.sql` | Schema completo para instalação nova |
| `scripts/fix-register-trigger.sql` | Script consolidado para migração em projeto existente |
| `scripts/fix-registro-join.sql` | Fix para erro ao criar conta (entrar em paróquia) |
| `scripts/EXECUTAR-NO-SUPABASE.sql` | Mesmo conteúdo que fix-register-trigger (backup) |
| `scripts/README-SQL.md` | Instruções de execução dos scripts |
| `middleware.ts` | Verifica auth e status (PENDING/REJECTED) |
| `lib/auth.ts` | `getAuthenticatedUser`, `canManageMinistryScales`, `getMinistriesUserCanManage` |
| `lib/actions/volunteers.ts` | `getVolunteersAction`, `getPendingUsersAction`, `approveUserAction`, `rejectUserAction` |
| `lib/actions/auth.ts` | `registerJoinParishAction` com `status: 'PENDING'` |
| `app/(auth)/aguardando-aprovacao/page.tsx` | Página para usuários pendentes |
| `app/(auth)/conta-rejeitada/page.tsx` | Página para usuários rejeitados |

---

## Regras de negócio

1. **ADMIN_PARISH** ao criar paróquia → `status = APPROVED`
2. **VOLUNTEER** ao entrar em paróquia existente → `status = PENDING`
3. Admin ou coordenador do ministério pode aprovar pendentes
4. Admin pode aprovar como coordenador de qualquer ministério
5. Coordenador só aprova candidatos cujo `ministry_preference_id` é do seu ministério

---

## Próximos passos sugeridos (roadmap)

- [ ] Notificações por email (novo cadastro pendente, lembrete de escala)
- [ ] Relatórios e exportação PDF
- [ ] Painel do SUPER_ADMIN com métricas globais
- [ ] Convite por link para paróquia específica
- [ ] Calendário visual de escalas

---

## Comandos úteis

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
```

---

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
```

---

## Observações técnicas

- **RLS:** Todas as tabelas usam `parish_id` para isolamento
- **Server Actions:** Retornam `ActionResult<T>` com `success`, `data`, `error`
- **Supabase:** `createClient()` para usuário autenticado; `createAdminClient()` apenas onde necessário (ex.: registro com nova paróquia)
- **Contagem de pendentes:** Coordenador vê apenas pendentes do seu ministério; Admin vê todos da paróquia
