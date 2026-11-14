import type { Tables } from '@/shared/api/database.types'
import type { FuelType } from '@/shared/domain/fuel'

// Columnas que la app lee de cada tabla. El modelo conserva los nombres de la DB hasta la 0.6.

export const SERVICE_COLUMNS = [
  'svc_montallantas',
  'svc_cambio_aceite',
  'svc_serviteca',
  'svc_tienda',
  'svc_lavadero',
  'svc_bano',
  'svc_cafe',
  'svc_electrico',
  'svc_atm',
] as const

export const STATION_KEYS = ['id', 'name', 'brand', 'address', 'lat', 'lng', 'zone_id', 'has_gnv', ...SERVICE_COLUMNS] as const

export const FUEL_PRICE_KEYS = [
  'id', 'fuel_type', 'price', 'price_unit', 'currency', 'comment', 'votes_up', 'votes_down', 'created_at', 'reported_by', 'is_active',
] as const

export const REPORT_KEYS = ['id', 'type', 'content', 'votes_up', 'votes_down', 'created_at', 'user_display_name'] as const

export type StationFields = Pick<Tables<'stations'>, (typeof STATION_KEYS)[number]>

export type FuelPriceRow = Pick<Tables<'fuel_prices'>, (typeof FUEL_PRICE_KEYS)[number]>

export type FuelPrice = Omit<FuelPriceRow, 'fuel_type'> & { readonly fuel_type: FuelType }

export type Report = Pick<Tables<'reports'>, (typeof REPORT_KEYS)[number]>

export interface Station extends StationFields {
  readonly fuel_prices: readonly FuelPrice[]
  readonly reports: readonly Report[]
}

/** Lo que el realtime puede cambiar de una estación ya cargada. */
export type StationChange =
  | { readonly kind: 'price-added'; readonly stationId: string; readonly price: FuelPrice }
  | { readonly kind: 'report-added'; readonly stationId: string; readonly report: Report }
  | { readonly kind: 'station-updated'; readonly station: StationFields; readonly isActive: boolean }
  | { readonly kind: 'unknown' }

export type Unsubscribe = () => void

/** Puerto de datos de estaciones. Las implementaciones son Supabase y Mock (Strategy). */
export interface StationsRepository {
  list(): Promise<readonly Station[]>
  /** Observer: avisa cada cambio para parchear la caché en lugar de recargar todo. */
  subscribe(listener: (change: StationChange) => void): Unsubscribe
}
