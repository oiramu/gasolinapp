import { assertOk, unwrap, unwrapList } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { ReportsRepository } from './types'

/** Escrituras por RPC: el servidor valida sesión, rangos, tipos y límites de tasa. */
export function createSupabaseReportsRepository(client: AppSupabaseClient): ReportsRepository {
  return {
    async reportPrice({ stationId, fuelType, price }) {
      assertOk(await client.rpc('report_price', { p_station_id: stationId, p_fuel_type: fuelType, p_price: price }))
    },

    async addReport({ stationId, type, content }) {
      assertOk(await client.rpc('add_report', { p_station_id: stationId, p_type: type, p_content: content }))
    },

    async suggestServices({ stationId, services }) {
      return unwrapList(await client.rpc('suggest_station_services', { p_station_id: stationId, p_services: services }))
    },

    async confirmPrice(priceId) {
      return unwrap(await client.rpc('confirm_price', { p_price_id: priceId }))
    },
  }
}
