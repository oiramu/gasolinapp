import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { fuelPrice, report, stationFields } from '@/test/fixtures/stations'
import { server } from '@/test/msw/server'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { MOCK_STATIONS } from './mockStations'
import { createMockStationsRepository } from './mockStationsRepository'
import { createSupabaseStationsRepository, REALTIME_CHANNEL } from './supabaseStationsRepository'

describe('createSupabaseStationsRepository.list', () => {
  it('pide solo estaciones activas y adapta las filas', async () => {
    let query: URLSearchParams | undefined
    server.use(
      http.get(`${REST_URL}/stations`, ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json([{ ...stationFields(), fuel_prices: [fuelPrice(), { ...fuelPrice(), fuel_type: 'super' }], reports: [report()] }])
      }),
    )
    const stations = await createSupabaseStationsRepository(createTestClient()).list()
    expect(query?.get('is_active')).toBe('eq.true')
    expect(query?.get('is_test')).toBe('eq.false')
    expect(query?.get('select')).toContain('fuel_prices')
    expect(stations).toEqual([{ ...stationFields(), fuel_prices: [fuelPrice()], reports: [report()] }])
  })

  it('propaga el error de PostgREST', async () => {
    server.use(http.get(`${REST_URL}/stations`, () => postgrestError('sin permiso')))
    await expect(createSupabaseStationsRepository(createTestClient()).list()).rejects.toThrow('sin permiso')
  })
})

describe('createSupabaseStationsRepository.subscribe', () => {
  const fakeClient = () => {
    const handlers = new Map<string, (payload: unknown) => void>()
    const channel = {
      on: vi.fn((_type: string, filter: { table: string }, handler: (payload: unknown) => void) => {
        handlers.set(filter.table, handler)
        return channel
      }),
      subscribe: vi.fn(() => channel),
    }
    const client = { channel: vi.fn(() => channel), removeChannel: vi.fn(() => Promise.resolve('ok')) }
    return { client, channel, handlers }
  }

  it('traduce los eventos de las tres tablas y se desuscribe', () => {
    const { client, channel, handlers } = fakeClient()
    const listener = vi.fn()
    const unsubscribe = createSupabaseStationsRepository(client as unknown as AppSupabaseClient).subscribe(listener)

    expect(client.channel).toHaveBeenCalledWith(REALTIME_CHANNEL)
    expect([...handlers.keys()]).toEqual(['fuel_prices', 'reports', 'stations'])
    expect(channel.subscribe).toHaveBeenCalled()

    const event = { eventType: 'DELETE', new: {}, old: {} }
    for (const handler of handlers.values()) handler(event)
    expect(listener).toHaveBeenCalledTimes(3)
    expect(listener).toHaveBeenCalledWith({ kind: 'unknown' })

    unsubscribe()
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })
})

describe('createMockStationsRepository', () => {
  it('devuelve las estaciones de desarrollo, sin realtime', async () => {
    const repository = createMockStationsRepository(MOCK_STATIONS, 0)
    expect(await repository.list()).toEqual(MOCK_STATIONS)
    const unsubscribe = repository.subscribe(vi.fn())
    expect(unsubscribe).not.toThrow()
  })

  it('usa los datos de desarrollo por defecto, en COP y con su unidad', async () => {
    vi.useFakeTimers()
    const pending = createMockStationsRepository().list()
    await vi.runAllTimersAsync()
    const stations = await pending
    vi.useRealTimers()
    const prices = stations.flatMap((s) => s.fuel_prices)
    expect(stations).toHaveLength(7)
    expect(prices.every((p) => p.price > 1000)).toBe(true)
    expect(prices.find((p) => p.fuel_type === 'gnv')?.price_unit).toBe('m3')
    expect(stations.find((s) => s.id === '1')?.has_gnv).toBe(true)
  })
})
