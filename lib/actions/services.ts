'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Service, ServiceWithTimeSlots } from '@/types/database'

// ============================================================
// SERVIÇOS (Datas de Serviço)
// ============================================================

// Listar datas de um ministério
export async function getServicesByMinistryAction(
  ministryId: string
): Promise<ActionResult<Service[]>> {
  const supabase = await createClient()

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

// Buscar serviço com horários e inscrições
export async function getServiceWithTimeSlotsAction(
  serviceId: string
): Promise<ActionResult<ServiceWithTimeSlots>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Buscar o serviço
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*, ministries(id, name)')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) {
    return { success: false, error: 'Data não encontrada.' }
  }

  // Buscar horários com contagem
  const { data: timeSlots, error: slotsError } = await supabase
    .from('time_slots_with_counts')
    .select('*')
    .eq('service_id', serviceId)
    .order('start_time')

  if (slotsError) {
    return { success: false, error: 'Erro ao buscar horários.' }
  }

  // Buscar inscrições de cada horário
  const slotIds = (timeSlots ?? []).map(s => s.id)

  let registrations: any[] = []
  if (slotIds.length > 0) {
    const { data: regs } = await supabase
      .from('registrations')
      .select('*, user:users(id, name, email)')
      .in('time_slot_id', slotIds)

    registrations = regs ?? []
  }

  // Montar estrutura
  const timeSlotsWithData = (timeSlots ?? []).map(slot => ({
    ...slot,
    registrations: registrations.filter(r => r.time_slot_id === slot.id),
    is_registered: user
      ? registrations.some(r => r.time_slot_id === slot.id && r.user_id === user.id)
      : false,
  }))

  return {
    success: true,
    data: {
      ...service,
      ministry: service.ministries,
      time_slots: timeSlotsWithData,
    } as ServiceWithTimeSlots,
  }
}

// Criar data de serviço
export async function createServiceAction(
  formData: FormData
): Promise<ActionResult<Service>> {
  const supabase = await createClient()

  const ministryId = formData.get('ministry_id') as string
  const date = formData.get('date') as string
  const description = formData.get('description') as string | null

  if (!ministryId || !date) {
    return { success: false, error: 'Ministério e data são obrigatórios.' }
  }

  // Obter parish_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: userData } = await supabase
    .from('users')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!userData?.parish_id) {
    return { success: false, error: 'Usuário sem paróquia associada.' }
  }

  // Verificar que o ministério pertence à paróquia do usuário
  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministryId)
    .eq('parish_id', userData.parish_id)
    .single()

  if (!ministry) {
    return { success: false, error: 'Ministério não encontrado.' }
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
      ministry_id: ministryId,
      parish_id: userData.parish_id,
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

// Excluir serviço (cascade: apaga horários e inscrições)
export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('services').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Erro ao excluir data.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}

// ============================================================
// HORÁRIOS (Time Slots)
// ============================================================

// Criar horário
export async function createTimeSlotAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const serviceId = formData.get('service_id') as string
  const startTime = formData.get('start_time') as string
  const endTime = formData.get('end_time') as string
  const maxVolunteers = parseInt(formData.get('max_volunteers') as string) || 5

  if (!serviceId || !startTime || !endTime) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  if (startTime >= endTime) {
    return { success: false, error: 'O horário de início deve ser anterior ao de fim.' }
  }

  if (maxVolunteers < 1) {
    return { success: false, error: 'O número de vagas deve ser pelo menos 1.' }
  }

  // Obter parish_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: userData } = await supabase
    .from('users')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!userData?.parish_id) {
    return { success: false, error: 'Usuário sem paróquia associada.' }
  }

  const { error } = await supabase
    .from('time_slots')
    .insert({
      service_id: serviceId,
      parish_id: userData.parish_id,
      start_time: startTime,
      end_time: endTime,
      max_volunteers: maxVolunteers,
    })

  if (error) {
    return { success: false, error: 'Erro ao criar horário.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}

// Excluir horário
export async function deleteTimeSlotAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('time_slots').delete().eq('id', id)

  if (error) {
    return { success: false, error: 'Erro ao excluir horário.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}

// ============================================================
// INSCRIÇÕES (Registrations) – Toggle
// ============================================================

// Inscrever voluntário em um horário
export async function registerVolunteerAction(
  timeSlotId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: userData } = await supabase
    .from('users')
    .select('parish_id')
    .eq('id', user.id)
    .single()

  if (!userData?.parish_id) {
    return { success: false, error: 'Usuário sem paróquia associada.' }
  }

  // Verificar se horário ainda tem vagas
  const { data: slot } = await supabase
    .from('time_slots_with_counts')
    .select('*')
    .eq('id', timeSlotId)
    .single()

  if (!slot) {
    return { success: false, error: 'Horário não encontrado.' }
  }

  if (slot.available_spots <= 0) {
    return { success: false, error: 'Não há vagas disponíveis neste horário.' }
  }

  const { error } = await supabase
    .from('registrations')
    .insert({
      user_id: user.id,
      time_slot_id: timeSlotId,
      parish_id: userData.parish_id,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Você já está inscrito neste horário.' }
    }
    return { success: false, error: 'Erro ao realizar inscrição.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}

// Cancelar inscrição
export async function unregisterVolunteerAction(
  timeSlotId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('user_id', user.id)
    .eq('time_slot_id', timeSlotId)

  if (error) {
    return { success: false, error: 'Erro ao cancelar inscrição.' }
  }

  revalidatePath('/escalas')
  return { success: true }
}
