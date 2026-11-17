import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker, SERVICE_WORKER_URL } from '@/app/serviceWorker'
import { afterDismiss, afterVisit, EMPTY_MEMORY, MIN_VISITS, shouldOfferInstall, SNOOZE_MS, type InstallMemory } from './model/installPolicy'
import { MEMORY_KEY, readMemory, recordVisit, VISIT_KEY, writeMemory, type KeyValueStore } from './model/installStorage'
import { browserStores, isStandalone, useInstallPrompt, type InstallStores } from './model/useInstallPrompt'
import { InstallBanner, InstallBannerView } from './ui/InstallBanner'

const NOW = Date.parse('2026-11-16T15:00:00Z')

/** Almacén en memoria (como localStorage). */
function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }
}

const throwingStore: KeyValueStore = {
  getItem: () => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('QuotaExceededError') },
}

describe('shouldOfferInstall', () => {
  const ready = { now: NOW, installed: false, canPrompt: true }
  const visits = (n: number, dismissedAt: number | null = null): InstallMemory => ({ visits: n, dismissedAt })

  it('desde la segunda visita, si el navegador permite instalar', () => {
    expect(shouldOfferInstall(visits(MIN_VISITS - 1), ready)).toBe(false)
    expect(shouldOfferInstall(visits(MIN_VISITS), ready)).toBe(true)
  })

  it('nunca si ya está instalada o si el navegador no lo permite (iOS, Firefox)', () => {
    expect(shouldOfferInstall(visits(5), { ...ready, installed: true })).toBe(false)
    expect(shouldOfferInstall(visits(5), { ...ready, canPrompt: false })).toBe(false)
  })

  it('cerrado, no vuelve a salir en 30 días', () => {
    expect(shouldOfferInstall(visits(5, NOW - SNOOZE_MS + 1), ready)).toBe(false)
    expect(shouldOfferInstall(visits(5, NOW - SNOOZE_MS), ready)).toBe(true)
  })

  it('una visita suma uno y cerrar guarda cuándo', () => {
    expect(afterVisit(EMPTY_MEMORY)).toEqual({ visits: 1, dismissedAt: null })
    expect(afterDismiss(visits(3), NOW)).toEqual({ visits: 3, dismissedAt: NOW })
  })
})

describe('memoria del aviso', () => {
  it('lee lo guardado; si falta, está dañado o el navegador bloquea el almacenamiento, empieza de cero', () => {
    expect(readMemory(memoryStore({ [MEMORY_KEY]: '{"visits":3,"dismissedAt":null}' }))).toEqual({ visits: 3, dismissedAt: null })
    expect(readMemory(memoryStore())).toEqual(EMPTY_MEMORY)
    expect(readMemory(memoryStore({ [MEMORY_KEY]: '{"visits":"tres"}' }))).toEqual(EMPTY_MEMORY)
    expect(readMemory(memoryStore({ [MEMORY_KEY]: '{"visits":1,"dismissedAt":"ayer"}' }))).toEqual(EMPTY_MEMORY)
    expect(readMemory(memoryStore({ [MEMORY_KEY]: 'no es json' }))).toEqual(EMPTY_MEMORY)
    expect(readMemory(throwingStore)).toEqual(EMPTY_MEMORY)
  })

  it('guardar no rompe la app si el navegador no deja', () => {
    expect(() => { writeMemory(throwingStore, EMPTY_MEMORY) }).not.toThrow()
  })

  it('cuenta la visita una sola vez por sesión del navegador (recargar no suma)', () => {
    const local = memoryStore()
    const session = memoryStore()
    expect(recordVisit(local, session).visits).toBe(1)
    expect(recordVisit(local, session).visits).toBe(1)
    expect(recordVisit(local, memoryStore()).visits).toBe(2) // otra sesión: otra visita
    expect(session.data.get(VISIT_KEY)).toBe('1')
  })

  it('sin sessionStorage no cuenta (ni rompe)', () => {
    const local = memoryStore({ [MEMORY_KEY]: '{"visits":4,"dismissedAt":null}' })
    expect(recordVisit(local, throwingStore)).toEqual({ visits: 4, dismissedAt: null })
  })
})

describe('navegador', () => {
  it('browserStores usa localStorage y sessionStorage; si el navegador los bloquea, almacenes que no guardan', () => {
    expect(browserStores(window)).toEqual({ local: window.localStorage, session: window.sessionStorage })
    const blocked = { get localStorage(): Storage { throw new Error('SecurityError') } } as unknown as Window
    const { local } = browserStores(blocked)
    local.setItem('x', '1')
    expect(local.getItem('x')).toBeNull()
  })

  it('isStandalone detecta la app instalada en Android/escritorio y en iOS', () => {
    const win = (matches: boolean | null, standalone?: boolean) =>
      ({ matchMedia: matches === null ? undefined : () => ({ matches }), navigator: { standalone } }) as unknown as Window
    expect(isStandalone(win(true))).toBe(true)
    expect(isStandalone(win(false, true))).toBe(true)
    expect(isStandalone(win(false))).toBe(false)
    expect(isStandalone(win(null))).toBe(false)
  })
})

