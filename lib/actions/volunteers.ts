'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { canManageMinistryScales, getMinistriesUserCanManage } from '@/lib/auth'
import type { ActionResult, User } from '@/types/database'

export type UserWithCoordinators = User & {
  ministry_preference?: { id: string; name: string } | null
  coordinator_of: { id: string; name: string }[]
  ministries: { id: string; name: string; status?: string }[]
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

  const { data: userMinistries } = userList.length > 0
    ? await supabase
        .from('user_ministries')
        .select('user_id, ministry_id, status')
        .in('user_id', userList.map((u) => u.id))
    : { data: [] }

  const umMinistryIds = [...new Set((userMinistries ?? []).map((um) => um.ministry_id))]
  const { data: umMinistries } = umMinistryIds.length > 0
    ? await supabase.from('ministries').select('id, name').in('id', umMinistryIds)
    : { data: [] }
  const umMinistryMap = new Map((umMinistries ?? []).map((m) => [m.id, m]))

  const ministriesByUser = (userMinistries ?? []).reduce<
    Record<string, { id: string; name: string; status?: string }[]>
  >((acc, um) => {
    const m = umMinistryMap.get(um.ministry_id)
    if (!acc[um.user_id]) acc[um.user_id] = []
    if (m) acc[um.user_id].push({ id: m.id, name: m.name, status: (um as { status?: string }).status })
    return acc
  }, {})

  const result: UserWithCoordinators[] = userList.map((u) => {
    const prefId = (u as User & { ministry_preference_id?: string }).ministry_preference_id
    const pref = prefId ? ministryMap.get(prefId) : null
    return {
      ...u,
      ministry_preference: pref ?? null,
      coordinator_of: coordByUser[u.id] ?? [],
      ministries: ministriesByUser[u.id] ?? [],
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

  // SUPER_ADMIN vê todos os pendentes; outros precisam de parish_id
  if (!ctx.parishId && ctx.role !== 'SUPER_ADMIN') return { success: true, data: [] }

  let query = supabase
    .from('users')
    .select('*')
    .eq('status', 'PENDING')
    .order('name')

  if (ctx.role !== 'SUPER_ADMIN' && ctx.parishId) {
    query = query.eq('parish_id', ctx.parishId)
  }

  const { data: users, error } = await query

  if (error) return { success: false, error: 'Erro ao buscar pendentes.' }

  const userList = users ?? []
  if (userList.length === 0) return { success: true, data: [] }

  const prefIds = userList
    .map((u) => (u as User & { ministry_preference_id?: string }).ministry_preference_id)
    .filter(Boolean) as string[]

  const { data: userMinistries } = userList.length > 0
    ? await supabase
        .from('user_ministries')
        .select('user_id, ministry_id')
        .in('user_id', userList.map((u) => u.id))
    : { data: [] }

  const userMinistryIds = (userMinistries ?? []).reduce<Record<string, string[]>>(
    (acc, um) => {
      if (!acc[um.user_id]) acc[um.user_id] = []
      acc[um.user_id].push(um.ministry_id)
      return acc
    },
    {}
  )

  const allMinistryIds = [...new Set((userMinistries ?? []).map((um) => um.ministry_id))]
  const { data: ministries } = allMinistryIds.length > 0
    ? await supabase.from('ministries').select('id, name').in('id', allMinistryIds)
    : { data: [] }
  const ministryMap = new Map((ministries ?? []).map((m) => [m.id, m]))

  const result: UserWithCoordinators[] = userList.map((u) => {
    const prefId = (u as User & { ministry_preference_id?: string }).ministry_preference_id
    const pref = prefId ? ministryMap.get(prefId) : null
    const ministryIds = userMinistryIds[u.id] ?? []
    const ministryPref = ministryIds.length > 0
      ? ministryMap.get(ministryIds[0]) ?? pref
      : pref
    return {
      ...u,
      ministry_preference: ministryPref ?? null,
      coordinator_of: [],
    }
  })

  const filtered = isAdmin
    ? result
    : result.filter((u) => {
        const ids = userMinistryIds[u.id] ?? []
        const prefId = (u as User & { ministry_preference_id?: string }).ministry_preference_id
        const checkIds = ids.length > 0 ? ids : (prefId ? [prefId] : [])
        return ctx.role === 'COORDINATOR' && checkIds.some((id) => coordMinistries.some((m) => m.id === id))
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
    // Vínculo exclusivo: user_ministries apenas com este ministério
    await supabase.from('user_ministries').delete().eq('user_id', userId)
    await supabase.from('user_ministries').insert({ user_id: userId, ministry_id: ministryId })
  }
  // Voluntário: user_ministries já foi populado pelo trigger no registro (ministry_ids)

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

  await supabase.from('user_ministries').insert({ user_id: userId, ministry_id: ministryId })
  // Ignora erro 23505 (duplicata) se já existir

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

// ============================================================
// CANDIDATURAS A MINISTÉRIOS (PENDING -> APPROVED)
// ============================================================

export type PendingMinistryRequest = {
  user_id: string
  user_name: string
  user_email: string
  ministry_id: string
  ministry_name: string
}

export async function getPendingMinistryRequestsAction(): Promise<
  ActionResult<PendingMinistryRequest[]>
> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  if (!isAdmin && coordMinistries.length === 0) {
    return { success: true, data: [] }
  }

  const coordMinistryIds = coordMinistries.map((m) => m.id)

  let pending: { user_id: string; ministry_id: string }[] = []
  if (ctx.role === 'SUPER_ADMIN') {
    const { data } = await supabase
      .from('user_ministries')
      .select('user_id, ministry_id')
      .eq('status', 'PENDING')
    pending = data ?? []
  } else if (isAdmin && ctx.parishId) {
    const { data: ministries } = await supabase
      .from('ministries')
      .select('id')
      .eq('parish_id', ctx.parishId)
    const parishMinistryIds = (ministries ?? []).map((m) => m.id)
    if (parishMinistryIds.length > 0) {
      const { data } = await supabase
        .from('user_ministries')
        .select('user_id, ministry_id')
        .eq('status', 'PENDING')
        .in('ministry_id', parishMinistryIds)
      pending = data ?? []
    }
  } else {
    const { data } = await supabase
      .from('user_ministries')
      .select('user_id, ministry_id')
      .eq('status', 'PENDING')
      .in('ministry_id', coordMinistryIds)
    pending = data ?? []
  }

  if (!pending.length) return { success: true, data: [] }

  const userIds = [...new Set(pending.map((p) => p.user_id))]
  const ministryIds = [...new Set(pending.map((p) => p.ministry_id))]

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds)
  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name')
    .in('id', ministryIds)

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))
  const ministryMap = new Map((ministries ?? []).map((m) => [m.id, m]))

  const result: PendingMinistryRequest[] = pending.map((p) => {
    const u = userMap.get(p.user_id)
    const m = ministryMap.get(p.ministry_id)
    return {
      user_id: p.user_id,
      user_name: u?.name ?? '',
      user_email: u?.email ?? '',
      ministry_id: p.ministry_id,
      ministry_name: m?.name ?? '',
    }
  })

  return { success: true, data: result }
}

export async function approveMinistryRequestAction(
  userId: string,
  ministryId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  const canApprove =
    isAdmin || coordMinistries.some((m) => m.id === ministryId)
  if (!canApprove) {
    return { success: false, error: 'Sem permissão para aprovar esta candidatura.' }
  }

  // Usar admin client para bypass de RLS (evita bloqueio em user_ministries_update)
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('user_ministries')
    .update({ status: 'APPROVED' })
    .eq('user_id', userId)
    .eq('ministry_id', ministryId)
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: 'Candidatura não encontrada ou já processada.' }
  }

  revalidatePath('/voluntarios')
  revalidatePath('/ministerios')
  return { success: true }
}

