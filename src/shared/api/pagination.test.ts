import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages, PAGE_SIZE, type PageResult } from './pagination'

/** Servidor falso: `total` filas numeradas, un tope de filas por respuesta y el total en `count`. */
function fakeServer(total: number, maxRows = PAGE_SIZE, withCount = true) {
  const rows = Array.from({ length: total }, (_, index) => index)
  return vi.fn((from: number, to: number): Promise<PageResult<number>> => {
    const end = Math.min(to + 1, from + maxRows)
    return Promise.resolve({ data: rows.slice(from, end), error: null, count: withCount ? total : null })
  })
}

describe('fetchAllPages', () => {
  it('trae todas las filas por páginas consecutivas hasta el total', async () => {
    const fetchPage = fakeServer(2500)
    const rows = await fetchAllPages(fetchPage)
    expect(rows).toHaveLength(2500)
    expect(rows.at(-1)).toBe(2499)
    expect(fetchPage.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('con menos filas que una página hace un solo pedido', async () => {
    const fetchPage = fakeServer(10)
    await expect(fetchAllPages(fetchPage)).resolves.toHaveLength(10)
    expect(fetchPage).toHaveBeenCalledOnce()
  })

  it('si el servidor corta antes del tamaño de página no se salta filas', async () => {
    const fetchPage = fakeServer(1200, 500)
    const rows = await fetchAllPages(fetchPage)
    expect(rows).toEqual(Array.from({ length: 1200 }, (_, index) => index))
    expect(fetchPage.mock.calls.map(([from]) => from)).toEqual([0, 500, 1000])
  })

  it('para con una página vacía aunque el total diga que faltan filas', async () => {
    const fetchPage = vi.fn(() => Promise.resolve({ data: [], error: null, count: 50 }))
    await expect(fetchAllPages(fetchPage)).resolves.toEqual([])
    expect(fetchPage).toHaveBeenCalledOnce()
  })

  it('sin count trae una sola página', async () => {
    const fetchPage = fakeServer(1500, PAGE_SIZE, false)
    await expect(fetchAllPages(fetchPage)).resolves.toHaveLength(1000)
    expect(fetchPage).toHaveBeenCalledOnce()
  })

  it('propaga el error de cualquier página', async () => {
    const fetchPage = vi.fn((from: number) =>
      Promise.resolve(from === 0 ? { data: [1, 2], error: null, count: 4 } : { data: null, error: { message: 'timeout' }, count: null }),
    )
    await expect(fetchAllPages(fetchPage, 2)).rejects.toThrow('timeout')
  })
})
