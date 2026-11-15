import type { AnalyticsRepository } from './types'

/** En modo mock no se mide nada. */
export function createMockAnalyticsRepository(): AnalyticsRepository {
  return {
    track: () => Promise.resolve(),
  }
}
