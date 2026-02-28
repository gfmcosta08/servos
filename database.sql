-- ============================================================
-- SERVOS - Schema Supabase
-- Plataforma SaaS Multi-Paróquias para Gestão de Voluntários
-- ============================================================

-- Limpar schema se necessário (ordem inversa de dependência)
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS time_slot_roles CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS ministry_roles CASCADE;
DROP TABLE IF EXISTS ministry_coordinators CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS ministries CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS parishes CASCADE;

-- Limpar tipos customizados
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================
-- ENUM: Status de aprovação do usuário
-- ============================================================
CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ============================================================
-- ENUM: Roles
-- ============================================================
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN_PARISH', 'COORDINATOR', 'VOLUNTEER');

-- ============================================================
-- TABELA: PARISHES
-- ============================================================
CREATE TABLE parishes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: USERS
-- Obs: Integrada com auth.users do Supabase via trigger
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'VOLUNTEER',
  parish_id   UUID REFERENCES parishes(id) ON DELETE SET NULL,
  status      user_status NOT NULL DEFAULT 'APPROVED',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: MINISTRIES
-- parish_id NOT NULL — ministério SEM paróquia não existe
-- ============================================================
CREATE TABLE ministries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  parish_id   UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: MINISTRY_ROLES (Funções do ministério: Leitor, Comentador...)
-- ============================================================
CREATE TABLE ministry_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: SERVICES (Datas de Serviço)
-- ministry_id + parish_id NOT NULL — data SEM ministério não existe
-- ============================================================
CREATE TABLE services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  parish_id    UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: TIME_SLOTS (Horários)
-- service_id + parish_id NOT NULL — horário SEM data não existe
-- Vagas definidas via time_slot_roles (quantidade por função)
-- ============================================================
CREATE TABLE time_slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  parish_id   UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: TIME_SLOT_ROLES (Quantidade por função em cada horário)
-- ============================================================
CREATE TABLE time_slot_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id    UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  ministry_role_id UUID NOT NULL REFERENCES ministry_roles(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(time_slot_id, ministry_role_id)
);

-- ============================================================
-- TABELA: REGISTRATIONS (Inscrições)
-- user_id + time_slot_role_id — voluntário ocupa uma vaga de função
-- UNIQUE: um voluntário por vaga de função
-- ============================================================
CREATE TABLE registrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_slot_id     UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  time_slot_role_id UUID NOT NULL REFERENCES time_slot_roles(id) ON DELETE CASCADE,
  parish_id        UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, time_slot_role_id)
);

-- ============================================================
-- INDEXES para performance
-- ============================================================
CREATE INDEX idx_ministries_parish ON ministries(parish_id);

-- ============================================================
-- TABELA: MINISTRY_COORDINATORS (Coordenador por ministério)
-- ============================================================
CREATE TABLE ministry_coordinators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ministry_id)
);

CREATE INDEX idx_ministry_coordinators_user ON ministry_coordinators(user_id);
CREATE INDEX idx_ministry_coordinators_ministry ON ministry_coordinators(ministry_id);

ALTER TABLE users ADD COLUMN ministry_preference_id UUID REFERENCES ministries(id) ON DELETE SET NULL;

