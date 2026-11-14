import { describe, expect, it } from 'vitest'
import { formatPrice, formatPriceValue, NO_PRICE_LABEL } from './format'

describe('formatPriceValue', () => {
  it('agrupa miles con punto, también con 4 cifras', () => {
    expect(formatPriceValue(15900)).toBe('15.900')
    expect(formatPriceValue(2500)).toBe('2.500')
  })

  it('respeta los decimales pedidos con coma', () => {
    expect(formatPriceValue(3.25, 2)).toBe('3,25')
    expect(formatPriceValue(15900.4)).toBe('15.900')
  })

  it('acepta números que llegan como texto desde un input', () => {
    expect(formatPriceValue('16500')).toBe('16.500')
  })

  it('muestra 0 cuando no hay precio', () => {
    expect(formatPriceValue(null)).toBe('0')
    expect(formatPriceValue(undefined)).toBe('0')
  })
})

describe('formatPrice', () => {
  it('agrega la unidad del combustible', () => {
    expect(formatPrice(15000, 'corriente')).toBe('$15.000/gal')
    expect(formatPrice(2500, 'gnv')).toBe('$2.500/m³')
  })

  it('usa la unidad explícita si se pasa', () => {
    expect(formatPrice(2500, 'corriente', 'm3')).toBe('$2.500/m³')
  })

  it('muestra "Sin reporte" cuando no hay precio', () => {
    expect(formatPrice(null, 'extra')).toBe(NO_PRICE_LABEL)
    expect(formatPrice(undefined, 'gnv')).toBe('Sin reporte')
  })
})
