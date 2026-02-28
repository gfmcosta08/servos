-- ============================================================
-- MIGRAÇÃO: user_ministries - Lista de ministérios por usuário
-- Execute no Supabase SQL Editor
-- ============================================================
-- Substitui ministry_preference_id (único) por lista de ministérios
-- para suportar múltiplos ministérios e regra de restrição de acesso
-- ============================================================

-- 1. Criar tabela user_ministries
CREATE TABLE IF NOT EXISTS user_ministries (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, ministry_id),
  UNIQUE(user_id, ministry_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ministries_user ON user_ministries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ministries_ministry ON user_ministries(ministry_id);

-- 2. Migrar dados: users com ministry_preference_id -> user_ministries
INSERT INTO user_ministries (user_id, ministry_id)
SELECT id, ministry_preference_id
FROM users
WHERE ministry_preference_id IS NOT NULL
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- 3. Usuários ADMIN_PARISH e SUPER_ADMIN: popular com todos os ministérios da paróquia
-- (para não restringir acesso durante migração)
INSERT INTO user_ministries (user_id, ministry_id)
SELECT u.id, m.id
FROM users u
JOIN ministries m ON m.parish_id = u.parish_id
WHERE u.role IN ('ADMIN_PARISH', 'SUPER_ADMIN')
  AND u.parish_id IS NOT NULL
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- 4. Coordenadores: adicionar ministérios que coordenam
INSERT INTO user_ministries (user_id, ministry_id)
SELECT user_id, ministry_id
FROM ministry_coordinators
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- 5. Usuários sem ministry_preference_id e sem user_ministries: dar acesso a todos os ministérios da paróquia
INSERT INTO user_ministries (user_id, ministry_id)
SELECT u.id, m.id
FROM users u
JOIN ministries m ON m.parish_id = u.parish_id
WHERE u.parish_id IS NOT NULL
  AND u.role NOT IN ('ADMIN_PARISH', 'SUPER_ADMIN')
  AND NOT EXISTS (SELECT 1 FROM user_ministries um WHERE um.user_id = u.id)
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- 6. Função: retorna IDs dos ministérios do usuário
CREATE OR REPLACE FUNCTION get_user_ministry_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(ministry_id), '{}'::UUID[])
  FROM user_ministries
  WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. Função: verifica se usuário tem acesso ao ministério
-- SUPER_ADMIN e ADMIN_PARISH da paróquia: true
-- Caso contrário: user_ministries
CREATE OR REPLACE FUNCTION user_has_access_to_ministry(p_user_id UUID, p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u WHERE u.id = p_user_id AND u.role = 'SUPER_ADMIN'
  )
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN ministries m ON m.parish_id = u.parish_id AND m.id = p_ministry_id
    WHERE u.id = p_user_id AND u.role = 'ADMIN_PARISH'
  )
  OR EXISTS (
    SELECT 1 FROM user_ministries
    WHERE user_id = p_user_id AND ministry_id = p_ministry_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. RLS para user_ministries
ALTER TABLE user_ministries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ministries_select" ON user_ministries;
CREATE POLICY "user_ministries_select" ON user_ministries
  FOR SELECT USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role IN ('ADMIN_PARISH', 'SUPER_ADMIN') AND u.parish_id IN (
        SELECT parish_id FROM ministries WHERE id = user_ministries.ministry_id
      ))
      OR EXISTS (
        SELECT 1 FROM ministry_coordinators mc
        WHERE mc.user_id = auth.uid() AND mc.ministry_id = user_ministries.ministry_id
      )
    )
  );

DROP POLICY IF EXISTS "user_ministries_insert" ON user_ministries;
CREATE POLICY "user_ministries_insert" ON user_ministries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_super_admin()
    OR (is_admin_or_coordinator() AND EXISTS (
      SELECT 1 FROM ministries m
      WHERE m.id = ministry_id AND m.parish_id = get_user_parish_id()
    ))
  );

DROP POLICY IF EXISTS "user_ministries_delete" ON user_ministries;
CREATE POLICY "user_ministries_delete" ON user_ministries
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_super_admin()
    OR (is_admin_or_coordinator() AND EXISTS (
      SELECT 1 FROM ministries m
      WHERE m.id = ministry_id AND m.parish_id = get_user_parish_id()
    ))
  );

-- 9. Grants
GRANT SELECT, INSERT, DELETE ON user_ministries TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_ministries TO service_role;

-- 10. Atualizar RLS de ministries, services, time_slots para usar user_has_access_to_ministry
DROP POLICY IF EXISTS "ministries_select" ON ministries;
CREATE POLICY "ministries_select" ON ministries
  FOR SELECT USING (
    is_super_admin() OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), id))
  );

DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services
  FOR SELECT USING (
    is_super_admin() OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), ministry_id))
  );

DROP POLICY IF EXISTS "time_slots_select" ON time_slots;
CREATE POLICY "time_slots_select" ON time_slots
  FOR SELECT USING (
    is_super_admin() OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), (SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );
