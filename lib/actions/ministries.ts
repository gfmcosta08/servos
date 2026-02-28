'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, canManageMinistryScales, getUserMinistryIds, canAccessMinistry } from '@/lib/auth'
import type { ActionResult, Ministry, MinistryRole } from '@/types/database'

// ============================================================
// REGRA ABSOLUTA: Toda operação verificada por parish_id via RLS
// ============================================================

// Listar ministérios da paróquia do usuário logado
// VOLUNTEER e COORDINATOR: filtrados por user_ministries (restrição quando length === 1)
// SUPER_ADMIN e ADMIN_PARISH: todos os ministérios da paróquia
export async function getMinistriesAction(): Promise<ActionResult<Ministry[]>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data, error } = await supabase
    .from('ministries')
    .select('*')
    .order('name')

  if (error) {
    return { success: false, error: 'Erro ao buscar ministérios.' }
  }

  let ministries = data ?? []

  if (['VOLUNTEER', 'COORDINATOR'].includes(ctx.role)) {
    const allowedIds = await getUserMinistryIds(ctx.user.id, ctx.role)
    if (allowedIds.length > 0) {
      ministries = ministries.filter((m) => allowedIds.includes(m.id))
    }
  }

  return { success: true, data: ministries }
}

// Criar ministério
export async function createMinistryAction(
  formData: FormData
): Promise<ActionResult<Ministry>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!ctx.parishId) return { success: false, error: 'Usuário sem paróquia associada.' }
  if (!['ADMIN_PARISH', 'COORDINATOR', 'SUPER_ADMIN'].includes(ctx.role)) {
    return { success: false, error: 'Sem permissão para criar ministérios.' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null

  if (!name?.trim()) {
    return { success: false, error: 'O nome do ministério é obrigatório.' }
  }

  const { data: ministry, error: ministryError } = await supabase
    .from('ministries')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      parish_id: ctx.parishId,
    })
    .select()
    .single()

  if (ministryError || !ministry) {
    return { success: false, error: 'Erro ao criar ministério.' }
  }

  await supabase.from('ministry_roles').insert({
    ministry_id: ministry.id,
    name: 'Voluntário',
    sort_order: 0,
  })

  revalidatePath('/ministerios')
  return { success: true, data: ministry }
}

// Atualizar ministério
export async function updateMinistryAction(
  id: string,
  formData: FormData
): Promise<ActionResult<Ministry>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  const canAccess = await canAccessMinistry(ctx.user.id, id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null

  if (!name?.trim()) {
    return { success: false, error: 'O nome do ministério é obrigatório.' }
  }

  // RLS garante que só atualiza ministério da própria paróquia
  const { data, error } = await supabase
    .from('ministries')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Erro ao atualizar ministério.' }
  }

  revalidatePath('/ministerios')
  return { success: true, data }
}

// Excluir ministério (cascade: apaga datas, horários e inscrições)
export async function deleteMinistryAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  const canAccess = await canAccessMinistry(ctx.user.id, id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { error } = await supabase
    .from('ministries')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: 'Erro ao excluir ministério.' }
  }

  revalidatePath('/ministerios')
  revalidatePath('/escalas')
  return { success: true }
}

// ============================================================
// FUNÇÕES DO MINISTÉRIO (ministry_roles)
// ============================================================

export async function getMinistryRolesAction(
  ministryId: string
): Promise<ActionResult<MinistryRole[]>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  const canAccess = await canAccessMinistry(ctx.user.id, ministryId)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { data, error } = await supabase
    .from('ministry_roles')
    .select('*')
    .eq('ministry_id', ministryId)
    .order('sort_order')

  if (error) {
    return { success: false, error: 'Erro ao buscar funções.' }
  }

  return { success: true, data: data ?? [] }
}

export async function createMinistryRoleAction(
  ministryId: string,
  name: string
): Promise<ActionResult<MinistryRole>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  const canAccess = await canAccessMinistry(ctx.user.id, ministryId)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }
  const canManage = await canManageMinistryScales(ministryId)
  if (!canManage) return { success: false, error: 'Sem permissão para adicionar funções neste ministério.' }

  if (!name?.trim()) {
    return { success: false, error: 'O nome da função é obrigatório.' }
  }

  const { data: roles } = await supabase
    .from('ministry_roles')
    .select('sort_order')
    .eq('ministry_id', ministryId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortOrder = (roles?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('ministry_roles')
    .insert({
      ministry_id: ministryId,
      name: name.trim(),
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Erro ao criar função.' }
  }

  revalidatePath('/ministerios')
  revalidatePath('/escalas')
  return { success: true, data }
}

export async function deleteMinistryRoleAction(
  roleId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: role } = await supabase
    .from('ministry_roles')
    .select('ministry_id')
    .eq('id', roleId)
    .single()
  if (!role) return { success: false, error: 'Função não encontrada.' }
  const canAccess = await canAccessMinistry(ctx.user.id, role.ministry_id)
  if (!canAccess) return { success: false, error: 'Acesso negado a este ministério.' }

  const { error } = await supabase
    .from('ministry_roles')
    .delete()
    .eq('id', roleId)

  if (error) {
    return { success: false, error: 'Erro ao excluir função.' }
  }

  revalidatePath('/ministerios')
  revalidatePath('/escalas')
  return { success: true }
}
