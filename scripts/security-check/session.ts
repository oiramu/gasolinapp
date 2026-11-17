// Sesión reutilizable de security:check. Con el captcha activo no se puede crear una sesión anónima
// en cada corrida: se guarda el refresh token (rota en cada uso) en un archivo local fuera del repo.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '../../src/shared/api/database.types.ts'

/** Fuera del repo (sobrevive a los worktrees y sirve desde cualquier checkout). */
export const SESSION_FILE = process.env.SECURITY_CHECK_SESSION_FILE ?? join(homedir(), '.config', 'gasolinapp', 'security-check-session.json')

/** Token que acepta la clave secreta de prueba de Cloudflare (Supabase local, config.toml). */
const LOCAL_CAPTCHA_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

type SavedSessions = Record<string, string>

const readSaved = (): SavedSessions => (existsSync(SESSION_FILE) ? (JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as SavedSessions) : {})

function save(url: string, refreshToken: string): void {
  mkdirSync(dirname(SESSION_FILE), { recursive: true })
  writeFileSync(SESSION_FILE, `${JSON.stringify({ ...readSaved(), [url]: refreshToken }, null, 2)}\n`, { mode: 0o600 })
}

const isLocal = (url: string): boolean => /\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)

/** Token de captcha para crear la sesión: el de la variable de entorno o, contra Supabase local, el de prueba. */
function captchaTokenFor(url: string): string | undefined {
  return process.env.SECURITY_CHECK_CAPTCHA_TOKEN ?? (isLocal(url) ? LOCAL_CAPTCHA_TOKEN : undefined)
}

async function refresh(client: SupabaseClient<Database>, refreshToken: string): Promise<User | null> {
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken })
  return error ? null : data.user
}

async function create(client: SupabaseClient<Database>, url: string): Promise<User> {
  const captchaToken = captchaTokenFor(url)
  const { data, error } = await client.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined)
  if (error || !data.user) {
    throw new Error(
      `No se pudo crear la sesión de security:check (${String(error?.code ?? error?.message)}). ` +
        'Con el captcha activo en producción, pasa un token en SECURITY_CHECK_CAPTCHA_TOKEN (README, "security:check").',
    )
  }
  return data.user
}

/** Reutiliza la sesión guardada para esta URL (y guarda el refresh token nuevo) o crea una. */
export async function openSession(client: SupabaseClient<Database>, url: string): Promise<User> {
  const saved = readSaved()[url]
  const user = (saved ? await refresh(client, saved) : null) ?? (await create(client, url))
  const { data } = await client.auth.getSession()
  if (data.session) save(url, data.session.refresh_token)
  return user
}
