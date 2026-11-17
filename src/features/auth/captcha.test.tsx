import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories } from '@/app/repositories'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/renderWithProviders'
import { createTestClient, SUPABASE_URL } from '@/test/supabase'
import { CAPTCHA_FAILED, CAPTCHA_UNAVAILABLE, createFixedCaptcha, DUMMY_CAPTCHA_TOKEN, type CaptchaProvider } from './api/captcha'
import { createSupabaseAuthRepository } from './api/supabaseAuthRepository'
import { createTurnstileCaptcha, createTurnstileLoader, TURNSTILE_SCRIPT_URL, type TurnstileApi } from './api/turnstileCaptcha'
import type { AuthRepository } from './api/types'
import { SessionNotice, SessionNoticeView } from './ui/SessionNotice'

const SIGNUP_URL = `${SUPABASE_URL}/auth/v1/signup`
const ANON_UID = '7a1b2c3d-0000-4000-8000-000000000042'
const SECONDS_PER_HOUR = 3600

const anonymousSession = () => ({
  access_token: 'access-token',
  token_type: 'bearer',
  expires_in: SECONDS_PER_HOUR,
  expires_at: Math.floor(Date.now() / 1000) + SECONDS_PER_HOUR,
  refresh_token: 'refresh-token',
  user: { id: ANON_UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {} },
})

