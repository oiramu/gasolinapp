import { FRESHNESS_LABELS, formatConfirmed, getFreshness } from '@/shared/domain/freshness'
import { FRESHNESS_COLORS } from '@/shared/ui/freshness'
import { useNow } from '@/shared/lib/useNow'

/** "● confirmado hace 3d · Reciente": qué tan creíble es el precio de una estación. */
export function FreshnessTag({ confirmedAt }: { readonly confirmedAt: string | null }) {
  const now = useNow()
  const freshness = getFreshness(confirmedAt, now)
  const color = FRESHNESS_COLORS[freshness]
  return (
    <span className="flex items-center gap-1 mt-0.5 text-[9px] font-mono text-gray-500" data-freshness={freshness}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {formatConfirmed(confirmedAt, now)}
      <span style={{ color }}>· {FRESHNESS_LABELS[freshness]}</span>
    </span>
  )
}
