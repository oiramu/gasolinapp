import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

/**
 * Singleton Supabase client.
 * Credentials are validated in config/env.js at module load time.
 */
export const supabase = createClient(env.supabase.url, env.supabase.anonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
})
