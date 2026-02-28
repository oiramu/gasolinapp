import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import { FUEL_TYPES, getLatestPrices, hasReportedPrices } from '@/lib/fuel'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — single source of truth for marker colors/fonts
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  active:   '#00E5A0',
  inactive: '#4B5563',
  surface:  '#111318',
  surfaceMuted: '#22272F',
}

const FONT_MONO = '"JetBrains Mono", monospace'
const FONT_BODY = '"DM Sans", sans-serif'

// ─────────────────────────────────────────────────────────────────────────────
// Station pin — rendered to static HTML for Leaflet DivIcon
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IMPORTANT: All inner elements use `pointerEvents: 'none'` to prevent
 * Leaflet from receiving rapid mouseover/mouseout events from child nodes,
 * which was causing the "going crazy on hover" jitter bug.
 * Pointer events are only handled by the outer Leaflet marker container.
 */
function StationPinSVG({ station, latestPrices, hasData }) {
  const extraPrice   = latestPrices?.extra?.price
  const displayPrice = extraPrice ? `$${extraPrice.toFixed(2)}` : 'S/D'
  const fuelCount    = Object.keys(latestPrices || {}).length
  const borderColor  = hasData ? COLORS.active : COLORS.inactive
  const textColor    = hasData ? COLORS.active : '#9CA3AF'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>

      {/* ── Bubble ──────────────────────────────────────────────────────── */}
      <div style={{
        background: hasData ? COLORS.surface : COLORS.surfaceMuted,
        border: `2px solid ${borderColor}`,
        borderRadius: 10, padding: '5px 9px', minWidth: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        boxShadow: hasData ? '0 4px 16px rgba(0,229,160,0.25)' : '0 2px 8px rgba(0,0,0,0.4)',
        position: 'relative',
      }}>

        {/* Fuel pump badge */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          style={{ position: 'absolute', top: -8, right: -8, background: borderColor, borderRadius: '50%', padding: 2 }}>
          <path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" stroke={COLORS.surface} strokeWidth="2" strokeLinecap="round"/>
          <path d="M15 11h2a2 2 0 0 1 2 2v3a1 1 0 0 0 2 0v-5l-3-3" stroke={COLORS.surface} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 22h12" stroke={COLORS.surface} strokeWidth="2" strokeLinecap="round"/>
          <rect x="6" y="11" width="5" height="4" rx="1" fill={COLORS.surface} stroke={COLORS.surface} strokeWidth="0.5"/>
        </svg>

        {/* Price */}
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, color: textColor, lineHeight: 1 }}>
          {displayPrice}
        </span>

        {/* Brand */}
        <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: '#6B7280', lineHeight: 1 }}>
          {station.brand}
        </span>

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
        borderTop: `6px solid ${borderColor}`,
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
  const latestPrices = getLatestPrices(station.fuel_prices)
  const hasData      = hasReportedPrices(station)

  return L.divIcon({
    html:        renderToStaticMarkup(<StationPinSVG station={station} latestPrices={latestPrices} hasData={hasData} />),
    className:   '',          // remove Leaflet's default white background
    iconSize:    [62, 48],
    iconAnchor:  [31, 48],    // bottom-center of the pin
    popupAnchor: [0, -50],
  })
}

/** Creates a Leaflet icon for a zone cluster (shown at low zoom). */
export function createZoneIcon(zone) {
  const html = renderToStaticMarkup(
    <div style={{
      background: COLORS.surface, border: `2px solid ${COLORS.active}`,
      borderRadius: 14, padding: '8px 14px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      boxShadow: '0 6px 24px rgba(0,229,160,0.3)',
      pointerEvents: 'none',  // let Leaflet own all events
    }}>
      <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 15, color: COLORS.active, lineHeight: 1 }}>
        ${zone.avg_extra?.toFixed(2)}
      </span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {zone.name} · {zone.station_count} est.
      </span>
    </div>
  )

  return L.divIcon({ html, className: '', iconSize: [90, 44], iconAnchor: [45, 22] })
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




