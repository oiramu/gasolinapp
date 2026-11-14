interface ApiError {
  readonly message: string
}

interface ApiResult<T> {
  readonly data: T | null
  readonly error: ApiError | null
}

/** Filas de una respuesta de Supabase, o lanza su error (TanStack Query lo captura). Sin filas → []. */
export function unwrapList<T>(result: ApiResult<readonly T[]>): T[] {
  if (result.error) throw new Error(result.error.message)
  return [...(result.data ?? [])]
}

/** Para escrituras sin datos de vuelta: solo verifica el error. */
export function assertOk({ error }: { readonly error: ApiError | null }): void {
  if (error) throw new Error(error.message)
}
