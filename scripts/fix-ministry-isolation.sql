-- ============================================================
-- FIX: Isolamento total por ministério
-- Execute no Supabase SQL Editor
-- ============================================================
-- Regra: Vagas/serviços criados em um ministério NÃO aparecem em outro.
-- Causa: RLS anterior permitia ver todos os services/time_slots da paróquia.
-- ============================================================

-- 1. Garantir user_has_access_to_ministry (se fix-volunteer-complete não foi executado)
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

-- 2. SERVICES: só quem tem acesso ao ministério vê os serviços
DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services
  FOR SELECT USING (
    is_super_admin()
    OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), ministry_id))
  );

-- 3. TIME_SLOTS: só quem tem acesso ao ministério do serviço vê os horários
DROP POLICY IF EXISTS "time_slots_select" ON time_slots;
CREATE POLICY "time_slots_select" ON time_slots
  FOR SELECT USING (
    is_super_admin()
    OR (parish_id = get_user_parish_id() AND user_has_access_to_ministry(auth.uid(), (SELECT ministry_id FROM services WHERE id = time_slots.service_id)))
  );

-- 4. TIME_SLOT_ROLES: herda do time_slots
DROP POLICY IF EXISTS "time_slot_roles_select" ON time_slot_roles;
CREATE POLICY "time_slot_roles_select" ON time_slot_roles
  FOR SELECT USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM time_slots ts
      JOIN services s ON s.id = ts.service_id
      WHERE ts.id = time_slot_roles.time_slot_id
        AND ts.parish_id = get_user_parish_id()
        AND user_has_access_to_ministry(auth.uid(), s.ministry_id)
    )
  );
