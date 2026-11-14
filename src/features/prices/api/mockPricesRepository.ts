import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { PricesRepository } from './types'

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
  }
}
