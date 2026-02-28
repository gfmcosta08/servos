'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import type {
  ActionResult,
  CurrentUser,
  DashboardStats,
  UpcomingService,
} from '@/types/database'

// ============================================================
// DASHBOARD - Métricas da Paróquia
// Todos os dados são isolados por parish_id via RLS
// ============================================================

export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

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

  // Pendentes de aprovação (apenas para quem pode aprovar)
  let pendingApprovals = 0
  if (ctx.role === 'SUPER_ADMIN') {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    pendingApprovals = count ?? 0
  } else if (ctx.parishId && ['ADMIN_PARISH', 'COORDINATOR'].includes(ctx.role)) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .eq('parish_id', ctx.parishId)
    pendingApprovals = count ?? 0
  }

  return {
    success: true,
    data: {
      total_volunteers: totalVolunteers ?? 0,
      total_ministries: totalMinistries ?? 0,
      upcoming_services: upcomingServices ?? 0,
      open_slots: openSlots ?? 0,
      pending_approvals: pendingApprovals,
    },
  }
}

export async function getUpcomingServicesAction(): Promise<ActionResult<UpcomingService[]>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('services')
    .select(`
      id,
      date,
      ministry_id,
      ministries(name),
      time_slots(
        id,
        registrations(id)
      )
    `)
    .gte('date', today)
    .order('date', { ascending: true })

  // Isolamento por ministério: VOLUNTEER e COORDINATOR veem apenas serviços dos seus ministérios
  if (['VOLUNTEER', 'COORDINATOR'].includes(ctx.role)) {
    const { getUserMinistryIds } = await import('@/lib/auth')
    const ministryIds = await getUserMinistryIds(ctx.user.id, ctx.role)
    if (ministryIds.length === 0) {
      return { success: true, data: [] }
    }
    query = query.in('ministry_id', ministryIds)
  }

  const { data: services, error } = await query.limit(10)

  const serviceIds = (services ?? []).map((s: { id: string }) => s.id)
  const { data: slotCounts } =
    serviceIds.length > 0
      ? await supabase
          .from('time_slots_with_counts')
          .select('service_id, max_volunteers')
          .in('service_id', serviceIds)
      : { data: [] }

  if (error) {
    return { success: false, error: 'Erro ao buscar próximos serviços.' }
  }

  interface ServiceRow {
    id: string
    date: string
    ministries?: { name?: string } | { name?: string }[] | null
    time_slots?: Array<{ id: string; registrations?: unknown[] }>
  }

  const getMinistryName = (m: ServiceRow['ministries']): string => {
    if (!m) return ''
    return Array.isArray(m) ? (m[0]?.name ?? '') : (m?.name ?? '')
  }

  const totalByService = (slotCounts ?? []).reduce(
    (acc: Record<string, number>, row: { service_id: string; max_volunteers: number }) => {
      acc[row.service_id] = (acc[row.service_id] ?? 0) + row.max_volunteers
      return acc
    },
    {} as Record<string, number>
  )

  const upcoming: UpcomingService[] = ((services ?? []) as ServiceRow[]).map((s) => {
    const slots = s.time_slots ?? []
    const filledSlots = slots.reduce(
      (acc, slot) => acc + (slot.registrations?.length ?? 0),
      0
    )
    const totalSlots = totalByService[s.id] ?? 0

    return {
      id: s.id,
      date: s.date,
      ministry_name: getMinistryName(s.ministries),
      total_slots: totalSlots,
      filled_slots: filledSlots,
    }
  })

  return { success: true, data: upcoming }
}

export async function getPendingCountAction(): Promise<number> {
  const ctx = await getAuthenticatedUser()
  if (!ctx?.parishId || !['ADMIN_PARISH', 'SUPER_ADMIN', 'COORDINATOR'].includes(ctx.role)) {
    return 0
  }
  const supabase = await createClient()
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')
    .eq('parish_id', ctx.parishId)
  return count ?? 0
}

export async function getCurrentUserAction(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*, parishes(id, name, city, state)')
    .eq('id', user.id)
    .single()

  return userData as CurrentUser | null
}
