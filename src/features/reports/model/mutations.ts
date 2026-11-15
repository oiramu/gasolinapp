import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWithSession } from '@/features/auth/model/session'
import { queryKeys } from '@/shared/api/queryKeys'
import { useReportsRepository } from './reportsRepository'
import { submitReport, type ReportSubmission } from './submitReport'

/**
 * Enviar un reporte (solo con sesión). El realtime ya parchea las estaciones con
 * cada precio, reporte o servicio; aquí solo se refrescan los promedios por zona.
 */
export function useSubmitReport() {
  const repository = useReportsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: useWithSession((submission: ReportSubmission) => submitReport(repository, submission)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.zoneAverages }),
  })
}
