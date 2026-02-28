import { createClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/database'

// ============================================================
// Helper: obtém usuário autenticado com parish_id e role
// Retorna null se não autenticado
// ============================================================

export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('parish_id, role')
    .eq('id', user.id)
    .single()

  if (error || !userData) return null

  return {
    user: { id: user.id },
    parishId: userData.parish_id,
    role: userData.role as AuthContext['role'],
  }
}

// ============================================================
// Helper: verifica se usuário pode gerenciar escalas do ministério
// (SUPER_ADMIN ou coordenador desse ministério)
// ============================================================

export async function canManageMinistryScales(
  ministryId: string
): Promise<boolean> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return false
  if (ctx.role === 'SUPER_ADMIN') return true

  const supabase = await createClient()
  const { data } = await supabase
    .from('ministry_coordinators')
    .select('id')
    .eq('user_id', ctx.user.id)
    .eq('ministry_id', ministryId)
    .maybeSingle()

  return !!data
}

/** Retorna os ministérios que o usuário pode gerenciar (coordenador ou SUPER_ADMIN) */
export async function getMinistriesUserCanManage(): Promise<{ id: string; name: string }[]> {
  const ctx = await getAuthenticatedUser()
  if (!ctx) return []
  if (ctx.role === 'SUPER_ADMIN' && ctx.parishId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ministries')
      .select('id, name')
      .eq('parish_id', ctx.parishId)
      .order('name')
    return data ?? []
  }
  if (ctx.role === 'COORDINATOR') {
    const supabase = await createClient()
    const { data: coords } = await supabase
      .from('ministry_coordinators')
      .select('ministry_id')
      .eq('user_id', ctx.user.id)
    if (!coords?.length) return []
    const ids = coords.map((c) => c.ministry_id)
    const { data: ministries } = await supabase
      .from('ministries')
      .select('id, name')
      .in('id', ids)
      .order('name')
    return ministries ?? []
  }
  return []
}

// ============================================================
// Helpers: user_ministries (lista de ministérios permitidos)
// ============================================================

/** Retorna os IDs dos ministérios aos quais o usuário tem acesso */
export async function getUserMinistryIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_ministries')
    .select('ministry_id')
    .eq('user_id', userId)
  return (data ?? []).map((r) => r.ministry_id)
}

/** Verifica se o usuário tem acesso ao ministério (SUPER_ADMIN, ADMIN_PARISH ou user_ministries) */
export async function canAccessMinistry(userId: string, ministryId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('role, parish_id')
    .eq('id', userId)
    .single()
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'ADMIN_PARISH' && user.parish_id) {
    const { data: ministry } = await supabase
      .from('ministries')
      .select('parish_id')
      .eq('id', ministryId)
      .single()
    return ministry?.parish_id === user.parish_id
  }
  const { data: um } = await supabase
    .from('user_ministries')
    .select('ministry_id')
    .eq('user_id', userId)
    .eq('ministry_id', ministryId)
    .maybeSingle()
  return !!um
}
