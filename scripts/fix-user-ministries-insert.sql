-- ============================================================
-- FIX: Policy INSERT em user_ministries (candidatura voluntário)
-- Execute no Supabase SQL Editor
-- ============================================================
-- Garante que voluntário pode inserir em user_ministries com status PENDING
-- ao clicar em "Candidatar-se" em um ministério.
-- ============================================================

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
