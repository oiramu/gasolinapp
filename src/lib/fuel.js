/**
 * lib/fuel.js
 *
 * Fuente única de verdad para tipos de combustible, colores, helpers
 * de formato y validación. Todos los componentes importan desde aquí.
 *
 * 'corriente' y 'gnv' se usan con la misma clave en frontend y BD.
 */

// ── Configuración de tipos de combustible ─────────────────────────────────────
export const FUEL_TYPES = {
  corriente: { label: 'Corriente',      color: '#00E5A0', bgClass: 'bg-fuel-500/10',    textClass: 'text-fuel-500',    borderClass: 'border-fuel-500/40'    },
  extra:     { label: 'Extra',          color: '#60A5FA', bgClass: 'bg-blue-400/10',    textClass: 'text-blue-400',    borderClass: 'border-blue-400/40'    },
  diesel:    { label: 'Diésel',         color: '#FFB547', bgClass: 'bg-amber-400/10',   textClass: 'text-amber-400',   borderClass: 'border-amber-400/40'   },
  urea:      { label: 'AdBlue/Urea',    color: '#A78BFA', bgClass: 'bg-violet-400/10',  textClass: 'text-violet-400',  borderClass: 'border-violet-400/40'  },
  gnv:       { label: 'Gas',            color: '#F97316', bgClass: 'bg-orange-500/10',  textClass: 'text-orange-500',  borderClass: 'border-orange-500/40'  },
}

export const FUEL_ORDER = ['corriente', 'extra', 'diesel', 'gnv', 'urea']

// ── Helpers de unidad ─────────────────────────────────────────────────────────

/** Devuelve la unidad de medida para un tipo de combustible. */
export function getFuelUnit(fuelType) {
  return fuelType === 'gnv' ? 'm3' : 'gallon'
}

/** Devuelve el label de unidad corto para mostrar en UI. */
export function getFuelUnitLabel(fuelType) {
  return fuelType === 'gnv' ? 'm³' : 'galón'
}

/** Devuelve el label legible del tipo de combustible. */
export function getFuelLabel(fuelType) {
  return FUEL_TYPES[fuelType]?.label ?? fuelType
}

// ── Helper de formato de precios ──────────────────────────────────────────────

export function formatPriceValue(price, fractionDigits = 0) {
  if (price === null || price === undefined) return '0'
  return Number(price).toLocaleString('de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })
}

/**
 * Formatea un precio para mostrar en UI, incluyendo la unidad correcta.
 *
 * @param {number|null|undefined} price
 * @param {string} fuelType  - 'corriente' | 'extra' | 'diesel' | 'urea' | 'gnv'
 * @param {string} [unit]    - 'gallon' | 'm3'. Si no se pasa, se infiere del fuelType.
 * @returns {string}
 *
 * @example
 * formatPrice(2500, 'gnv')          // "$2.500,00/m³"
 * formatPrice(15000, 'corriente')   // "$15.000,00/gal"
 * formatPrice(null, 'extra')        // "Sin reporte"
 */
export function formatPrice(price, fuelType, unit) {
  if (price === null || price === undefined) return 'Sin reporte'

  const resolvedUnit = unit ?? getFuelUnit(fuelType)
  const unitLabel    = resolvedUnit === 'm3' ? '/m³' : '/gal'

  return `$${formatPriceValue(price)}${unitLabel}`
}

// ── Rangos de validación por tipo (COP) ───────────────────────────────────────

/**
 * Rangos de precio esperados por tipo de combustible en COP.
 * Nota: los precios del seed original están en USD (heredado) pero el
 * formateo en pantalla los muestra como COP. Estos rangos corresponden
 * al valor real en COP que los usuarios reportarán.
 */
export const FUEL_PRICE_RANGES = {
  corriente: { min: 12000, max: 20000 },
  extra:     { min: 13000, max: 25000 },
  diesel:    { min: 9000, max: 19000 },
  urea:      { min: 2000,  max: 10000 },
  gnv:       { min: 1500,  max: 5000  },
}

/**
 * Devuelve true si el precio se sale del rango esperado para ese combustible.
 * Se usa para mostrar advertencias suaves sin bloquear el envío.
 */
export function isPriceOutlier(price, fuelType) {
  const range = FUEL_PRICE_RANGES[fuelType]
  if (!range) return false
  return price < range.min || price > range.max
}

// ── Colores de marca ──────────────────────────────────────────────────────────
export const BRAND_COLORS = {
  Terpel: '#E8003C',
  Biomax: '#0066CC',
  Primax: '#FF6600',
  Shell:  '#DD1D21',
  Mobil:  '#CE0037',
  Texaco: '#EE2E24',
}

export const BRAND_LOGO_ICONS = {
  Terpel: '🔴',
  Biomax: '🔵',
  Primax: '🟠',
  Shell:  '🐚',
  Mobil:  '🏎️',
}

// ── Helpers de datos ──────────────────────────────────────────────────────────

/**
 * Extrae el precio activo más reciente para cada tipo de combustible
 * de un array de fuel_prices.
 *
 * @param {Array} fuelPrices
 * @returns {Record<string, object>}
 */
export function getLatestPrices(fuelPrices = []) {
  const result = {}
  for (const p of fuelPrices) {
    if (!p.is_active) continue
    if (!result[p.fuel_type] || new Date(p.created_at) > new Date(result[p.fuel_type].created_at)) {
      result[p.fuel_type] = p
    }
  }
  return result
}

/**
 * Devuelve true si la estación tiene al menos un precio activo reportado.
 */
export function hasReportedPrices(station) {
  return station.fuel_prices?.some((p) => p.is_active)
}

/**
 * Formatea tiempo relativo. Ej: "hace 2h", "ahora mismo".
 */
export function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── Labels de tipo de reporte ─────────────────────────────────────────────────
export const REPORT_TYPE_LABELS = {
  price:      { label: 'Precio',     icon: '💰' },
  promotion:  { label: 'Promoción',  icon: '🏷️' },
  warning:    { label: 'Aviso',      icon: '⚠️' },
  correction: { label: 'Corrección', icon: '✏️' },
  comment:    { label: 'Comentario', icon: '💬' },
}
