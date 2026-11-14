import { describe, expect, it } from 'vitest'
import { fuelPrice, report, stationFields } from '@/test/fixtures/stations'
import { toPriceChange, toReportChange, toStationChange } from './realtimeChanges'

const base = { schema: 'public', commit_timestamp: '2026-11-13T10:00:00Z', errors: [] as string[] }
const priceRow = { ...fuelPrice(), station_id: 's1', expires_at: null }
const reportRow = { ...report(), station_id: 's1', is_visible: true }
const stationRow = { ...stationFields(), is_active: true, location: null, osm_id: null, created_at: null, updated_at: null }

const insert = <T extends object>(table: string, row: T) => ({ ...base, table, eventType: 'INSERT' as const, new: row, old: {} })
const update = <T extends object>(table: string, row: T) => ({ ...base, table, eventType: 'UPDATE' as const, new: row, old: {} })
const remove = <T extends object>(table: string, row: Partial<T>) => ({ ...base, table, eventType: 'DELETE' as const, new: {}, old: row })

describe('toPriceChange', () => {
  it('un INSERT activo es un precio nuevo de la estación', () => {
    expect(toPriceChange(insert('fuel_prices', priceRow))).toEqual({ kind: 'price-added', stationId: 's1', price: fuelPrice() })
  })

  it.each([
    ['inactivo', insert('fuel_prices', { ...priceRow, is_active: false })],
    ['con combustible desconocido', insert('fuel_prices', { ...priceRow, fuel_type: 'super' })],
    ['UPDATE', update('fuel_prices', priceRow)],
    ['DELETE', remove('fuel_prices', { id: 'p1' })],
  ])('%s → unknown', (_, payload) => {
    expect(toPriceChange(payload)).toEqual({ kind: 'unknown' })
  })
})

describe('toReportChange', () => {
  it('un INSERT visible es un reporte nuevo', () => {
    expect(toReportChange(insert('reports', reportRow))).toEqual({ kind: 'report-added', stationId: 's1', report: report() })
  })

  it.each([
    ['oculto', insert('reports', { ...reportRow, is_visible: false })],
    ['UPDATE de votos', update('reports', reportRow)],
  ])('%s → unknown', (_, payload) => {
    expect(toReportChange(payload)).toEqual({ kind: 'unknown' })
  })
})

describe('toStationChange', () => {
  it('un UPDATE trae los campos y si sigue activa', () => {
    expect(toStationChange(update('stations', stationRow))).toEqual({ kind: 'station-updated', station: stationFields(), isActive: true })
    expect(toStationChange(update('stations', { ...stationRow, is_active: null }))).toMatchObject({ isActive: false })
  })

  it('un INSERT → unknown', () => {
    expect(toStationChange(insert('stations', stationRow))).toEqual({ kind: 'unknown' })
  })
})
