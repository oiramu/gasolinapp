import { getFreshness, type Freshness } from './freshness'

/** Precio comunitario más reciente de un combustible en una estación. */
export interface CommunityPrice {
  readonly price: number
  readonly confirmedAt: string | null
}

/** Precio oficial de referencia vigente en la ciudad de la estación. */
export interface OfficialPrice {
  readonly price: number
  /** Primer día en que rige, `YYYY-MM-DD`. */
  readonly validFrom: string
}

export type DisplayPrice =
  | { readonly source: 'community'; readonly price: number; readonly freshness: Freshness }
  | { readonly source: 'reference'; readonly price: number; readonly validFrom: string }
  | { readonly source: 'none' }

const TRUSTED: ReadonlySet<Freshness> = new Set(['fresh', 'recent'])
const NONE: DisplayPrice = { source: 'none' }

/**
 * Qué precio mostrar para un combustible en una estación:
 * 1. el comunitario si es fresco o reciente;
 * 2. si no, el oficial de referencia de su ciudad;
 * 3. si no hay oficial, el comunitario aunque esté viejo (con su frescura a la vista);
 * 4. si no hay ninguno, 'none' ("Sin precio").
 */
export function resolveDisplayPrice(community: CommunityPrice | undefined, official: OfficialPrice | undefined, now: number): DisplayPrice {
  const fromCommunity = community && { source: 'community' as const, price: community.price, freshness: getFreshness(community.confirmedAt, now) }
  if (fromCommunity && TRUSTED.has(fromCommunity.freshness)) return fromCommunity
  if (official) return { source: 'reference', price: official.price, validFrom: official.validFrom }
  return fromCommunity ?? NONE
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'] as const

/** "2026-11-01" → "nov 2026", para "Precio de referencia oficial (nov 2026)". */
export function formatReferenceMonth(validFrom: string): string {
  const [year = '', month = ''] = validFrom.split('-')
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`
}
