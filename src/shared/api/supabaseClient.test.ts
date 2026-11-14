import { describe, expect, it } from 'vitest'
import { createTestClient } from '@/test/supabase'

describe('createSupabaseClient', () => {
  it('crea un cliente con acceso a tablas, RPC y realtime', () => {
    const client = createTestClient()
    expect(typeof client.from).toBe('function')
    expect(typeof client.rpc).toBe('function')
    expect(typeof client.channel).toBe('function')
  })
})
