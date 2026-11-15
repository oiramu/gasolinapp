import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { PricesRepository } from '../api/types'

export const { Provider: PricesRepositoryProvider, useRepository: usePricesRepository } =
  createRepositoryContext<PricesRepository>('prices')
