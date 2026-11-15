import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/shared/api/queryKeys'
import { debounce } from '@/shared/lib/debounce'
import type { Station } from '../api/types'
import { applyStationChange } from './stationsCache'
import { useStationsRepository } from './stationsRepository'

/** Agrupa ráfagas de cambios que no se pueden parchear en una sola recarga. */
export const INVALIDATE_DEBOUNCE_MS = 1000

/** Observer del realtime: parchea la caché con cada cambio; si no puede, invalida con debounce. */
export function useStationsRealtime(): void {
  const repository = useStationsRepository()
  const queryClient = useQueryClient()

  useEffect(() => {
    const invalidate = debounce(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stations })
    }, INVALIDATE_DEBOUNCE_MS)

    const unsubscribe = repository.subscribe((change) => {
      const cached = queryClient.getQueryData<readonly Station[]>(queryKeys.stations)
      const patched = cached ? applyStationChange(cached, change) : null
      if (patched) queryClient.setQueryData(queryKeys.stations, patched)
      else invalidate()
    })

    return () => {
      unsubscribe()
      invalidate.cancel()
    }
  }, [repository, queryClient])
}
