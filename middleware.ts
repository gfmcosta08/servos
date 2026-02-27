import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================
// Middleware de Autenticação e Isolamento por Paróquia
// Garante que rotas protegidas sejam acessadas apenas por usuários autenticados.
// Arquivo deve se chamar middleware.ts (Next.js convention).
// ============================================================

const PUBLIC_ROUTES = ['/login', '/register', '/confirmar-email', '/recuperar-senha', '/nova-senha']
const AUTH_ROUTES   = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      } as CookieMethodsServer,
    }
  )

  // Verificar sessão atual — não usar getSession() aqui (pode ser spoofado)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirecionar usuário autenticado para fora das páginas de auth
  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirecionar usuário não autenticado para login
  if (!user && !PUBLIC_ROUTES.some(r => pathname.startsWith(r)) && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
