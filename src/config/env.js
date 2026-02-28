/**
 * Centralized environment configuration.
 *
 * All env variables are validated here at module load time so the app
 * fails fast with a clear message instead of a cryptic runtime error.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[env] Missing Supabase variables.\n' +
    'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const env = {
  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  },
  /** Set VITE_USE_MOCK_DATA=true in .env to use local mock data instead of Supabase. */
  useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
}
