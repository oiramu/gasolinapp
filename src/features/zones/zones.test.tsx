import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockZonesRepository, MOCK_ZONES } from './api/mockZonesRepository'
import { createSupabaseZonesRepository } from './api/supabaseZonesRepository'
import { useZones } from './model/useZones'

describe('createSupabaseZonesRepository', () => {
  it('llama la RPC get_zone_averages', async () => {
    server.use(http.post(`${REST_URL}/rpc/get_zone_averages`, () => HttpResponse.json(MOCK_ZONES)))
    expect(await createSupabaseZonesRepository(createTestClient()).listAverages()).toEqual(MOCK_ZONES)
  })

  it('propaga el error', async () => {
    server.use(http.post(`${REST_URL}/rpc/get_zone_averages`, () => postgrestError('rpc caída')))
    await expect(createSupabaseZonesRepository(createTestClient()).listAverages()).rejects.toThrow('rpc caída')
  })
})

describe('createMockZonesRepository', () => {
  it('devuelve zonas de Barranquilla con promedios en COP', async () => {
    vi.useFakeTimers()
    const pending = createMockZonesRepository().listAverages()
    await vi.runAllTimersAsync()
    const zones = await pending
    vi.useRealTimers()
    expect(zones).toHaveLength(5)
    expect(zones.every((zone) => zone.city === 'Barranquilla' && (zone.avg_corriente ?? 0) > 1000)).toBe(true)
  })
})

describe('useZones', () => {
  it('devuelve una lista vacía y luego las zonas', async () => {
    const { result } = renderWithProviders(() => useZones())
    expect(result.current).toEqual([])
    await waitFor(() => {
      expect(result.current).toEqual(MOCK_ZONES)
    })
  })
})
