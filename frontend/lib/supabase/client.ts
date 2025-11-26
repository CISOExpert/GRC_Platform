import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Log environment variables for debugging
  console.log('[Supabase Client] Initializing with:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Handle auth errors gracefully
  client.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Client] Auth state change:', event, session?.user?.email)
    if (event === 'TOKEN_REFRESHED' && !session) {
      // Clear invalid session
      client.auth.signOut({ scope: 'local' })
    }
  })
  
  return client
}
