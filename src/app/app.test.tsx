import { describe, expect, it } from 'vitest'
import { createQueryClient, STALE_TIME_MS } from './queryClient'
import { createMockRepositories, createRepositories } from './repositories'

const REPOSITORY_NAMES = ['analytics', 'auth', 'prices', 'reports', 'stations', 'votes', 'zones']

describe('createRepositories (Strategy)', () => {
  it('en modo mock usa los repositorios en memoria', () => {
    const repositories = createRepositories({ dataSource: 'mock' })
    expect(Object.keys(repositories).sort()).toEqual(REPOSITORY_NAMES)
    expect(Object.keys(createMockRepositories(0)).sort()).toEqual(REPOSITORY_NAMES)
  })

  it('los votos mock parten de los contadores de las estaciones mock (o de cero si no existe)', async () => {
    const { votes } = createMockRepositories(0)
    await expect(votes.cast({ targetType: 'report', targetId: 'r1', value: -1 })).resolves.toEqual({ votesUp: 0, votesDown: 1, myVote: -1 })
    await expect(votes.cast({ targetType: 'report', targetId: 'no-existe', value: 1 })).resolves.toEqual({ votesUp: 1, votesDown: 0, myVote: 1 })
  })

  it('en modo Supabase crea el cliente y los repositorios remotos', () => {
    const repositories = createRepositories({ dataSource: 'supabase', supabase: { url: 'http://supabase.test', anonKey: 'anon' }, captchaSiteKey: null })
    expect(Object.keys(repositories).sort()).toEqual(REPOSITORY_NAMES)
  })

  it('con clave de Turnstile compone el captcha sin descargar el script hasta el alta', () => {
    const supabase = { url: 'http://supabase.test', anonKey: 'anon' }
    const repositories = createRepositories({ dataSource: 'supabase', supabase, captchaSiteKey: '1x00000000000000000000BB' })
    expect(Object.keys(repositories).sort()).toEqual(REPOSITORY_NAMES)
    expect(document.querySelector('script[src*="turnstile"]')).toBeNull()
  })
})

describe('createQueryClient', () => {
  it('no recarga al enfocar y considera vigentes los datos 5 minutos', () => {
    const queries = createQueryClient().getDefaultOptions().queries
    expect(queries).toMatchObject({ staleTime: STALE_TIME_MS, retry: 1, refetchOnWindowFocus: false })
  })
})
