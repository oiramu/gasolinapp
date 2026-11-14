import { unwrapList } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { ZonesRepository } from './types'

export function createSupabaseZonesRepository(client: AppSupabaseClient): ZonesRepository {
  return {
    async listAverages() {
      return unwrapList(await client.rpc('get_zone_averages'))
    },
  }
}
