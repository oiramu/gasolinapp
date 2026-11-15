import { describe, expect, it } from 'vitest'
import { BRAND_COLORS } from './brands'
import { REPORT_TYPE_LABELS } from './reports'

describe('REPORT_TYPE_LABELS', () => {
  it('cubre exactamente los tipos que permite el CHECK de reports.type', () => {
    expect(Object.keys(REPORT_TYPE_LABELS).sort()).toEqual(['comment', 'correction', 'price', 'promotion', 'warning'])
  })
})

describe('BRAND_COLORS', () => {
  it('usa colores hexadecimales de 6 dígitos', () => {
    for (const color of Object.values(BRAND_COLORS)) expect(color).toMatch(/^#[0-9A-F]{6}$/)
  })
})
