import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { ZonesRepository } from '../api/types'

export const { Provider: ZonesRepositoryProvider, useRepository: useZonesRepository } =
  createRepositoryContext<ZonesRepository>('zones')