// ============================================================
// REMOVER ACESSO / EXCLUIR USUÁRIO
// ============================================================

export async function removeUserFromMinistryAction(
  userId: string,
  ministryId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const isAdmin = ['ADMIN_PARISH', 'SUPER_ADMIN'].includes(ctx.role)
  const coordMinistries = ctx.role === 'COORDINATOR' ? await getMinistriesUserCanManage() : []

  const canRemove =
    isAdmin || coordMinistries.some((m) => m.id === ministryId)
  if (!canRemove) {
    return { success: false, error: 'Sem permissão para remover acesso deste ministério.' }
  }

  const { error } = await supabase
    .from('user_ministries')
    .delete()
    .eq('user_id', userId)
    .eq('ministry_id', ministryId)

  if (error) return { success: false, error: 'Erro ao remover acesso.' }

  revalidatePath('/voluntarios')
  return { success: true }
}

export async function excludeUserAction(userId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (ctx.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Apenas Super Admin pode excluir usuários.' }
  }

  const adminClient = createAdminClient()

  // Marcar como excluído (fallback se deleteUser falhar)
  await adminClient.from('users').update({ status: 'REJECTED', parish_id: null }).eq('id', userId)
  await adminClient.from('user_ministries').delete().eq('user_id', userId)
  await adminClient.from('ministry_coordinators').delete().eq('user_id', userId)

  // Deletar de auth.users para permitir recadastro com o mesmo email
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('[excludeUserAction] auth.admin.deleteUser:', authError.message)
    return {
      success: false,
      error: 'Usuário marcado como excluído, mas não foi possível liberar o email para novo cadastro. Verifique SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  revalidatePath('/voluntarios')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// CONFIRMAÇÃO MANUAL DE EMAIL (quando o email do Supabase não chega)
// ============================================================

export async function confirmUserEmailManuallyAction(userId: string): Promise<ActionResult> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (ctx.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Apenas Super Admin pode confirmar email manualmente.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })

  if (error) {
    console.error('[confirmUserEmailManuallyAction]', error.message)
    return {
      success: false,
      error: 'Erro ao confirmar email. Verifique se o usuário existe.',
    }
  }

  revalidatePath('/voluntarios')
  return { success: true }
}

