import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/features/auth/model/session'
import { queryKeys } from '@/shared/api/queryKeys'
import type { VoteTargetType } from '@/shared/domain/votes'
import type { MyVotes } from '../api/types'
import { useVotesRepository } from './votesRepository'

const NO_VOTES: MyVotes = {}

/**
 * Mis votos sobre una lista de objetivos (p. ej. los reportes de la estación abierta).
 * Todos los componentes que pasan la misma lista comparten una sola petición.
 */
export function useMyVotes(targetType: VoteTargetType, targetIds: readonly string[]): MyVotes {
  const repository = useVotesRepository()
  const session = useSession()
  const { data } = useQuery({
    queryKey: queryKeys.myVotes(session?.userId ?? null, targetType, targetIds),
    queryFn: () => repository.listMine(targetType, targetIds),
    enabled: session !== null && targetIds.length > 0,
  })
  return data ?? NO_VOTES
}
