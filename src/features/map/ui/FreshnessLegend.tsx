import { FRESHNESS_LABELS, FRESHNESS_ORDER, FRESHNESS_RANGES } from '@/shared/domain/freshness'
import { FRESHNESS_OPACITY } from '@/shared/ui/freshness'

/** Leyenda de frescura: un pin más transparente es un precio confirmado hace más tiempo. */
export function FreshnessLegend({ color }: { readonly color: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] uppercase tracking-wider font-mono text-gray-500">Frescura del precio</p>
      {FRESHNESS_ORDER.map((freshness) => (
        <div key={freshness} className="flex items-center gap-3 text-[11px] font-mono text-gray-300">
          <div
            className="w-3.5 h-3.5 rounded-md border-2 flex-shrink-0"
            style={{ borderColor: color, backgroundColor: `${color}33`, opacity: FRESHNESS_OPACITY[freshness] }}
          />
          <span>{FRESHNESS_LABELS[freshness]}</span>
          <span className="ml-auto text-[10px] text-gray-500">{FRESHNESS_RANGES[freshness]}</span>
        </div>
      ))}
    </div>
  )
}
