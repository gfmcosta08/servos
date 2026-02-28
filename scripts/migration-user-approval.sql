-- ============================================================
-- MIGRAÇÃO: Fluxo de aprovação de usuários
-- Execute no Supabase SQL Editor para projetos EXISTENTES
-- ============================================================

-- 1. Criar tipo user_status
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adicionar coluna status em users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'APPROVED';

-- 3. Usuários existentes ficam APPROVED
UPDATE users SET status = 'APPROVED' WHERE status IS NULL;

-- 4. Default para novos: APPROVED (trigger sobrescreve para PENDING no join)
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'APPROVED';

-- 5. Atualizar trigger handle_new_user para aceitar status
-- Para join (parish_id vem de metadata, não é criação de paróquia): status = PENDING
-- Para new parish (role = ADMIN_PARISH): status = APPROVED
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_status user_status;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOLUNTEER');
  -- Quem cria paróquia (ADMIN_PARISH) é aprovado automaticamente
  IF v_role = 'ADMIN_PARISH' THEN
    v_status := 'APPROVED';
  ELSE
    v_status := COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'PENDING');
  END IF;

  INSERT INTO public.users (id, name, email, role, parish_id, ministry_preference_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    (NEW.raw_user_meta_data->>'parish_id')::UUID,
    (NEW.raw_user_meta_data->>'ministry_id')::UUID,
    v_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
