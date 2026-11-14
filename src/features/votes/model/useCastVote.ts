import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWithSession } from '@/features/auth/model/session'
import { queryKeys } from '@/shared/api/queryKeys'
import { applyVote, type VoteOutcome } from '@/shared/domain/votes'
import type { VoteCommand } from '../api/types'
import { restoreSnapshot, takeSnapshot, writeOutcome, type VoteCacheSnapshot } from './voteCache'
import { useVotesRepository } from './votesRepository'

export interface CastVoteVariables extends VoteCommand {
  /** Lo que la UI muestra antes de votar: contadores y mi voto actual. */
  readonly current: VoteOutcome
}

/**
 * Command con rollback: aplica el voto en la caché al instante, lo revierte si la RPC
 * falla y, si sale bien, reemplaza la predicción por la respuesta del servidor.
 */
export function useCastVote() {
  const repository = useVotesRepository()
  const queryClient = useQueryClient()

  return useMutation<VoteOutcome, Error, CastVoteVariables, VoteCacheSnapshot>({
    mutationFn: useWithSession(({ targetType, targetId, value }: CastVoteVariables) => repository.cast({ targetType, targetId, value })),
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.stations }),
        queryClient.cancelQueries({ queryKey: queryKeys.myVotesAll }),
      ])
      const snapshot = takeSnapshot(queryClient)
      writeOutcome(queryClient, variables, applyVote(variables.current, variables.value))
      return snapshot
    },
    onError: (_error, _variables, snapshot) => {
      restoreSnapshot(queryClient, snapshot)
    },
    onSuccess: (outcome, variables) => {
      writeOutcome(queryClient, variables, outcome)
    },
  })
}