/** Respuesta de Supabase Auth cuando el captcha falta, venció o no es válido. */
const captchaRejected = () =>
  HttpResponse.json({ code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (invalid-input-response)' }, { status: 400 })

/** Endpoint de alta: responde en orden con `responses` y guarda el token de captcha de cada intento. */
function mockSignup(...responses: (() => Response)[]) {
  const tokens: unknown[] = []
  server.use(
    http.post(SIGNUP_URL, async ({ request }) => {
      const body = (await request.json()) as { gotrue_meta_security?: { captcha_token?: string } }
      tokens.push(body.gotrue_meta_security?.captcha_token)
      const respond = responses[Math.min(tokens.length - 1, responses.length - 1)] ?? (() => HttpResponse.json(anonymousSession()))
      return respond()
    }),
  )
  return tokens
}

/** Captcha que entrega tokens numerados: token-1, token-2… */
function countingCaptcha(): CaptchaProvider & { readonly calls: () => number } {
  let count = 0
  return {
    getToken: () => Promise.resolve(`token-${String(++count)}`),
    calls: () => count,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('alta anónima con captcha (Supabase)', () => {
  it('manda el token del captcha en el alta', async () => {
    const tokens = mockSignup(() => HttpResponse.json(anonymousSession()))
    const repository = createSupabaseAuthRepository(createTestClient(), createFixedCaptcha())
    await expect(repository.signInAnonymously()).resolves.toEqual({ userId: ANON_UID })
    expect(tokens).toEqual([DUMMY_CAPTCHA_TOKEN])
  })

  it('si el servidor rechaza el token, reintenta una vez con uno nuevo', async () => {
    const tokens = mockSignup(captchaRejected, () => HttpResponse.json(anonymousSession()))
    const captcha = countingCaptcha()
    await expect(createSupabaseAuthRepository(createTestClient(), captcha).signInAnonymously()).resolves.toEqual({ userId: ANON_UID })
    expect(tokens).toEqual(['token-1', 'token-2'])
  })

  it('si lo rechaza dos veces, falla con CAPTCHA_FAILED (sin más intentos)', async () => {
    const tokens = mockSignup(captchaRejected)
    await expect(createSupabaseAuthRepository(createTestClient(), countingCaptcha()).signInAnonymously()).rejects.toThrow(CAPTCHA_FAILED)
    expect(tokens).toHaveLength(2)
  })

  it('sin captcha configurado no manda token; si el servidor lo exige, falla con CAPTCHA_FAILED', async () => {
    const tokens = mockSignup(captchaRejected)
    await expect(createSupabaseAuthRepository(createTestClient()).signInAnonymously()).rejects.toThrow(CAPTCHA_FAILED)
    expect(tokens).toEqual([undefined])
  })

  it('si el widget no carga, no llama al servidor', async () => {
    const tokens = mockSignup()
    const broken: CaptchaProvider = { getToken: () => Promise.reject(new Error(CAPTCHA_UNAVAILABLE)) }
    await expect(createSupabaseAuthRepository(createTestClient(), broken).signInAnonymously()).rejects.toThrow(CAPTCHA_UNAVAILABLE)
    expect(tokens).toEqual([])
  })
})

/** Turnstile falso: guarda las opciones del render para disparar sus callbacks desde el test. */
function fakeTurnstile() {
  let options: Parameters<TurnstileApi['render']>[1] | undefined
  const api = {
    render: vi.fn((_container: HTMLElement, renderOptions: Parameters<TurnstileApi['render']>[1]) => {
      options = renderOptions
      return 'widget-1'
    }),
    remove: vi.fn(),
  }
  const current = () => {
    if (!options) throw new Error('el widget no se montó')
    return options
  }
  return { api, current }
}

describe('Turnstile invisible', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  it('monta el widget oculto con la clave del sitio, entrega el token y se desmonta', async () => {
    const { api, current } = fakeTurnstile()
    const captcha = createTurnstileCaptcha({ siteKey: 'site-key', load: () => Promise.resolve(api) })
    const pending = captcha.getToken()
    await tick()
    expect(current().sitekey).toBe('site-key')
    expect(document.querySelectorAll('body > div[aria-hidden="true"]')).toHaveLength(1)
    current().callback('el-token')
    await expect(pending).resolves.toBe('el-token')
    expect(api.remove).toHaveBeenCalledWith('widget-1')
    expect(document.querySelectorAll('body > div[aria-hidden="true"]')).toHaveLength(0)
  })

  it.each(['error-callback', 'timeout-callback'] as const)('%s → CAPTCHA_UNAVAILABLE y se desmonta', async (event) => {
    const { api, current } = fakeTurnstile()
    const pending = createTurnstileCaptcha({ siteKey: 'k', load: () => Promise.resolve(api) }).getToken()
    await tick()
    current()[event]()
    await expect(pending).rejects.toThrow(CAPTCHA_UNAVAILABLE)
    expect(api.remove).toHaveBeenCalledOnce()
  })

  it('si el widget no responde a tiempo → CAPTCHA_UNAVAILABLE', async () => {
    const { api } = fakeTurnstile()
    await expect(createTurnstileCaptcha({ siteKey: 'k', load: () => Promise.resolve(api), timeoutMs: 5 }).getToken()).rejects.toThrow(CAPTCHA_UNAVAILABLE)
    expect(api.remove).toHaveBeenCalledOnce()
  })

  it('si el render explota, falla sin intentar desmontar un widget que no existe', async () => {
    const remove = vi.fn()
    const api: TurnstileApi = { render: () => { throw new Error('boom') }, remove }
    await expect(createTurnstileCaptcha({ siteKey: 'k', load: () => Promise.resolve(api) }).getToken()).rejects.toThrow('boom')
    expect(remove).not.toHaveBeenCalled()
    expect(document.querySelectorAll('body > div[aria-hidden="true"]')).toHaveLength(0)
  })
})

describe('carga del script de Turnstile', () => {
  afterEach(() => {
    document.head.querySelectorAll('script').forEach((script) => { script.remove() })
    delete window.turnstile
  })

  const scripts = () => [...document.head.querySelectorAll<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`)]

  it('descarga el script una sola vez y entrega window.turnstile', async () => {
    const load = createTurnstileLoader()
    const first = load()
    const second = load()
    expect(scripts()).toHaveLength(1)
    const { api } = fakeTurnstile()
    window.turnstile = api
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(first).resolves.toBe(api)
    await expect(second).resolves.toBe(api)
  })

  it('si el script no carga (bloqueador), falla y el siguiente intento lo vuelve a pedir', async () => {
    const load = createTurnstileLoader()
    const first = load()
    scripts()[0]?.dispatchEvent(new Event('error'))
    await expect(first).rejects.toThrow(CAPTCHA_UNAVAILABLE)
    void load().catch(() => undefined)
    expect(scripts()).toHaveLength(2)
  })

  it('si el script carga pero no expone window.turnstile, falla', async () => {
    const pending = createTurnstileLoader()()
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(pending).rejects.toThrow(CAPTCHA_UNAVAILABLE)
  })
})

describe('SessionNotice', () => {
  function renderNotice(signInAnonymously: AuthRepository['signInAnonymously']) {
    const auth: AuthRepository = { getSession: () => Promise.resolve(null), signInAnonymously }
    render(
      <AppProviders repositories={{ ...createMockRepositories(0), auth }} queryClient={createTestQueryClient()}>
        <SessionNotice />
      </AppProviders>,
    )
  }

  it('con sesión no muestra nada', async () => {
    renderNotice(() => Promise.resolve({ userId: ANON_UID }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si el captcha no carga avisa con un mensaje claro y "Reintentar" crea la sesión', async () => {
    const signIn = vi.fn<AuthRepository['signInAnonymously']>()
      .mockRejectedValueOnce(new Error(CAPTCHA_UNAVAILABLE))
      .mockResolvedValue({ userId: ANON_UID })
    renderNotice(signIn)
    expect(await screen.findByRole('alert')).toHaveTextContent(/bloqueador de anuncios/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(signIn).toHaveBeenCalledTimes(2)
  })

  it('mientras reintenta, el botón dice "Verificando…" y no se puede volver a tocar', () => {
    render(<SessionNoticeView message="No pudimos verificar tu conexión." retrying retry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Verificando…' })).toBeDisabled()
  })

  it('cualquier otra falla usa el mensaje general', async () => {
    renderNotice(() => Promise.reject(new Error('Failed to fetch')))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos preparar tu sesión/)
  })
})
