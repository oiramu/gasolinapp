import type { VoteOutcome, VoteTarget, VoteTargetType, VoteValue } from '@/shared/domain/votes'

export interface VoteCommand extends VoteTarget {
  readonly value: VoteValue
}

/** Mi voto por id de objetivo; cada id pedido tiene entrada (null = sin voto). */
export type MyVotes = Readonly<Record<string, VoteValue | null>>

/** Puerto de votos. Supabase vota por la RPC `cast_vote`; el mock lo simula en memoria. */
export interface VotesRepository {
  cast(command: VoteCommand): Promise<VoteOutcome>
  listMine(targetType: VoteTargetType, targetIds: readonly string[]): Promise<MyVotes>
}
