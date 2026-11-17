import { useEffect } from 'react'

export type ModuleLoader = () => Promise<unknown>

/** Si el navegador no tiene requestIdleCallback (Safari), se espera este tiempo. */
export const PREFETCH_FALLBACK_MS = 3000
/** Aunque el navegador nunca quede ocioso, la precarga arranca a más tardar en este tiempo. */
const IDLE_TIMEOUT_MS = 6000

/**
 * Descarga en segundo plano, cuando el navegador está ocioso, los módulos que casi seguro se van a
 * usar (para que abran al instante) sin competir con la carga inicial del mapa. Los errores se
 * ignoran: si la precarga falla, el módulo se pide de nuevo al abrirlo. `loaders` debe ser estable.
 */
export function usePrefetchOnIdle(loaders: readonly ModuleLoader[], win: Window = window): void {
  useEffect(() => {
    const prefetch = () => {
      for (const load of loaders) void load().catch(() => undefined)
    }
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(prefetch, { timeout: IDLE_TIMEOUT_MS })
      return () => {
        win.cancelIdleCallback(id)
      }
    }
    const timer = win.setTimeout(prefetch, PREFETCH_FALLBACK_MS)
    return () => {
      win.clearTimeout(timer)
    }
  }, [loaders, win])
}
