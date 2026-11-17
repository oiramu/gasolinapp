import { afterEach, describe, expect, it, vi } from 'vitest'
import { bogotaDaysAgo, formatRelativeTime } from './time'

const NOW = Date.parse('2026-11-13T12:00:00Z')
const MINUTE = 60_000
const ago = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString()

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [0, 'ahora mismo'],
    [0.5, 'ahora mismo'],
    [-10, 'ahora mismo'],
    [1, 'hace 1m'],
    [59, 'hace 59m'],
    [60, 'hace 1h'],
    [1439, 'hace 23h'],
    [1440, 'hace 1d'],
    [4 * 1440 + 5, 'hace 4d'],
  ])('%s minutos → %s', (minutes, expected) => {
    expect(formatRelativeTime(ago(minutes), NOW)).toBe(expected)
  })

  it('usa la hora actual por defecto', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    expect(formatRelativeTime(ago(120))).toBe('hace 2h')
  })

  it('acepta Date y timestamps', () => {
    expect(formatRelativeTime(new Date(NOW - 5 * MINUTE), NOW)).toBe('hace 5m')
    expect(formatRelativeTime(NOW - 5 * MINUTE, NOW)).toBe('hace 5m')
  })

  it('conserva la salida actual con fechas inválidas', () => {
    expect(formatRelativeTime('no es fecha', NOW)).toBe('hace NaNd')
  })
})

describe('bogotaDaysAgo', () => {
  // 16 nov 2026, 00:30 en Bogotá = 05:30 UTC
  const NOW_BOGOTA_MIDNIGHT = Date.parse('2026-11-16T05:30:00Z')

  it('cuenta días de calendario en hora de Bogotá, no en UTC', () => {
    expect(bogotaDaysAgo('2026-11-16T05:10:00Z', NOW_BOGOTA_MIDNIGHT)).toBe(0) // 00:10 de hoy en Bogotá
    expect(bogotaDaysAgo('2026-11-16T04:50:00Z', NOW_BOGOTA_MIDNIGHT)).toBe(1) // 23:50 de ayer en Bogotá (ya era 16 en UTC)
    expect(bogotaDaysAgo('2026-11-12T20:00:00Z', NOW_BOGOTA_MIDNIGHT)).toBe(4)
  })

  it('usa la hora actual por defecto', () => {
    expect(bogotaDaysAgo(new Date())).toBe(0)
  })
})
