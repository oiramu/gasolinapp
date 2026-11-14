import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import { MOCK_STATIONS } from './mockStations'
import type { Station, StationsRepository } from './types'

/** Repositorio en memoria para el modo mock y los tests. No emite cambios en tiempo real. */
export function createMockStationsRepository(
  stations: readonly Station[] = MOCK_STATIONS,
  latencyMs = MOCK_LATENCY_MS,
): StationsRepository {
  return {
    async list() {
      await delay(latencyMs)
      return [...stations]
    },
    subscribe() {
      return () => undefined
    },
  }
}
