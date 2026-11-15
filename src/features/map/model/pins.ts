import type { Station } from '@/features/stations/api/types'
import type { ZoneAverage } from '@/features/zones/api/types'
import { formatPriceValue } from '@/shared/domain/format'
import { getFreshness, type Freshness } from '@/shared/domain/freshness'
import { FUEL_TYPES, getLatestPrices, isFuelType, type FuelType } from '@/shared/domain/fuel'
import { FRESHNESS_OPACITY } from '@/shared/ui/freshness'

// Qué muestra cada pin del mapa (funciones puras: sin store, sin Leaflet).

export const PIN_COLORS = {
  active: '#00E5A0',
  inactive: '#4B5563',
  surface: '#111318',
  surfaceMuted: '#22272F',
  gnv: '#F97316',
  favorite: '#FBBF24',
  muted: '#9CA3AF',
} as const

const NO_PRICE = 'S/D'
const DIMMED_OPACITY = 0.3

/** Si la estación no tiene el combustible elegido, el pin muestra el primero de estos que tenga. */
const FALLBACK_FUELS: readonly FuelType[] = ['corriente', 'extra', 'diesel']

export interface StationPinModel {
  readonly label: string
  readonly brand: string
  readonly color: string
  readonly hasData: boolean
  /** Frescura del precio que muestra el pin (sin precio: dudoso). */
  readonly freshness: Freshness
  /** Según la frescura; con GNV elegido, las estaciones sin GNV se atenúan del todo. */
  readonly opacity: number
  readonly hasGnv: boolean
  readonly isFavorite: boolean
  /** Un punto de color por combustible con precio (solo si hay más de uno). */
  readonly fuelDots: readonly string[]
}

const priceLabel = (price: number | null | undefined): string =>
  price === null || price === undefined ? NO_PRICE : `$${formatPriceValue(price, 0)}`

function pinColor(hasChosenFuel: boolean, fuelType: FuelType, hasData: boolean): string {
  if (hasChosenFuel) return FUEL_TYPES[fuelType].color
  return hasData ? PIN_COLORS.active : PIN_COLORS.inactive
}

type LatestPrices = ReturnType<typeof getLatestPrices<Station['fuel_prices'][number]>>

/** El precio del combustible elegido o, si la estación no lo tiene, el primero de respaldo. */
const shownPrice = (latest: LatestPrices, fuelType: FuelType) =>
  latest[fuelType] ?? FALLBACK_FUELS.map((fuel) => latest[fuel]).find((price) => price !== undefined)

/** Con GNV elegido, una estación sin GNV se atenúa del todo; si no, manda la frescura. */
const pinOpacity = (dimmed: boolean, freshness: Freshness): number => (dimmed ? DIMMED_OPACITY : FRESHNESS_OPACITY[freshness])

export interface PinOptions {
  readonly fuelType: FuelType
  readonly isFavorite: boolean
  /** Hora de referencia para la frescura (useNow). */
  readonly now: number
}

export function stationPinModel(station: Station, { fuelType, isFavorite, now }: PinOptions): StationPinModel {
  const latest = getLatestPrices(station.fuel_prices)
  const fuels = Object.keys(latest).filter(isFuelType)
  const shown = shownPrice(latest, fuelType)
  const freshness = getFreshness(shown?.confirmed_at, now)
  return {
    label: priceLabel(shown?.price),
    brand: station.brand,
    color: pinColor(latest[fuelType] !== undefined, fuelType, fuels.length > 0),
    hasData: fuels.length > 0,
    freshness,
    opacity: pinOpacity(fuelType === 'gnv' && !station.has_gnv, freshness),
    hasGnv: station.has_gnv,
    isFavorite,
    fuelDots: fuels.length > 1 ? fuels.map((fuel) => FUEL_TYPES[fuel].color) : [],
  }
}

export interface ZonePinModel {
  readonly label: string
  readonly caption: string
  readonly color: string
}

/** Promedio de la zona para el combustible elegido (o corriente si la zona no tiene ese dato). */
export function zonePinModel(zone: ZoneAverage, fuelType: FuelType): ZonePinModel {
  return {
    label: priceLabel(zone[`avg_${fuelType}`] ?? zone.avg_corriente),
    caption: `${zone.name} · ${String(zone.station_count)} est.`,
    color: FUEL_TYPES[fuelType].color,
  }
}
