/** Sesión del dispositivo. Por ahora siempre anónima (1.1); la cuenta con email llega en la 5.1. */
export interface Session {
  readonly userId: string
}

export interface AuthRepository {
  /** Sesión guardada en este dispositivo, o null si no hay. */
  getSession(): Promise<Session | null>
  /** Crea un usuario anónimo y deja su sesión guardada. */
  signInAnonymously(): Promise<Session>
}
