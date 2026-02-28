-- ============================================================
-- MIGRAÇÃO: status em user_ministries (candidatura pendente)
-- Execute no Supabase SQL Editor
-- ============================================================
-- Permite que voluntários se candidatem a ministérios; coordenador aprova
-- status: 'PENDING' (aguardando) | 'APPROVED' (aprovado)
-- ============================================================

-- 1. Adicionar coluna status
ALTER TABLE user_ministries
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED'
CHECK (status IN ('PENDING', 'APPROVED'));

-- 2. Garantir que registros existentes tenham APPROVED
UPDATE user_ministries SET status = 'APPROVED' WHERE status IS NULL;

-- 3. Função: retorna IDs dos ministérios do usuário (apenas aprovados)
CREATE OR REPLACE FUNCTION get_user_ministry_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(ministry_id), '{}'::UUID[])
  FROM user_ministries
  WHERE user_id = p_user_id
    AND (status = 'APPROVED' OR status IS NULL);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Função: verifica se usuário tem acesso ao ministério
-- Considera user_ministries (apenas APPROVED) e ministry_coordinators
CREATE OR REPLACE FUNCTION user_has_access_to_ministry(p_user_id UUID, p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id AND u.role = 'SUPER_ADMIN')
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN ministries m ON m.parish_id = u.parish_id AND m.id = p_ministry_id
    WHERE u.id = p_user_id AND u.role = 'ADMIN_PARISH'
  )
  OR EXISTS (
    SELECT 1 FROM user_ministries
    WHERE user_id = p_user_id AND ministry_id = p_ministry_id
      AND (status = 'APPROVED' OR status IS NULL)
  )
  OR EXISTS (SELECT 1 FROM ministry_coordinators WHERE user_id = p_user_id AND ministry_id = p_ministry_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Policy UPDATE para coordenador/admin aprovar candidaturas
DROP POLICY IF EXISTS "user_ministries_update" ON user_ministries;
CREATE POLICY "user_ministries_update" ON user_ministries
  FOR UPDATE USING (
    is_super_admin()
    OR (is_admin_or_coordinator() AND EXISTS (
      SELECT 1 FROM ministries m
      WHERE m.id = ministry_id AND m.parish_id = get_user_parish_id()
    ))
    OR EXISTS (
      SELECT 1 FROM ministry_coordinators mc
      WHERE mc.user_id = auth.uid() AND mc.ministry_id = user_ministries.ministry_id
    )
  );

-- 6. Grant UPDATE
GRANT UPDATE ON user_ministries TO authenticated;
GRANT UPDATE ON user_ministries TO service_role;
