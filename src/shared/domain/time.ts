const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1440

interface RelativeStep {
  /** El paso aplica si los minutos transcurridos son menores que este límite. */
  readonly below: number
  readonly minutesPerUnit: number
  readonly suffix: string
}

const DAYS: RelativeStep = { below: Infinity, minutesPerUnit: MINUTES_PER_DAY, suffix: 'd' }

const RELATIVE_STEPS: readonly RelativeStep[] = [
  { below: MINUTES_PER_HOUR, minutesPerUnit: 1, suffix: 'm' },
  { below: MINUTES_PER_DAY, minutesPerUnit: MINUTES_PER_HOUR, suffix: 'h' },
  DAYS,
]

/** Tiempo relativo corto: "ahora mismo", "hace 5m", "hace 2h", "hace 3d". */
export function formatRelativeTime(date: string | number | Date, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(date).getTime()) / MS_PER_MINUTE)
  if (minutes < 1) return 'ahora mismo'
  const step = RELATIVE_STEPS.find((candidate) => minutes < candidate.below) ?? DAYS
  return `hace ${String(Math.floor(minutes / step.minutesPerUnit))}${step.suffix}`
}
