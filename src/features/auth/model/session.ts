import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { queryKeys } from '@/shared/api/queryKeys'
import { toUserMessage } from '@/shared/api/rpcErrors'
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

const SESSION_FAILED = 'No pudimos preparar tu sesión. Revisa tu conexión y reintenta.'

export interface SessionFailure {
  readonly message: string
  readonly retrying: boolean
  readonly retry: () => void
}

/** Si el alta anónima falló (captcha o red): el mensaje para el usuario y cómo reintentar. */
export function useSessionFailure(): SessionFailure | null {
  const { error, isError, isFetching, refetch } = useQuery(sessionQuery(useAuthRepository()))
  if (!isError) return null
  return {
    message: toUserMessage(error, SESSION_FAILED),
    retrying: isFetching,
    retry: () => {
      void refetch()
    },
  }
}

/** La UI deshabilita las mutaciones mientras no haya sesión. */
export function useHasSession(): boolean {
  return useSession() !== null
}

/** La sesión en caché o, si el intento anterior falló, una nueva. Estable entre renders. */
export function useEnsureSession(): () => Promise<Session> {
  const repository = useAuthRepository()
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.query(sessionQuery(repository)), [queryClient, repository])
}

/** Envuelve la función de una mutación para que nunca salga sin sesión. */
export function useWithSession<A, R>(mutationFn: (args: A) => Promise<R>): (args: A) => Promise<R> {
  const ensureSession = useEnsureSession()
  return async (args: A) => {
    await ensureSession()
    return mutationFn(args)
  }
}
