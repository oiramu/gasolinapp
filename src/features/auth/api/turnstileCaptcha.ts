import { CAPTCHA_UNAVAILABLE, type CaptchaProvider } from './captcha'

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Tiempo máximo para que el widget invisible entregue el token. */
const TOKEN_TIMEOUT_MS = 15_000

interface TurnstileRenderOptions {
  readonly sitekey: string
  readonly callback: (token: string) => void
  readonly 'error-callback': () => void
  readonly 'timeout-callback': () => void
}

/** Lo que la app usa de `window.turnstile`. */
export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const unavailable = () => new Error(CAPTCHA_UNAVAILABLE)

/**
 * Carga el script de Turnstile una sola vez y solo cuando se pide (los dispositivos con sesión
 * nunca lo descargan). Si falla, el siguiente intento lo vuelve a pedir.
 */
export function createTurnstileLoader(doc: Document = document): () => Promise<TurnstileApi> {
  let loading: Promise<TurnstileApi> | null = null
  const load = () =>
    new Promise<TurnstileApi>((resolve, reject) => {
      const script = doc.createElement('script')
      script.src = TURNSTILE_SCRIPT_URL
      script.async = true
      script.onload = () => {
        const turnstile = doc.defaultView?.turnstile
        if (turnstile) resolve(turnstile)
        else reject(unavailable())
      }
      script.onerror = () => {
        reject(unavailable())
      }
      doc.head.append(script)
    })
  return () => {
    loading ??= load().catch((error: unknown) => {
      loading = null
      throw error
    })
    return loading
  }
}

/** Monta el widget, espera su token (o su error) y lo desmonta. */
function renderForToken(turnstile: TurnstileApi, container: HTMLElement, { sitekey, timeoutMs }: { readonly sitekey: string; readonly timeoutMs: number }): Promise<string> {
  let widgetId: string | undefined
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(unavailable())
    }, timeoutMs)
    const fail = () => {
      clearTimeout(timer)
      reject(unavailable())
    }
    widgetId = turnstile.render(container, {
      sitekey,
      callback: (token) => {
        clearTimeout(timer)
        resolve(token)
      },
      'error-callback': fail,
      'timeout-callback': fail,
    })
  }).finally(() => {
    if (widgetId !== undefined) turnstile.remove(widgetId)
  })
}

export interface TurnstileCaptchaOptions {
  readonly siteKey: string
  readonly load: () => Promise<TurnstileApi>
  readonly timeoutMs?: number
  readonly doc?: Document
}

/** Widget invisible de Cloudflare Turnstile: el usuario no ve nada; se monta solo para el alta. */
export function createTurnstileCaptcha({ siteKey, load, timeoutMs = TOKEN_TIMEOUT_MS, doc = document }: TurnstileCaptchaOptions): CaptchaProvider {
  return {
    async getToken() {
      const turnstile = await load()
      const container = doc.createElement('div')
      container.setAttribute('aria-hidden', 'true')
      doc.body.append(container)
      try {
        return await renderForToken(turnstile, container, { sitekey: siteKey, timeoutMs })
      } finally {
        container.remove()
      }
    },
  }
}
