import { assertOk } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { toCommentRow, toPriceRows } from './priceRows'
import type { ReportsRepository } from './types'

/**
 * Escrituras directas a tablas con políticas públicas. La tarea 1.3 las reemplaza
 * por RPCs con auth.uid() y límites de tasa (los votos ya van por RPC: features/votes).
 */
export function createSupabaseReportsRepository(client: AppSupabaseClient): ReportsRepository {
  return {
    async submitPriceReport(report) {
      // Un solo INSERT para todos los combustibles: es atómico (antes era uno por combustible)
      const rows = toPriceRows(report)
      if (rows.length > 0) assertOk(await client.from('fuel_prices').insert(rows))
      const commentRow = toCommentRow(report)
      if (commentRow) assertOk(await client.from('reports').insert(commentRow))
    },
  }
}