CREATE INDEX idx_ministry_roles_ministry ON ministry_roles(ministry_id);
CREATE INDEX idx_services_ministry ON services(ministry_id);
CREATE INDEX idx_services_parish ON services(parish_id);
CREATE INDEX idx_services_date ON services(date);
CREATE INDEX idx_time_slots_service ON time_slots(service_id);
CREATE INDEX idx_time_slots_parish ON time_slots(parish_id);
CREATE INDEX idx_time_slot_roles_time_slot ON time_slot_roles(time_slot_id);
CREATE INDEX idx_time_slot_roles_ministry_role ON time_slot_roles(ministry_role_id);
CREATE INDEX idx_registrations_time_slot ON registrations(time_slot_id);
CREATE INDEX idx_registrations_time_slot_role ON registrations(time_slot_role_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_registrations_parish ON registrations(parish_id);
CREATE INDEX idx_users_parish ON users(parish_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- REGRA ABSOLUTA: Toda query isolada por parish_id
-- ============================================================

ALTER TABLE parishes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slot_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNÇÃO AUXILIAR: Retorna parish_id do usuário autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_parish_id()
RETURNS UUID AS $$
  SELECT parish_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNÇÃO AUXILIAR: Verifica se usuário é SUPER_ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNÇÃO AUXILIAR: Verifica se usuário é ADMIN ou COORDINATOR
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_or_coordinator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('ADMIN_PARISH', 'COORDINATOR', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNÇÃO AUXILIAR: Verifica se usuário é coordenador do ministério
-- ============================================================
CREATE OR REPLACE FUNCTION is_coordinator_of_ministry(p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  OR EXISTS (
    SELECT 1 FROM ministry_coordinators
    WHERE user_id = auth.uid() AND ministry_id = p_ministry_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: PARISHES
-- ============================================================
-- SUPER_ADMIN vê todas; outros veem apenas a sua
CREATE POLICY "parishes_select" ON parishes
  FOR SELECT USING (
    is_super_admin() OR id = get_user_parish_id()
  );

CREATE POLICY "parishes_insert" ON parishes
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "parishes_update" ON parishes
  FOR UPDATE USING (
    is_super_admin() OR id = get_user_parish_id()
  );

-- ============================================================
-- RLS: USERS
-- ============================================================
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id() OR id = auth.uid()
  );

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    -- Permite criação do próprio perfil ao registrar
    id = auth.uid()
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    id = auth.uid() OR is_super_admin() OR (
      is_admin_or_coordinator() AND parish_id = get_user_parish_id()
    )
  );

-- ============================================================
-- RLS: MINISTRIES
-- ============================================================
CREATE POLICY "ministries_select" ON ministries
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id()
  );

CREATE POLICY "ministries_insert" ON ministries
  FOR INSERT WITH CHECK (
    is_admin_or_coordinator() AND parish_id = get_user_parish_id()
  );

CREATE POLICY "ministries_update" ON ministries
  FOR UPDATE USING (
    is_admin_or_coordinator() AND parish_id = get_user_parish_id()
  );

CREATE POLICY "ministries_delete" ON ministries
  FOR DELETE USING (
    is_admin_or_coordinator() AND parish_id = get_user_parish_id()
  );

-- ============================================================
-- RLS: MINISTRY_ROLES
-- ============================================================
CREATE POLICY "ministry_roles_select" ON ministry_roles
  FOR SELECT USING (
    is_super_admin() OR
    ministry_id IN (SELECT id FROM ministries WHERE parish_id = get_user_parish_id())
  );

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

-- ============================================================
-- RLS: MINISTRY_COORDINATORS
-- ============================================================
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

-- ============================================================
-- RLS: SERVICES
-- ============================================================
CREATE POLICY "services_select" ON services
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id()
  );

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

-- ============================================================
-- RLS: TIME_SLOTS
-- ============================================================
CREATE POLICY "time_slots_select" ON time_slots
  FOR SELECT USING (
    is_super_admin() OR parish_id = get_user_parish_id()
  );

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

-- ============================================================
-- RLS: TIME_SLOT_ROLES
-- ============================================================
CREATE POLICY "time_slot_roles_select" ON time_slot_roles
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (SELECT 1 FROM time_slots ts WHERE ts.id = time_slot_roles.time_slot_id AND ts.parish_id = get_user_parish_id())
  );

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

-- ============================================================
-- RLS: REGISTRATIONS
-- ============================================================
CREATE POLICY "registrations_select" ON registrations
  FOR SELECT USING (
    is_super_admin()
    OR parish_id = get_user_parish_id()
  );

CREATE POLICY "registrations_insert" ON registrations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND parish_id = get_user_parish_id()
    AND EXISTS (SELECT 1 FROM time_slot_roles tsr JOIN time_slots ts ON ts.id = tsr.time_slot_id
      WHERE tsr.id = time_slot_role_id AND ts.parish_id = get_user_parish_id())
  );

CREATE POLICY "registrations_delete" ON registrations
  FOR DELETE USING (
    user_id = auth.uid()
    OR is_admin_or_coordinator() AND parish_id = get_user_parish_id()
  );

-- ============================================================
-- TRIGGER: Cria perfil em public.users ao registrar
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_status user_status;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'VOLUNTEER');
  IF v_role = 'ADMIN_PARISH' THEN
    v_status := 'APPROVED';
  ELSE
    v_status := COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'PENDING');
  END IF;

  INSERT INTO public.users (id, name, email, role, parish_id, ministry_preference_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    (NEW.raw_user_meta_data->>'parish_id')::UUID,
    (NEW.raw_user_meta_data->>'ministry_id')::UUID,
    v_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VIEW: time_slots com contagem de inscritos (total = soma das quantidades)
-- ============================================================
CREATE OR REPLACE VIEW time_slots_with_counts AS
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

-- ============================================================
-- SUPER_ADMIN INICIAL (substituir pelo email real)
-- Executar manualmente após criar o primeiro usuário
-- ============================================================
-- UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'seu@email.com';
