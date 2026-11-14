import { describe, expect, it } from 'vitest'
import { fuelPrice, report, station, stationFields } from '@/test/fixtures/stations'
import { applyStationChange, findTally } from './stationsCache'

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

describe('votos en caché', () => {
  const tally = { votesUp: 9, votesDown: 4 }

  it('actualiza los contadores del reporte y deja igual lo demás', () => {
    const other = report({ id: 'r2' })
    const withTwo = station({ reports: [report(), other] })
    const [patched] = applyStationChange([withTwo, s2], { kind: 'votes-updated', targetType: 'report', targetId: 'r1', tally }) ?? []
    expect(patched?.reports).toEqual([{ ...report(), votes_up: 9, votes_down: 4 }, other])
    expect(patched?.fuel_prices).toBe(withTwo.fuel_prices)
  })

  it('actualiza un precio y no recrea estaciones que no lo tienen', () => {
    const other = station({ ...stationFields({ id: 's3' }), fuel_prices: [fuelPrice({ id: 'p9' })], reports: [] })
    const result = applyStationChange([s1, other], { kind: 'votes-updated', targetType: 'price', targetId: 'p9', tally })
    expect(result?.[0]).toBe(s1)
    expect(result?.[1]?.fuel_prices[0]).toMatchObject({ votes_up: 9, votes_down: 4 })
  })

  it('findTally lee los contadores en caché o devuelve null', () => {
    expect(findTally(cache, { targetType: 'report', targetId: 'r1' })).toEqual({ votesUp: 2, votesDown: 0 })
    expect(findTally(cache, { targetType: 'price', targetId: 'no-existe' })).toBeNull()
  })
})
