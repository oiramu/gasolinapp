import type { AuthRepository, Session } from './types'

export const MOCK_USER_ID = '0f1e2d3c-4b5a-4687-9a0b-1c2d3e4f5a6b'

/** Modo mock: siempre hay sesión y el uid es fijo. */
export function createMockAuthRepository(userId = MOCK_USER_ID): AuthRepository {
  const session: Session = { userId }
  return {
    getSession: () => Promise.resolve(session),
    signInAnonymously: () => Promise.resolve(session),
  }
}
