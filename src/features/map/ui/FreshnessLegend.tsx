import { FRESHNESS_LABELS, FRESHNESS_ORDER, FRESHNESS_RANGES } from '@/shared/domain/freshness'
import { FRESHNESS_OPACITY } from '@/shared/ui/freshness'

const SWATCH = 'h-2.5 rounded-full border'

/**
 * Leyenda de frescura compacta para el celular: una escala de cuatro pasos (un pin más transparente
 * es un precio confirmado hace más tiempo) y una fila para el oficial (borde punteado).
 */
export function FreshnessLegend({ color }: { readonly color: string }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Frescura del precio</p>
      <ul className="grid grid-cols-4 gap-1.5">
        {FRESHNESS_ORDER.map((freshness) => (
          <li key={freshness} className="flex min-w-0 flex-col items-center gap-1 text-center">
            <span className={`${SWATCH} w-full`} style={{ borderColor: color, backgroundColor: `${color}55`, opacity: FRESHNESS_OPACITY[freshness] }} />
            <span className="text-[11px] leading-none text-gray-300">{FRESHNESS_LABELS[freshness]}</span>
            <span className="font-mono text-[10px] leading-none text-gray-500">{FRESHNESS_RANGES[freshness]}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-[11px] text-gray-300">
        <span className={`${SWATCH} w-6 shrink-0 border-dashed`} style={{ borderColor: color }} />
        Precio oficial
        <span className="ml-auto font-mono text-[10px] text-gray-500">referencia</span>
      </p>
    </div>
  )
}
