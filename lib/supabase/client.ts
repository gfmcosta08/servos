import { createBrowserClient } from '@supabase/ssr'

// O tipo Database em types/database.ts serve como referência de documentação.
// Para habilitar tipagem completa, gere os tipos via:
// npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/supabase.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
