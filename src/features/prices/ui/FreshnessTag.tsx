import { FRESHNESS_LABELS, formatConfirmed, getFreshness } from '@/shared/domain/freshness'
import { useNow } from '@/shared/lib/useNow'
import { FRESHNESS_COLORS } from '@/shared/ui/freshness'

/** "● Reciente · hace 3d": qué tan creíble es el precio comunitario de una estación. */
export function FreshnessTag({ confirmedAt }: { readonly confirmedAt: string | null }) {
  const now = useNow()
  const freshness = getFreshness(confirmedAt, now)
  const color = FRESHNESS_COLORS[freshness]
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-400" data-freshness={freshness}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate">
        <span style={{ color }}>{FRESHNESS_LABELS[freshness]}</span> · {formatConfirmed(confirmedAt, now)}
      </span>
    </span>
  )
}
