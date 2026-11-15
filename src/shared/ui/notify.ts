export type ToastType = 'success' | 'error'

/** Aviso al usuario (Toast). Los componentes lo reciben por props; no conocen el store. */
export type Notify = (message: string, type: ToastType) => void
