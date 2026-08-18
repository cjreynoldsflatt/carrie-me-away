import { createClient } from '@supabase/supabase-js'

// Single shared client — safe to use in both API routes and client code
// (uses the publishable/anon key, not the service role key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
