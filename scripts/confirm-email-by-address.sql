-- Confirma o email de um usuário diretamente no Supabase.
-- Use quando o email de confirmação não chegou e o Super Admin não consegue confirmar pelo app.
-- Execute no Supabase → SQL Editor.

-- Substitua o email abaixo pelo endereço que deseja confirmar:
-- Apenas email_confirmed_at (confirmed_at é coluna gerada e não pode ser alterada)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'farollapi@gmail.com';

-- Verifica quantas linhas foram afetadas:
-- 1 = usuário encontrado e confirmado
-- 0 = usuário não existe (a pessoa precisa se cadastrar em /register primeiro)

-- ============================================================
-- APROVAR USUÁRIO (resolve "Conta não aprovada")
-- Execute se a pessoa já confirmou o email mas ainda vê mensagem de não aprovado:
-- ============================================================
UPDATE public.users
SET status = 'APPROVED'
WHERE email = 'farollapi@gmail.com';
