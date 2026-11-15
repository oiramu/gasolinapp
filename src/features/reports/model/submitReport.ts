import type { ReportsRepository } from '../api/types'
import { hasServices, type ReportDraft } from './reportForm'

export interface ReportSubmission extends Omit<ReportDraft, 'outOfRange'> {
  readonly stationId: string
}

export interface SubmitOutcome {
  /** Hubo sugerencia de servicios y cuáles quedaron aplicadas en la estación. */
  readonly suggestedServices: boolean
  readonly appliedServices: readonly string[]
}

/**
 * Envía un reporte: cada precio por `report_price`, el comentario por `add_report`
 * y los servicios por `suggest_station_services`. Va en orden: si una RPC falla
 * (p. ej. RATE_LIMIT), lo anterior ya quedó guardado y el error llega a la UI.
 */
export async function submitReport(repository: ReportsRepository, submission: ReportSubmission): Promise<SubmitOutcome> {
  const { stationId, prices, comment, services } = submission
  for (const entry of prices) await repository.reportPrice({ stationId, ...entry })
  if (comment !== '') await repository.addReport({ stationId, type: prices.length > 0 ? 'price' : 'comment', content: comment })
  const suggestedServices = hasServices(services)
  const appliedServices = suggestedServices ? await repository.suggestServices({ stationId, services }) : []
  return { suggestedServices, appliedServices }
}

const MESSAGES = {
  sent: '✓ ¡Reporte enviado! Gracias por contribuir.',
  applied: '✓ ¡Reporte enviado! Los servicios quedaron actualizados.',
  pending: '✓ ¡Reporte enviado! Los servicios se actualizan cuando otra persona los confirme.',
} as const

export function submitMessage({ suggestedServices, appliedServices }: SubmitOutcome): string {
  if (!suggestedServices) return MESSAGES.sent
  return appliedServices.length > 0 ? MESSAGES.applied : MESSAGES.pending
}