describe('useInstallPrompt', () => {
  /** Ventana falsa: recibe los eventos de instalación de Chrome. */
  function setup(memory: InstallMemory) {
    const win = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }), navigator: {} }) as unknown as Window
    const stores: InstallStores = { local: memoryStore({ [MEMORY_KEY]: JSON.stringify(memory) }), session: memoryStore() }
    const hook = renderHook(() => useInstallPrompt({ win, stores, now: () => NOW }))
    const offer = () => {
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn(() => Promise.resolve()) })
      act(() => { win.dispatchEvent(event) })
      return event
    }
    return { ...hook, win, stores, offer }
  }

  it('en la segunda visita, cuando Chrome ofrece instalar, muestra el aviso (y frena el banner propio de Chrome)', () => {
    const { result, offer } = setup({ visits: 1, dismissedAt: null })
    expect(result.current.visible).toBe(false)
    const event = offer()
    expect(event.defaultPrevented).toBe(true)
    expect(result.current.visible).toBe(true)
  })

  it('en la primera visita no lo muestra aunque Chrome lo ofrezca', () => {
    const { result, offer } = setup(EMPTY_MEMORY)
    offer()
    expect(result.current.visible).toBe(false)
  })

  it('"Instalar" abre el diálogo nativo una sola vez y el aviso se va', () => {
    const { result, offer } = setup({ visits: 1, dismissedAt: null })
    const event = offer()
    act(() => { result.current.install() })
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(result.current.visible).toBe(false)
    act(() => { result.current.install() }) // sin evento ya no hace nada
    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it('si el diálogo nativo falla, no rompe la app', async () => {
    const { result, win } = setup({ visits: 1, dismissedAt: null })
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn(() => Promise.reject(new Error('ya usado'))) })
    act(() => { win.dispatchEvent(event) })
    act(() => { result.current.install() })
    await Promise.resolve()
    expect(result.current.visible).toBe(false)
  })

  it('cerrar lo silencia y queda guardado; instalada por otro camino, también se va', () => {
    const { result, offer, stores, win } = setup({ visits: 3, dismissedAt: null })
    offer()
    act(() => { result.current.dismiss() })
    expect(result.current.visible).toBe(false)
    expect(readMemory(stores.local)).toEqual({ visits: 4, dismissedAt: NOW })

    const other = setup({ visits: 3, dismissedAt: null })
    other.offer()
    act(() => { other.win.dispatchEvent(new Event('appinstalled')) })
    expect(other.result.current.visible).toBe(false)
    expect(win).not.toBe(other.win)
  })

  it('al desmontar deja de escuchar', () => {
    const { unmount, win } = setup({ visits: 1, dismissedAt: null })
    const remove = vi.spyOn(win, 'removeEventListener')
    unmount()
    expect(remove).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })

  it('por defecto usa la ventana, el almacenamiento y el reloj del navegador', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.visible).toBe(false)
  })
})

describe('InstallBanner', () => {
  it('"Instalar" y "Ahora no" llaman a sus acciones', async () => {
    const onInstall = vi.fn()
    const onDismiss = vi.fn()
    render(<InstallBannerView onInstall={onInstall} onDismiss={onDismiss} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Instalar' }))
    await user.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(onInstall).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('el contenedor no muestra nada mientras no convenga ofrecerlo', () => {
    render(<InstallBanner />)
    expect(screen.queryByRole('region', { name: 'Instalar GasolinApp' })).not.toBeInTheDocument()
  })

  it('el contenedor aparece en la segunda visita cuando Chrome ofrece instalar', () => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ visits: 1, dismissedAt: null }))
    sessionStorage.removeItem(VISIT_KEY)
    render(<InstallBanner />)
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: () => Promise.resolve() }))
    })
    expect(screen.getByRole('region', { name: 'Instalar GasolinApp' })).toBeInTheDocument()
    localStorage.removeItem(MEMORY_KEY)
    sessionStorage.removeItem(VISIT_KEY)
  })
})

describe('registerServiceWorker', () => {
  function fakeWindow() {
    const target = new EventTarget()
    return Object.assign(target, {}) as unknown as Window
  }

  it('registra /sw.js cuando termina de cargar la página', () => {
    const register = vi.fn(() => Promise.resolve({} as ServiceWorkerRegistration))
    const win = fakeWindow()
    registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator, win)
    expect(register).not.toHaveBeenCalled()
    win.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL)
  })

  it('si falla el registro o no hay soporte, la app sigue igual', async () => {
    const win = fakeWindow()
    const register = vi.fn(() => Promise.reject(new Error('sin https')))
    registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator, win)
    win.dispatchEvent(new Event('load'))
    await Promise.resolve()
    const addListener = vi.spyOn(win, 'addEventListener')
    registerServiceWorker({} as Navigator, win)
    expect(addListener).not.toHaveBeenCalled()
  })

  it('por defecto usa el navegador real', () => {
    expect(() => { registerServiceWorker() }).not.toThrow()
  })
})
