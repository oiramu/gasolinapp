import { http, HttpResponse, type JsonBodyType } from 'msw'
import { createSupabaseClient } from '@/shared/api/supabaseClient'

/** Host falso: MSW intercepta todo lo que el cliente de Supabase envía aquí. */
export const SUPABASE_URL = 'http://supabase.test'
export const REST_URL = `${SUPABASE_URL}/rest/v1`

export const createTestClient = () => createSupabaseClient({ url: SUPABASE_URL, anonKey: 'anon-test' })

/** Respuesta de error con el formato de PostgREST. */
export const postgrestError = (message: string) => HttpResponse.json({ message, code: 'PGRST000', details: null, hint: null }, { status: 400 })

export const restGet = (table: string, body: JsonBodyType) => http.get(`${REST_URL}/${table}`, () => HttpResponse.json(body))
