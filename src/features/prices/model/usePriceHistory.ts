import { skipToken, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import type { DailyPrice } from '../api/types'
import { usePricesRepository } from './pricesRepository'

const NO_HISTORY: readonly DailyPrice[] = []

export interface PriceHistoryState {
  readonly data: readonly DailyPrice[]
  readonly loading: boolean
}

/** Historial diario de una estación y combustible para los últimos `days` días. */
export function usePriceHistory(stationId: string | null, fuelType: string | null, days: number): PriceHistoryState {
  const repository = usePricesRepository()
  const { data, isPending } = useQuery({
    queryKey: queryKeys.priceHistory(stationId, fuelType, days),
    queryFn: stationId && fuelType ? () => repository.history({ stationId, fuelType, days }) : skipToken,
  })
  return { data: data ?? NO_HISTORY, loading: isPending }
}
