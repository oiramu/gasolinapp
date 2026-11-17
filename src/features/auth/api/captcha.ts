import type { RpcErrorCode } from '@/shared/api/rpcErrors'

/** Puerto: un token de un solo uso que prueba que hay una persona detrás del alta anónima. */
export interface CaptchaProvider {
  getToken(): Promise<string>
}

/** El widget no cargó o no respondió a tiempo (bloqueador de anuncios, red lenta). */
export const CAPTCHA_UNAVAILABLE = 'CAPTCHA_UNAVAILABLE' satisfies RpcErrorCode

/** El servidor rechazó el token incluso después de reintentar con uno nuevo. */
export const CAPTCHA_FAILED = 'CAPTCHA_FAILED' satisfies RpcErrorCode

/** Token que aceptan las claves de prueba de Cloudflare (Supabase local y tests). */
export const DUMMY_CAPTCHA_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

/** Captcha que siempre entrega el mismo token: para tests y para el entorno local. */
export function createFixedCaptcha(token = DUMMY_CAPTCHA_TOKEN): CaptchaProvider {
  return { getToken: () => Promise.resolve(token) }
}
