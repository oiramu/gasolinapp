import { isFuelType } from '@/shared/domain/fuel'
import {
  FUEL_PRICE_KEYS,
  REPORT_KEYS,
  STATION_KEYS,
  type FuelPrice,
  type FuelPriceRow,
  type Report,
  type Station,
  type StationFields,
} from './types'

type RawStation = StationFields & {
  readonly fuel_prices?: readonly FuelPriceRow[] | null
  readonly reports?: readonly Report[] | null
}

function pick<T, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>
}

/** Fila de `fuel_prices` → dominio. Descarta combustibles desconocidos (p. ej. el legado `super`). */
export function toFuelPrice(row: FuelPriceRow): FuelPrice | null {
  const { fuel_type } = row
  return isFuelType(fuel_type) ? { ...pick(row, FUEL_PRICE_KEYS), fuel_type } : null
}

const isPrice = (price: FuelPrice | null): price is FuelPrice => price !== null

/** Fila de `reports` → dominio, sin columnas extra. */
export function toReport(row: Report): Report {
  return pick(row, REPORT_KEYS)
}

/** Solo los campos propios de la estación, sin relaciones ni columnas extra. */
export function toStationFields(row: StationFields): StationFields {
  return pick(row, STATION_KEYS)
}

/** Fila con relaciones → `Station`, con listas nunca nulas. */
export function toStation(row: RawStation): Station {
  return {
    ...toStationFields(row),
    fuel_prices: (row.fuel_prices ?? []).map(toFuelPrice).filter(isPrice),
    reports: (row.reports ?? []).map(toReport),
  }
}
