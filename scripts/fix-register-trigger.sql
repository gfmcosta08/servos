-- ============================================================
-- FIX: Corrigir trigger de registro de usuário
-- Execute no Supabase → SQL Editor
-- ============================================================
-- Problema: "Database error saving new user" ao criar conta
-- Causa: Trigger handle_new_user falha ao inserir em public.users
--        (RLS ou permissões do supabase_auth_admin)
-- ============================================================

-- 1. Recriar função com SECURITY DEFINER e search_path
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

-- 2. Limpar paróquias órfãs (tentativas anteriores que falharam)
DELETE FROM parishes
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE users.parish_id = parishes.id
);

-- 3. Verificar se o trigger existe
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
-- Deve retornar 1 linha. Se vazio, execute database.sql completo.
