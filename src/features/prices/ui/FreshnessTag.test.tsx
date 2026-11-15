import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FreshnessLegend } from '@/features/map/ui/FreshnessLegend'
import { CLOCK_TICK_MS, useNow } from '@/shared/lib/useNow'
import { FreshnessTag } from './FreshnessTag'

const NOW = Date.parse('2026-11-16T12:00:00Z')
const DAY = 86_400_000

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('FreshnessTag', () => {
  it('dice cuándo se confirmó y qué tan fresco es el precio', () => {
    const { container } = render(<FreshnessTag confirmedAt={new Date(NOW - 4 * DAY).toISOString()} />)
    expect(screen.getByText(/hace 4d/)).toBeInTheDocument()
    expect(screen.getByText('Reciente')).toBeInTheDocument()
    expect(container.querySelector('[data-freshness="recent"]')).not.toBeNull()
  })

  it('sin fecha es dudoso y avanza solo con el reloj de la UI', () => {
    const { rerender } = render(<FreshnessTag confirmedAt={null} />)
    expect(screen.getByText('Dudoso')).toBeInTheDocument()
    expect(screen.getByText(/sin confirmar/)).toBeInTheDocument()
    rerender(<FreshnessTag confirmedAt={new Date(NOW - 2.99 * DAY).toISOString()} />)
    expect(screen.getByText('Fresco')).toBeInTheDocument()
    act(() => {
      vi.setSystemTime(NOW + DAY)
      vi.advanceTimersByTime(CLOCK_TICK_MS)
    })
    expect(screen.getByText('Reciente')).toBeInTheDocument()
  })
})

describe('useNow', () => {
  it('se actualiza cada intervalo y limpia su timer al desmontar', () => {
    const { result, unmount } = renderHook(() => useNow(1000))
    expect(result.current).toBe(NOW)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(NOW + 1000)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('FreshnessLegend', () => {
  it('una escala de cuatro niveles con su rango compacto y una fila para el oficial', () => {
    render(<FreshnessLegend color="#00E5A0" />)
    expect(screen.getByText('Frescura del precio')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Fresco< 3 d', 'Reciente< 10 d', 'Viejo< 30 d', 'Dudoso30+ d',
    ])
    expect(screen.getByText('Precio oficial')).toBeInTheDocument()
  })
})
