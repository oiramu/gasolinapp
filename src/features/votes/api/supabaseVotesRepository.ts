import { unwrap, unwrapList } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { toVoteValue } from '@/shared/domain/votes'
import { toMyVotes } from './myVotes'
import type { VotesRepository } from './types'

interface CastVoteRow {
  readonly votes_up: number
  readonly votes_down: number
  readonly my_vote: number | null
}

/** Votos por RPC: el servidor valida la sesión, el objetivo y el valor, y recalcula los contadores. */
export function createSupabaseVotesRepository(client: AppSupabaseClient): VotesRepository {
  return {
    async cast({ targetType, targetId, value }) {
      const args = { p_target_type: targetType, p_target_id: targetId, p_value: value }
      const row = unwrap<CastVoteRow>(await client.rpc('cast_vote', args).single())
      return { votesUp: row.votes_up, votesDown: row.votes_down, myVote: toVoteValue(row.my_vote) }
    },

    async listMine(targetType, targetIds) {
      const rows = unwrapList(await client.rpc('get_my_votes', { p_target_ids: [...targetIds] }))
      return toMyVotes(targetType, targetIds, rows)
    },
  }
}
