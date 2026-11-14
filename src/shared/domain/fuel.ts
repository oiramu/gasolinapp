/**
 * Fuente única de verdad para los tipos de combustible: etiquetas, colores,
 * unidades, rangos de validación y resolución del precio vigente.
 * Las claves coinciden con `fuel_prices.fuel_type` en la base de datos.
 */

export type FuelUnit = 'gallon' | 'm3'

interface FuelTypeConfig {
  readonly label: string
  readonly color: string
  readonly bgClass: string
  readonly textClass: string
  readonly borderClass: string
  readonly unit: FuelUnit
}

export const FUEL_TYPES = {
  corriente: { label: 'Corriente', color: '#00E5A0', bgClass: 'bg-fuel-500/10', textClass: 'text-fuel-500', borderClass: 'border-fuel-500/40', unit: 'gallon' },
  extra: { label: 'Extra', color: '#60A5FA', bgClass: 'bg-blue-400/10', textClass: 'text-blue-400', borderClass: 'border-blue-400/40', unit: 'gallon' },
  diesel: { label: 'Diésel', color: '#FFB547', bgClass: 'bg-amber-400/10', textClass: 'text-amber-400', borderClass: 'border-amber-400/40', unit: 'gallon' },
  urea: { label: 'AdBlue/Urea', color: '#A78BFA', bgClass: 'bg-violet-400/10', textClass: 'text-violet-400', borderClass: 'border-violet-400/40', unit: 'gallon' },
  gnv: { label: 'Gas', color: '#F97316', bgClass: 'bg-orange-500/10', textClass: 'text-orange-500', borderClass: 'border-orange-500/40', unit: 'm3' },
} as const satisfies Record<string, FuelTypeConfig>

export type FuelType = keyof typeof FUEL_TYPES

export const FUEL_ORDER: readonly FuelType[] = ['corriente', 'extra', 'diesel', 'gnv', 'urea']

export function isFuelType(value: string): value is FuelType {
  return Object.hasOwn(FUEL_TYPES, value)
}

// ── Unidades ──────────────────────────────────────────────────────────────────

const DEFAULT_UNIT: FuelUnit = 'gallon'

const UNIT_LABELS: Record<FuelUnit, string> = { gallon: 'galón', m3: 'm³' }

/** Unidad de medida del combustible. Un tipo desconocido se mide en galones. */
export function getFuelUnit(fuelType: string): FuelUnit {
  return isFuelType(fuelType) ? FUEL_TYPES[fuelType].unit : DEFAULT_UNIT
}

/** Etiqueta corta de la unidad para la UI: "galón" o "m³". */
export function getFuelUnitLabel(fuelType: string): string {
  return UNIT_LABELS[getFuelUnit(fuelType)]
}

// ── Rangos de validación (COP) ────────────────────────────────────────────────

interface PriceRange {
  readonly min: number
  readonly max: number
}

/**
 * Rango de precio esperado por combustible (fuente única). `report_price` lo valida en el servidor
 * con `public.fuel_price_ranges`, que el pgTAP generado por sharedRules.db.test.ts compara con esto.
 */
export const FUEL_PRICE_RANGES = {
  corriente: { min: 12000, max: 20000 },
  extra: { min: 13000, max: 25000 },
  diesel: { min: 9000, max: 19000 },
  urea: { min: 2000, max: 10000 },
  gnv: { min: 1500, max: 5000 },
} as const satisfies Record<FuelType, PriceRange>

/** True si el precio se sale del rango esperado. Solo advierte: no bloquea el envío. */
export function isPriceOutlier(price: number, fuelType: string): boolean {
  if (!isFuelType(fuelType)) return false
  const { min, max } = FUEL_PRICE_RANGES[fuelType]
  return price < min || price > max
}

// ── Precio vigente ────────────────────────────────────────────────────────────

export interface PriceRecord {
  readonly fuel_type: string
  readonly is_active: boolean | null
  readonly created_at: string | null
}

const EPOCH = 0

function toTime(date: string | null): number {
  return date === null ? EPOCH : new Date(date).getTime()
}

function isNewer(candidate: PriceRecord, current: PriceRecord | undefined): boolean {
  return current === undefined || toTime(candidate.created_at) > toTime(current.created_at)
}

/** Precio activo más reciente por tipo de combustible. */
export function getLatestPrices<T extends PriceRecord>(fuelPrices: readonly T[] = []): Record<string, T> {
  const latest: Record<string, T> = {}
  for (const price of fuelPrices) {
    if (price.is_active === true && isNewer(price, latest[price.fuel_type])) latest[price.fuel_type] = price
  }
  return latest
}

/** True si la estación tiene al menos un precio activo reportado. */
export function hasReportedPrices(station: { readonly fuel_prices?: readonly PriceRecord[] | null }): boolean {
  return station.fuel_prices?.some((price) => price.is_active === true) ?? false
}
