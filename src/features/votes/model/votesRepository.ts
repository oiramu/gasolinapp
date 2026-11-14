import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { VotesRepository } from '../api/types'

export const { Provider: VotesRepositoryProvider, useRepository: useVotesRepository } =
  createRepositoryContext<VotesRepository>('votes')
