'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import type { ActionResult } from '@/types/database'

// ============================================================
// LOGIN
// ============================================================
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { success: false, error: 'Email ou senha inválidos.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ============================================================
// LOGOUT
// ============================================================
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ============================================================
// REGISTRO - Criar nova paróquia
// ============================================================
export async function registerWithNewParishAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const parishName = formData.get('parish_name') as string
  const parishCity = formData.get('parish_city') as string
  const parishState = formData.get('parish_state') as string

  if (!name || !email || !password || !parishName || !parishCity || !parishState) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' }
  }

  // 1. Criar paróquia
  const slug = generateSlug(parishName)
  const { data: parish, error: parishError } = await supabase
    .from('parishes')
    .insert({ name: parishName, slug, city: parishCity, state: parishState })
    .select()
    .single()

  if (parishError) {
    if (parishError.code === '23505') {
      return { success: false, error: 'Já existe uma paróquia com esse nome. Tente outro nome.' }
    }
    return { success: false, error: 'Erro ao criar paróquia. Tente novamente.' }
  }

  // 2. Criar usuário no Supabase Auth com metadados
  const { error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'ADMIN_PARISH',
        parish_id: parish.id,
      },
    },
  })

  if (authError) {
    // Reverter criação da paróquia
    await supabase.from('parishes').delete().eq('id', parish.id)
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'Este email já está cadastrado.' }
    }
    return { success: false, error: 'Erro ao criar conta. Tente novamente.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ============================================================
// REGISTRO - Entrar em paróquia existente
// ============================================================
export async function registerJoinParishAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const parishId = formData.get('parish_id') as string

  if (!name || !email || !password || !parishId) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' }
  }

  // Verificar se paróquia existe
  const { data: parish, error: parishError } = await supabase
    .from('parishes')
    .select('id')
    .eq('id', parishId)
    .single()

  if (parishError || !parish) {
    return { success: false, error: 'Paróquia não encontrada.' }
  }

  // Criar usuário como VOLUNTEER
  const { error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'VOLUNTEER',
        parish_id: parishId,
      },
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { success: false, error: 'Este email já está cadastrado.' }
    }
    return { success: false, error: 'Erro ao criar conta. Tente novamente.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ============================================================
// Buscar paróquias disponíveis (para join)
// ============================================================
export async function getParishesAction(): Promise<ActionResult<{ id: string; name: string; city: string; state: string }[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('parishes')
    .select('id, name, city, state')
    .order('name')

  if (error) {
    return { success: false, error: 'Erro ao buscar paróquias.' }
  }

  return { success: true, data: data ?? [] }
}
