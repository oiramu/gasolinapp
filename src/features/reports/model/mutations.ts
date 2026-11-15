import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTrack } from '@/features/analytics/model/useTrack'
import { useWithSession } from '@/features/auth/model/session'
import { queryKeys } from '@/shared/api/queryKeys'
import { useReportsRepository } from './reportsRepository'
import { submitReport, type ReportSubmission, type SubmitOutcome } from './submitReport'

/**
 * Enviar un reporte (solo con sesión). El realtime ya parchea las estaciones con
 * cada precio, reporte o servicio; aquí solo se refrescan los promedios por zona.
 * Si llevaba precios, registra `price_reported`.
 */
export function useSubmitReport() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  const track = useTrack()
  return useMutation<SubmitOutcome, Error, ReportSubmission>({
    mutationFn: useWithSession((submission: ReportSubmission) => submitReport(repository, submission)),
    onSuccess: (_outcome, { stationId, prices }) => {
      if (prices.length > 0) track('price_reported', { station_id: stationId, fuels: prices.map((entry) => entry.fuelType).join(',') })
      return queryClient.invalidateQueries({ queryKey: queryKeys.zoneAverages })
    },
  })
}
