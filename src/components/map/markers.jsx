import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { FUEL_TYPES, getLatestPrices, hasReportedPrices, formatPriceValue } from '@/lib/fuel'
import { useAppStore } from '@/store/appStore'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — single source of truth for marker colors/fonts
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  active:       '#00E5A0',
  inactive:     '#4B5563',
  surface:      '#111318',
  surfaceMuted: '#22272F',
  gnv:          '#F97316',
}

const FONT_MONO = '"JetBrains Mono", monospace'
const FONT_BODY = '"DM Sans", sans-serif'

// ── Icon HTML cache ───────────────────────────────────────────────────────────────
const stationIconCache = new Map()
const zoneIconCache    = new Map()

/** Call when defaultFuelType changes to force icon re-renders. */
export function clearIconCache() {
  stationIconCache.clear()
  zoneIconCache.clear()
}

// ─────────────────────────────────────────────────────────────────────────────
// Station pin — rendered to static HTML for Leaflet DivIcon
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IMPORTANT: All inner elements use `pointerEvents: 'none'` to prevent
 * Leaflet from receiving rapid mouseover/mouseout events from child nodes,
 * which was causing the "going crazy on hover" jitter bug.
 * Pointer events are only handled by the outer Leaflet marker container.
 */
function StationPinSVG({ station, latestPrices, hasData, defaultFuelType, dimmed }) {
  // Prefer the user's chosen fuel type, fall back to any available
  const priceObj = latestPrices?.[defaultFuelType]
    || latestPrices?.corriente
    || latestPrices?.extra
    || latestPrices?.diesel

  const price = priceObj?.price
  const displayPrice = price
    ? (price > 100 ? `$${formatPriceValue(price, 0)}` : `$${formatPriceValue(price, 2)}`)
    : 'S/D'
  const fuelCount = Object.keys(latestPrices || {}).length
  const textColor = hasData ? COLORS.active : '#9CA3AF'

  // If we have the requested fuel type price, tint the border with its color
  const fuelColor = latestPrices?.[defaultFuelType]
    ? (FUEL_TYPES[defaultFuelType]?.color || COLORS.active)
    : (hasData ? COLORS.active : COLORS.inactive)

  const hasGnv = station.has_gnv === true
  const isFavorite = station.id === useAppStore.getState().favoriteStationId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none', opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}>

      {/* ── Bubble ──────────────────────────────────────────────────────── */}
      <div style={{
        background: hasData ? COLORS.surface : COLORS.surfaceMuted,
        border: `2px solid ${fuelColor}`,
        borderRadius: 10, padding: '5px 9px', minWidth: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        boxShadow: hasData ? `0 4px 16px ${fuelColor}40` : '0 2px 8px rgba(0,0,0,0.4)',
        position: 'relative',
      }}>

        {/* Top-right: Fuel pump icon badge */}
        <div style={{ position: 'absolute', top: -8, right: -8, width: 14, height: 14, background: fuelColor, borderRadius: '50%', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            style={{ pointerEvents: 'none' }}>
            <path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" stroke={COLORS.surface} strokeWidth="3" strokeLinecap="round"/>
            <path d="M15 11h2a2 2 0 0 1 2 2v3a1 1 0 0 0 2 0v-5l-3-3" stroke={COLORS.surface} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 22h12" stroke={COLORS.surface} strokeWidth="3" strokeLinecap="round"/>
            <rect x="6" y="11" width="5" height="4" rx="1" fill={COLORS.surface} stroke={COLORS.surface} strokeWidth="0.5"/>
          </svg>
        </div>

        {/* Top-left area: GAS badge and Favorite star */}
        <div style={{ position: 'absolute', top: -12, left: -12, display: 'flex', alignItems: 'center', gap: 2 }}>
          {isFavorite && (
            <div style={{
              width: 18, height: 18, background: '#FBBF24', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${COLORS.surface}`, boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
              zIndex: 10
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#000">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
          )}

          {hasGnv && (
            <div style={{
              background: COLORS.gnv, borderRadius: 4,
              padding: '2px 5px',
              fontFamily: FONT_MONO, fontSize: 8, fontWeight: 800,
              color: '#fff', lineHeight: 1.1,
              letterSpacing: '0.5px',
              border: `1px solid ${COLORS.surface}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              GAS
            </div>
          )}
        </div>

        {/* Price */}
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, color: hasData ? fuelColor : '#9CA3AF', lineHeight: 1 }}>
          {displayPrice}
        </span>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: fuelColor, opacity: 0.75, lineHeight: 1 }}>
            {station.brand}
          </span>
        </div>

        {/* Fuel type dots */}
        {hasData && fuelCount > 1 && (
          <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
            {Object.keys(latestPrices).map((ft) => (
              <div key={ft} style={{ width: 4, height: 4, borderRadius: '50%', background: FUEL_TYPES[ft]?.color || '#6B7280' }} />
            ))}
          </div>
        )}
      </div>

      {/* Triangle pointer */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `6px solid ${fuelColor}`,
        marginTop: -1,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Public factory functions
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a Leaflet icon for a single gas station. */
export function createStationIcon(station) {
  const { defaultFuelType, favoriteStationId } = useAppStore.getState()
  const cacheKey = `${station.id}:${defaultFuelType}:${station.fuel_prices?.length ?? 0}:${favoriteStationId === station.id}`

  if (!stationIconCache.has(cacheKey)) {
    const latestPrices = getLatestPrices(station.fuel_prices)
    const hasData      = hasReportedPrices(station)
    const dimmed       = defaultFuelType === 'gnv' && station.has_gnv !== true

    stationIconCache.set(cacheKey, renderToStaticMarkup(
      <StationPinSVG station={station} latestPrices={latestPrices} hasData={hasData} defaultFuelType={defaultFuelType} dimmed={dimmed} />
    ))
  }

  return L.divIcon({
    html:        stationIconCache.get(cacheKey),
    className:   '',
    iconSize:    [62, 48],
    iconAnchor:  [31, 48],
    popupAnchor: [0, -50],
  })
}

/** Creates a Leaflet icon for a zone cluster (shown at low zoom). */
export function createZoneIcon(zone) {
  const defaultFuelType = useAppStore.getState().defaultFuelType
  const avgKey          = `avg_${defaultFuelType}`
  const avgPrice        = zone[avgKey] ?? zone.avg_corriente
  const cacheKey        = `${zone.id}:${defaultFuelType}:${avgPrice}`

  if (!zoneIconCache.has(cacheKey)) {
    const fuelColor = FUEL_TYPES[defaultFuelType]?.color || COLORS.active
    zoneIconCache.set(cacheKey, renderToStaticMarkup(
      <div style={{
        background: COLORS.surface, border: `2px solid ${fuelColor}`,
        borderRadius: 14, padding: '8px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        boxShadow: `0 6px 24px ${fuelColor}4D`,
        pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 15, color: fuelColor, lineHeight: 1 }}>
          {avgPrice ? `$${Math.round(avgPrice)}` : 'S/D'}
        </span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {zone.name} · {zone.station_count} est.
        </span>
      </div>
    ))
  }

  return L.divIcon({
    html:      zoneIconCache.get(cacheKey),
    className: '',
    iconSize:  [90, 44],
    iconAnchor:[45, 22]
  })
}

/** Pulsing dot for the user's current GPS position — app green palette. */
export function createUserLocationIcon() {
  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', width: 20, height: 20, pointerEvents: 'none' }}>
      {/* Outer pulse ring */}
      <div style={{
        position: 'absolute', inset: -6,
        borderRadius: '50%', background: 'rgba(0,229,160,0.2)',
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      {/* Inner dot */}
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#00E5A0',
        border: '3px solid #111318',
        boxShadow: '0 2px 12px rgba(0,229,160,0.6)',
      }} />
    </div>
  )

  return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
}
