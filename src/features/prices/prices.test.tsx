import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockPricesRepository } from './api/mockPricesRepository'
import { createSupabasePricesRepository } from './api/supabasePricesRepository'
import type { PricesRepository } from './api/types'
import { usePriceHistory } from './model/usePriceHistory'
import { useReferencePrice } from './model/useReferencePrice'

const repository = () => createSupabasePricesRepository(createTestClient())
const daily = { price_date: '2026-11-13', avg_price: 15900, min_price: 15800, max_price: 16000, report_count: 3 }

describe('history', () => {
  it('usa la vista diaria cuando responde', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get(`${REST_URL}/daily_avg_prices`, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json([daily])
      }),
    )
    expect(await repository().history({ stationId: 's1', fuelType: 'corriente', days: 30 })).toEqual([daily])
    expect(params?.get('station_id')).toBe('eq.s1')
    expect(params?.get('order')).toBe('price_date.asc')
  })

  it('si la vista falla, agrupa los precios en el cliente', async () => {
    server.use(
      http.get(`${REST_URL}/daily_avg_prices`, () => postgrestError('vista no disponible')),
      http.get(`${REST_URL}/fuel_prices`, () => HttpResponse.json([{ price: 15900, created_at: '2026-11-13T10:00:00Z' }])),
    )
    expect(await repository().history({ stationId: 's1', fuelType: 'corriente', days: 30 })).toEqual([
      { price_date: '2026-11-13', avg_price: 15900, min_price: 15900, max_price: 15900, report_count: 1 },
    ])
  })
})

describe('referencePrice', () => {
  it('prefiere el precio de la estación de hace un mes', async () => {
    server.use(http.get(`${REST_URL}/fuel_prices`, () => HttpResponse.json([{ price: 15500 }])))
    expect(await repository().referencePrice({ stationId: 's1', fuelType: 'corriente' })).toBe(15500)
  })

  it('sin precio de la estación usa el promedio vigente del combustible', async () => {
    server.use(
      http.get(`${REST_URL}/fuel_prices`, () => HttpResponse.json([])),
      http.get(`${REST_URL}/latest_prices`, () => HttpResponse.json([{ price: 15900 }, { price: 16000 }, { price: null }])),
    )
    expect(await repository().referencePrice({ stationId: 's1', fuelType: 'corriente' })).toBe(15950)
  })

  it('sin estación va directo al promedio; sin datos → null', async () => {
    server.use(http.get(`${REST_URL}/latest_prices`, () => HttpResponse.json([])))
    expect(await repository().referencePrice({ stationId: null, fuelType: 'gnv' })).toBeNull()
  })
})

describe('createMockPricesRepository', () => {
  it('no tiene historial ni referencia', async () => {
    const mock = createMockPricesRepository(0)
    expect(await mock.history({ stationId: 's1', fuelType: 'extra', days: 7 })).toEqual([])
    expect(await mock.referencePrice({ stationId: 's1', fuelType: 'extra' })).toBeNull()
    vi.useFakeTimers()
    const pending = createMockPricesRepository().history({ stationId: 's1', fuelType: 'extra', days: 7 })
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual([])
    vi.useRealTimers()
  })
})

describe('hooks de precios', () => {
  const fake = () => {
    const history = vi.fn(() => Promise.resolve([daily]))
    const referencePrice = vi.fn(() => Promise.resolve(15500))
    const prices: PricesRepository = { history, referencePrice }
    return { prices, history, referencePrice }
  }

  it('usePriceHistory carga el historial y no consulta sin estación o combustible', async () => {
    const { prices, history } = fake()
    const { result } = renderWithProviders(() => usePriceHistory('s1', 'corriente', 30), { prices })
    await waitFor(() => {
      expect(result.current).toEqual({ data: [daily], loading: false })
    })
    renderWithProviders(() => usePriceHistory(null, null, 30), { prices })
    expect(history).toHaveBeenCalledTimes(1)
  })

  it('useReferencePrice devuelve null mientras no está habilitado', async () => {
    const { prices, referencePrice } = fake()
    const { result } = renderWithProviders(() => useReferencePrice('s1', 'corriente', true), { prices })
    await waitFor(() => {
      expect(result.current).toBe(15500)
    })
    const disabled = renderWithProviders(() => useReferencePrice(null, null, false), { prices })
    expect(disabled.result.current).toBeNull()
    expect(referencePrice).toHaveBeenCalledTimes(1)
  })
})
