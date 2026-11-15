import { PIN_COLORS, type ZonePinModel } from '../model/pins'

const FONT_MONO = '"JetBrains Mono", monospace'
const FONT_BODY = '"DM Sans", sans-serif'

/** Pin de una zona (zoom lejano): promedio de la zona, no precio de una estación. */
export function ZonePin({ model }: { readonly model: ZonePinModel }) {
  const { label, caption, color } = model
  return (
    <div style={{ background: PIN_COLORS.surface, border: `2px solid ${color}`, borderRadius: 14, padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, boxShadow: `0 6px 24px ${color}4D`, pointerEvents: 'none' }}>
      <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 15, color, lineHeight: 1 }}>{label}</span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 9, color: PIN_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{caption}</span>
    </div>
  )
}

/** Punto pulsante de la ubicación del usuario. */
export function UserLocationDot() {
  return (
    <div style={{ position: 'relative', width: 20, height: 20, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'rgba(0,229,160,0.2)', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: PIN_COLORS.active, border: `3px solid ${PIN_COLORS.surface}`, boxShadow: '0 2px 12px rgba(0,229,160,0.6)' }} />
    </div>
  )
}
