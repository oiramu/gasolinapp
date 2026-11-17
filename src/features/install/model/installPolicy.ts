// 4.2: cuándo ofrecer "Instalar". Funciones puras: el estado vive en installStorage.

/** Desde la segunda visita: la primera es para conocer la app. */
export const MIN_VISITS = 2
const SNOOZE_DAYS = 30
const MS_PER_DAY = 86_400_000
/** Después de cerrar el aviso, no vuelve a salir en 30 días. */
export const SNOOZE_MS = SNOOZE_DAYS * MS_PER_DAY

export interface InstallMemory {
  readonly visits: number
  /** Cuándo se cerró el aviso por última vez (ms), o null si nunca. */
  readonly dismissedAt: number | null
}

export const EMPTY_MEMORY: InstallMemory = { visits: 0, dismissedAt: null }

export interface InstallContext {
  readonly now: number
  /** Ya se abre como app instalada. */
  readonly installed: boolean
  /** El navegador ofreció instalar (beforeinstallprompt): Chrome en Android y escritorio. */
  readonly canPrompt: boolean
}

export function shouldOfferInstall(memory: InstallMemory, { now, installed, canPrompt }: InstallContext): boolean {
  if (installed || !canPrompt || memory.visits < MIN_VISITS) return false
  return memory.dismissedAt === null || now - memory.dismissedAt >= SNOOZE_MS
}

export const afterVisit = (memory: InstallMemory): InstallMemory => ({ ...memory, visits: memory.visits + 1 })

export const afterDismiss = (memory: InstallMemory, now: number): InstallMemory => ({ ...memory, dismissedAt: now })
