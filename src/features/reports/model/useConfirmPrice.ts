import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTrack } from '@/features/analytics/model/useTrack'
import { useWithSession } from '@/features/auth/model/session'
import type { Station } from '@/features/stations/api/types'
import { patchConfirmed } from '@/features/stations/model/stationsCache'
import { queryKeys } from '@/shared/api/queryKeys'
import { useReportsRepository } from './reportsRepository'

interface StationsSnapshot {
  readonly stations: readonly Station[] | undefined
}

/** Rollback. Sin snapshot (si falló `onMutate`) no hay nada que revertir. */
export function restoreStations(queryClient: QueryClient, snapshot: StationsSnapshot | undefined): void {
  if (!snapshot) return
  queryClient.setQueryData(queryKeys.stations, snapshot.stations)
}

/**
 * Command con rollback: el precio queda confirmado "ahora" al instante (su frescura sube),
 * se revierte si la RPC falla y, si sale bien, se usa el `confirmed_at` del servidor (y `price_confirmed`).
 */
export function useConfirmPrice() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  const track = useTrack()
  const writeConfirmed = (priceId: string, confirmedAt: string) => {
    queryClient.setQueryData<readonly Station[]>(queryKeys.stations, (stations) => stations && patchConfirmed(stations, priceId, confirmedAt))
  }

  return useMutation<string, Error, string, StationsSnapshot>({
    mutationFn: useWithSession((priceId: string) => repository.confirmPrice(priceId)),
    onMutate: async (priceId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.stations })
      const snapshot = { stations: queryClient.getQueryData<readonly Station[]>(queryKeys.stations) }
      writeConfirmed(priceId, new Date().toISOString())
      return snapshot
    },
    onError: (_error, _priceId, snapshot) => {
      restoreStations(queryClient, snapshot)
    },
    onSuccess: (confirmedAt, priceId) => {
      writeConfirmed(priceId, confirmedAt)
      track('price_confirmed', { price_id: priceId })
    },
  })
}
