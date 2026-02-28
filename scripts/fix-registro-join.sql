-- ============================================================
-- FIX: Erro ao criar conta ao entrar em paróquia existente
-- Execute no Supabase SQL Editor
-- ============================================================
-- Causa: O trigger handle_new_user roda como supabase_auth_admin.
--        Com SECURITY DEFINER, a função deve rodar como o owner (postgres)
--        e assim bypassar RLS. Se o owner não for postgres, o INSERT falha.
-- ============================================================

-- 1. Recriar trigger com tratamento de ministry_id vazio
--    (evita erro quando '' é passado em metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_status user_status;
  v_ministry_id UUID;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOLUNTEER');
  IF v_role = 'ADMIN_PARISH' THEN
    v_status := 'APPROVED';
  ELSE
    v_status := COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'PENDING');
  END IF;

  -- ministry_id: tratar string vazia (''::uuid falha)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Garantir owner postgres para bypass de RLS
DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Fallback: se ainda falhar, adicione policy para auth admin
--    (descomente apenas se o erro persistir após rodar os passos acima)
-- DROP POLICY IF EXISTS "users_insert" ON users;
-- CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());
-- CREATE POLICY "users_insert_trigger" ON users FOR INSERT TO supabase_auth_admin WITH CHECK (true);
