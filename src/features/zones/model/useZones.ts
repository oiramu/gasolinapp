import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import type { ZoneAverage } from '../api/types'
import { useZonesRepository } from './zonesRepository'

const NO_ZONES: readonly ZoneAverage[] = []

/** Promedios por zona para el zoom lejano. */
export function useZones(): readonly ZoneAverage[] {
  const repository = useZonesRepository()
  const { data } = useQuery({ queryKey: queryKeys.zoneAverages, queryFn: () => repository.listAverages() })
  return data ?? NO_ZONES
}
