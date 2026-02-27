import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// ============================================================
// Rota de confirmação de e-mail e recovery de senha
// Supabase envia links para: {SITE_URL}/auth/confirm?token_hash=...&type=...
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      // Recuperação de senha: redirecionar para tela de nova senha
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/nova-senha', origin))
      }
      // Confirmação de e-mail ou magic link: ir para o dashboard
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Token inválido ou expirado
  return NextResponse.redirect(
    new URL('/login?error=token_invalido', origin)
  )
}
