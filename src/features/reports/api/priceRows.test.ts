import { describe, expect, it } from 'vitest'
import { ANONYMOUS, toCommentRow, toPriceRows } from './priceRows'

const report = { stationId: 's1', fuels: { corriente: '15900', gnv: 2850 }, comment: 'Sin cola', userDisplayName: 'MK' }

describe('toPriceRows', () => {
  it('crea una fila por combustible con su unidad, en COP', () => {
    expect(toPriceRows(report)).toEqual([
      { station_id: 's1', fuel_type: 'corriente', price: 15900, price_unit: 'gallon', currency: 'COP', comment: 'Sin cola', reported_by: 'MK', is_active: true },
      { station_id: 's1', fuel_type: 'gnv', price: 2850, price_unit: 'm3', currency: 'COP', comment: 'Sin cola', reported_by: 'MK', is_active: true },
    ])
  })

  it('omite precios vacíos o no numéricos y conserva el "0" escrito (lo rechaza la DB)', () => {
    const rows = toPriceRows({ ...report, fuels: { extra: '', diesel: 'abc', urea: 0, corriente: '0' } })
    expect(rows.map((row) => [row.fuel_type, row.price])).toEqual([['corriente', 0]])
  })

  it('un nombre vacío o ausente es anónimo', () => {
    expect(toPriceRows({ ...report, userDisplayName: '' })[0]?.reported_by).toBe(ANONYMOUS)
    expect(toPriceRows({ ...report, userDisplayName: undefined })[0]?.reported_by).toBe(ANONYMOUS)
  })
})

describe('toCommentRow', () => {
  it('crea el reporte de texto solo si hay comentario', () => {
    expect(toCommentRow(report)).toEqual({ station_id: 's1', type: 'price', content: 'Sin cola', user_display_name: 'MK' })
    expect(toCommentRow({ ...report, comment: '' })).toBeNull()
  })
})
