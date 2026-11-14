import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { ReportsRepository } from '../api/types'

export const { Provider: ReportsRepositoryProvider, useRepository: useReportsRepository } =
  createRepositoryContext<ReportsRepository>('reports')
