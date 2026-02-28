-- ============================================================
-- FIX: Usuário sem paróquia/ministério (parish_id null)
-- Quando o trigger falhou ou o usuário foi criado sem vínculos.
-- Execute no Supabase → SQL Editor
-- ============================================================

-- 1. Ver paróquias disponíveis (para escolher o ID correto)
SELECT id, name, city, state, slug FROM parishes ORDER BY name;

-- 2. Ver ministérios de uma paróquia (substitua PARISH_ID pelo id da paróquia)
-- SELECT id, name FROM ministries WHERE parish_id = 'PARISH_ID' ORDER BY name;

-- 3. Corrigir farollapi@gmail.com: vincular à primeira paróquia e primeiro ministério
--    (Ajuste os IDs se sua paróquia/ministério forem outros)
DO $$
DECLARE
  v_user_id UUID;
  v_parish_id UUID;
  v_ministry_id UUID;
BEGIN
  -- Buscar usuário
  SELECT id INTO v_user_id FROM public.users WHERE email = 'farollapi@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário farollapi@gmail.com não encontrado.';
  END IF;

  -- Primeira paróquia (ou especifique: v_parish_id := 'uuid-aqui'::UUID)
  SELECT id INTO v_parish_id FROM parishes ORDER BY name LIMIT 1;
  IF v_parish_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma paróquia encontrada. Crie uma paróquia primeiro.';
  END IF;

  -- Primeiro ministério da paróquia
  SELECT id INTO v_ministry_id FROM ministries WHERE parish_id = v_parish_id ORDER BY name LIMIT 1;

  -- Atualizar usuário
  UPDATE public.users
  SET parish_id = v_parish_id,
      ministry_preference_id = v_ministry_id
  WHERE id = v_user_id;

  -- Inserir em user_ministries (se existir o ministério)
  IF v_ministry_id IS NOT NULL THEN
    INSERT INTO public.user_ministries (user_id, ministry_id)
    VALUES (v_user_id, v_ministry_id)
    ON CONFLICT (user_id, ministry_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Usuário corrigido: parish_id=%, ministry_preference_id=%', v_parish_id, v_ministry_id;
END $$;
