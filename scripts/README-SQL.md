# Scripts SQL para Supabase

Execute no **Supabase → SQL Editor** na ordem abaixo. Copie o conteúdo de cada arquivo e cole no editor, depois clique em **Run**.

---

## Ordem de execução

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `fix-register-trigger.sql` | Corrige erro ao criar conta ("Database error saving new user") |
| 2 | `migration-ministry-roles.sql` | Funções por ministério (Leitor, Comentador) e vagas por horário |
| 3 | `migration-coordinator-permissions.sql` | Coordenador por ministério (quem pode criar escalas e horários) |

---

## Onde estão os arquivos

- `scripts/fix-register-trigger.sql`
- `scripts/migration-ministry-roles.sql`
- `scripts/migration-coordinator-permissions.sql`

Abra cada arquivo no VS Code/Cursor, selecione todo o conteúdo (Ctrl+A) e copie (Ctrl+C). Cole no Supabase SQL Editor e execute.

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
