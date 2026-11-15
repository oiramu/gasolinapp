import type { Station } from '@/features/stations/api/types'
import type { ZoneAverage } from '@/features/zones/api/types'
import { formatPriceValue } from '@/shared/domain/format'
import { FUEL_TYPES, getLatestPrices, isFuelType, type FuelType } from '@/shared/domain/fuel'

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

/** Si la estación no tiene el combustible elegido, el pin muestra el primero de estos que tenga. */
const FALLBACK_FUELS: readonly FuelType[] = ['corriente', 'extra', 'diesel']

export interface StationPinModel {
  readonly label: string
  readonly brand: string
  readonly color: string
  readonly hasData: boolean
  /** Con GNV elegido, las estaciones sin GNV se atenúan. */
  readonly dimmed: boolean
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

export function stationPinModel(station: Station, fuelType: FuelType, isFavorite: boolean): StationPinModel {
  const latest = getLatestPrices(station.fuel_prices)
  const fuels = Object.keys(latest).filter(isFuelType)
  const chosen = latest[fuelType]
  const shown = chosen ?? FALLBACK_FUELS.map((fuel) => latest[fuel]).find((price) => price !== undefined)
  const hasData = fuels.length > 0
  return {
    label: priceLabel(shown?.price),
    brand: station.brand,
    color: pinColor(chosen !== undefined, fuelType, hasData),
    hasData,
    dimmed: fuelType === 'gnv' && !station.has_gnv,
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
