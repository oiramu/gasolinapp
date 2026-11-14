import { describe, expect, it } from 'vitest'
import { fuelPrice, report, stationFields } from '@/test/fixtures/stations'
import { toFuelPrice, toReport, toStation, toStationFields } from './stationAdapter'

describe('toFuelPrice', () => {
  it('conserva solo las columnas del modelo', () => {
    const row = { ...fuelPrice(), station_id: 's1', expires_at: null }
    expect(toFuelPrice(row)).toEqual(fuelPrice())
  })

  it('descarta combustibles desconocidos', () => {
    expect(toFuelPrice({ ...fuelPrice(), fuel_type: 'super' })).toBeNull()
  })
})

describe('toReport y toStationFields', () => {
  it('quitan las columnas extra que trae el realtime', () => {
    expect(toReport({ ...report(), station_id: 's1', is_visible: true } as never)).toEqual(report())
    expect(toStationFields({ ...stationFields(), location: 'POINT', osm_id: 'n1' } as never)).toEqual(stationFields())
  })
})

describe('toStation', () => {
  it('normaliza relaciones nulas a listas vacías', () => {
    expect(toStation({ ...stationFields(), fuel_prices: null, reports: null })).toEqual({ ...stationFields(), fuel_prices: [], reports: [] })
    expect(toStation(stationFields())).toEqual({ ...stationFields(), fuel_prices: [], reports: [] })
  })

  it('adapta precios y reportes, y descarta los precios inválidos', () => {
    const legacy = { ...fuelPrice({ id: 'old' }), fuel_type: 'super' }
    const result = toStation({ ...stationFields(), fuel_prices: [fuelPrice(), legacy], reports: [report()] })
    expect(result.fuel_prices).toEqual([fuelPrice()])
    expect(result.reports).toEqual([report()])
  })
})
