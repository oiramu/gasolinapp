/** Promedio diario de una estación y combustible (vista `daily_avg_prices` o agrupado en cliente). */
export interface DailyPrice {
  readonly price_date: string
  readonly avg_price: number
  readonly min_price: number
  readonly max_price: number
  readonly report_count: number
}

export interface HistoryQuery {
  readonly stationId: string
  readonly fuelType: string
  readonly days: number
}

export interface ReferenceQuery {
  readonly stationId: string | null
  readonly fuelType: string
}

export interface PricesRepository {
  history(query: HistoryQuery): Promise<readonly DailyPrice[]>
  /** Precio de hace ~30 días en la estación o, si no hay, el promedio vigente del combustible. */
  referencePrice(query: ReferenceQuery): Promise<number | null>
}
