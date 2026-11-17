export interface SupabaseConfig {
  readonly url: string
  readonly anonKey: string
}

/**
 * Fuente de datos de la app. En modo mock no se necesita Supabase ni captcha. Sin clave de
 * Turnstile el alta anónima no pide captcha (sirve mientras el captcha esté apagado en Supabase).
 */
export type AppEnv =
  | { readonly dataSource: 'mock' }
  | { readonly dataSource: 'supabase'; readonly supabase: SupabaseConfig; readonly captchaSiteKey: string | null }

export interface RawEnv {
  readonly VITE_USE_MOCK_DATA?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

export const MISSING_SUPABASE_MESSAGE =
  '[env] Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copia .env.example a .env o usa VITE_USE_MOCK_DATA=true.'

/** Valida las variables según el modo y falla rápido con un mensaje claro. */
export function parseEnv(raw: RawEnv): AppEnv {
  if (raw.VITE_USE_MOCK_DATA === 'true') return { dataSource: 'mock' }
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey } = raw
  if (!url || !anonKey) throw new Error(MISSING_SUPABASE_MESSAGE)
  return { dataSource: 'supabase', supabase: { url, anonKey }, captchaSiteKey: raw.VITE_TURNSTILE_SITE_KEY || null }
}
