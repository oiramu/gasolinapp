import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories } from '@/app/repositories'
import { createMockReportsRepository } from '@/features/reports/api/mockReportsRepository'
import { useSubmitPriceReport } from '@/features/reports/model/mutations'
import { queryKeys } from '@/shared/api/queryKeys'
import { server } from '@/test/msw/server'
import { createTestQueryClient, renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, SUPABASE_URL } from '@/test/supabase'
import { createMockAuthRepository, MOCK_USER_ID } from './api/mockAuthRepository'
import { ANONYMOUS_SIGN_IN_FAILED, createSupabaseAuthRepository } from './api/supabaseAuthRepository'
import type { AuthRepository } from './api/types'
import { formatDeviceId } from './model/deviceId'
import { useHasSession, useSession } from './model/session'
import { DeviceId, DeviceIdView } from './ui/DeviceId'

const SIGNUP_URL = `${SUPABASE_URL}/auth/v1/signup`
const ANON_UID = '7a1b2c3d-0000-4000-8000-000000000042'
const SECONDS_PER_HOUR = 3600

const anonymousSession = () => ({
  access_token: 'access-token',
  token_type: 'bearer',
  expires_in: SECONDS_PER_HOUR,
  expires_at: Math.floor(Date.now() / 1000) + SECONDS_PER_HOUR,
  refresh_token: 'refresh-token',
  user: { id: ANON_UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {} },
})

const supabaseAuth = () => createSupabaseAuthRepository(createTestClient())

/** Registra el endpoint de alta anónima y cuenta cuántas veces se llama. */
function mockSignup(response: () => Response = () => HttpResponse.json(anonymousSession())) {
  const calls: unknown[] = []
  server.use(
    http.post(SIGNUP_URL, async ({ request }) => {
      calls.push(await request.json())
      return response()
    }),
  )
  return calls
}

/** Auth sin sesión guardada cuyo alta anónima falla por red (se puede reconfigurar con `signIn`). */
function failingAuth() {
  const signIn = vi.fn<AuthRepository['signInAnonymously']>().mockRejectedValue(new Error('sin red'))
  const auth: AuthRepository = { getSession: () => Promise.resolve(null), signInAnonymously: signIn }
  return { auth, signIn }
}

beforeEach(() => {
  localStorage.clear()
})

describe('repositorio de auth en Supabase', () => {
  it('sin sesión guardada devuelve null y el alta anónima crea una', async () => {
    const calls = mockSignup()
    const repository = supabaseAuth()
    await expect(repository.getSession()).resolves.toBeNull()
    await expect(repository.signInAnonymously()).resolves.toEqual({ userId: ANON_UID })
    expect(calls).toHaveLength(1)
    expect(calls[0]).not.toHaveProperty('email')
  })

  it('al recargar, un cliente nuevo lee la misma sesión sin pedirla otra vez', async () => {
    const calls = mockSignup()
    await supabaseAuth().signInAnonymously()
    await expect(supabaseAuth().getSession()).resolves.toEqual({ userId: ANON_UID })
    expect(calls).toHaveLength(1)
  })

  it('propaga el error de red', async () => {
    mockSignup(() => HttpResponse.error())
    await expect(supabaseAuth().signInAnonymously()).rejects.toThrow()
  })

  it('falla si la respuesta no trae sesión', async () => {
    mockSignup(() => HttpResponse.json({}))
    await expect(supabaseAuth().signInAnonymously()).rejects.toThrow(ANONYMOUS_SIGN_IN_FAILED)
  })
})

describe('useSession', () => {
  it('sesión nueva: sin sesión guardada, entra como anónimo', async () => {
    const calls = mockSignup()
    const { result } = renderWithProviders(() => useSession(), { auth: supabaseAuth() })
    expect(result.current).toBeNull()
    await waitFor(() => {
      expect(result.current).toEqual({ userId: ANON_UID })
    })
    expect(calls).toHaveLength(1)
  })

  it('sesión existente: reutiliza el uid guardado sin crear otro usuario', async () => {
    const calls = mockSignup()
    await supabaseAuth().signInAnonymously()
    const { result } = renderWithProviders(() => useSession(), { auth: supabaseAuth() })
    await waitFor(() => {
      expect(result.current).toEqual({ userId: ANON_UID })
    })
    expect(calls).toHaveLength(1)
  })

  it('error de red: no hay sesión y las mutaciones quedan deshabilitadas', async () => {
    const calls = mockSignup(() => HttpResponse.error())
    const { result, queryClient } = renderWithProviders(() => ({ session: useSession(), hasSession: useHasSession() }), {
      auth: supabaseAuth(),
    })
    await waitFor(() => {
      expect(calls).toHaveLength(1)
    })
    await waitFor(() => {
      expect(queryClient.getQueryState(queryKeys.session)?.status).toBe('error')
    })
    expect(result.current).toEqual({ session: null, hasSession: false })
  })

  it('en modo mock la sesión tiene un uid fijo', async () => {
    const { result } = renderWithProviders(() => useHasSession(), { auth: createMockAuthRepository() })
    await waitFor(() => {
      expect(result.current).toBe(true)
    })
    await expect(createMockAuthRepository().signInAnonymously()).resolves.toEqual({ userId: MOCK_USER_ID })
  })
})

describe('mutaciones con sesión', () => {
  const report = { stationId: 's1', fuels: { corriente: '15900' }, comment: '' }

  it('ninguna mutación sale sin sesión', async () => {
    const reports = createMockReportsRepository(0)
    const submit = vi.spyOn(reports, 'submitPriceReport')
    const { result } = renderWithProviders(() => useSubmitPriceReport(), { auth: failingAuth().auth, reports })
    await expect(result.current.mutateAsync(report)).rejects.toThrow('sin red')
    expect(submit).not.toHaveBeenCalled()
  })

  it('si el alta falló, la mutación la reintenta y sale con sesión', async () => {
    const { auth, signIn } = failingAuth()
    signIn.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue({ userId: ANON_UID })
    const reports = createMockReportsRepository(0)
    const submit = vi.spyOn(reports, 'submitPriceReport')
    const { result } = renderWithProviders(() => useSubmitPriceReport(), { auth, reports })
    await expect(result.current.mutateAsync(report)).rejects.toThrow('sin red')
    await result.current.mutateAsync(report)
    expect(signIn).toHaveBeenCalledTimes(2)
    expect(submit).toHaveBeenCalledExactlyOnceWith(report)
  })
})

describe('ID de dispositivo', () => {
  it('usa los primeros 6 caracteres del uid', () => {
    expect(formatDeviceId(ANON_UID)).toBe('7a1b2c')
  })

  it('muestra el ID de la sesión y un marcador mientras no hay', async () => {
    render(
      <AppProviders repositories={createMockRepositories(0)} queryClient={createTestQueryClient()}>
        <DeviceId />
      </AppProviders>,
    )
    expect(await screen.findByText(formatDeviceId(MOCK_USER_ID))).toBeInTheDocument()
    render(<DeviceIdView deviceId={null} />)
    expect(screen.getByText('······')).toBeInTheDocument()
  })
})
