'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
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
