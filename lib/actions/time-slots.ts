'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, canManageMinistryScales, canAccessMinistry } from '@/lib/auth'
import type { ActionResult } from '@/types/database'

// ============================================================
// HORÁRIOS (Time Slots) com funções
// ============================================================

export async function createTimeSlotAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!ctx.parishId) return { success: false, error: 'Usuário sem paróquia associada.' }

  const serviceId = formData.get('service_id') as string
  const startTime = formData.get('start_time') as string
  const endTime = formData.get('end_time') as string
  const rolesJson = formData.get('roles') as string

  if (!serviceId || !startTime || !endTime) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  if (startTime >= endTime) {
    return { success: false, error: 'O horário de início deve ser anterior ao de fim.' }
  }

  let roles: { ministry_role_id: string; quantity: number }[] = []
  try {
    roles = JSON.parse(rolesJson || '[]')
  } catch {
    return { success: false, error: 'Dados de funções inválidos.' }
  }

  if (roles.length === 0 || roles.every(r => r.quantity < 1)) {
    return { success: false, error: 'Adicione pelo menos uma função com quantidade maior que zero.' }
  }

  const { data: service } = await supabase
    .from('services')
    .select('parish_id, ministry_id')
    .eq('id', serviceId)
    .single()

  if (!service || service.parish_id !== ctx.parishId) {
    return { success: false, error: 'Serviço não encontrado.' }
  }

  const canAccess = await canAccessMinistry(ctx.user.id, service.ministry_id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
  const canManage = await canManageMinistryScales(service.ministry_id)
  if (!canManage) {
    return { success: false, error: 'Sem permissão para criar horários neste ministério.' }
  }

  const { data: timeSlot, error: slotError } = await supabase
    .from('time_slots')
    .insert({
      service_id: serviceId,
      parish_id: ctx.parishId,
      start_time: startTime,
      end_time: endTime,
    })
    .select()
    .single()

  if (slotError || !timeSlot) {
    return { success: false, error: 'Erro ao criar horário.' }
  }

  // Garantir isolamento: cada ministry_role deve pertencer ao ministério do service
  for (const role of roles) {
    if (role.quantity < 1) continue
    const { data: mr } = await supabase
      .from('ministry_roles')
      .select('ministry_id')
      .eq('id', role.ministry_role_id)
      .single()
    if (!mr || mr.ministry_id !== service.ministry_id) {
      await supabase.from('time_slots').delete().eq('id', timeSlot.id)
      return { success: false, error: 'Função não pertence a este ministério. Use apenas funções do ministério da escala.' }
    }
    const { error: tsrError } = await supabase
      .from('time_slot_roles')
      .insert({
        time_slot_id: timeSlot.id,
        ministry_role_id: role.ministry_role_id,
        quantity: role.quantity,
      })

    if (tsrError) {
      await supabase.from('time_slots').delete().eq('id', timeSlot.id)
      return { success: false, error: 'Erro ao criar vagas. Verifique se as funções pertencem ao ministério.' }
    }
  }

  revalidatePath('/escalas')
  return { success: true }
}

export async function deleteTimeSlotAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: slot } = await supabase
    .from('time_slots')
    .select('service_id')
    .eq('id', id)
    .single()

  if (!slot) return { success: false, error: 'Horário não encontrado.' }

  const { data: service } = await supabase
    .from('services')
    .select('ministry_id')
    .eq('id', slot.service_id)
    .single()

  if (!service) return { success: false, error: 'Serviço não encontrado.' }

  const canAccess = await canAccessMinistry(ctx.user.id, service.ministry_id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
  const canManage = await canManageMinistryScales(service.ministry_id)
  if (!canManage) {
    return { success: false, error: 'Sem permissão para excluir horários deste ministério.' }
  }

  const { error } = await supabase.from('time_slots').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Erro ao excluir horário.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}
