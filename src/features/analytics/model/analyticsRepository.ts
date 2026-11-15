import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { AnalyticsRepository } from '../api/types'

export const { Provider: AnalyticsRepositoryProvider, useRepository: useAnalyticsRepository } =
  createRepositoryContext<AnalyticsRepository>('analytics')
