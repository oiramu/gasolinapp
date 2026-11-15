import { formatRelativeTime } from './time'

/**
 * Qué tan creíble es un precio según cuándo se confirmó por última vez (`fuel_prices.confirmed_at`).
 * Un precio no vence: envejece.
 */
export type Freshness = 'fresh' | 'recent' | 'old' | 'doubtful'

const MS_PER_DAY = 86_400_000

/** Límites en días, de menor a mayor: por debajo de cada uno, el precio tiene esa frescura. */
const FRESHNESS_STEPS: readonly { readonly belowDays: number; readonly freshness: Freshness }[] = [
  { belowDays: 3, freshness: 'fresh' },
  { belowDays: 10, freshness: 'recent' },
  { belowDays: 30, freshness: 'old' },
]

export const FRESHNESS_LABELS: Readonly<Record<Freshness, string>> = {
  fresh: 'Fresco',
  recent: 'Reciente',
  old: 'Viejo',
  doubtful: 'Dudoso',
}

/** Rangos para la leyenda: "< 3 días", "< 10 días", "< 30 días", "30 días o más". */
export const FRESHNESS_RANGES: Readonly<Record<Freshness, string>> = {
  fresh: '< 3 días',
  recent: '< 10 días',
  old: '< 30 días',
  doubtful: '30 días o más',
}

export const FRESHNESS_ORDER: readonly Freshness[] = ['fresh', 'recent', 'old', 'doubtful']

/** Sin fecha, o con más de 30 días, el precio es dudoso. */
export function getFreshness(confirmedAt: string | null | undefined, now: number): Freshness {
  if (!confirmedAt) return 'doubtful'
  const days = (now - new Date(confirmedAt).getTime()) / MS_PER_DAY
  return FRESHNESS_STEPS.find((step) => days < step.belowDays)?.freshness ?? 'doubtful'
}

/** "confirmado hace 3d", "confirmado ahora mismo" o "sin confirmar". */
export function formatConfirmed(confirmedAt: string | null | undefined, now: number): string {
  return confirmedAt ? `confirmado ${formatRelativeTime(confirmedAt, now)}` : 'sin confirmar'
}
