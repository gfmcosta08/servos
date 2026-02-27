-- ============================================================
-- MIGRAÇÃO: Funções por ministério
-- Execute no Supabase SQL Editor para projetos EXISTENTES
-- ============================================================

-- 1. Criar tabela ministry_roles
CREATE TABLE IF NOT EXISTS ministry_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ministry_roles_ministry ON ministry_roles(ministry_id);

-- 2. Criar tabela time_slot_roles
CREATE TABLE IF NOT EXISTS time_slot_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id    UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  ministry_role_id UUID NOT NULL REFERENCES ministry_roles(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(time_slot_id, ministry_role_id)
);

CREATE INDEX IF NOT EXISTS idx_time_slot_roles_time_slot ON time_slot_roles(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_roles_ministry_role ON time_slot_roles(ministry_role_id);

-- 3. RLS para ministry_roles
ALTER TABLE ministry_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_roles_select" ON ministry_roles
  FOR SELECT USING (
    is_super_admin() OR
    ministry_id IN (SELECT id FROM ministries WHERE parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_roles_insert" ON ministry_roles
  FOR INSERT WITH CHECK (
    is_admin_or_coordinator() AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_roles_update" ON ministry_roles
  FOR UPDATE USING (
    is_admin_or_coordinator() AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_roles_delete" ON ministry_roles
  FOR DELETE USING (
    is_admin_or_coordinator() AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

-- 4. RLS para time_slot_roles
ALTER TABLE time_slot_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_slot_roles_select" ON time_slot_roles
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (SELECT 1 FROM time_slots ts WHERE ts.id = time_slot_roles.time_slot_id AND ts.parish_id = get_user_parish_id())
  );

CREATE POLICY "time_slot_roles_insert" ON time_slot_roles
  FOR INSERT WITH CHECK (
    is_admin_or_coordinator() AND
    EXISTS (SELECT 1 FROM time_slots ts WHERE ts.id = time_slot_roles.time_slot_id AND ts.parish_id = get_user_parish_id())
  );

CREATE POLICY "time_slot_roles_delete" ON time_slot_roles
  FOR DELETE USING (
    is_admin_or_coordinator() AND
    EXISTS (SELECT 1 FROM time_slots ts WHERE ts.id = time_slot_roles.time_slot_id AND ts.parish_id = get_user_parish_id())
  );

-- 5. Migrar dados existentes: criar função "Voluntário" para cada ministério
INSERT INTO ministry_roles (ministry_id, name, sort_order)
SELECT m.id, 'Voluntário', 0
FROM ministries m
WHERE NOT EXISTS (SELECT 1 FROM ministry_roles mr WHERE mr.ministry_id = m.id);

-- 6. Criar time_slot_roles para time_slots existentes
INSERT INTO time_slot_roles (time_slot_id, ministry_role_id, quantity)
SELECT ts.id, mr.id, ts.max_volunteers
FROM time_slots ts
JOIN services s ON s.id = ts.service_id
JOIN ministry_roles mr ON mr.ministry_id = s.ministry_id AND mr.name = 'Voluntário'
WHERE NOT EXISTS (SELECT 1 FROM time_slot_roles tsr WHERE tsr.time_slot_id = ts.id);

-- 7. Adicionar coluna time_slot_role_id em registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS time_slot_role_id UUID REFERENCES time_slot_roles(id) ON DELETE CASCADE;

-- 8. Migrar registrations existentes: atribuir ao primeiro time_slot_role do horário
UPDATE registrations r
SET time_slot_role_id = (
  SELECT tsr.id FROM time_slot_roles tsr
  WHERE tsr.time_slot_id = r.time_slot_id
  ORDER BY tsr.id
  LIMIT 1
)
WHERE r.time_slot_role_id IS NULL;

-- 9. Remover constraint antiga e adicionar nova
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_time_slot_id_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_time_slot_role_id_key;
ALTER TABLE registrations ADD CONSTRAINT registrations_user_id_time_slot_role_id_key UNIQUE (user_id, time_slot_role_id);

-- 10. Atualizar view para usar time_slot_roles
DROP VIEW IF EXISTS time_slots_with_counts;
CREATE VIEW time_slots_with_counts AS
SELECT
  ts.id,
  ts.service_id,
  ts.parish_id,
  ts.start_time,
  ts.end_time,
  ts.created_at,
  (SELECT COALESCE(SUM(quantity), 0)::INTEGER FROM time_slot_roles WHERE time_slot_id = ts.id) AS max_volunteers,
  (SELECT COUNT(*)::INTEGER FROM registrations WHERE time_slot_id = ts.id) AS current_volunteers,
  (SELECT COALESCE(SUM(quantity), 0) FROM time_slot_roles WHERE time_slot_id = ts.id) -
  (SELECT COUNT(*) FROM registrations WHERE time_slot_id = ts.id) AS available_spots
FROM time_slots ts;

-- 11. Remover coluna max_volunteers de time_slots (opcional, para consistência)
ALTER TABLE time_slots DROP COLUMN IF EXISTS max_volunteers;

