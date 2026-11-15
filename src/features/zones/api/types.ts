/** Promedio de precios por zona (RPC `get_zone_averages`). Sin reportes, el promedio es null. */
export interface ZoneAverage {
  readonly id: string
  readonly name: string
  readonly city: string | null
  readonly dept: string | null
  readonly code: string | null
  readonly lat: number
  readonly lng: number
  readonly avg_corriente: number | null
  readonly avg_extra: number | null
  readonly avg_diesel: number | null
  readonly avg_gnv: number | null
  readonly avg_urea: number | null
  readonly station_count: number
}

export interface ZonesRepository {
  listAverages(): Promise<readonly ZoneAverage[]>
}
