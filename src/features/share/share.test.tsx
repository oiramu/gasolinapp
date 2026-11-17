import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsRepository } from '@/features/analytics/api/types'
import { stationUrl } from '@/shared/lib/stationLink'
import { fuelPrice, station, stationFields } from '@/test/fixtures/stations'
import { renderWithProviders } from '@/test/renderWithProviders'
import { buildShareMessage, confirmedPhrase } from './model/shareMessage'
import { browserShareTarget, shareMessage, WHATSAPP_URL, type ShareTarget } from './model/shareTarget'
import { useShareStation } from './model/useShareStation'
import { ShareButton } from './ui/ShareStationButton'

// 16 nov 2026, 10:00 en Bogotá
const NOW = Date.parse('2026-11-16T15:00:00Z')
const URL_S1 = 'https://gasolinapp.oiramu.com/?estacion=s1&combustible=corriente'

describe('stationUrl', () => {
  it('arma el enlace directo completo', () => {
    expect(stationUrl('https://gasolinapp.oiramu.com', { stationId: 's1', fuelType: 'corriente' })).toBe(URL_S1)
  })
})

describe('confirmedPhrase', () => {
  it.each([
    ['2026-11-16T13:00:00Z', 'confirmado hoy'],
    ['2026-11-15T20:00:00Z', 'confirmado ayer'],
    ['2026-11-11T13:00:00Z', 'confirmado hace 5 días'],
    ['2026-11-16T16:00:00Z', 'confirmado hoy'], // reloj adelantado: nunca "hace -1 días"
  ])('%s → %s', (confirmedAt, phrase) => {
    expect(confirmedPhrase(confirmedAt, NOW)).toBe(phrase)
  })

  it('sin fecha no dice nada', () => {
    expect(confirmedPhrase(null, NOW)).toBeNull()
  })
})

describe('buildShareMessage', () => {
  const base = { stationName: 'Terpel El Recreo', fuelType: 'corriente', confirmedAt: '2026-11-16T13:00:00Z', url: URL_S1, now: NOW } as const

  it('precio comunitario: precio, unidad, estación, cuándo se confirmó y el enlace', () => {
    expect(buildShareMessage({ ...base, display: { source: 'community', price: 15900, freshness: 'fresh' } })).toBe(
      `⛽ Corriente a $15.900/galón en Terpel El Recreo (confirmado hoy). Míralo en GasolinApp: ${URL_S1}`,
    )
  })

  it('precio oficial: dice que es la referencia oficial y de qué mes', () => {
    expect(buildShareMessage({ ...base, confirmedAt: null, display: { source: 'reference', price: 15964, validFrom: '2026-11-01' } })).toBe(
      `⛽ Corriente a $15.964/galón en Terpel El Recreo (precio oficial de referencia, nov 2026). Míralo en GasolinApp: ${URL_S1}`,
    )
  })

  it('el gas se mide en m³ y, sin fecha de confirmación, no lleva paréntesis', () => {
    expect(buildShareMessage({ ...base, fuelType: 'gnv', confirmedAt: null, display: { source: 'community', price: 3124, freshness: 'doubtful' } })).toBe(
      `⛽ Gas a $3.124/m³ en Terpel El Recreo. Míralo en GasolinApp: ${URL_S1}`,
    )
  })

  it('sin precio invita a ver la estación', () => {
    expect(buildShareMessage({ ...base, display: { source: 'none' } })).toBe(`⛽ Precios de Terpel El Recreo en GasolinApp: ${URL_S1}`)
  })
})

describe('shareMessage', () => {
  const target = (share?: ShareTarget['share']) => ({ share, open: vi.fn<(url: string) => void>() })

  it('con la hoja nativa del celular comparte el texto y no abre WhatsApp', async () => {
    const t = target(vi.fn(() => Promise.resolve()))
    await expect(shareMessage('hola', t)).resolves.toBe('native')
    expect(t.share).toHaveBeenCalledWith({ text: 'hola' })
    expect(t.open).not.toHaveBeenCalled()
  })

  it('si la persona cancela, no abre WhatsApp ni cuenta como compartido', async () => {
    const t = target(() => Promise.reject(new DOMException('cancelado', 'AbortError')))
    await expect(shareMessage('hola', t)).resolves.toBeNull()
    expect(t.open).not.toHaveBeenCalled()
  })

  it('si la hoja nativa falla, o no existe (escritorio), abre WhatsApp con el texto', async () => {
    const failing = target(() => Promise.reject(new DOMException('no permitido', 'NotAllowedError')))
    await expect(shareMessage('Precio: $15.900 & más', failing)).resolves.toBe('whatsapp')
    expect(failing.open).toHaveBeenCalledWith(`${WHATSAPP_URL}Precio%3A%20%2415.900%20%26%20m%C3%A1s`)
    const desktop = target()
    await expect(shareMessage('hola', desktop)).resolves.toBe('whatsapp')
  })
})

