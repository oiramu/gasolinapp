import type { ServiceKey } from '@/features/stations/api/types'
import type { FuelType } from '@/shared/domain/fuel'
import type { ReportType } from '@/shared/domain/reports'

/** Precio en COP enteros. Moneda, unidad e identidad las fija el servidor (`report_price`). */
export interface PriceEntry {
  readonly fuelType: FuelType
  readonly price: number
}

export interface PriceReportInput extends PriceEntry {
  readonly stationId: string
}

export interface CommunityReportInput {
  readonly stationId: string
  readonly type: ReportType
  readonly content: string
}

export type ServiceValues = Readonly<Partial<Record<ServiceKey, boolean>>>

export interface ServiceSuggestionInput {
  readonly stationId: string
  readonly services: ServiceValues
}

/** Puerto de escrituras de la comunidad. Supabase usa las RPC de la 1.3a; el mock no persiste. */
export interface ReportsRepository {
  reportPrice(input: PriceReportInput): Promise<void>
  addReport(input: CommunityReportInput): Promise<void>
  /** Devuelve las claves que quedaron aplicadas en la estación (2 usuarios coincidieron). */
  suggestServices(input: ServiceSuggestionInput): Promise<readonly string[]>
  /** "¿Sigue en $X? Sí": renueva la confirmación de un precio comunitario. Devuelve el `confirmed_at` nuevo. */
  confirmPrice(priceId: string): Promise<string>
}
