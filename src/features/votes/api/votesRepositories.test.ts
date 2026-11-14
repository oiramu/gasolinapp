import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockVotesRepository } from './mockVotesRepository'
import { toMyVotes } from './myVotes'
import { createSupabaseVotesRepository } from './supabaseVotesRepository'

const repository = () => createSupabaseVotesRepository(createTestClient())
const command = { targetType: 'report', targetId: 'r1', value: 1 } as const

describe('toMyVotes', () => {
  it('da una entrada por id pedido, solo del tipo indicado y sin valores inválidos', () => {
    const rows = [
      { target_type: 'report', target_id: 'r1', value: 1 },
      { target_type: 'price', target_id: 'r2', value: -1 },
      { target_type: 'report', target_id: 'r3', value: 0 },
    ]
    expect(toMyVotes('report', ['r1', 'r2', 'r3'], rows)).toEqual({ r1: 1, r2: null, r3: null })
  })
})

describe('createSupabaseVotesRepository', () => {
  it('cast llama la RPC cast_vote y adapta la respuesta', async () => {
    let body: unknown
    server.use(
      http.post(`${REST_URL}/rpc/cast_vote`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ votes_up: 6, votes_down: 1, my_vote: null })
      }),
    )
    await expect(repository().cast(command)).resolves.toEqual({ votesUp: 6, votesDown: 1, myVote: null })
    expect(body).toEqual({ p_target_type: 'report', p_target_id: 'r1', p_value: 1 })
  })

  it('cast propaga el código de error de la RPC', async () => {
    server.use(http.post(`${REST_URL}/rpc/cast_vote`, () => postgrestError('TARGET_NOT_FOUND')))
    await expect(repository().cast(command)).rejects.toThrow('TARGET_NOT_FOUND')
  })

  it('listMine llama get_my_votes con los ids', async () => {
    let body: unknown
    server.use(
      http.post(`${REST_URL}/rpc/get_my_votes`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json([{ target_type: 'report', target_id: 'r1', value: -1 }])
      }),
    )
    await expect(repository().listMine('report', ['r1', 'r2'])).resolves.toEqual({ r1: -1, r2: null })
    expect(body).toEqual({ p_target_ids: ['r1', 'r2'] })
  })
})

describe('createMockVotesRepository', () => {
  it('aplica las reglas de cast_vote sobre los contadores de partida', async () => {
    const mock = createMockVotesRepository(() => ({ votesUp: 5, votesDown: 1 }), 0)
    await expect(mock.cast(command)).resolves.toEqual({ votesUp: 6, votesDown: 1, myVote: 1 })
    await expect(mock.listMine('report', ['r1', 'r2'])).resolves.toEqual({ r1: 1, r2: null })
    await expect(mock.cast(command)).resolves.toEqual({ votesUp: 5, votesDown: 1, myVote: null })
  })

  it('por defecto arranca en cero y simula latencia', async () => {
    vi.useFakeTimers()
    const pending = createMockVotesRepository().cast({ ...command, value: -1 })
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual({ votesUp: 0, votesDown: 1, myVote: -1 })
    vi.useRealTimers()
  })
})
