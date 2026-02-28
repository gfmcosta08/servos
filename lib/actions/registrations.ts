'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, canAccessMinistry } from '@/lib/auth'
import type { ActionResult } from '@/types/database'

// ============================================================
// INSCRIÇÕES (Registrations) – por função
// ============================================================

export async function registerVolunteerAction(
  timeSlotRoleId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!ctx.parishId) return { success: false, error: 'Usuário sem paróquia associada.' }

  const { data: tsr } = await supabase
    .from('time_slot_roles')
    .select('*, time_slots!inner(parish_id, service_id)')
    .eq('id', timeSlotRoleId)
    .single()

  if (!tsr || (tsr.time_slots as { parish_id: string })?.parish_id !== ctx.parishId) {
    return { success: false, error: 'Vaga não encontrada.' }
  }

  const serviceId = (tsr.time_slots as { service_id?: string })?.service_id
  if (!serviceId) return { success: false, error: 'Vaga inválida.' }
  const { data: service } = await supabase
    .from('services')
    .select('ministry_id')
    .eq('id', serviceId)
    .single()
  if (!service) return { success: false, error: 'Vaga não encontrada.' }
  const canAccess = await canAccessMinistry(ctx.user.id, service.ministry_id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { count } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('time_slot_role_id', timeSlotRoleId)

  if ((count ?? 0) >= tsr.quantity) {
    return { success: false, error: 'Não há vagas disponíveis para esta função.' }
  }

  const timeSlotId = tsr.time_slot_id

  const { error } = await supabase
    .from('registrations')
    .insert({
      user_id: ctx.user.id,
      time_slot_id: timeSlotId,
      time_slot_role_id: timeSlotRoleId,
      parish_id: ctx.parishId,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Você já está inscrito nesta função.' }
    }
    return { success: false, error: 'Erro ao realizar inscrição.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}

export async function unregisterVolunteerAction(
  timeSlotRoleId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: tsr } = await supabase
    .from('time_slot_roles')
    .select('time_slot_id')
    .eq('id', timeSlotRoleId)
    .single()
  if (tsr) {
    const { data: slot } = await supabase
      .from('time_slots')
      .select('service_id')
      .eq('id', tsr.time_slot_id)
      .single()
    if (slot) {
      const { data: svc } = await supabase
        .from('services')
        .select('ministry_id')
        .eq('id', slot.service_id)
        .single()
      if (svc) {
        const canAccess = await canAccessMinistry(ctx.user.id, svc.ministry_id)
        if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
      }
    }
  }

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('user_id', ctx.user.id)
    .eq('time_slot_role_id', timeSlotRoleId)

  if (error) {
    return { success: false, error: 'Erro ao cancelar inscrição.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}
