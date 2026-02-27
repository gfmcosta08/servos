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
