import { toTally, type VoteCounts, type VoteTally, type VoteTarget, type VoteTargetType } from '@/shared/domain/votes'
import type { Station, StationChange } from '../api/types'

// Parches puros sobre la lista en caché. `null` = no se puede parchear: hay que invalidar.

type ChangeByKind = { [C in StationChange as C['kind']]: C }
type Kind = keyof ChangeByKind
type Patched = readonly Station[] | null
type Patch<K extends Kind> = (stations: readonly Station[], change: ChangeByKind[K]) => Patched

const updateStation = (stations: readonly Station[], id: string, update: (station: Station) => Station) =>
  stations.map((station) => (station.id === id ? update(station) : station))

const addPrice: Patch<'price-added'> = (stations, { stationId, price }) =>
  updateStation(stations, stationId, (station) =>
    station.fuel_prices.some((p) => p.id === price.id) ? station : { ...station, fuel_prices: [...station.fuel_prices, price] },
  )

const addReport: Patch<'report-added'> = (stations, { stationId, report }) =>
  updateStation(stations, stationId, (station) =>
    station.reports.some((r) => r.id === report.id) ? station : { ...station, reports: [...station.reports, report] },
  )

const updateFields: Patch<'station-updated'> = (stations, { station: fields, isActive }) => {
  if (!isActive) return stations.filter((station) => station.id !== fields.id)
  // Una estación reactivada no está en caché: hay que traerla completa
  if (!stations.some((station) => station.id === fields.id)) return null
  return updateStation(stations, fields.id, (station) => ({ ...station, ...fields }))
}

interface Votable extends VoteCounts {
  readonly id: string
}

/** La misma lista si el objetivo no está; así no se recrean estaciones que no cambiaron. */
function withTally<T extends Votable>(items: readonly T[], id: string, tally: VoteTally): readonly T[] {
  if (!items.some((item) => item.id === id)) return items
  return items.map((item) => (item.id === id ? { ...item, votes_up: tally.votesUp, votes_down: tally.votesDown } : item))
}

type VotableList = 'reports' | 'fuel_prices'

const VOTABLE_LISTS = { report: 'reports', price: 'fuel_prices' } as const satisfies Record<VoteTargetType, VotableList>

const tallyPatch = (list: VotableList, id: string, tally: VoteTally) => (station: Station): Station => {
  const items = withTally<Votable>(station[list], id, tally)
  return items === station[list] ? station : { ...station, [list]: items }
}

/** Nuevos contadores de un reporte o precio en caché (votos propios o de otros por realtime). */
export function patchVotes(stations: readonly Station[], { targetType, targetId }: VoteTarget, tally: VoteTally): readonly Station[] {
  return stations.map(tallyPatch(VOTABLE_LISTS[targetType], targetId, tally))
}

const updateVotes: Patch<'votes-updated'> = (stations, change) => patchVotes(stations, change, change.tally)

const PATCHES: { [K in Kind]: Patch<K> } = {
  'price-added': addPrice,
  'report-added': addReport,
  'station-updated': updateFields,
  'votes-updated': updateVotes,
  unknown: () => null,
}

const patchWith = <K extends Kind>(stations: readonly Station[], kind: K, change: ChangeByKind[K]): Patched =>
  PATCHES[kind](stations, change)

export function applyStationChange(stations: readonly Station[], change: StationChange): Patched {
  return patchWith(stations, change.kind, change)
}

/** Contadores actuales de un reporte o precio en caché; null si no está cargado. */
export function findTally(stations: readonly Station[], { targetType, targetId }: VoteTarget): VoteTally | null {
  const list = VOTABLE_LISTS[targetType]
  for (const station of stations) {
    const item = (station[list] as readonly Votable[]).find((candidate) => candidate.id === targetId)
    if (item) return toTally(item)
  }
  return null
}
