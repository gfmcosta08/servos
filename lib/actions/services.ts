'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, canManageMinistryScales, canAccessMinistry } from '@/lib/auth'
import type {
  ActionResult,
  MinistryRole,
  Service,
  ServiceWithTimeSlots,
  TimeSlotRoleWithDetails,
  TimeSlotWithRegistrations,
} from '@/types/database'
import type { Registration, User } from '@/types/database'

// ============================================================
// SERVIÇOS (Datas de Serviço)
// ============================================================

export async function canManageMinistryScalesAction(
  ministryId: string
): Promise<boolean> {
  return canManageMinistryScales(ministryId)
}

export async function getServicesByMinistryAction(
  ministryId: string
): Promise<ActionResult<Service[]>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  const canAccess = await canAccessMinistry(ctx.user.id, ministryId)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('ministry_id', ministryId)
    .order('date', { ascending: true })

  if (error) {
    return { success: false, error: 'Erro ao buscar datas.' }
  }

  return { success: true, data: data ?? [] }
}

type RegistrationWithUser = Registration & {
  user: Pick<User, 'id' | 'name' | 'email'>
  ministry_roles?: Pick<MinistryRole, 'name'> | null
}

export async function getServiceWithTimeSlotsAction(
  serviceId: string
): Promise<ActionResult<ServiceWithTimeSlots>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*, ministries(id, name)')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return { success: false, error: 'Data não encontrada.' }
  }

  const ministryId = service.ministry_id
  const canAccess = await canAccessMinistry(ctx.user.id, ministryId)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { data: timeSlots, error: slotsError } = await supabase
    .from('time_slots_with_counts')
    .select('*')
    .eq('service_id', serviceId)
    .order('start_time')

  if (slotsError) {
    return { success: false, error: 'Erro ao buscar horários.' }
  }

  const slotIds = (timeSlots ?? []).map(s => s.id)

  const { data: timeSlotRoles } = await supabase
    .from('time_slot_roles')
    .select('*, ministry_roles(id, name)')
    .in('time_slot_id', slotIds)

  const { data: registrations } = slotIds.length > 0
    ? await supabase
        .from('registrations')
        .select('*, user:users(id, name, email)')
        .in('time_slot_id', slotIds)
    : { data: [] }

  const regs = (registrations ?? []) as RegistrationWithUser[]

  const timeSlotsWithData: TimeSlotWithRegistrations[] = (timeSlots ?? []).map(slot => {
    const slotRoles = (timeSlotRoles ?? []).filter(tsr => tsr.time_slot_id === slot.id)
    const slotRegs = regs.filter(r => r.time_slot_id === slot.id)

    const timeSlotRolesWithDetails: TimeSlotRoleWithDetails[] = slotRoles.map(tsr => {
      const filled = slotRegs.filter(r => r.time_slot_role_id === tsr.id).length
      return {
        ...tsr,
        ministry_role: tsr.ministry_roles as Pick<MinistryRole, 'id' | 'name'>,
        filled,
        available: tsr.quantity - filled,
      }
    })

    const regsWithRole = slotRegs.map(r => {
      const tsr = slotRoles.find(t => t.id === r.time_slot_role_id)
      const roleName = tsr?.ministry_roles
        ? (Array.isArray(tsr.ministry_roles)
          ? (tsr.ministry_roles[0] as { name: string })?.name
          : (tsr.ministry_roles as { name: string })?.name)
        : undefined
      return {
        ...r,
        ministry_role: roleName ? { name: roleName } : undefined,
      }
    })

    const userRegRoleIds = ctx
      ? slotRegs.filter(r => r.user_id === ctx.user.id).map(r => r.time_slot_role_id)
      : []

    return {
      ...slot,
      time_slot_roles: timeSlotRolesWithDetails,
      registrations: regsWithRole,
      is_registered: ctx ? slotRegs.some(r => r.user_id === ctx.user.id) : false,
      user_registered_role_ids: userRegRoleIds,
    }
  })

  return {
    success: true,
    data: {
      ...service,
      ministry: service.ministries,
      time_slots: timeSlotsWithData,
    } as ServiceWithTimeSlots,
  }
}

export async function createServiceAction(
  formData: FormData
): Promise<ActionResult<Service>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!ctx.parishId) return { success: false, error: 'Usuário sem paróquia associada.' }

  const ministryId = formData.get('ministry_id') as string
  const canAccess = await canAccessMinistry(ctx.user.id, ministryId)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
  const canManage = await canManageMinistryScales(ministryId)
  if (!canManage) {
    return { success: false, error: 'Sem permissão para criar escalas neste ministério.' }
  }
  const date = formData.get('date') as string
  const description = formData.get('description') as string | null

  if (!ministryId || !date) {
    return { success: false, error: 'Ministério e data são obrigatórios.' }
  }

  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministryId)
    .eq('parish_id', ctx.parishId)
    .single()

  if (!ministry) {
    return { success: false, error: 'Ministério não encontrado.' }
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      ministry_id: ministryId,
      parish_id: ctx.parishId,
      date,
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Erro ao criar data.' }
  }

  revalidatePath('/escalas')
  return { success: true, data }
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: service } = await supabase
    .from('services')
    .select('ministry_id')
    .eq('id', id)
    .single()

  if (!service) return { success: false, error: 'Data não encontrada.' }

  const canAccess = await canAccessMinistry(ctx.user.id, service.ministry_id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
  const canManage = await canManageMinistryScales(service.ministry_id)
  if (!canManage) {
    return { success: false, error: 'Sem permissão para excluir escalas deste ministério.' }
  }

  const { error } = await supabase.from('services').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Erro ao excluir data.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}
