export interface Debounced {
  (): void
  cancel(): void
}

/** Ejecuta `fn` una sola vez, `waitMs` después de la última llamada. */
export function debounce(fn: () => void, waitMs: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = (): void => {
    clearTimeout(timer)
  }
  const debounced = (): void => {
    cancel()
    timer = setTimeout(fn, waitMs)
  }
  return Object.assign(debounced, { cancel })
}
