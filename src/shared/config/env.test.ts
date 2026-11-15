import { describe, expect, it } from 'vitest'
import { MISSING_SUPABASE_MESSAGE, parseEnv } from './env'

const SUPABASE = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' }

describe('parseEnv', () => {
  it('en modo mock no exige las variables de Supabase', () => {
    expect(parseEnv({ VITE_USE_MOCK_DATA: 'true' })).toEqual({ dataSource: 'mock' })
  })

  it('en modo Supabase devuelve la configuración', () => {
    expect(parseEnv({ ...SUPABASE, VITE_USE_MOCK_DATA: 'false' })).toEqual({
      dataSource: 'supabase',
      supabase: { url: 'https://x.supabase.co', anonKey: 'anon' },
    })
  })

  it.each([{}, { VITE_SUPABASE_URL: 'https://x.supabase.co' }, { VITE_SUPABASE_ANON_KEY: 'anon' }])(
    'falla con un mensaje claro si falta configuración: %j',
    (raw) => {
      expect(() => parseEnv(raw)).toThrow(MISSING_SUPABASE_MESSAGE)
    },
  )
})
