import { formatReferenceMonth, type DisplayPrice } from '@/shared/domain/displayPrice'
import { formatPriceValue } from '@/shared/domain/format'
import { FUEL_TYPES, getFuelUnitLabel, type FuelType } from '@/shared/domain/fuel'
import { bogotaDaysAgo } from '@/shared/domain/time'

export interface ShareMessageInput {
  readonly stationName: string
  readonly fuelType: FuelType
  readonly display: DisplayPrice
  /** Confirmación del precio comunitario (para "confirmado hoy"). */
  readonly confirmedAt: string | null
  readonly url: string
  readonly now: number
}

const CONFIRMED_BY_DAYS: readonly string[] = ['confirmado hoy', 'confirmado ayer']

/** "confirmado hoy", "confirmado ayer" o "confirmado hace 5 días" (días de calendario en Bogotá). */
export function confirmedPhrase(confirmedAt: string | null, now: number): string | null {
  if (!confirmedAt) return null
  const days = Math.max(0, bogotaDaysAgo(confirmedAt, now))
  return CONFIRMED_BY_DAYS[days] ?? `confirmado hace ${String(days)} días`
}

const priceText = (fuelType: FuelType, price: number) => `${FUEL_TYPES[fuelType].label} a $${formatPriceValue(price)}/${getFuelUnitLabel(fuelType)}`

/** De dónde sale el precio, entre paréntesis: la confirmación comunitaria o la referencia oficial. */
function sourceNote(display: Exclude<DisplayPrice, { source: 'none' }>, confirmedAt: string | null, now: number): string {
  const note = display.source === 'reference' ? `precio oficial de referencia, ${formatReferenceMonth(display.validFrom)}` : confirmedPhrase(confirmedAt, now)
  return note ? ` (${note})` : ''
}

/**
 * Texto para compartir por WhatsApp:
 * "⛽ Corriente a $15.900/galón en Terpel El Recreo (confirmado hoy). Míralo en GasolinApp: <enlace>".
 * Sin precio a la vista, invita a ver la estación.
 */
export function buildShareMessage({ stationName, fuelType, display, confirmedAt, url, now }: ShareMessageInput): string {
  if (display.source === 'none') return `⛽ Precios de ${stationName} en GasolinApp: ${url}`
  return `⛽ ${priceText(fuelType, display.price)} en ${stationName}${sourceNote(display, confirmedAt, now)}. Míralo en GasolinApp: ${url}`
}
