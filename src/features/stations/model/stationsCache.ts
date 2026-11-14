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

const PATCHES: { [K in Kind]: Patch<K> } = {
  'price-added': addPrice,
  'report-added': addReport,
  'station-updated': updateFields,
  unknown: () => null,
}

const patchWith = <K extends Kind>(stations: readonly Station[], kind: K, change: ChangeByKind[K]): Patched =>
  PATCHES[kind](stations, change)

export function applyStationChange(stations: readonly Station[], change: StationChange): Patched {
  return patchWith(stations, change.kind, change)
}
