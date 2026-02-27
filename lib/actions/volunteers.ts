'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, User } from '@/types/database'

// ============================================================
// VOLUNTÁRIOS
// ============================================================

export async function getVolunteersAction(): Promise<ActionResult<User[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    return { success: false, error: 'Erro ao buscar voluntários.' }
  }

  return { success: true, data: data ?? [] }
}

export async function updateUserRoleAction(
  userId: string,
  role: 'ADMIN_PARISH' | 'COORDINATOR' | 'VOLUNTEER'
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Verificar se é admin
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentUser || !['ADMIN_PARISH', 'SUPER_ADMIN'].includes(currentUser.role)) {
    return { success: false, error: 'Sem permissão para alterar cargos.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Erro ao atualizar cargo.' }
  }

  return { success: true }
}
