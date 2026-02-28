-- ============================================================
-- FIX: Voluntário sem ministérios aprovados não via nenhum ministério
-- Execute no Supabase SQL Editor
-- ============================================================
-- Problema: ministries_select exigia user_has_access_to_ministry, então
-- voluntário novo (sem user_ministries APPROVED) via 0 ministérios e não
-- conseguia se candidatar.
--
-- Solução: Permitir que membros da paróquia vejam TODOS os ministérios
-- da paróquia. A restrição por ministério fica em services/time_slots.
-- A página Ministérios usa getMinistriesForVolunteerAction e precisa
-- listar todos para o voluntário poder clicar em "Candidatar-se".
-- ============================================================

DROP POLICY IF EXISTS "ministries_select" ON ministries;
CREATE POLICY "ministries_select" ON ministries
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id()
  );
