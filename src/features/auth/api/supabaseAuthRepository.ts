import { unwrap } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { CAPTCHA_FAILED, type CaptchaProvider } from './captcha'
import type { AuthRepository, Session } from './types'

export const ANONYMOUS_SIGN_IN_FAILED = 'No se pudo crear la sesión anónima'

interface AuthSessionData {
  readonly session: { readonly user: { readonly id: string } } | null
}

interface AuthError {
  readonly message: string
  readonly code?: string
}

const toSession = ({ session }: AuthSessionData): Session | null => (session ? { userId: session.user.id } : null)

/** Supabase responde `captcha_failed` si el token falta, venció o no es válido. */
const isCaptchaRejected = (error: AuthError | null): boolean => error?.code === 'captcha_failed'

/**
 * supabase-js guarda la sesión en localStorage: al recargar, `getSession` devuelve el mismo uid.
 * Con captcha, el alta anónima pide un token justo antes (vence a los 5 minutos y es de un solo
 * uso) y, si el servidor lo rechaza, reintenta una vez con uno nuevo.
 */
export function createSupabaseAuthRepository(client: AppSupabaseClient, captcha: CaptchaProvider | null = null): AuthRepository {
  const signIn = async () => {
    const captchaToken = captcha ? await captcha.getToken() : undefined
    return client.auth.signInAnonymously(captchaToken === undefined ? undefined : { options: { captchaToken } })
  }

  return {
    async getSession() {
      return toSession(unwrap<AuthSessionData>(await client.auth.getSession()))
    },
    async signInAnonymously() {
      const first = await signIn()
      const result = captcha && isCaptchaRejected(first.error) ? await signIn() : first
      if (isCaptchaRejected(result.error)) throw new Error(CAPTCHA_FAILED)
      const session = toSession(unwrap<AuthSessionData>(result))
      if (!session) throw new Error(ANONYMOUS_SIGN_IN_FAILED)
      return session
    },
  }
}
