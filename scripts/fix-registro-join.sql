-- ============================================================
-- FIX: Erro ao criar conta ao entrar em paróquia existente
-- Execute no Supabase SQL Editor
-- ============================================================
-- Causa: Trigger handle_new_user falha ao inserir em public.users
--        (RLS, colunas ausentes ou role sem permissão)
-- ============================================================

-- 0. Garantir colunas necessárias em users
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'APPROVED';
UPDATE users SET status = 'APPROVED' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'APPROVED';

ALTER TABLE users ADD COLUMN IF NOT EXISTS ministry_preference_id UUID REFERENCES ministries(id) ON DELETE SET NULL;

-- 1. Recriar trigger (SET search_path = '' conforme padrão Supabase)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
  v_status public.user_status;
  v_ministry_id UUID;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'VOLUNTEER');
  IF v_role = 'ADMIN_PARISH' THEN
    v_status := 'APPROVED';
  ELSE
    v_status := COALESCE((NEW.raw_user_meta_data->>'status')::public.user_status, 'PENDING');
  END IF;

  BEGIN
    v_ministry_id := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'ministry_id', '')), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_ministry_id := NULL;
  END;

  INSERT INTO public.users (id, name, email, role, parish_id, ministry_preference_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    (NEW.raw_user_meta_data->>'parish_id')::UUID,
    v_ministry_id,
    v_status
  );
  RETURN NEW;
END;
$$;

-- 2. Owner postgres para bypass de RLS
DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Policies: usuário autenticado + roles do Auth
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_trigger" ON users;
CREATE POLICY "users_insert_trigger" ON users
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_insert_service_role" ON users;
CREATE POLICY "users_insert_service_role" ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Grants explícitos
GRANT INSERT ON public.users TO supabase_auth_admin;
GRANT INSERT ON public.users TO service_role;
