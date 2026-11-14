import type { DailyPrice } from './types'

// Funciones puras para armar el historial

export interface DailyPriceRow {
  readonly price_date: string | null
  readonly avg_price: number | null
  readonly min_price: number | null
  readonly max_price: number | null
  readonly report_count: number | null
}

/** Fila de la vista materializada → dominio. Las filas incompletas se descartan. */
export function toDailyPrice(row: DailyPriceRow): DailyPrice[] {
  const { price_date, avg_price, min_price, max_price, report_count } = row
  if (price_date === null || avg_price === null || min_price === null || max_price === null || report_count === null) return []
  return [{ price_date, avg_price, min_price, max_price, report_count }]
}

export interface RawPrice {
  readonly price: number
  readonly created_at: string | null
}

const ISO_DATE_LENGTH = 10

const average = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length

/** Agrupa precios por día (UTC, como lo hacía el cliente). Respaldo si la vista no responde. */
export function groupByDay(rows: readonly RawPrice[]): DailyPrice[] {
  const byDay = new Map<string, number[]>()
  for (const { price, created_at } of rows) {
    if (created_at === null) continue
    const day = created_at.slice(0, ISO_DATE_LENGTH)
    byDay.set(day, [...(byDay.get(day) ?? []), price])
  }
  return [...byDay].map(([price_date, prices]) => ({
    price_date,
    avg_price: Math.round(average(prices)),
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    report_count: prices.length,
  }))
}

/** Promedio redondeado de una muestra de precios; sin muestra → null. */
export function roundedAverage(prices: readonly number[]): number | null {
  return prices.length > 0 ? Math.round(average(prices)) : null
}
