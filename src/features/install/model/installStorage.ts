import { afterVisit, EMPTY_MEMORY, type InstallMemory } from './installPolicy'

export const MEMORY_KEY = 'gasolinapp:install'
export const VISIT_KEY = 'gasolinapp:visit-counted'

/** Lo que se usa de localStorage / sessionStorage (inyectable en los tests). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const isMemory = (value: unknown): value is InstallMemory =>
  typeof value === 'object' && value !== null &&
  typeof (value as InstallMemory).visits === 'number' &&
  ((value as InstallMemory).dismissedAt === null || typeof (value as InstallMemory).dismissedAt === 'number')

/** La memoria guardada; si falta, está dañada o el navegador bloquea el almacenamiento, vacía. */
export function readMemory(store: KeyValueStore): InstallMemory {
  try {
    const parsed: unknown = JSON.parse(store.getItem(MEMORY_KEY) ?? 'null')
    return isMemory(parsed) ? parsed : EMPTY_MEMORY
  } catch {
    return EMPTY_MEMORY
  }
}

/** Guarda sin romper la app si el navegador no deja (modo privado, almacenamiento lleno). */
export function writeMemory(store: KeyValueStore, memory: InstallMemory): void {
  try {
    store.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch {
    // Sin almacenamiento el aviso se comporta como en la primera visita: no aparece
  }
}

/** Cuenta la visita una sola vez por sesión del navegador: recargar la página no suma. */
export function recordVisit(local: KeyValueStore, session: KeyValueStore): InstallMemory {
  const memory = readMemory(local)
  try {
    if (session.getItem(VISIT_KEY)) return memory
    session.setItem(VISIT_KEY, '1')
  } catch {
    return memory
  }
  const next = afterVisit(memory)
  writeMemory(local, next)
  return next
}
