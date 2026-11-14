import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import type { PriceReport, Vote } from '../api/types'
import { useReportsRepository } from './reportsRepository'

/** Reportar precios. Al terminar se refrescan las estaciones y los promedios por zona. */
export function useSubmitPriceReport() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (report: PriceReport) => repository.submitPriceReport(report),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.zoneAverages }),
      ]),
  })
}

/** Votar un reporte. La versión optimista con rollback llega con la RPC `cast_vote` (1.2). */
export function useVoteOnReport() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vote: Vote) => repository.vote(vote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stations }),
  })
}
