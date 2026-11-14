import { getLatestPrices, type PriceRecord } from './fuel'

export interface LatLng {
  readonly lat: number
  readonly lng: number
}

/** Lo único que el dominio necesita de un área del mapa (Leaflet `LatLngBounds` lo cumple). */
export interface Bounds {
  contains(point: [number, number]): boolean
}

export interface PricedStation extends LatLng {
  readonly fuel_prices?: readonly (PriceRecord & { readonly price: number })[] | null
}

const EARTH_RADIUS_METERS = 6_371_000
const DEGREES_PER_HALF_TURN = 180
const DEGREES_TO_RADIANS = Math.PI / DEGREES_PER_HALF_TURN
const METERS_PER_KILOMETER = 1000

/** Radio del filtro "cerca de mí". */
export const NEAR_RADIUS_METERS = 15_000

const toRadians = (degrees: number): number => degrees * DEGREES_TO_RADIANS

/** Distancia en metros sobre la esfera terrestre (fórmula de Haversine). */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const halfLat = Math.sin(toRadians(to.lat - from.lat) / 2)
  const halfLng = Math.sin(toRadians(to.lng - from.lng) / 2)
  const a = halfLat ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * halfLng ** 2
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** "850m" o "2.3km". Sin distancia conocida → null. */
export function formatDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return null
  return meters < METERS_PER_KILOMETER
    ? `${String(Math.round(meters))}m`
    : `${(meters / METERS_PER_KILOMETER).toFixed(1)}km`
}

// ── Mejor precio visible ──────────────────────────────────────────────────────

interface Candidate<S> {
  readonly station: S
  readonly price: number
}

const hasCoordinates = (station: LatLng): boolean => Boolean(station.lat) && Boolean(station.lng)

function toCandidate<S extends PricedStation>(station: S, fuelType: string): Candidate<S> | null {
  const latest = getLatestPrices(station.fuel_prices ?? [])[fuelType]
  return latest ? { station, price: latest.price } : null
}

function cheapest<S>(candidates: readonly Candidate<S>[]): S | null {
  const [first, ...rest] = candidates
  if (!first) return null
  return rest.reduce((best, candidate) => (candidate.price < best.price ? candidate : best), first).station
}

/**
 * Estación con el precio más bajo del combustible dentro del área visible.
 * Resuelve el precio vigente una sola vez por estación; en empate gana la primera.
 */
export function getBestStation<S extends PricedStation>(
  stations: readonly S[],
  bounds: Bounds | null | undefined,
  fuelType: string,
): S | null {
  if (!bounds) return null
  const candidates = stations
    .filter((station) => hasCoordinates(station) && bounds.contains([station.lat, station.lng]))
    .map((station) => toCandidate(station, fuelType))
    .filter((candidate): candidate is Candidate<S> => candidate !== null)
  return cheapest(candidates)
}
