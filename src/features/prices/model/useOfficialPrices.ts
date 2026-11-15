import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '@/shared/api/queryKeys'
import { cityKey } from '@/shared/domain/cities'
import type { OfficialPrice } from '@/shared/domain/displayPrice'
import type { FuelType } from '@/shared/domain/fuel'
import type { CityOfficialPrice } from '../api/types'
import { usePricesRepository } from './pricesRepository'

/** Precio oficial vigente para una ciudad (de la zona de la estación) y un combustible. */
export type OfficialPriceLookup = (city: string | null | undefined, fuelType: FuelType) => OfficialPrice | undefined

/** Cambian una vez al mes: con refrescar cada 6 horas basta. */
const OFFICIAL_STALE_MS = 21_600_000

const NO_PRICES: readonly CityOfficialPrice[] = []

export function buildOfficialLookup(prices: readonly CityOfficialPrice[]): OfficialPriceLookup {
  const byKey = new Map(prices.map((p) => [`${cityKey(p.city)}|${p.fuelType}`, { price: p.price, validFrom: p.validFrom }]))
  return (city, fuelType) => (city ? byKey.get(`${cityKey(city)}|${fuelType}`) : undefined)
}

export function useOfficialPrices(): OfficialPriceLookup {
  const repository = usePricesRepository()
  const { data = NO_PRICES } = useQuery({
    queryKey: queryKeys.officialPrices,
    queryFn: () => repository.officialPrices(),
    staleTime: OFFICIAL_STALE_MS,
  })
  return useMemo(() => buildOfficialLookup(data), [data])
}