describe('browserShareTarget', () => {
  // jsdom no trae la Web Share API: se define y se quita en cada test
  const setNavigatorShare = (share: Navigator['share'] | undefined) => {
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share')
  })

  it('usa navigator.share si existe y abre WhatsApp en otra pestaña', async () => {
    const share = vi.fn(() => Promise.resolve())
    setNavigatorShare(share)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const target = browserShareTarget()
    await target.share?.({ text: 'hola' })
    expect(share).toHaveBeenCalledWith({ text: 'hola' })
    target.open('https://wa.me/?text=x')
    expect(open).toHaveBeenCalledWith('https://wa.me/?text=x', '_blank', 'noopener')
  })

  it('sin Web Share API no ofrece la hoja nativa', () => {
    setNavigatorShare(undefined)
    expect(browserShareTarget().share).toBeUndefined()
  })
})

describe('useShareStation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(share: ShareTarget['share']) {
    const target = { share, open: vi.fn<(url: string) => void>() }
    const analytics = { track: vi.fn<AnalyticsRepository['track']>(() => Promise.resolve()) }
    const rendered = renderWithProviders(() => useShareStation(target), { analytics })
    return { ...rendered, target, analytics }
  }

  it('comparte el precio comunitario fresco con el enlace directo y registra share', async () => {
    const share = vi.fn(() => Promise.resolve())
    const { result, analytics } = setup(share)
    const recreo = station({ fuel_prices: [fuelPrice({ confirmed_at: '2026-11-16T13:00:00Z' })] })
    act(() => {
      result.current({ station: recreo, fuelType: 'corriente', from: 'panel' })
    })
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledWith({ name: 'share', props: { via: 'native', station_id: 's1', from: 'panel' } })
    })
    expect(share).toHaveBeenCalledWith({
      text: `⛽ Corriente a $15.900/galón en Terpel El Recreo (confirmado hoy). Míralo en GasolinApp: ${window.location.origin}/?estacion=s1&combustible=corriente`,
    })
  })

  it('sin precio comunitario de diésel en Barranquilla comparte el oficial', async () => {
    const share = vi.fn(() => Promise.resolve())
    const { result } = setup(share)
    // z1 es una zona de Barranquilla en el mock; esperar a que carguen zonas y precios oficiales
    await waitFor(() => {
      act(() => {
        result.current({ station: station({ ...stationFields({ zone_id: 'z1' }) }), fuelType: 'diesel', from: 'best_price' })
      })
      expect(share).toHaveBeenLastCalledWith({ text: expect.stringContaining('Diésel a $11.291/galón en Terpel El Recreo (precio oficial de referencia, nov 2026)') as unknown })
    })
  })

  it('si la persona cancela no registra nada', async () => {
    const { result, analytics } = setup(() => Promise.reject(new DOMException('cancelado', 'AbortError')))
    act(() => {
      result.current({ station: station(), fuelType: 'corriente', from: 'panel' })
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(analytics.track).not.toHaveBeenCalled()
  })
})

describe('ShareButton', () => {
  it('en la cabecera es solo el ícono; en la tarjeta dice "Compartir"; los dos se llaman "Compartir"', async () => {
    const onShare = vi.fn()
    const { rerender } = render(<ShareButton variant="icon" onShare={onShare} />)
    expect(screen.getByRole('button', { name: 'Compartir' })).not.toHaveTextContent('Compartir')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Compartir' }))
    expect(onShare).toHaveBeenCalledOnce()
    rerender(<ShareButton variant="pill" onShare={onShare} />)
    expect(screen.getByRole('button', { name: 'Compartir' })).toHaveTextContent('Compartir')
  })
})
