import { toVoteValue, type VoteTargetType, type VoteValue } from '@/shared/domain/votes'
import type { MyVotes } from './types'

interface MyVoteRow {
  readonly target_type: string
  readonly target_id: string
  readonly value: number
}

/** Filas de `get_my_votes` → un voto (o null) por cada id pedido del tipo indicado. */
export function toMyVotes(targetType: VoteTargetType, targetIds: readonly string[], rows: readonly MyVoteRow[]): MyVotes {
  const mine = new Map<string, VoteValue | null>(
    rows.filter((row) => row.target_type === targetType).map((row) => [row.target_id, toVoteValue(row.value)]),
  )
  return Object.fromEntries(targetIds.map((id) => [id, mine.get(id) ?? null]))
}
