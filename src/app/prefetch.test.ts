import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PREFETCH_FALLBACK_MS, usePrefetchOnIdle, type ModuleLoader } from './usePrefetchOnIdle'

describe('usePrefetchOnIdle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('con requestIdleCallback descarga los módulos cuando el navegador queda ocioso, y cancela al desmontar', () => {
    let idle: (() => void) | undefined
    const cancelIdleCallback = vi.fn()
    const win = {
      requestIdleCallback: vi.fn((callback: () => void) => {
        idle = callback
        return 7
      }),
      cancelIdleCallback,
    } as unknown as Window
    const load = vi.fn<ModuleLoader>(() => Promise.resolve({}))
    const loaders = [load]
    const { unmount } = renderHook(() => {
      usePrefetchOnIdle(loaders, win)
    })
    expect(load).not.toHaveBeenCalled()
    idle?.()
    expect(load).toHaveBeenCalledOnce()
    unmount()
    expect(cancelIdleCallback).toHaveBeenCalledWith(7)
  })

  it('sin requestIdleCallback (Safari) espera un rato; si la precarga falla, no pasa nada', async () => {
    vi.useFakeTimers()
    const failing = vi.fn<ModuleLoader>(() => Promise.reject(new Error('sin red')))
    const ok = vi.fn<ModuleLoader>(() => Promise.resolve({}))
    const loaders = [failing, ok]
    renderHook(() => {
      usePrefetchOnIdle(loaders, { setTimeout, clearTimeout } as unknown as Window)
    })
    vi.advanceTimersByTime(PREFETCH_FALLBACK_MS - 1)
    expect(ok).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(failing).toHaveBeenCalledOnce()
    expect(ok).toHaveBeenCalledOnce()
    await Promise.resolve()
  })

  it('al desmontar antes de tiempo no descarga nada', () => {
    vi.useFakeTimers()
    const load = vi.fn<ModuleLoader>(() => Promise.resolve({}))
    const loaders = [load]
    const { unmount } = renderHook(() => {
      usePrefetchOnIdle(loaders, { setTimeout, clearTimeout } as unknown as Window)
    })
    unmount()
    vi.advanceTimersByTime(PREFETCH_FALLBACK_MS)
    expect(load).not.toHaveBeenCalled()
  })

  it('por defecto usa la ventana del navegador', () => {
    const { unmount } = renderHook(() => {
      usePrefetchOnIdle([])
    })
    expect(() => {
      unmount()
    }).not.toThrow()
  })
})
