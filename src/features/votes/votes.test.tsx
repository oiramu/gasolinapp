import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories, type Repositories } from '@/app/repositories'
import type { AuthRepository } from '@/features/auth/api/types'
import type { Station } from '@/features/stations/api/types'
import { queryKeys } from '@/shared/api/queryKeys'
import type { VoteOutcome } from '@/shared/domain/votes'
import { report, station } from '@/test/fixtures/stations'
import { createTestQueryClient, renderWithProviders } from '@/test/renderWithProviders'
import { createMockVotesRepository } from './api/mockVotesRepository'
import type { MyVotes, VotesRepository } from './api/types'
import { useCastVote } from './model/useCastVote'
import { useMyVotes } from './model/useMyVotes'
import { restoreSnapshot, writeOutcome } from './model/voteCache'
import { ReportVotes } from './ui/ReportVotes'

const USER = '0f1e2d3c-4b5a-4687-9a0b-1c2d3e4f5a6b' // MOCK_USER_ID
const mineKey = queryKeys.myVotes(USER, 'report', ['r1'])
const target = { targetType: 'report', targetId: 'r1' } as const

/** Promesa que el test resuelve o rechaza cuando quiere, para ver el estado optimista. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const noSession: AuthRepository = { getSession: () => new Promise(() => undefined), signInAnonymously: () => new Promise(() => undefined) }

describe('useMyVotes', () => {
  it('pide mis votos con sesión', async () => {
    const votes = createMockVotesRepository(undefined, 0)
    await votes.cast({ ...target, value: -1 })
    const { result } = renderWithProviders(() => useMyVotes('report', ['r1', 'r2']), { votes })
    await waitFor(() => {
      expect(result.current).toEqual({ r1: -1, r2: null })
    })
  })

  it('sin sesión o sin ids no pide nada', () => {
    const votes = createMockVotesRepository(undefined, 0)
    const listMine = vi.spyOn(votes, 'listMine')
    expect(renderWithProviders(() => useMyVotes('report', ['r1']), { votes, auth: noSession }).result.current).toEqual({})
    expect(renderWithProviders(() => useMyVotes('report', []), { votes }).result.current).toEqual({})
    expect(listMine).not.toHaveBeenCalled()
  })
})

describe('useCastVote (Command con rollback)', () => {
  const current: VoteOutcome = { votesUp: 2, votesDown: 0, myVote: null }

  function setup(cast: VotesRepository['cast']) {
    const votes: VotesRepository = { cast, listMine: () => Promise.resolve({}) }
    const rendered = renderWithProviders(() => useCastVote(), { votes })
    rendered.queryClient.setQueryData(queryKeys.stations, [station()])
    rendered.queryClient.setQueryData<MyVotes>(mineKey, { r1: null })
    const cached = () => ({
      report: rendered.queryClient.getQueryData<readonly Station[]>(queryKeys.stations)?.[0]?.reports[0],
      mine: rendered.queryClient.getQueryData<MyVotes>(mineKey),
    })
    return { ...rendered, cached }
  }

  it('aplica el voto al instante y luego lo reemplaza por la respuesta del servidor', async () => {
    const server = deferred<VoteOutcome>()
    const { result, cached } = setup(() => server.promise)
    act(() => {
      result.current.mutate({ ...target, value: 1, current })
    })
    await waitFor(() => {
      expect(cached()).toMatchObject({ report: { votes_up: 3, votes_down: 0 }, mine: { r1: 1 } })
    })
    // Otro usuario votó a la vez: manda el conteo del servidor
    await act(async () => {
      server.resolve({ votesUp: 4, votesDown: 0, myVote: 1 })
      await server.promise
    })
    await waitFor(() => {
      expect(cached()).toMatchObject({ report: { votes_up: 4 }, mine: { r1: 1 } })
    })
  })

  it('si la RPC falla, revierte la caché', async () => {
    const server = deferred<VoteOutcome>()
    const { result, cached } = setup(() => server.promise)
    act(() => {
      result.current.mutate({ ...target, value: -1, current })
    })
    await waitFor(() => {
      expect(cached()).toMatchObject({ report: { votes_down: 1 }, mine: { r1: -1 } })
    })
    await act(async () => {
      server.reject(new Error('TARGET_NOT_FOUND'))
      await server.promise.catch(() => undefined)
    })
    await waitFor(() => {
      expect(cached()).toMatchObject({ report: { votes_up: 2, votes_down: 0 }, mine: { r1: null } })
    })
  })
})

describe('voteCache', () => {
  it('no toca listas que no tienen el objetivo ni cachés vacías', () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData<MyVotes>(queryKeys.myVotes(USER, 'report', ['r9']), { r9: 1 })
    queryClient.getQueryCache().build(queryClient, { queryKey: queryKeys.myVotes(USER, 'report', ['r1']) })
    writeOutcome(queryClient, target, { votesUp: 1, votesDown: 0, myVote: 1 })
    expect(queryClient.getQueryData(queryKeys.myVotes(USER, 'report', ['r9']))).toEqual({ r9: 1 })
    expect(queryClient.getQueryData(queryKeys.myVotes(USER, 'report', ['r1']))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.stations)).toBeUndefined()
  })

  it('sin snapshot no revierte nada', () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(queryKeys.stations, [station()])
    restoreSnapshot(queryClient, undefined)
    expect(queryClient.getQueryData(queryKeys.stations)).toEqual([station()])
  })
})

describe('ReportVotes', () => {
  function renderVotes(overrides: Partial<Repositories> = {}) {
    const onError = vi.fn()
    const queryClient = createTestQueryClient()
    const repositories = { ...createMockRepositories(0), ...overrides }
    queryClient.setQueryData(queryKeys.stations, [station()])
    const Subject = () => {
      const r1 = queryClient.getQueryData<readonly Station[]>(queryKeys.stations)?.[0]?.reports[0] ?? report()
      return <ReportVotes report={r1} reportIds={['r1']} onError={onError} />
    }
    const view = render(
      <AppProviders repositories={repositories} queryClient={queryClient}>
        <Subject />
      </AppProviders>,
    )
    const up = () => screen.getByRole('button', { name: /^\d+$/ })
    const down = () => screen.getByRole('button', { name: 'Incorrecto' })
    return { ...view, onError, up, down }
  }

  it('marca mi voto y lo quita al tocarlo otra vez', async () => {
    const user = userEvent.setup()
    const { up, down } = renderVotes()
    await waitFor(() => {
      expect(up()).toBeEnabled()
    })
    await user.click(up())
    await waitFor(() => {
      expect(up()).toHaveAttribute('aria-pressed', 'true')
    })
    expect(down()).toHaveAttribute('aria-pressed', 'false')
    await user.click(up())
    await waitFor(() => {
      expect(up()).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('sin sesión los botones quedan deshabilitados', () => {
    const { up, down } = renderVotes({ auth: noSession })
    expect(up()).toBeDisabled()
    expect(down()).toBeDisabled()
  })

  it('avisa si el voto falla', async () => {
    const user = userEvent.setup()
    const votes: VotesRepository = { cast: () => Promise.reject(new Error('sin red')), listMine: () => Promise.resolve({ r1: null }) }
    const { down, onError } = renderVotes({ votes })
    await waitFor(() => {
      expect(down()).toBeEnabled()
    })
    await user.click(down())
    await waitFor(() => {
      expect(onError).toHaveBeenCalledOnce()
    })
  })
})
