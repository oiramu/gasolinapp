import { QueryClient } from '@tanstack/react-query'

const MS_PER_MINUTE = 60_000
const STALE_MINUTES = 5

/** El realtime mantiene frescas las estaciones; el resto se considera vigente 5 minutos. */
export const STALE_TIME_MS = STALE_MINUTES * MS_PER_MINUTE

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, retry: 1, refetchOnWindowFocus: false },
    },
  })
}
