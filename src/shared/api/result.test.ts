import { describe, expect, it } from 'vitest'
import { assertOk, unwrapList } from './result'

describe('unwrapList', () => {
  it('devuelve las filas o una lista vacía', () => {
    expect(unwrapList({ data: [1, 2], error: null })).toEqual([1, 2])
    expect(unwrapList({ data: null, error: null })).toEqual([])
  })

  it('lanza el error de Supabase', () => {
    expect(() => unwrapList({ data: null, error: { message: 'sin permiso' } })).toThrow('sin permiso')
  })
})

describe('assertOk', () => {
  it('no hace nada sin error y lanza con error', () => {
    expect(() => {
      assertOk({ error: null })
    }).not.toThrow()
    expect(() => {
      assertOk({ error: { message: 'falló' } })
    }).toThrow('falló')
  })
})
