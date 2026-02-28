'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, canManageMinistryScales } from '@/lib/auth'
import type { ActionResult, MinistryAnnouncement } from '@/types/database'

// ============================================================
// RECADOS DO MINISTÉRIO
// Apenas coordenador do ministério ou SUPER_ADMIN podem criar/excluir
// ============================================================

export async function createAnnouncementAction(
  ministryId: string,
  formData: FormData
): Promise<ActionResult<MinistryAnnouncement>> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const canManage = await canManageMinistryScales(ministryId)
  if (!canManage) {
    return { success: false, error: 'Apenas o coordenador do ministério ou SUPER_ADMIN podem criar recados.' }
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  if (!title?.trim()) return { success: false, error: 'O título é obrigatório.' }
  if (!content?.trim()) return { success: false, error: 'O conteúdo é obrigatório.' }

  const { data, error } = await supabase
    .from('ministry_announcements')
    .insert({
      ministry_id: ministryId,
      created_by: ctx.user.id,
      title: title.trim(),
      content: content.trim(),
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao criar recado.' }

  revalidatePath(`/ministerios/${ministryId}`)
  revalidatePath('/ministerios')
  return { success: true, data }
}

export async function deleteAnnouncementAction(
  announcementId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const ctx = await getAuthenticatedUser()
  if (!ctx) return { success: false, error: 'Não autorizado.' }

  const { data: announcement, error: fetchError } = await supabase
    .from('ministry_announcements')
    .select('ministry_id')
    .eq('id', announcementId)
    .single()

  if (fetchError || !announcement) {
    return { success: false, error: 'Recado não encontrado.' }
  }

  const canManage = await canManageMinistryScales(announcement.ministry_id)
  if (!canManage) {
    return { success: false, error: 'Apenas o coordenador do ministério ou SUPER_ADMIN podem excluir recados.' }
  }

  const { error } = await supabase
    .from('ministry_announcements')
    .delete()
    .eq('id', announcementId)

  if (error) return { success: false, error: 'Erro ao excluir recado.' }

  revalidatePath(`/ministerios/${announcement.ministry_id}`)
  revalidatePath('/ministerios')
  return { success: true }
}
