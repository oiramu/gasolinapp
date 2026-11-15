import type { Station } from '@/features/stations/api/types'
import type { ZoneAverage } from '@/features/zones/api/types'
import { formatPriceValue } from '@/shared/domain/format'
import { resolveDisplayPrice, type DisplayPrice, type OfficialPrice } from '@/shared/domain/displayPrice'
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
/** El precio oficial no envejece dentro del mes, pero no es el precio confirmado de la estación. */
const REFERENCE_OPACITY = 0.9

/** Si la estación no tiene precio para el combustible elegido, el pin muestra el primero de estos que tenga. */
const FALLBACK_FUELS: readonly FuelType[] = ['corriente', 'extra', 'diesel']

/** De dónde sale el precio del pin: reporte de la comunidad, referencia oficial o nada. */
export type PinSource = DisplayPrice['source']

export interface StationPinModel {
  readonly label: string
  readonly brand: string
  readonly color: string
  readonly hasData: boolean
  /** 'reference' se pinta distinto (borde punteado e insignia REF). */
  readonly source: PinSource
  /** Frescura del precio comunitario que muestra el pin (null si es oficial o no hay precio). */
  readonly freshness: Freshness | null
  /** Según la frescura o la fuente; con GNV elegido, las estaciones sin GNV se atenúan del todo. */
  readonly opacity: number
  readonly hasGnv: boolean
  readonly isFavorite: boolean
  /** Un punto de color por combustible con precio comunitario (solo si hay más de uno). */
  readonly fuelDots: readonly string[]
}

const priceLabel = (price: number | null): string => (price === null ? NO_PRICE : `$${formatPriceValue(price, 0)}`)

function pinColor(ofChosenFuel: boolean, fuelType: FuelType, hasData: boolean): string {
  if (ofChosenFuel) return FUEL_TYPES[fuelType].color
  return hasData ? PIN_COLORS.active : PIN_COLORS.inactive
}

type LatestPrices = ReturnType<typeof getLatestPrices<Station['fuel_prices'][number]>>

interface PinPrice {
  readonly price: number | null
  readonly source: PinSource
  readonly freshness: Freshness | null
  readonly ofChosenFuel: boolean
}

export interface PinOptions {
  readonly fuelType: FuelType
  readonly isFavorite: boolean
  /** Hora de referencia para la frescura (useNow). */
  readonly now: number
  /** Precio oficial del combustible elegido en la ciudad de la estación, si existe. */
  readonly official?: OfficialPrice
}

const NO_PIN_PRICE: PinPrice = { price: null, source: 'none', freshness: null, ofChosenFuel: false }

/**
 * Para el combustible elegido decide resolveDisplayPrice (comunitario fresco o reciente, oficial,
 * comunitario viejo). Si no hay nada, el pin muestra otro combustible comunitario de respaldo.
 */
function pinPrice(latest: LatestPrices, { fuelType, official, now }: PinOptions): PinPrice {
  const chosen = latest[fuelType]
  const display = resolveDisplayPrice(chosen && { price: chosen.price, confirmedAt: chosen.confirmed_at }, official, now)
  if (display.source !== 'none') {
    return { price: display.price, source: display.source, freshness: display.source === 'community' ? display.freshness : null, ofChosenFuel: true }
  }
  const fallback = FALLBACK_FUELS.map((fuel) => latest[fuel]).find((price) => price !== undefined)
  return fallback ? { price: fallback.price, source: 'community', freshness: getFreshness(fallback.confirmed_at, now), ofChosenFuel: false } : NO_PIN_PRICE
}

function sourceOpacity({ source, freshness }: PinPrice): number {
  if (freshness) return FRESHNESS_OPACITY[freshness]
  return source === 'reference' ? REFERENCE_OPACITY : FRESHNESS_OPACITY.doubtful
}


export function stationPinModel(station: Station, { fuelType, isFavorite, now, official }: PinOptions): StationPinModel {
  const latest = getLatestPrices(station.fuel_prices)
  const fuels = Object.keys(latest).filter(isFuelType)
  const shown = pinPrice(latest, { fuelType, isFavorite, now, official })
  const dimmed = fuelType === 'gnv' && !station.has_gnv
  return {
    label: priceLabel(shown.price),
    brand: station.brand,
    color: pinColor(shown.ofChosenFuel, fuelType, shown.price !== null),
    hasData: shown.price !== null,
    source: shown.source,
    freshness: shown.freshness,
    opacity: dimmed ? DIMMED_OPACITY : sourceOpacity(shown),
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
