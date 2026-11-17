export type ShareVia = 'native' | 'whatsapp'

/** Lo que se usa del navegador para compartir (inyectable en los tests). */
export interface ShareTarget {
  /** Web Share API; no existe en la mayoría de los navegadores de escritorio. */
  readonly share?: (data: ShareData) => Promise<void>
  readonly open: (url: string) => void
}

export const WHATSAPP_URL = 'https://wa.me/?text='

/** La persona cerró la hoja de compartir: no es un error ni hay que abrir WhatsApp. */
const isCancelled = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError'

type NativeResult = 'native' | 'cancelled' | 'failed'

async function shareNatively(share: NonNullable<ShareTarget['share']>, message: string): Promise<NativeResult> {
  try {
    await share({ text: message })
    return 'native'
  } catch (error) {
    return isCancelled(error) ? 'cancelled' : 'failed'
  }
}

/**
 * Comparte el mensaje con la hoja nativa del celular y, si no existe o falla, abre WhatsApp.
 * Devuelve por dónde salió, o null si la persona canceló.
 */
export async function shareMessage(message: string, target: ShareTarget): Promise<ShareVia | null> {
  const native = target.share ? await shareNatively(target.share, message) : 'failed'
  if (native === 'native') return 'native'
  if (native === 'cancelled') return null
  target.open(`${WHATSAPP_URL}${encodeURIComponent(message)}`)
  return 'whatsapp'
}

/** El navegador real: `navigator.share` si existe y una pestaña nueva para WhatsApp. */
export function browserShareTarget(): ShareTarget {
  return {
    share: typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined,
    open: (url) => {
      window.open(url, '_blank', 'noopener')
    },
  }
}
