import { assertOk } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { AnalyticsRepository } from './types'

/** El servidor valida el nombre, el tamaño de las props, la sesión y el límite de tasa. */
export function createSupabaseAnalyticsRepository(client: AppSupabaseClient): AnalyticsRepository {
  return {
    async track({ name, props }) {
      assertOk(await client.rpc('track', { p_name: name, p_props: props }))
    },
  }
}
