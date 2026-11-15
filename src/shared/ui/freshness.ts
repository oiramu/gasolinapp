import type { Freshness } from '@/shared/domain/freshness'

// Cómo se ve cada nivel de frescura. Una sola tabla para el pin, el panel y la leyenda.

export const FRESHNESS_COLORS: Readonly<Record<Freshness, string>> = {
  fresh: '#00E5A0',
  recent: '#A3E635',
  old: '#FBBF24',
  doubtful: '#9CA3AF',
}

/** Opacidad del pin: un precio viejo se ve, pero se nota que es viejo. */
export const FRESHNESS_OPACITY: Readonly<Record<Freshness, number>> = {
  fresh: 1,
  recent: 0.85,
  old: 0.6,
  doubtful: 0.4,
}
