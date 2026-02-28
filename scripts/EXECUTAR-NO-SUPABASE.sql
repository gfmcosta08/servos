-- ============================================================
-- EXECUTAR TUDO NO SUPABASE SQL EDITOR
-- Copie este arquivo inteiro, cole no Supabase → SQL Editor, clique em Run
-- ============================================================

-- ========== PARTE 1: Fluxo de aprovação ==========
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'APPROVED';
UPDATE users SET status = 'APPROVED' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'APPROVED';

-- ========== PARTE 2: Coordenador por ministério ==========
CREATE TABLE IF NOT EXISTS ministry_coordinators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ministry_id)
);

CREATE INDEX IF NOT EXISTS idx_ministry_coordinators_user ON ministry_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_ministry_coordinators_ministry ON ministry_coordinators(ministry_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS ministry_preference_id UUID REFERENCES ministries(id) ON DELETE SET NULL;

ALTER TABLE ministry_coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ministry_coordinators_select" ON ministry_coordinators;
CREATE POLICY "ministry_coordinators_select" ON ministry_coordinators
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "ministry_coordinators_insert" ON ministry_coordinators;
CREATE POLICY "ministry_coordinators_insert" ON ministry_coordinators
  FOR INSERT WITH CHECK (
    (is_super_admin() OR is_admin_or_coordinator()) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "ministry_coordinators_delete" ON ministry_coordinators;
CREATE POLICY "ministry_coordinators_delete" ON ministry_coordinators
  FOR DELETE USING (
    (is_super_admin() OR is_admin_or_coordinator()) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE OR REPLACE FUNCTION is_coordinator_of_ministry(p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  OR EXISTS (
    SELECT 1 FROM ministry_coordinators
    WHERE user_id = auth.uid() AND ministry_id = p_ministry_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "services_insert" ON services;
DROP POLICY IF EXISTS "services_update" ON services;
DROP POLICY IF EXISTS "services_delete" ON services;

CREATE POLICY "services_insert" ON services
  FOR INSERT WITH CHECK (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry(ministry_id))
  );

CREATE POLICY "services_update" ON services
  FOR UPDATE USING (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry(ministry_id))
  );

CREATE POLICY "services_delete" ON services
  FOR DELETE USING (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry(ministry_id))
  );

DROP POLICY IF EXISTS "time_slots_insert" ON time_slots;
DROP POLICY IF EXISTS "time_slots_update" ON time_slots;
DROP POLICY IF EXISTS "time_slots_delete" ON time_slots;

CREATE POLICY "time_slots_insert" ON time_slots
  FOR INSERT WITH CHECK (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry((SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );

CREATE POLICY "time_slots_update" ON time_slots
  FOR UPDATE USING (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry((SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );

CREATE POLICY "time_slots_delete" ON time_slots
  FOR DELETE USING (
    parish_id = get_user_parish_id() AND
    (is_super_admin() OR is_coordinator_of_ministry((SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );

INSERT INTO ministry_coordinators (user_id, ministry_id)
SELECT u.id, m.id
FROM users u
JOIN ministries m ON m.parish_id = u.parish_id
WHERE u.role = 'COORDINATOR' AND u.parish_id IS NOT NULL
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- ========== PARTE 3: Funções por ministério ==========
CREATE TABLE IF NOT EXISTS ministry_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ministry_roles_ministry ON ministry_roles(ministry_id);

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

ALTER TABLE ministry_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ministry_roles_select" ON ministry_roles;
CREATE POLICY "ministry_roles_select" ON ministry_roles
  FOR SELECT USING (
    is_super_admin() OR
    ministry_id IN (SELECT id FROM ministries WHERE parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "ministry_roles_insert" ON ministry_roles;
CREATE POLICY "ministry_roles_insert" ON ministry_roles
  FOR INSERT WITH CHECK (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "ministry_roles_update" ON ministry_roles;
CREATE POLICY "ministry_roles_update" ON ministry_roles
  FOR UPDATE USING (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "ministry_roles_delete" ON ministry_roles;
CREATE POLICY "ministry_roles_delete" ON ministry_roles
  FOR DELETE USING (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

ALTER TABLE time_slot_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_slot_roles_select" ON time_slot_roles;
CREATE POLICY "time_slot_roles_select" ON time_slot_roles
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (SELECT 1 FROM time_slots ts WHERE ts.id = time_slot_roles.time_slot_id AND ts.parish_id = get_user_parish_id())
  );

DROP POLICY IF EXISTS "time_slot_roles_insert" ON time_slot_roles;
CREATE POLICY "time_slot_roles_insert" ON time_slot_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM time_slots ts
      JOIN services s ON s.id = ts.service_id
      WHERE ts.id = time_slot_roles.time_slot_id
      AND ts.parish_id = get_user_parish_id()
      AND (is_super_admin() OR is_coordinator_of_ministry(s.ministry_id))
    )
  );

DROP POLICY IF EXISTS "time_slot_roles_delete" ON time_slot_roles;
CREATE POLICY "time_slot_roles_delete" ON time_slot_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM time_slots ts
      JOIN services s ON s.id = ts.service_id
      WHERE ts.id = time_slot_roles.time_slot_id
      AND ts.parish_id = get_user_parish_id()
      AND (is_super_admin() OR is_coordinator_of_ministry(s.ministry_id))
    )
  );

INSERT INTO ministry_roles (ministry_id, name, sort_order)
SELECT m.id, 'Voluntário', 0
FROM ministries m
WHERE NOT EXISTS (SELECT 1 FROM ministry_roles mr WHERE mr.ministry_id = m.id);

INSERT INTO time_slot_roles (time_slot_id, ministry_role_id, quantity)
SELECT ts.id, mr.id, 1
FROM time_slots ts
JOIN services s ON s.id = ts.service_id
JOIN ministry_roles mr ON mr.ministry_id = s.ministry_id AND mr.name = 'Voluntário'
WHERE NOT EXISTS (SELECT 1 FROM time_slot_roles tsr WHERE tsr.time_slot_id = ts.id);

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS time_slot_role_id UUID REFERENCES time_slot_roles(id) ON DELETE CASCADE;

UPDATE registrations r
SET time_slot_role_id = (
  SELECT tsr.id FROM time_slot_roles tsr
  WHERE tsr.time_slot_id = r.time_slot_id
  ORDER BY tsr.id
  LIMIT 1
)
WHERE r.time_slot_role_id IS NULL;

ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_time_slot_id_key;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_user_id_time_slot_role_id_key;
ALTER TABLE registrations ADD CONSTRAINT registrations_user_id_time_slot_role_id_key UNIQUE (user_id, time_slot_role_id);

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

ALTER TABLE time_slots DROP COLUMN IF EXISTS max_volunteers;

-- ========== PARTE 4: Trigger de registro (com status) ==========
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

DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Limpar paróquias órfãs
DELETE FROM parishes
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE users.parish_id = parishes.id
);

-- ============================================================
-- FIM. Execute no Supabase SQL Editor e clique em Run.
-- ============================================================
