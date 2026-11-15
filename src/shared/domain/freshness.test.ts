import { describe, expect, it } from 'vitest'
import { FRESHNESS_LABELS, FRESHNESS_ORDER, FRESHNESS_RANGES, formatConfirmed, getFreshness } from './freshness'

const NOW = Date.parse('2026-11-16T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

describe('getFreshness', () => {
  it.each([
    { days: 0, expected: 'fresh' },
    { days: 2.9, expected: 'fresh' },
    { days: 3, expected: 'recent' },
    { days: 9.9, expected: 'recent' },
    { days: 10, expected: 'old' },
    { days: 29.9, expected: 'old' },
    { days: 30, expected: 'doubtful' },
    { days: 400, expected: 'doubtful' },
  ])('$days días → $expected', ({ days, expected }) => {
    expect(getFreshness(daysAgo(days), NOW)).toBe(expected)
  })

  it('sin fecha es dudoso', () => {
    expect(getFreshness(null, NOW)).toBe('doubtful')
    expect(getFreshness(undefined, NOW)).toBe('doubtful')
  })
})

describe('formatConfirmed', () => {
  it('dice cuándo se confirmó o que falta confirmar', () => {
    expect(formatConfirmed(daysAgo(3), NOW)).toBe('confirmado hace 3d')
    expect(formatConfirmed(new Date(NOW).toISOString(), NOW)).toBe('confirmado ahora mismo')
    expect(formatConfirmed(null, NOW)).toBe('sin confirmar')
  })
})

describe('textos de frescura', () => {
  it('cada nivel tiene etiqueta y rango, en orden de más a menos fresco', () => {
    expect(FRESHNESS_ORDER.map((f) => `${FRESHNESS_LABELS[f]} (${FRESHNESS_RANGES[f]})`)).toEqual([
      'Fresco (< 3 días)', 'Reciente (< 10 días)', 'Viejo (< 30 días)', 'Dudoso (30 días o más)',
    ])
  })
})
