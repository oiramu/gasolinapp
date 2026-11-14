import { describe, expect, it } from 'vitest'
import { fuelPrice, report, station, stationFields } from '@/test/fixtures/stations'
import { applyStationChange } from './stationsCache'

const s1 = station()
const s2 = station({ ...stationFields({ id: 's2', name: 'Biomax' }) })
const cache = [s1, s2]

describe('applyStationChange', () => {
  it('agrega un precio nuevo solo a su estación', () => {
    const price = fuelPrice({ id: 'p2', price: 16000 })
    const result = applyStationChange(cache, { kind: 'price-added', stationId: 's1', price })
    expect(result?.[0]?.fuel_prices).toEqual([...s1.fuel_prices, price])
    expect(result?.[1]).toBe(s2)
  })

  it('no duplica un precio o reporte que ya está', () => {
    expect(applyStationChange(cache, { kind: 'price-added', stationId: 's1', price: fuelPrice() })?.[0]).toBe(s1)
    expect(applyStationChange(cache, { kind: 'report-added', stationId: 's1', report: report() })?.[0]).toBe(s1)
  })

  it('agrega un reporte nuevo', () => {
    const added = report({ id: 'r2' })
    expect(applyStationChange(cache, { kind: 'report-added', stationId: 's2', report: added })?.[1]?.reports).toEqual([...s2.reports, added])
  })

  it('actualiza los campos de una estación activa', () => {
    const fields = stationFields({ has_gnv: true })
    const result = applyStationChange(cache, { kind: 'station-updated', station: fields, isActive: true })
    expect(result?.[0]).toEqual({ ...s1, has_gnv: true })
  })

  it('quita una estación desactivada', () => {
    expect(applyStationChange(cache, { kind: 'station-updated', station: stationFields(), isActive: false })).toEqual([s2])
  })

  it('pide invalidar si no puede parchear', () => {
    expect(applyStationChange(cache, { kind: 'station-updated', station: stationFields({ id: 'nueva' }), isActive: true })).toBeNull()
    expect(applyStationChange(cache, { kind: 'unknown' })).toBeNull()
  })
})
