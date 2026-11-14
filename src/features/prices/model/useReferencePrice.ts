import { skipToken, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import { usePricesRepository } from './pricesRepository'

/** Precio de referencia de hace ~30 días para la calculadora. Mientras no hay dato → null. */
export function useReferencePrice(stationId: string | null, fuelType: string | null, enabled: boolean): number | null {
  const repository = usePricesRepository()
  const { data } = useQuery({
    queryKey: queryKeys.referencePrice(stationId, fuelType),
    queryFn: enabled && fuelType ? () => repository.referencePrice({ stationId, fuelType }) : skipToken,
  })
  return data ?? null
}
