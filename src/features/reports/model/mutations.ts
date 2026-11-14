import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWithSession } from '@/features/auth/model/session'
import { queryKeys } from '@/shared/api/queryKeys'
import type { PriceReport } from '../api/types'
import { useReportsRepository } from './reportsRepository'

/** Reportar precios (solo con sesión). Al terminar se refrescan las estaciones y los promedios por zona. */
export function useSubmitPriceReport() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: useWithSession((report: PriceReport) => repository.submitPriceReport(report)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.zoneAverages }),
      ]),
  })
}
