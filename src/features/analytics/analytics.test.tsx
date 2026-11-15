import { act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '@/features/auth/api/types'
import { useSubmitReport } from '@/features/reports/model/mutations'
import { useConfirmPrice } from '@/features/reports/model/useConfirmPrice'
import { useCastVote } from '@/features/votes/model/useCastVote'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockAnalyticsRepository } from './api/mockAnalyticsRepository'
import { createSupabaseAnalyticsRepository } from './api/supabaseAnalyticsRepository'
import type { AnalyticsRepository } from './api/types'
import { useTrack, useTrackAppOpen, useTrackStationOpen } from './model/useTrack'

function spyAnalytics(track: AnalyticsRepository['track'] = () => Promise.resolve()) {
  const analytics = { track: vi.fn(track) }
  return analytics
}

const noSession: AuthRepository = { getSession: () => new Promise(() => undefined), signInAnonymously: () => new Promise(() => undefined) }

describe('repositorios de analytics', () => {
  it('Supabase llama track con el nombre y las props', async () => {
    const calls: unknown[] = []
    server.use(
      http.post(`${REST_URL}/rpc/track`, async ({ request }) => {
        calls.push(await request.json())
        return HttpResponse.json(null)
      }),
    )
    await createSupabaseAnalyticsRepository(createTestClient()).track({ name: 'share', props: { from: 'calculator' } })
    expect(calls).toEqual([{ p_name: 'share', p_props: { from: 'calculator' } }])
  })

  it('Supabase propaga el código de error de la RPC', async () => {
    server.use(http.post(`${REST_URL}/rpc/track`, () => postgrestError('RATE_LIMIT')))
    await expect(createSupabaseAnalyticsRepository(createTestClient()).track({ name: 'vote', props: {} })).rejects.toThrow('RATE_LIMIT')
  })

  it('el mock no registra nada', async () => {
    await expect(createMockAnalyticsRepository().track({ name: 'app_open', props: {} })).resolves.toBeUndefined()
  })
})

describe('useTrack', () => {
  it('envía con sesión y props vacías por defecto', async () => {
    const analytics = spyAnalytics()
    const { result } = renderWithProviders(() => useTrack(), { analytics })
    act(() => {
      result.current('app_open')
    })
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledExactlyOnceWith({ name: 'app_open', props: {} })
    })
  })

  it('sin sesión espera y no envía', async () => {
    const analytics = spyAnalytics()
    const { result } = renderWithProviders(() => useTrack(), { analytics, auth: noSession })
    act(() => {
      result.current('app_open')
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(analytics.track).not.toHaveBeenCalled()
  })

  it('un error del servidor no rompe nada ni llega a la UI', async () => {
    const analytics = spyAnalytics(() => Promise.reject(new Error('RATE_LIMIT')))
    const { result } = renderWithProviders(() => useTrack(), { analytics })
    act(() => {
      result.current('vote', { value: 1 })
    })
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledOnce()
    })
  })

  it('es estable entre renders (sirve como dependencia de efectos)', () => {
    const { result, rerender } = renderWithProviders(() => useTrack())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('eventos de pantalla', () => {
  it('app_open una sola vez aunque la app vuelva a renderizar', async () => {
    const analytics = spyAnalytics()
    const { rerender } = renderWithProviders(() => {
      useTrackAppOpen()
    }, { analytics })
    rerender()
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledExactlyOnceWith({ name: 'app_open', props: {} })
    })
  })

  it('station_open al abrir cada estación; sin estación no registra nada', async () => {
    const analytics = spyAnalytics()
    let stationId: string | null = null
    const { rerender } = renderWithProviders(() => {
      useTrackStationOpen(stationId)
    }, { analytics })
    stationId = 's1'
    rerender()
    rerender()
    stationId = 's2'
    rerender()
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledTimes(2)
    })
    expect(analytics.track.mock.calls.map(([event]) => event)).toEqual([
      { name: 'station_open', props: { station_id: 's1' } },
      { name: 'station_open', props: { station_id: 's2' } },
    ])
  })
})

describe('eventos de las mutaciones', () => {
  it('price_reported solo si el reporte llevaba precios', async () => {
    const analytics = spyAnalytics()
    const { result } = renderWithProviders(() => useSubmitReport(), { analytics })
    await act(() => result.current.mutateAsync({ stationId: 's1', prices: [], comment: 'Sin cola', services: {} }))
    await act(() => result.current.mutateAsync({
      stationId: 's1', prices: [{ fuelType: 'corriente', price: 15900 }, { fuelType: 'diesel', price: 11000 }], comment: '', services: {},
    }))
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledExactlyOnceWith({ name: 'price_reported', props: { station_id: 's1', fuels: 'corriente,diesel' } })
    })
  })

  it('price_confirmed al confirmar un precio', async () => {
    const analytics = spyAnalytics()
    const { result } = renderWithProviders(() => useConfirmPrice(), { analytics })
    await act(() => result.current.mutateAsync('p1'))
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledExactlyOnceWith({ name: 'price_confirmed', props: { price_id: 'p1' } })
    })
  })

  it('vote al votar', async () => {
    const analytics = spyAnalytics()
    const { result } = renderWithProviders(() => useCastVote(), { analytics })
    await act(() => result.current.mutateAsync({ targetType: 'report', targetId: 'r1', value: -1, current: { votesUp: 0, votesDown: 0, myVote: null } }))
    await waitFor(() => {
      expect(analytics.track).toHaveBeenCalledExactlyOnceWith({ name: 'vote', props: { target_type: 'report', value: -1 } })
    })
  })
})
