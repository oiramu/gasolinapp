import type { Station } from '../api/types'
import { useStationsQuery } from './stationsQuery'
import { useStationsRealtime } from './useStationsRealtime'

const NO_STATIONS: readonly Station[] = []

export interface StationsState {
  readonly stations: readonly Station[]
  readonly loading: boolean
  readonly error: string | null
}

/** Estaciones activas siempre frescas (query + realtime), con la forma que espera `App`. */
export function useStations(): StationsState {
  const { data, isPending, error } = useStationsQuery()
  useStationsRealtime()
  return { stations: data ?? NO_STATIONS, loading: isPending, error: error?.message ?? null }
}
