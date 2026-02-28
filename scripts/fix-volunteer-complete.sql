-- ============================================================
-- FIX COMPLETO: Voluntário - Escalas, Ministérios, Recados
-- Execute no Supabase SQL Editor
-- ============================================================
-- 1. ministries_select: voluntário vê todos da paróquia (para candidatura)
-- 2. user_has_access_to_ministry: user_ministries APPROVED + ministry_coordinators
-- 3. services/time_slots: apenas quem tem acesso ao ministério
-- 4. ministry_announcements: recados (coordenador/SUPER_ADMIN criam)
-- ============================================================

-- 0. Garantir coluna status em user_ministries (se migration não aplicada)
ALTER TABLE user_ministries
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED'
CHECK (status IN ('PENDING', 'APPROVED'));
UPDATE user_ministries SET status = 'APPROVED' WHERE status IS NULL;

-- 1. MINISTRIES: todos da paróquia podem ver
DROP POLICY IF EXISTS "ministries_select" ON ministries;
CREATE POLICY "ministries_select" ON ministries
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id()
  );

-- 2. user_has_access_to_ministry (user_ministries APPROVED ou NULL + ministry_coordinators)
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

-- 3. SERVICES: apenas quem tem acesso ao ministério
DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services
  FOR SELECT USING (
    is_super_admin() OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), ministry_id))
  );

-- 4. TIME_SLOTS: apenas quem tem acesso ao ministério do serviço
DROP POLICY IF EXISTS "time_slots_select" ON time_slots;
CREATE POLICY "time_slots_select" ON time_slots
  FOR SELECT USING (
    is_super_admin() OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), (SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );

-- 5. TABELA ministry_announcements (recados)
CREATE TABLE IF NOT EXISTS ministry_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ministry_announcements_ministry ON ministry_announcements(ministry_id);

ALTER TABLE ministry_announcements ENABLE ROW LEVEL SECURITY;

-- SELECT: quem tem acesso ao ministério vê os recados
DROP POLICY IF EXISTS "ministry_announcements_select" ON ministry_announcements;
CREATE POLICY "ministry_announcements_select" ON ministry_announcements
  FOR SELECT USING (
    is_super_admin()
    OR (EXISTS (
      SELECT 1 FROM ministries m
      WHERE m.id = ministry_announcements.ministry_id
        AND m.parish_id = get_user_parish_id()
        AND user_has_access_to_ministry(auth.uid(), m.id)
    ))
  );

-- INSERT: apenas coordenador do ministério ou SUPER_ADMIN
DROP POLICY IF EXISTS "ministry_announcements_insert" ON ministry_announcements;
CREATE POLICY "ministry_announcements_insert" ON ministry_announcements
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM ministry_coordinators mc
      WHERE mc.user_id = auth.uid() AND mc.ministry_id = ministry_announcements.ministry_id
    ))
  );

-- DELETE: apenas coordenador do ministério ou SUPER_ADMIN
DROP POLICY IF EXISTS "ministry_announcements_delete" ON ministry_announcements;
CREATE POLICY "ministry_announcements_delete" ON ministry_announcements
  FOR DELETE USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM ministry_coordinators mc
      WHERE mc.user_id = auth.uid() AND mc.ministry_id = ministry_announcements.ministry_id
    )
  );

GRANT SELECT, INSERT, DELETE ON ministry_announcements TO authenticated;
GRANT SELECT, INSERT, DELETE ON ministry_announcements TO service_role;
