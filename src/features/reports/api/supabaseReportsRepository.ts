import { assertOk } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { toCommentRow, toPriceRows } from './priceRows'
import type { ReportsRepository, VoteType } from './types'

const VOTE_COLUMNS = { up: 'votes_up', down: 'votes_down' } as const satisfies Record<VoteType, string>

/**
 * Escrituras directas a tablas con políticas públicas. Las tareas 1.2 (votos) y
 * 1.3 (reportes) las reemplazan por RPCs con auth.uid() y límites de tasa.
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

    async vote({ reportId, voteType }) {
      const column = VOTE_COLUMNS[voteType]
      const { data } = await client.from('reports').select('votes_up, votes_down').eq('id', reportId).single()
      const current = data?.[column] ?? 0
      assertOk(await client.from('reports').update({ [column]: current + 1 }).eq('id', reportId))
    },
  }
}
