-- ============================================================
-- MIGRAÇÃO: Coordenador por ministério
-- Execute no Supabase SQL Editor para projetos EXISTENTES
-- ============================================================

-- 1. Criar tabela ministry_coordinators
CREATE TABLE IF NOT EXISTS ministry_coordinators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ministry_id)
);

CREATE INDEX IF NOT EXISTS idx_ministry_coordinators_user ON ministry_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_ministry_coordinators_ministry ON ministry_coordinators(ministry_id);

-- 2. Adicionar ministry_preference_id em users (ministério ao qual se candidatou no registro)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ministry_preference_id UUID REFERENCES ministries(id) ON DELETE SET NULL;

-- 3. RLS para ministry_coordinators
ALTER TABLE ministry_coordinators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_coordinators_select" ON ministry_coordinators
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_coordinators_insert" ON ministry_coordinators
  FOR INSERT WITH CHECK (
    (is_super_admin() OR is_admin_or_coordinator()) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_coordinators_delete" ON ministry_coordinators
  FOR DELETE USING (
    (is_super_admin() OR is_admin_or_coordinator()) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_coordinators.ministry_id AND m.parish_id = get_user_parish_id())
  );

-- 4. Função: verifica se usuário é coordenador do ministério (ou SUPER_ADMIN)
CREATE OR REPLACE FUNCTION is_coordinator_of_ministry(p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  OR EXISTS (
    SELECT 1 FROM ministry_coordinators
    WHERE user_id = auth.uid() AND ministry_id = p_ministry_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Atualizar RLS de SERVICES: apenas coordenador do ministério ou SUPER_ADMIN
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

-- 6. Atualizar RLS de TIME_SLOTS: via service.ministry_id
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

-- 7. Atualizar RLS de TIME_SLOT_ROLES
DROP POLICY IF EXISTS "time_slot_roles_insert" ON time_slot_roles;
DROP POLICY IF EXISTS "time_slot_roles_delete" ON time_slot_roles;

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

-- 8. Migrar usuários com role COORDINATOR para ministry_coordinators (todos os ministérios da paróquia)
INSERT INTO ministry_coordinators (user_id, ministry_id)
SELECT u.id, m.id
FROM users u
JOIN ministries m ON m.parish_id = u.parish_id
WHERE u.role = 'COORDINATOR' AND u.parish_id IS NOT NULL
ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- 9. Atualizar RLS de MINISTRY_ROLES: coordenador do ministério pode gerenciar funções
DROP POLICY IF EXISTS "ministry_roles_insert" ON ministry_roles;
DROP POLICY IF EXISTS "ministry_roles_update" ON ministry_roles;
DROP POLICY IF EXISTS "ministry_roles_delete" ON ministry_roles;

CREATE POLICY "ministry_roles_insert" ON ministry_roles
  FOR INSERT WITH CHECK (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_roles_update" ON ministry_roles
  FOR UPDATE USING (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

CREATE POLICY "ministry_roles_delete" ON ministry_roles
  FOR DELETE USING (
    (is_super_admin() OR is_admin_or_coordinator() OR is_coordinator_of_ministry(ministry_id)) AND
    EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_roles.ministry_id AND m.parish_id = get_user_parish_id())
  );

-- 10. Atualizar trigger handle_new_user para salvar ministry_preference_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, parish_id, ministry_preference_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOLUNTEER'),
    (NEW.raw_user_meta_data->>'parish_id')::UUID,
    (NEW.raw_user_meta_data->>'ministry_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
