import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { ReportsRepository } from './types'

/** En modo mock las escrituras se aceptan y no persisten. */
export function createMockReportsRepository(latencyMs = MOCK_LATENCY_MS): ReportsRepository {
  return {
    async submitPriceReport() {
      await delay(latencyMs)
    },
  }
}
