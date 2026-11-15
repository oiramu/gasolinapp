import { isFuelType, isPriceOutlier, type FuelType } from '@/shared/domain/fuel'

// Importación mensual de precios oficiales: CSV `city,fuel_type,price` → SQL para public.reference_prices.
// Funciones puras; scripts/import-reference-prices.ts solo lee archivos y argumentos.

export interface ReferenceRow {
  readonly city: string
  readonly fuelType: FuelType
  readonly price: number
}

export interface ImportOptions {
  /** Primer día en que rige el precio, `YYYY-MM-DD`. */
  readonly validFrom: string
  readonly sourceUrl: string
}

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly errors: readonly string[] }

const HEADER = 'city,fuel_type,price'
const FIELDS = 3
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** "16.331" (punto de miles, como lo publica la CREG) o "16331" → 16331. */
const parsePrice = (raw: string): number => Number(raw.replaceAll('.', ''))

interface Candidate {
  readonly fields: readonly string[]
  readonly city: string
  readonly fuelType: string
  readonly rawPrice: string
  readonly price: number
}

/** Reglas de cada fila, en orden: la primera que falla da el error. */
const RULES: readonly { readonly fails: (c: Candidate) => boolean; readonly reason: (c: Candidate) => string }[] = [
  { fails: (c) => c.fields.length !== FIELDS || c.city === '', reason: () => `se esperaban ${HEADER}` },
  { fails: (c) => !isFuelType(c.fuelType), reason: (c) => `combustible desconocido "${c.fuelType}"` },
  { fails: (c) => !Number.isInteger(c.price) || isPriceOutlier(c.price, c.fuelType), reason: (c) => `precio fuera de rango para ${c.fuelType}: "${c.rawPrice}"` },
]

function toCandidate(line: string): Candidate {
  const fields = line.split(',').map((field) => field.trim())
  const [city = '', fuelType = '', rawPrice = ''] = fields
  return { fields, city, fuelType, rawPrice, price: parsePrice(rawPrice) }
}

function parseLine(line: string, lineNumber: number): Parsed<ReferenceRow> {
  const candidate = toCandidate(line)
  const broken = RULES.find((rule) => rule.fails(candidate))
  const { city, fuelType, price } = candidate
  if (broken || !isFuelType(fuelType)) {
    return { ok: false, errors: [`línea ${String(lineNumber)}: ${broken?.reason(candidate) ?? ''}`] }
  }
  return { ok: true, value: { city, fuelType, price } }
}

function duplicates(rows: readonly ReferenceRow[]): string[] {
  const seen = new Set<string>()
  return rows.flatMap(({ city, fuelType }) => {
    const key = `${city}/${fuelType}`
    const repeated = seen.has(key)
    seen.add(key)
    return repeated ? [`fila repetida: ${key}`] : []
  })
}

export function parseReferenceCsv(csv: string): Parsed<readonly ReferenceRow[]> {
  const [header = '', ...lines] = csv.split(/\r?\n/).map((line) => line.trim())
  if (header !== HEADER) return { ok: false, errors: [`la primera línea debe ser "${HEADER}"`] }
  const parsed = lines.map((line, index) => ({ line, lineNumber: index + 2 })).filter(({ line }) => line !== '')
    .map(({ line, lineNumber }) => parseLine(line, lineNumber))
  const rows = parsed.flatMap((result) => (result.ok ? [result.value] : []))
  const errors = [...parsed.flatMap((result) => (result.ok ? [] : result.errors)), ...duplicates(rows)]
  if (rows.length === 0 && errors.length === 0) return { ok: false, errors: ['el CSV no tiene filas'] }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: rows }
}

const isRealDate = (value: string): boolean => ISO_DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)

const dateErrors = (validFrom: string): string[] => (isRealDate(validFrom) ? [] : ['--valid-from debe ser una fecha YYYY-MM-DD'])
const sourceErrors = (sourceUrl: string): string[] => (sourceUrl.startsWith('https://') ? [] : ['--source debe ser una URL https://'])

export function validateOptions(validFrom = '', sourceUrl = ''): Parsed<ImportOptions> {
  const errors = [...dateErrors(validFrom), ...sourceErrors(sourceUrl)]
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { validFrom, sourceUrl } }
}

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`

/** SQL idempotente: volver a correrlo corrige precio y fuente sin duplicar filas. */
export function toReferenceSql(rows: readonly ReferenceRow[], { validFrom, sourceUrl }: ImportOptions): string {
  const values = rows.map(({ city, fuelType, price }) =>
    `  (${literal(city)}, ${literal(fuelType)}, DATE ${literal(validFrom)}, ${String(price)}, ${literal(sourceUrl)})`)
  return [
    `-- Precios oficiales de referencia vigentes desde ${validFrom}. Generado por npm run reference-prices:import.`,
    `-- Fuente: ${sourceUrl}`,
    '-- Correr en el SQL Editor de Supabase (como postgres). Idempotente.',
    'BEGIN;',
    'INSERT INTO public.reference_prices (city, fuel_type, valid_from, price, source_url) VALUES',
    values.join(',\n'),
    'ON CONFLICT (city, fuel_type, valid_from) DO UPDATE SET price = EXCLUDED.price, source_url = EXCLUDED.source_url;',
    'COMMIT;',
    '',
  ].join('\n')
}
