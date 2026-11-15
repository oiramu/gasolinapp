import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { ReportsRepository } from './types'

/** En modo mock las escrituras se aceptan y no persisten; ninguna sugerencia se aplica y confirmar es "ahora". */
export function createMockReportsRepository(latencyMs = MOCK_LATENCY_MS): ReportsRepository {
  return {
    async reportPrice() {
      await delay(latencyMs)
    },
    async addReport() {
      await delay(latencyMs)
    },
    async suggestServices() {
      await delay(latencyMs)
      return []
    },
    async confirmPrice() {
      await delay(latencyMs)
      return new Date().toISOString()
    },
  }
}
