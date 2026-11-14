import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Tables } from '@/shared/api/database.types'
import { toFuelPrice, toReport, toStationFields } from './stationAdapter'
import type { StationChange } from './types'

// Traduce eventos de Postgres a cambios de dominio. Lo que no sabe aplicar es `unknown` (se invalida).

const UNKNOWN: StationChange = { kind: 'unknown' }

export function toPriceChange(payload: RealtimePostgresChangesPayload<Tables<'fuel_prices'>>): StationChange {
  if (payload.eventType !== 'INSERT' || payload.new.is_active !== true) return UNKNOWN
  const price = toFuelPrice(payload.new)
  return price ? { kind: 'price-added', stationId: payload.new.station_id, price } : UNKNOWN
}

export function toReportChange(payload: RealtimePostgresChangesPayload<Tables<'reports'>>): StationChange {
  if (payload.eventType !== 'INSERT' || payload.new.is_visible !== true) return UNKNOWN
  return { kind: 'report-added', stationId: payload.new.station_id, report: toReport(payload.new) }
}

export function toStationChange(payload: RealtimePostgresChangesPayload<Tables<'stations'>>): StationChange {
  if (payload.eventType !== 'UPDATE') return UNKNOWN
  return { kind: 'station-updated', station: toStationFields(payload.new), isActive: payload.new.is_active === true }
}
