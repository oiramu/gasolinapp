import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig } from '@/shared/config/env'
import type { Database } from './database.types'

export type AppSupabaseClient = SupabaseClient<Database>

const REALTIME_EVENTS_PER_SECOND = 10

/** Cliente tipado con el schema generado. Solo lo crea la estrategia Supabase. */
export function createSupabaseClient(config: SupabaseConfig): AppSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    realtime: { params: { eventsPerSecond: REALTIME_EVENTS_PER_SECOND } },
  })
}
