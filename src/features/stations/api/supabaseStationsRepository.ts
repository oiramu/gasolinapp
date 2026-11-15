import type { Tables } from '@/shared/api/database.types'
import { unwrapList } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { toPriceChange, toReportChange, toStationChange } from './realtimeChanges'
import { toStation } from './stationAdapter'
import type { StationsRepository } from './types'

// El tipo inferido de este select debe cumplir el del Adapter: si falta una columna, no compila
export const STATION_SELECT = `
  id, name, brand, address, lat, lng, zone_id, has_gnv,
  svc_montallantas, svc_cambio_aceite, svc_serviteca, svc_tienda, svc_lavadero, svc_bano, svc_cafe, svc_electrico, svc_atm,
  fuel_prices (id, fuel_type, price, price_unit, currency, comment, votes_up, votes_down, created_at, reported_by, is_active),
  reports (id, type, content, votes_up, votes_down, created_at, user_display_name)
`

export const REALTIME_CHANNEL = 'station_updates'

const changesOn = (table: 'fuel_prices' | 'reports' | 'stations') => ({ event: '*', schema: 'public', table }) as const

export function createSupabaseStationsRepository(client: AppSupabaseClient): StationsRepository {
  return {
    async list() {
      // Las estaciones de prueba (security:check) nunca se muestran
      const rows = unwrapList(await client.from('stations').select(STATION_SELECT).eq('is_active', true).eq('is_test', false))
      return rows.map(toStation)
    },

    subscribe(listener) {
      const channel = client
        .channel(REALTIME_CHANNEL)
        .on<Tables<'fuel_prices'>>('postgres_changes', changesOn('fuel_prices'), (payload) => {
          listener(toPriceChange(payload))
        })
        .on<Tables<'reports'>>('postgres_changes', changesOn('reports'), (payload) => {
          listener(toReportChange(payload))
        })
        .on<Tables<'stations'>>('postgres_changes', changesOn('stations'), (payload) => {
          listener(toStationChange(payload))
        })
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
