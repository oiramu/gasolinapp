import { useEffect, useState } from 'react'
import { afterDismiss, EMPTY_MEMORY, shouldOfferInstall, type InstallMemory } from './installPolicy'
import { readMemory, recordVisit, writeMemory, type KeyValueStore } from './installStorage'

/** El evento de Chrome que permite mostrar el diálogo de instalación cuando la app quiera. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

export interface InstallStores {
  readonly local: KeyValueStore
  readonly session: KeyValueStore
}

const NO_STORE: KeyValueStore = { getItem: () => null, setItem: () => undefined }

/** localStorage y sessionStorage; si el navegador los bloquea, almacenes vacíos que no guardan. */
export function browserStores(win: Window = window): InstallStores {
  try {
    return { local: win.localStorage, session: win.sessionStorage }
  } catch {
    return { local: NO_STORE, session: NO_STORE }
  }
}

/** Ya se abre como app instalada (Android/escritorio con display-mode, iOS con navigator.standalone). */
export function isStandalone(win: Window = window): boolean {
  const media = typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches
  return media || (win.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export interface InstallPromptOptions {
  readonly win?: Window
  readonly stores?: InstallStores
  readonly now?: () => number
}

export interface InstallPromptState {
  readonly visible: boolean
  readonly install: () => void
  readonly dismiss: () => void
}

/**
 * 4.2: ofrece instalar la app desde la segunda visita, si el navegador lo permite. Cerrar el aviso
 * lo silencia 30 días. Instalar abre el diálogo nativo de Chrome (que solo se puede usar una vez).
 */
export function useInstallPrompt({ win = window, stores = browserStores(win), now = Date.now }: InstallPromptOptions = {}): InstallPromptState {
  const [memory, setMemory] = useState<InstallMemory>(EMPTY_MEMORY)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone(win))

  useEffect(() => {
    setMemory(recordVisit(stores.local, stores.session))
    // Solo al montar: una visita por carga de la app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    win.addEventListener('beforeinstallprompt', onPrompt)
    win.addEventListener('appinstalled', onInstalled)
    return () => {
      win.removeEventListener('beforeinstallprompt', onPrompt)
      win.removeEventListener('appinstalled', onInstalled)
    }
  }, [win])

  return {
    visible: shouldOfferInstall(memory, { now: now(), installed, canPrompt: promptEvent !== null }),
    install: () => {
      void promptEvent?.prompt().catch(() => undefined)
      setPromptEvent(null)
    },
    dismiss: () => {
      const next = afterDismiss(readMemory(stores.local), now())
      writeMemory(stores.local, next)
      setMemory(next)
    },
  }
}
