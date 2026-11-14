import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StationChange, StationsRepository } from '@/features/stations/api/types'
import { queryKeys } from '@/shared/api/queryKeys'
import { fuelPrice, station } from '@/test/fixtures/stations'
import { renderWithProviders } from '@/test/renderWithProviders'
import { INVALIDATE_DEBOUNCE_MS } from './useStationsRealtime'
import { useStations } from './useStations'

/** Repositorio controlable: el test decide qué devuelve `list` y qué cambios emite. */
const controllableRepository = (list: StationsRepository['list']) => {
  let emit: (change: StationChange) => void = () => undefined
  const unsubscribe = vi.fn()
  const listSpy = vi.fn(list)
  const repository: StationsRepository = {
    list: listSpy,
    subscribe: (listener) => {
      emit = listener
      return unsubscribe
    },
  }
  return { repository, listSpy, unsubscribe, emit: (change: StationChange) => { emit(change) } }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useStations', () => {
  it('carga las estaciones', async () => {
    const { repository } = controllableRepository(() => Promise.resolve([station()]))
    const { result } = renderWithProviders(() => useStations(), { stations: repository })
    expect(result.current).toMatchObject({ stations: [], loading: true, error: null })
    await waitFor(() => {
      expect(result.current.stations).toEqual([station()])
    })
    expect(result.current.loading).toBe(false)
  })

  it('expone el mensaje de error', async () => {
    const { repository } = controllableRepository(() => Promise.reject(new Error('sin red')))
    const { result } = renderWithProviders(() => useStations(), { stations: repository })
    await waitFor(() => {
      expect(result.current.error).toBe('sin red')
    })
  })

  it('parchea la caché con cada cambio sin volver a pedir la lista', async () => {
    const { repository, listSpy, emit } = controllableRepository(() => Promise.resolve([station()]))
    const { result } = renderWithProviders(() => useStations(), { stations: repository })
    await waitFor(() => {
      expect(result.current.stations).toHaveLength(1)
    })
    const price = fuelPrice({ id: 'p2', price: 16100 })
    act(() => {
      emit({ kind: 'price-saved', stationId: 's1', price })
    })
    await waitFor(() => {
      expect(result.current.stations[0]?.fuel_prices).toContainEqual(price)
    })
    expect(listSpy).toHaveBeenCalledTimes(1)
  })

  it('agrupa los cambios que no puede parchear en una sola recarga', async () => {
    const { repository, listSpy, emit } = controllableRepository(() => Promise.resolve([station()]))
    const { queryClient } = renderWithProviders(() => useStations(), { stations: repository })
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1)
    })
    vi.useFakeTimers()
    act(() => {
      emit({ kind: 'unknown' })
      emit({ kind: 'unknown' })
    })
    await act(() => vi.advanceTimersByTimeAsync(INVALIDATE_DEBOUNCE_MS))
    vi.useRealTimers()
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2)
    })
    expect(queryClient.getQueryData(queryKeys.stations)).toEqual([station()])
  })

  it('invalida si llega un cambio antes de tener datos, y se desuscribe al desmontar', async () => {
    const { repository, emit, unsubscribe } = controllableRepository(() => new Promise(() => undefined))
    const { unmount, queryClient } = renderWithProviders(() => useStations(), { stations: repository })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.useFakeTimers()
    act(() => {
      emit({ kind: 'price-saved', stationId: 's1', price: fuelPrice() })
    })
    await act(() => vi.advanceTimersByTimeAsync(INVALIDATE_DEBOUNCE_MS))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.stations })
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
