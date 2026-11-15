import { QueryClient } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories, type Repositories } from '@/app/repositories'

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })

/** renderHook con QueryClient y repositorios inyectados (mock por defecto, sobrescribibles). */
export function renderWithProviders<T>(hook: () => T, overrides: Partial<Repositories> = {}, queryClient = createTestQueryClient()) {
  const repositories: Repositories = { ...createMockRepositories(0), ...overrides }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders repositories={repositories} queryClient={queryClient}>
      {children}
    </AppProviders>
  )
  return { ...renderHook(hook, { wrapper }), queryClient, repositories }
}
