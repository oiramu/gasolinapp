import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import type { AuthRepository, Session } from '../api/types'
import { useAuthRepository } from './authRepository'

/** La sesión guardada o, si no hay, una anónima nueva. */
export async function ensureSession(repository: AuthRepository): Promise<Session> {
  return (await repository.getSession()) ?? repository.signInAnonymously()
}

// supabase-js renueva el token por su cuenta: la sesión en caché no vence.
const sessionQuery = (repository: AuthRepository) =>
  queryOptions({ queryKey: queryKeys.session, queryFn: () => ensureSession(repository), staleTime: 'static', gcTime: Infinity })

/** Sesión del dispositivo; null mientras se crea o si falló. */
export function useSession(): Session | null {
  return useQuery(sessionQuery(useAuthRepository())).data ?? null
}

/** La UI deshabilita las mutaciones mientras no haya sesión. */
export function useHasSession(): boolean {
  return useSession() !== null
}

/**
 * Envuelve la función de una mutación para que nunca salga sin sesión: espera la
 * sesión en caché o la vuelve a pedir si el intento anterior falló.
 */
export function useWithSession<A, R>(mutationFn: (args: A) => Promise<R>): (args: A) => Promise<R> {
  const repository = useAuthRepository()
  const queryClient = useQueryClient()
  return async (args: A) => {
    await queryClient.query(sessionQuery(repository))
    return mutationFn(args)
  }
}
