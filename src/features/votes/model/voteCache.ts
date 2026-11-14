import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { Station } from '@/features/stations/api/types'
import { patchVotes } from '@/features/stations/model/stationsCache'
import { queryKeys } from '@/shared/api/queryKeys'
import type { VoteOutcome, VoteTarget, VoteValue } from '@/shared/domain/votes'
import type { MyVotes } from '../api/types'

// Escrituras de un voto en la caché: contadores en las estaciones y "mi voto" en las listas de votos.

export interface VoteCacheSnapshot {
  readonly stations: readonly Station[] | undefined
  readonly myVotes: readonly (readonly [QueryKey, MyVotes | undefined])[]
}

const withMyVote = (mine: MyVotes, targetId: string, vote: VoteValue | null): MyVotes =>
  targetId in mine ? { ...mine, [targetId]: vote } : mine

export function takeSnapshot(queryClient: QueryClient): VoteCacheSnapshot {
  return {
    stations: queryClient.getQueryData<readonly Station[]>(queryKeys.stations),
    myVotes: queryClient.getQueriesData<MyVotes>({ queryKey: queryKeys.myVotesAll }),
  }
}

/** Rollback. Sin snapshot (si falló `onMutate`) no hay nada que revertir. */
export function restoreSnapshot(queryClient: QueryClient, snapshot: VoteCacheSnapshot | undefined): void {
  if (!snapshot) return
  queryClient.setQueryData(queryKeys.stations, snapshot.stations)
  for (const [key, mine] of snapshot.myVotes) queryClient.setQueryData(key, mine)
}

export function writeOutcome(queryClient: QueryClient, target: VoteTarget, outcome: VoteOutcome): void {
  queryClient.setQueryData<readonly Station[]>(queryKeys.stations, (stations) => stations && patchVotes(stations, target, outcome))
  queryClient.setQueriesData<MyVotes>({ queryKey: queryKeys.myVotesAll }, (mine) => mine && withMyVote(mine, target.targetId, outcome.myVote))
}
