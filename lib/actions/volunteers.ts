'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { canManageMinistryScales, getMinistriesUserCanManage } from '@/lib/auth'
import type { ActionResult, User } from '@/types/database'

export type UserWithCoordinators = User & {
  ministry_preference?: { id: string; name: string } | null
  coordinator_of: { id: string; name: string }[]
}

// ============================================================
// VOLUNTÁRIOS
// ============================================================

export async function getVolunteersAction(): Promise<ActionResult<UserWithCoordinators[]>> {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .or('status.eq.APPROVED,status.is.null')
    .order('name')

  if (error) {
    return { success: false, error: 'Erro ao buscar voluntários.' }
  }

  const userList = users ?? []
  const prefIds = userList
    .map((u) => (u as User & { ministry_preference_id?: string }).ministry_preference_id)
    .filter(Boolean) as string[]

  const { data: ministries } = prefIds.length > 0
    ? await supabase.from('ministries').select('id, name').in('id', prefIds)
    : { data: [] }

  const ministryMap = new Map((ministries ?? []).map((m) => [m.id, m]))

  const { data: coordinators } = userList.length > 0
    ? await supabase
        .from('ministry_coordinators')
        .select('user_id, ministry_id')
        .in('user_id', userList.map((u) => u.id))
    : { data: [] }

  const coordMinistryIds = [...new Set((coordinators ?? []).map((c) => c.ministry_id))]
  const { data: coordMinistries } = coordMinistryIds.length > 0
    ? await supabase.from('ministries').select('id, name').in('id', coordMinistryIds)
    : { data: [] }

  const coordMinistryMap = new Map((coordMinistries ?? []).map((m) => [m.id, m]))
  const coordByUser = (coordinators ?? []).reduce<Record<string, { id: string; name: string }[]>>(
    (acc, c) => {
      const m = coordMinistryMap.get(c.ministry_id)
      if (!acc[c.user_id]) acc[c.user_id] = []
      if (m) acc[c.user_id].push({ id: m.id, name: m.name })
      return acc
    },
    {}
  )

  const result: UserWithCoordinators[] = userList.map((u) => {
    const prefId = (u as User & { ministry_preference_id?: string }).ministry_preference_id
    const pref = prefId ? ministryMap.get(prefId) : null
    return {
      ...u,
      ministry_preference: pref ?? null,
      coordinator_of: coordByUser[u.id] ?? [],
    }
  })

  return { success: true, data: result }
}

export async function updateUserRoleAction(
  userId: string,
  role: 'ADMIN_PARISH' | 'COORDINATOR' | 'VOLUNTEER'
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)) {
    return { success: false, error: 'Sem permissão para alterar cargos.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Erro ao atualizar cargo.' }
  }

  revalidatePath('/voluntarios')
  return { success: true }
}

// ============================================================
// PENDENTES E APROVAÇÃO
// ============================================================

export async function getPendingUsersAction(): Promise<ActionResult<UserWithCoordinators[]>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  if (!ctx.parishId) return { success: true, data: [] }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', 'PENDING')
    .eq('parish_id', ctx.parishId)
    .order('name')

  if (error) return { success: false, error: 'Erro ao buscar pendentes.' }

  const userList = users ?? []
  if (userList.length === 0) return { success: true, data: [] }

  const prefIds = userList
    .map((u) => (u as User & { ministry_preference_id?: string }).ministry_preference_id)
    .filter(Boolean) as string[]

  const { data: ministries } = prefIds.length > 0
    ? await supabase.from('ministries').select('id, name').in('id', prefIds)
    : { data: [] }

  const ministryMap = new Map((ministries ?? []).map((m) => [m.id, m]))

  const result: UserWithCoordinators[] = userList.map((u) => {
    const prefId = (u as User & { ministry_preference_id?: string }).ministry_preference_id
    const pref = prefId ? ministryMap.get(prefId) : null
    return {
      ...u,
      ministry_preference: pref ?? null,
      coordinator_of: [],
    }
  })

  const filtered = isAdmin
    ? result
    : result.filter((u) => {
        const ministryPrefId = u.ministry_preference?.id
        return ctx.role === 'COORDINATOR' && ministryPrefId && coordMinistries.some((m) => m.id === ministryPrefId)
      })

  return { success: true, data: filtered }
}

export async function approveUserAction(
  userId: string,
  options: { asCoordinator?: boolean; ministryId?: string }
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  const { data: target } = await supabase
    .from('users')
    .select('id, status, ministry_preference_id')
    .eq('id', userId)
    .single()

  if (!target || (target as { status?: string }).status !== 'PENDING') {
    return { success: false, error: 'Usuário não encontrado ou já processado.' }
  }

  const ministryPrefId = (target as { ministry_preference_id?: string }).ministry_preference_id
  const asCoord = options.asCoordinator && options.ministryId
  const ministryId = asCoord ? options.ministryId! : ministryPrefId

  if (asCoord && ministryId) {
    const canManage = isAdmin || (ctx.role === 'COORDINATOR' && coordMinistries.some((m) => m.id === ministryId))
    if (!canManage) return { success: false, error: 'Sem permissão para aprovar como coordenador deste ministério.' }
  } else if (!isAdmin) {
    if (ctx.role !== 'COORDINATOR' || !ministryPrefId || !coordMinistries.some((m) => m.id === ministryPrefId)) {
      return { success: false, error: 'Sem permissão para aprovar este usuário.' }
    }
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({ status: 'APPROVED' })
    .eq('id', userId)

  if (updateErr) return { success: false, error: 'Erro ao aprovar.' }

  if (asCoord && ministryId) {
    await supabase.from('ministry_coordinators').insert({ user_id: userId, ministry_id: ministryId })
  }

  revalidatePath('/voluntarios')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function rejectUserAction(userId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  const { data: target } = await supabase
    .from('users')
    .select('id, status, ministry_preference_id')
    .eq('id', userId)
    .single()

  if (!target || (target as { status?: string }).status !== 'PENDING') {
    return { success: false, error: 'Usuário não encontrado ou já processado.' }
  }

  const ministryPrefId = (target as { ministry_preference_id?: string }).ministry_preference_id
  const canReject = isAdmin || (ctx.role === 'COORDINATOR' && ministryPrefId && coordMinistries.some((m) => m.id === ministryPrefId))

  if (!canReject) return { success: false, error: 'Sem permissão para rejeitar este usuário.' }

  const { error } = await supabase
    .from('users')
    .update({ status: 'REJECTED' })
    .eq('id', userId)

  if (error) return { success: false, error: 'Erro ao rejeitar.' }

  revalidatePath('/voluntarios')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// COORDENADORES POR MINISTÉRIO
// ============================================================

export async function addMinistryCoordinatorAction(
  userId: string,
  ministryId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)) {
    return { success: false, error: 'Sem permissão para delegar coordenadores.' }
  }

  const { error } = await supabase.from('ministry_coordinators').insert({
    user_id: userId,
    ministry_id: ministryId,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Usuário já é coordenador deste ministério.' }
    }
    return { success: false, error: 'Erro ao adicionar coordenador.' }
  }

  revalidatePath('/voluntarios')
  return { success: true }
}

export async function removeMinistryCoordinatorAction(
  userId: string,
  ministryId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)) {
    return { success: false, error: 'Sem permissão para remover coordenadores.' }
  }

  const { error } = await supabase
    .from('ministry_coordinators')
    .delete()
    .eq('user_id', userId)
    .eq('ministry_id', ministryId)

  if (error) {
    return { success: false, error: 'Erro ao remover coordenador.' }
  }

  revalidatePath('/voluntarios')
  return { success: true }
}
