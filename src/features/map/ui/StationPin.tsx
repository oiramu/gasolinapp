import { PIN_COLORS, type StationPinModel } from '../model/pins'

const FONT_MONO = '"JetBrains Mono", monospace'
const FONT_BODY = '"DM Sans", sans-serif'

/** El precio oficial va con borde punteado: no es un precio confirmado en esta estación. */
const BORDER_STYLE = { true: 'dashed', false: 'solid' } as const

/** Con precio: fondo oscuro y halo del color; sin datos: fondo apagado y texto gris. */
const TONE = {
  true: { background: PIN_COLORS.surface, shadow: (color: string) => `0 4px 16px ${color}40`, label: (color: string) => color },
  false: { background: PIN_COLORS.surfaceMuted, shadow: () => '0 2px 8px rgba(0,0,0,0.4)', label: () => PIN_COLORS.muted },
} as const

/**
 * Pin de una estación, renderizado a HTML estático para un DivIcon de Leaflet.
 * Todos los nodos internos llevan `pointerEvents: 'none'`: así Leaflet no recibe
 * mouseover/mouseout de cada hijo (causaba el temblor al pasar el mouse).
 */
export function StationPin({ model }: { readonly model: StationPinModel }) {
  const { label, brand, color, hasData, opacity, hasGnv, isFavorite, fuelDots, source } = model
  const isReference = source === 'reference'
  const tone = TONE[String(hasData) as `${boolean}`]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none', opacity, transition: 'opacity 0.2s' }}>
      <div style={{
        background: tone.background,
        border: `2px ${BORDER_STYLE[String(isReference) as `${boolean}`]} ${color}`,
        borderRadius: 10, padding: '5px 9px', minWidth: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        boxShadow: tone.shadow(color),
        position: 'relative',
      }}>
        <FuelBadge color={color} />
        <div style={{ position: 'absolute', top: -12, left: -12, display: 'flex', alignItems: 'center', gap: 2 }}>
          {isFavorite && <FavoriteStar />}
          {isReference && <ReferenceBadge />}
          {hasGnv && <GasBadge />}
        </div>
        <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, color: tone.label(color), lineHeight: 1 }}>{label}</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 9, color, opacity: 0.75, lineHeight: 1 }}>{brand}</span>
        {fuelDots.length > 0 && (
          <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
            {fuelDots.map((dot) => (
              <div key={dot} style={{ width: 4, height: 4, borderRadius: '50%', background: dot }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${color}`, marginTop: -1, pointerEvents: 'none' }} />
    </div>
  )
}

function FuelBadge({ color }: { readonly color: string }) {
  return (
    <div style={{ position: 'absolute', top: -8, right: -8, width: 14, height: 14, background: color, borderRadius: '50%', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
        <path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" stroke={PIN_COLORS.surface} strokeWidth="3" strokeLinecap="round" />
        <path d="M15 11h2a2 2 0 0 1 2 2v3a1 1 0 0 0 2 0v-5l-3-3" stroke={PIN_COLORS.surface} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 22h12" stroke={PIN_COLORS.surface} strokeWidth="3" strokeLinecap="round" />
        <rect x="6" y="11" width="5" height="4" rx="1" fill={PIN_COLORS.surface} stroke={PIN_COLORS.surface} strokeWidth="0.5" />
      </svg>
    </div>
  )
}

function FavoriteStar() {
  return (
    <div data-favorite style={{ width: 18, height: 18, background: PIN_COLORS.favorite, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${PIN_COLORS.surface}`, boxShadow: '0 2px 6px rgba(0,0,0,0.6)', zIndex: 10 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#000">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  )
}

function GasBadge() {
  return (
    <div style={{ background: PIN_COLORS.gnv, borderRadius: 4, padding: '2px 5px', fontFamily: FONT_MONO, fontSize: 8, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '0.5px', border: `1px solid ${PIN_COLORS.surface}`, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      GAS
    </div>
  )
}

function ReferenceBadge() {
  return (
    <div data-reference style={{ background: PIN_COLORS.surfaceMuted, borderRadius: 4, padding: '2px 4px', fontFamily: FONT_MONO, fontSize: 8, fontWeight: 800, color: PIN_COLORS.muted, lineHeight: 1.1, letterSpacing: '0.5px', border: `1px solid ${PIN_COLORS.muted}` }}>
      REF
    </div>
  )
}
