// ============================================================
// SERVOS - Tipos TypeScript do Banco de Dados
// ============================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_PARISH' | 'COORDINATOR' | 'VOLUNTEER'

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

// ============================================================
// Entidades do Banco
// ============================================================

export interface Parish {
  id: string
  name: string
  slug: string
  city: string
  state: string
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  parish_id: string | null
  ministry_preference_id?: string | null
  status?: UserStatus
  created_at: string
}

export interface Ministry {
  id: string
  name: string
  description: string | null
  parish_id: string
  created_at: string
}

export interface MinistryRole {
  id: string
  ministry_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface MinistryCoordinator {
  id: string
  user_id: string
  ministry_id: string
  created_at: string
}

export interface Service {
  id: string
  ministry_id: string
  parish_id: string
  date: string
  description: string | null
  created_at: string
}

export interface TimeSlot {
  id: string
  service_id: string
  parish_id: string
  start_time: string
  end_time: string
  created_at: string
}

export interface TimeSlotRole {
  id: string
  time_slot_id: string
  ministry_role_id: string
  quantity: number
  created_at: string
}

export interface Registration {
  id: string
  user_id: string
  time_slot_id: string
  time_slot_role_id: string
  parish_id: string
  created_at: string
}

// TimeSlot da view (com max_volunteers calculado)
export interface TimeSlotFromView extends TimeSlot {
  max_volunteers: number
}

// ============================================================
// Tipos com relacionamentos (JOINs)
// ============================================================

export interface TimeSlotWithCounts extends TimeSlot {
  max_volunteers: number
  current_volunteers: number
  available_spots: number
}

export interface TimeSlotRoleWithDetails extends TimeSlotRole {
  ministry_role: Pick<MinistryRole, 'id' | 'name'>
  filled: number
  available: number
}

export interface TimeSlotWithRegistrations extends TimeSlotWithCounts {
  time_slot_roles: TimeSlotRoleWithDetails[]
  registrations: (Registration & { user: Pick<User, 'id' | 'name' | 'email'>; ministry_role?: Pick<MinistryRole, 'name'> })[]
  is_registered?: boolean
  user_registered_role_ids?: string[]
}

export interface ServiceWithTimeSlots extends Service {
  time_slots: TimeSlotWithRegistrations[]
  ministry?: Pick<Ministry, 'id' | 'name'>
}

export interface MinistryWithServices extends Ministry {
  services: ServiceWithTimeSlots[]
}

// ============================================================
// Tipos para formulários
// ============================================================

export interface CreateParishForm {
  name: string
  slug: string
  city: string
  state: string
}

export interface CreateMinistryForm {
  name: string
  description?: string
}

export interface CreateServiceForm {
  ministry_id: string
  date: string
  description?: string
}

export interface CreateTimeSlotForm {
  service_id: string
  start_time: string
  end_time: string
  roles: { ministry_role_id: string; quantity: number }[]
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  parish_option: 'create' | 'join'
  parish_id?: string
  parish_name?: string
  parish_city?: string
  parish_state?: string
}

// ============================================================
// Contexto de autenticação (helper para Server Actions)
// ============================================================

export interface AuthContext {
  user: { id: string }
  parishId: string | null
  role: UserRole
}

// ============================================================
// Tipos de resposta das Server Actions
// ============================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================
// Tipos de Dashboard
// ============================================================

export interface DashboardStats {
  total_volunteers: number
  total_ministries: number
  upcoming_services: number
  open_slots: number
  pending_approvals: number
}

export interface UpcomingService {
  id: string
  date: string
  ministry_name: string
  total_slots: number
  filled_slots: number
}

// ============================================================
// Usuário atual (com paróquia)
// ============================================================

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
  parish_id: string | null
  created_at: string
  parishes: Pick<Parish, 'id' | 'name' | 'city' | 'state'> | null
}

// ============================================================
// Database Types para Supabase Client
// ============================================================

export type Database = {
  public: {
    Tables: {
      parishes: {
        Row: Parish
        Insert: Omit<Parish, 'id' | 'created_at'>
        Update: Partial<Omit<Parish, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      ministries: {
        Row: Ministry
        Insert: Omit<Ministry, 'id' | 'created_at'>
        Update: Partial<Omit<Ministry, 'id' | 'parish_id' | 'created_at'>>
      }
      ministry_roles: {
        Row: MinistryRole
        Insert: Omit<MinistryRole, 'id' | 'created_at'>
        Update: Partial<Omit<MinistryRole, 'id' | 'ministry_id' | 'created_at'>>
      }
      services: {
        Row: Service
        Insert: Omit<Service, 'id' | 'created_at'>
        Update: Partial<Omit<Service, 'id' | 'parish_id' | 'created_at'>>
      }
      time_slots: {
        Row: TimeSlot
        Insert: Omit<TimeSlot, 'id' | 'created_at'>
        Update: Partial<Omit<TimeSlot, 'id' | 'parish_id' | 'created_at'>>
      }
      time_slot_roles: {
        Row: TimeSlotRole
        Insert: Omit<TimeSlotRole, 'id' | 'created_at'>
        Update: Partial<Omit<TimeSlotRole, 'id' | 'time_slot_id' | 'ministry_role_id' | 'created_at'>>
      }
      registrations: {
        Row: Registration
        Insert: Omit<Registration, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: {
      time_slots_with_counts: {
        Row: TimeSlotWithCounts
      }
    }
    Functions: {
      get_user_parish_id: { Returns: string }
      is_super_admin: { Returns: boolean }
      is_admin_or_coordinator: { Returns: boolean }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
