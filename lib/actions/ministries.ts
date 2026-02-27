'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Ministry } from '@/types/database'

// ============================================================
// REGRA ABSOLUTA: Toda operação verificada por parish_id via RLS
// ============================================================

// Listar ministérios da paróquia do usuário logado
export async function getMinistriesAction(): Promise<ActionResult<Ministry[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ministries')
    .select('*')
    .order('name')

  if (error) {
    return { success: false, error: 'Erro ao buscar ministérios.' }
  }

  return { success: true, data: data ?? [] }
}

// Criar ministério
export async function createMinistryAction(
  formData: FormData
): Promise<ActionResult<Ministry>> {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null

  if (!name?.trim()) {
    return { success: false, error: 'O nome do ministério é obrigatório.' }
  }

  // Obter parish_id do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('parish_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.parish_id) {
    return { success: false, error: 'Usuário sem paróquia associada.' }
  }

  if (!['ADMIN_PARISH', 'COORDINATOR', 'SUPER_ADMIN'].includes(userData.role)) {
    return { success: false, error: 'Sem permissão para criar ministérios.' }
  }

  const { data, error } = await supabase
    .from('ministries')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      parish_id: userData.parish_id,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Erro ao criar ministério.' }
  }

  revalidatePath('/ministerios')
  return { success: true, data }
}

// Atualizar ministério
export async function updateMinistryAction(
  id: string,
  formData: FormData
): Promise<ActionResult<Ministry>> {
  const supabase = await createClient()

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
