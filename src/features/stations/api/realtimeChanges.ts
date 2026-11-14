import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Tables } from '@/shared/api/database.types'
import { toTally, type VoteCounts, type VoteTargetType } from '@/shared/domain/votes'
import { toFuelPrice, toReport, toStationFields } from './stationAdapter'
import type { StationChange } from './types'

// Traduce eventos de Postgres a cambios de dominio. Lo que no sabe aplicar es `unknown` (se invalida).

const UNKNOWN: StationChange = { kind: 'unknown' }

// Un UPDATE de un reporte visible o de un precio activo solo cambia sus votos (cast_vote)
const votesChange = (targetType: VoteTargetType, row: VoteCounts & { readonly id: string }): StationChange => ({
  kind: 'votes-updated',
  targetType,
  targetId: row.id,
  tally: toTally(row),
})

export function toPriceChange(payload: RealtimePostgresChangesPayload<Tables<'fuel_prices'>>): StationChange {
  if (payload.eventType === 'DELETE' || payload.new.is_active !== true) return UNKNOWN
  if (payload.eventType === 'UPDATE') return votesChange('price', payload.new)
  const price = toFuelPrice(payload.new)
  return price ? { kind: 'price-added', stationId: payload.new.station_id, price } : UNKNOWN
}

export function toReportChange(payload: RealtimePostgresChangesPayload<Tables<'reports'>>): StationChange {
  if (payload.eventType === 'DELETE' || payload.new.is_visible !== true) return UNKNOWN
  if (payload.eventType === 'UPDATE') return votesChange('report', payload.new)
  return { kind: 'report-added', stationId: payload.new.station_id, report: toReport(payload.new) }
}

export function toStationChange(payload: RealtimePostgresChangesPayload<Tables<'stations'>>): StationChange {
  if (payload.eventType !== 'UPDATE') return UNKNOWN
  return { kind: 'station-updated', station: toStationFields(payload.new), isActive: payload.new.is_active === true }
}
