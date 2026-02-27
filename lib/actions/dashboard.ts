'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, DashboardStats, UpcomingService } from '@/types/database'

// ============================================================
// DASHBOARD - Métricas da Paróquia
// Todos os dados são isolados por parish_id via RLS
// ============================================================

export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Total de voluntários (via RLS, só da paróquia)
  const { count: totalVolunteers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'VOLUNTEER')

  // Total de ministérios
  const { count: totalMinistries } = await supabase
    .from('ministries')
    .select('*', { count: 'exact', head: true })

  // Próximos serviços (a partir de hoje)
  const today = new Date().toISOString().split('T')[0]
  const { count: upcomingServices } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .gte('date', today)

  // Horários com vagas abertas
  const { count: openSlots } = await supabase
    .from('time_slots_with_counts')
    .select('*', { count: 'exact', head: true })
    .gt('available_spots', 0)

  return {
    success: true,
    data: {
      total_volunteers: totalVolunteers ?? 0,
      total_ministries: totalMinistries ?? 0,
      upcoming_services: upcomingServices ?? 0,
      open_slots: openSlots ?? 0,
    },
  }
}

export async function getUpcomingServicesAction(): Promise<ActionResult<UpcomingService[]>> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: services, error } = await supabase
    .from('services')
    .select(`
      id,
      date,
      ministries(name),
      time_slots(
        id,
        max_volunteers,
        registrations(id)
      )
    `)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(5)

  if (error) {
    return { success: false, error: 'Erro ao buscar próximos serviços.' }
  }

  const upcoming: UpcomingService[] = (services ?? []).map((s: any) => {
    const slots = s.time_slots ?? []
    const totalSlots = slots.reduce((acc: number, slot: any) => acc + slot.max_volunteers, 0)
    const filledSlots = slots.reduce((acc: number, slot: any) => acc + (slot.registrations?.length ?? 0), 0)

    return {
      id: s.id,
      date: s.date,
      ministry_name: s.ministries?.name ?? '',
      total_slots: totalSlots,
      filled_slots: filledSlots,
    }
  })

  return { success: true, data: upcoming }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCurrentUserAction(): Promise<any | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*, parishes(id, name, city, state)')
    .eq('id', user.id)
    .single()

  return userData as any
}
