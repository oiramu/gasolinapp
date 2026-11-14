import { unwrap } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { AuthRepository, Session } from './types'

export const ANONYMOUS_SIGN_IN_FAILED = 'No se pudo crear la sesión anónima'

interface AuthSessionData {
  readonly session: { readonly user: { readonly id: string } } | null
}

const toSession = ({ session }: AuthSessionData): Session | null => (session ? { userId: session.user.id } : null)

/** supabase-js guarda la sesión en localStorage: al recargar, `getSession` devuelve el mismo uid. */
export function createSupabaseAuthRepository(client: AppSupabaseClient): AuthRepository {
  return {
    async getSession() {
      return toSession(unwrap<AuthSessionData>(await client.auth.getSession()))
    },
    async signInAnonymously() {
      const session = toSession(unwrap<AuthSessionData>(await client.auth.signInAnonymously()))
      if (!session) throw new Error(ANONYMOUS_SIGN_IN_FAILED)
      return session
    },
  }
}
