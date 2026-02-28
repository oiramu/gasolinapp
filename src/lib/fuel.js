export const FUEL_TYPES = {
  extra:  { label: 'Extra',        color: '#00E5A0', bgClass: 'bg-fuel-500/10',  textClass: 'text-fuel-500',  borderClass: 'border-fuel-500/40'  },
  super:  { label: 'Súper',        color: '#60A5FA', bgClass: 'bg-blue-400/10',  textClass: 'text-blue-400',  borderClass: 'border-blue-400/40'  },
  diesel: { label: 'Diésel',       color: '#FFB547', bgClass: 'bg-amber-400/10', textClass: 'text-amber-400', borderClass: 'border-amber-400/40' },
  urea:   { label: 'AdBlue/Urea',  color: '#A78BFA', bgClass: 'bg-violet-400/10',textClass: 'text-violet-400',borderClass: 'border-violet-400/40'},
}

export const FUEL_ORDER = ['extra', 'super', 'diesel', 'urea']

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

/**
 * Get the latest active price for each fuel type from the prices array.
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
 * Check if a station has any active reported prices.
 */
export function hasReportedPrices(station) {
  return station.fuel_prices?.some((p) => p.is_active)
}

/**
 * Format relative time (e.g. "hace 2h")
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

export const REPORT_TYPE_LABELS = {
  price:      { label: 'Precio',     icon: '💰' },
  promotion:  { label: 'Promoción',  icon: '🏷️' },
  warning:    { label: 'Aviso',      icon: '⚠️' },
  correction: { label: 'Corrección', icon: '✏️' },
  comment:    { label: 'Comentario', icon: '💬' },
}
