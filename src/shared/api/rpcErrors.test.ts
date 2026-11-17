import { describe, expect, it } from 'vitest'
import { toUserMessage } from './rpcErrors'

describe('toUserMessage', () => {
  it('traduce los códigos de las RPC', () => {
    expect(toUserMessage(new Error('RATE_LIMIT'), 'falló')).toMatch(/Espera un rato/)
    expect(toUserMessage(new Error('OUT_OF_RANGE'), 'falló')).toMatch(/fuera del rango/)
  })

  it('traduce las fallas del captcha del alta anónima', () => {
    expect(toUserMessage(new Error('CAPTCHA_UNAVAILABLE'), 'falló')).toMatch(/bloqueador de anuncios/)
    expect(toUserMessage(new Error('CAPTCHA_FAILED'), 'falló')).toMatch(/Recarga la página/)
  })

  it('cualquier otro error usa el mensaje de respaldo', () => {
    expect(toUserMessage(new Error('Failed to fetch'), 'falló')).toBe('falló')
    expect(toUserMessage(new Error('toString'), 'falló')).toBe('falló')
    expect(toUserMessage('RATE_LIMIT', 'falló')).toBe('falló')
  })
})
