import { isFuelType, type FuelType } from '@/shared/domain/fuel'

// 3.2: enlace directo a una estación, `?estacion=<id>&combustible=<tipo>`.

export const STATION_PARAM = 'estacion'
export const FUEL_PARAM = 'combustible'

export interface StationLink {
  readonly stationId: string
  readonly fuelType: FuelType | null
}

/** La estación (y el combustible) del enlace; sin estación, null. Un combustible desconocido se ignora. */
export function readStationLink(search: string): StationLink | null {
  const params = new URLSearchParams(search)
  const stationId = params.get(STATION_PARAM)?.trim()
  if (!stationId) return null
  const fuel = params.get(FUEL_PARAM)
  return { stationId, fuelType: fuel !== null && isFuelType(fuel) ? fuel : null }
}

/** La query con el enlace de la estación abierta (o sin él, si no hay), conservando los demás parámetros. */
export function writeStationLink(search: string, link: StationLink | null): string {
  const params = new URLSearchParams(search)
  params.delete(STATION_PARAM)
  params.delete(FUEL_PARAM)
  if (link) {
    params.set(STATION_PARAM, link.stationId)
    if (link.fuelType) params.set(FUEL_PARAM, link.fuelType)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
