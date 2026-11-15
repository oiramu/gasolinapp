import { createRepositoryContext } from '@/shared/api/repositoryContext'
import type { AuthRepository } from '../api/types'

export const { Provider: AuthRepositoryProvider, useRepository: useAuthRepository } =
  createRepositoryContext<AuthRepository>('auth')
