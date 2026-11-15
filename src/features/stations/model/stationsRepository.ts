import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { StationsRepository } from '../api/types'

export const { Provider: StationsRepositoryProvider, useRepository: useStationsRepository } =
  createRepositoryContext<StationsRepository>('stations')
