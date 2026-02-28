-- ============================================================
-- FIX: Coordenador pode ocupar vagas nas escalas
-- Execute no Supabase SQL Editor
-- ============================================================
-- Inclui ministry_coordinators na função user_has_access_to_ministry
-- para que coordenadores tenham acesso mesmo sem entrada em user_ministries
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_access_to_ministry(p_user_id UUID, p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id AND u.role = 'SUPER_ADMIN')
  OR EXISTS (
    SELECT 1 FROM users u
    JOIN ministries m ON m.parish_id = u.parish_id AND m.id = p_ministry_id
    WHERE u.id = p_user_id AND u.role = 'ADMIN_PARISH'
  )
  OR EXISTS (SELECT 1 FROM user_ministries WHERE user_id = p_user_id AND ministry_id = p_ministry_id)
  OR EXISTS (SELECT 1 FROM ministry_coordinators WHERE user_id = p_user_id AND ministry_id = p_ministry_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;
