import { getFuelUnit, type FuelUnit } from './fuel'

// de-DE agrupa con punto también los números de 4 cifras ("2.500"); es-CO no lo hace
const PRICE_LOCALE = 'de-DE'

const UNIT_SUFFIXES: Record<FuelUnit, string> = { gallon: '/gal', m3: '/m³' }

export const NO_PRICE_LABEL = 'Sin reporte'

/** Número con separador de miles colombiano. `null`/`undefined` → "0". */
export function formatPriceValue(price: number | string | null | undefined, fractionDigits = 0): string {
  if (price === null || price === undefined) return '0'
  return Number(price).toLocaleString(PRICE_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/**
 * Precio con su unidad, sin decimales.
 *
 * @example
 * formatPrice(2500, 'gnv')        // "$2.500/m³"
 * formatPrice(15000, 'corriente') // "$15.000/gal"
 * formatPrice(null, 'extra')      // "Sin reporte"
 */
export function formatPrice(price: number | null | undefined, fuelType: string, unit?: FuelUnit): string {
  if (price === null || price === undefined) return NO_PRICE_LABEL
  return `$${formatPriceValue(price)}${UNIT_SUFFIXES[unit ?? getFuelUnit(fuelType)]}`
}