/**
 * Confirma email por endereço (quando o usuário não aparece na lista de pendentes).
 * Útil para usuários excluídos que se recadastraram e o email de confirmação não chegou.
 */
export async function confirmUserEmailByEmailAction(email: string): Promise<ActionResult> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (ctx.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Apenas Super Admin pode confirmar email por endereço.' }
  }

  const trimmed = email?.trim().toLowerCase()
  if (!trimmed) return { success: false, error: 'Informe o email.' }

  const adminClient = createAdminClient()
  let user: { id: string; email?: string } | null = null
  let page = 1
  const perPage = 500

  // Paginar para encontrar o usuário (listUsers pode retornar menos que perPage)
  while (true) {
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (listError) {
      console.error('[confirmUserEmailByEmailAction] listUsers:', listError.message)
      return { success: false, error: 'Erro ao buscar usuários.' }
    }

    const found = (users ?? []).find((u) => u.email?.toLowerCase() === trimmed)
    if (found) {
      user = found
      break
    }
    if (!users || users.length < perPage) break
    page++
  }

  if (!user) {
    return {
      success: false,
      error: 'Usuário não encontrado. Peça à pessoa para se cadastrar primeiro em /register.',
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (updateError) {
    console.error('[confirmUserEmailByEmailAction] updateUserById:', updateError.message)
    return { success: false, error: 'Erro ao confirmar email.' }
  }

  revalidatePath('/voluntarios')
  return { success: true }
}

/**
 * Aprova usuário por email (quando não aparece na lista de pendentes).
 * Resolve o erro "Conta não aprovada" para usuários que já confirmaram o email.
 */
export async function approveUserByEmailAction(email: string): Promise<ActionResult> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (ctx.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Apenas Super Admin pode aprovar por email.' }
  }

  const trimmed = email?.trim().toLowerCase()
  if (!trimmed) return { success: false, error: 'Informe o email.' }

  const adminClient = createAdminClient()
  const { data: user, error: findError } = await adminClient
    .from('users')
    .select('id, status')
    .ilike('email', trimmed)
    .maybeSingle()

  if (findError || !user) {
    return {
      success: false,
      error: 'Usuário não encontrado. Verifique se o email está correto.',
    }
  }

  if ((user as { status?: string }).status === 'APPROVED') {
    return { success: false, error: 'Usuário já está aprovado.' }
  }

  const { error: updateError } = await adminClient
    .from('users')
    .update({ status: 'APPROVED' })
    .eq('id', user.id)

  if (updateError) {
    console.error('[approveUserByEmailAction]', updateError.message)
    return { success: false, error: 'Erro ao aprovar.' }
  }

  revalidatePath('/voluntarios')
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Corrige vínculo de usuário sem paróquia/ministério (parish_id null).
 * Útil quando o trigger falhou no registro.
 */
export async function fixUserParishByEmailAction(
  email: string,
  parishId: string,
  ministryId: string
): Promise<ActionResult> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (ctx.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Apenas Super Admin pode corrigir vínculos.' }
  }

  const trimmed = email?.trim().toLowerCase()
  if (!trimmed || !parishId || !ministryId) {
    return { success: false, error: 'Informe email, paróquia e ministério.' }
  }

  const adminClient = createAdminClient()

  const { data: user, error: findError } = await adminClient
    .from('users')
    .select('id')
    .ilike('email', trimmed)
    .maybeSingle()

  if (findError || !user) {
    return { success: false, error: 'Usuário não encontrado.' }
  }

  const { error: updateError } = await adminClient
    .from('users')
    .update({ parish_id: parishId, ministry_preference_id: ministryId })
    .eq('id', user.id)

  if (updateError) {
    console.error('[fixUserParishByEmailAction]', updateError.message)
    return { success: false, error: 'Erro ao atualizar usuário.' }
  }

  await adminClient.from('user_ministries').delete().eq('user_id', user.id)
  await adminClient.from('user_ministries').insert({
    user_id: user.id,
    ministry_id: ministryId,
  })

  revalidatePath('/voluntarios')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getMinistriesUserCanManageAction(): Promise<
  ActionResult<{ id: string; name: string }[]>
> {
  const data = await getMinistriesUserCanManage()
  return { success: true, data }
}
