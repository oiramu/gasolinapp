import type { FuelType } from '@/shared/domain/fuel'
import type { OfficialPrice } from '@/shared/domain/displayPrice'

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

/** Precio oficial vigente en una ciudad (vista `current_reference_prices`). */
export interface CityOfficialPrice extends OfficialPrice {
  readonly city: string
  readonly fuelType: FuelType
}

export interface PricesRepository {
  history(query: HistoryQuery): Promise<readonly DailyPrice[]>
  /** Precio de hace ~30 días en la estación o, si no hay, el promedio vigente del combustible. */
  referencePrice(query: ReferenceQuery): Promise<number | null>
  /** Precios oficiales de referencia vigentes (MinEnergía/CREG), por ciudad y combustible. */
  officialPrices(): Promise<readonly CityOfficialPrice[]>
}
