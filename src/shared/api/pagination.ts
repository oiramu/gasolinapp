import { unwrapList } from './result'

/** Tope de filas por respuesta de PostgREST en Supabase (`max_rows`). Pedir más no trae más. */
export const PAGE_SIZE = 1000

/** Respuesta de una consulta con `count: 'exact'`: el total viene aparte de las filas de la página. */
export interface PageResult<T> {
  readonly data: readonly T[] | null
  readonly error: { readonly message: string } | null
  readonly count: number | null
}

/** Pide las filas `from`..`to` (inclusive, como `.range()`), siempre con el mismo orden. */
export type FetchPage<T> = (from: number, to: number) => PromiseLike<PageResult<T>>

/**
 * Todas las filas de una consulta, página por página. Avanza por las filas recibidas (si el
 * servidor corta antes de `pageSize` no se salta ninguna) y para al llegar al total o con una
 * página vacía. Sin `count`, el total es lo recibido: solo se pide una página.
 */
export async function fetchAllPages<T>(fetchPage: FetchPage<T>, pageSize = PAGE_SIZE): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    // Secuencial a propósito: cada página empieza donde terminó la anterior
    const result = await fetchPage(rows.length, rows.length + pageSize - 1)
    const page = unwrapList(result)
    rows.push(...page)
    if (page.length === 0 || rows.length >= (result.count ?? rows.length)) return rows
  }
}
