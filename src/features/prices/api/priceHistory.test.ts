import { describe, expect, it } from 'vitest'
import { groupByDay, roundedAverage, toDailyPrice } from './priceHistory'

const daily = { price_date: '2026-11-13', avg_price: 15900, min_price: 15800, max_price: 16000, report_count: 3 }

describe('toDailyPrice', () => {
  it('adapta filas completas y descarta las incompletas', () => {
    expect(toDailyPrice(daily)).toEqual([daily])
    for (const key of Object.keys(daily)) expect(toDailyPrice({ ...daily, [key]: null })).toEqual([])
  })
})

describe('groupByDay', () => {
  it('agrupa por día con promedio redondeado, mínimo, máximo y conteo', () => {
    const rows = [
      { price: 15900, created_at: '2026-11-12T08:00:00Z' },
      { price: 16000, created_at: '2026-11-12T20:00:00Z' },
      { price: 15800, created_at: '2026-11-13T09:00:00Z' },
      { price: 99999, created_at: null },
    ]
    expect(groupByDay(rows)).toEqual([
      { price_date: '2026-11-12', avg_price: 15950, min_price: 15900, max_price: 16000, report_count: 2 },
      { price_date: '2026-11-13', avg_price: 15800, min_price: 15800, max_price: 15800, report_count: 1 },
    ])
  })
})

describe('roundedAverage', () => {
  it('promedia y redondea; sin muestra → null', () => {
    expect(roundedAverage([15900, 16000, 16001])).toBe(15967)
    expect(roundedAverage([])).toBeNull()
  })
})
