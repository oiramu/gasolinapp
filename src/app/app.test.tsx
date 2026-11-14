import { describe, expect, it } from 'vitest'
import { createQueryClient, STALE_TIME_MS } from './queryClient'
import { createMockRepositories, createRepositories } from './repositories'

const REPOSITORY_NAMES = ['auth', 'prices', 'reports', 'stations', 'zones']

describe('createRepositories (Strategy)', () => {
  it('en modo mock usa los repositorios en memoria', () => {
    const repositories = createRepositories({ dataSource: 'mock' })
    expect(Object.keys(repositories).sort()).toEqual(REPOSITORY_NAMES)
    expect(Object.keys(createMockRepositories(0)).sort()).toEqual(REPOSITORY_NAMES)
  })

  it('en modo Supabase crea el cliente y los repositorios remotos', () => {
    const repositories = createRepositories({ dataSource: 'supabase', supabase: { url: 'http://supabase.test', anonKey: 'anon' } })
    expect(Object.keys(repositories).sort()).toEqual(REPOSITORY_NAMES)
  })
})

describe('createQueryClient', () => {
  it('no recarga al enfocar y considera vigentes los datos 5 minutos', () => {
    const queries = createQueryClient().getDefaultOptions().queries
    expect(queries).toMatchObject({ staleTime: STALE_TIME_MS, retry: 1, refetchOnWindowFocus: false })
  })
})
