import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { CityOfficialPrice, PricesRepository } from './types'

/** Datos mock en Barranquilla: precios oficiales de noviembre de 2026 (CREG). */
export const MOCK_OFFICIAL_PRICES: readonly CityOfficialPrice[] = [
  { city: 'Barranquilla', fuelType: 'corriente', price: 15964, validFrom: '2026-11-01' },
  { city: 'Barranquilla', fuelType: 'diesel', price: 11291, validFrom: '2026-11-01' },
]

/** En modo mock no hay historial: la gráfica muestra su estado vacío y la calculadora no compara. */
export function createMockPricesRepository(latencyMs = MOCK_LATENCY_MS): PricesRepository {
  return {
    async history() {
      await delay(latencyMs)
      return []
    },
    async referencePrice() {
      await delay(latencyMs)
      return null
    },
    async officialPrices() {
      await delay(latencyMs)
      return MOCK_OFFICIAL_PRICES
    },
  }
}
