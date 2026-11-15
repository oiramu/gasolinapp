import { act } from '@testing-library/react'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/queryKeys'
import { server } from '@/test/msw/server'
import { stationFields } from '@/test/fixtures/stations'
import { renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockReportsRepository } from './api/mockReportsRepository'
import { createSupabaseReportsRepository } from './api/supabaseReportsRepository'
import type { ReportsRepository } from './api/types'
import { useSubmitReport } from './model/mutations'
import { canSubmit, INITIAL_FORM, parsePrice, priceEntries, toDraft, type ReportForm } from './model/reportForm'
import { submitMessage, submitReport, type ReportSubmission } from './model/submitReport'

const repository = () => createSupabaseReportsRepository(createTestClient())

/** Captura el cuerpo de cada llamada a la RPC y responde con `body`. */
function captureRpc(name: string, body: JsonBodyType = null) {
  const calls: unknown[] = []
  server.use(
    http.post(`${REST_URL}/rpc/${name}`, async ({ request }) => {
      calls.push(await request.json())
      return HttpResponse.json(body)
    }),
  )
  return calls
}

describe('createSupabaseReportsRepository', () => {
  it('reportPrice llama report_price con el precio en COP', async () => {
    const calls = captureRpc('report_price', 'p1')
    await repository().reportPrice({ stationId: 's1', fuelType: 'gnv', price: 2500 })
    expect(calls).toEqual([{ p_station_id: 's1', p_fuel_type: 'gnv', p_price: 2500 }])
  })

  it('addReport llama add_report', async () => {
    const calls = captureRpc('add_report', 'r1')
    await repository().addReport({ stationId: 's1', type: 'comment', content: 'Sin cola' })
    expect(calls).toEqual([{ p_station_id: 's1', p_type: 'comment', p_content: 'Sin cola' }])
  })

  it('suggestServices devuelve las claves aplicadas', async () => {
    const calls = captureRpc('suggest_station_services', ['svc_bano'])
    await expect(repository().suggestServices({ stationId: 's1', services: { svc_bano: true } })).resolves.toEqual(['svc_bano'])
    expect(calls).toEqual([{ p_station_id: 's1', p_services: { svc_bano: true } }])
  })

  it('propaga el código de error de la RPC', async () => {
    server.use(http.post(`${REST_URL}/rpc/report_price`, () => postgrestError('RATE_LIMIT')))
    await expect(repository().reportPrice({ stationId: 's1', fuelType: 'extra', price: 18000 })).rejects.toThrow('RATE_LIMIT')
  })
})

describe('createMockReportsRepository', () => {
  it('acepta escrituras sin persistir ni aplicar servicios', async () => {
    const mock = createMockReportsRepository(0)
    await expect(mock.reportPrice({ stationId: 's1', fuelType: 'extra', price: 18000 })).resolves.toBeUndefined()
    await expect(mock.addReport({ stationId: 's1', type: 'comment', content: 'x' })).resolves.toBeUndefined()
    vi.useFakeTimers()
    const pending = createMockReportsRepository().suggestServices({ stationId: 's1', services: { svc_bano: true } })
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual([])
    vi.useRealTimers()
  })
})

describe('reportForm', () => {
  // svc_cafe en null: sin dato, así que proponer false sí es un cambio
  const station = stationFields({ svc_tienda: true, svc_bano: false, svc_cafe: null })
  const form = (overrides: Partial<ReportForm>): ReportForm => ({ ...INITIAL_FORM, ...overrides })

  it('parsePrice acepta COP enteros positivos', () => {
    expect(['15900', '15900.6', '', '  ', '0', '-5', 'abc'].map(parsePrice)).toEqual([15900, 15901, null, null, null, null, null])
  })

  it('solo envía combustibles activos con precio válido', () => {
    const prices = { ...INITIAL_FORM.prices, corriente: '15900', extra: '18900', gnv: 'x' }
    const activeFuels = { ...INITIAL_FORM.activeFuels, extra: false, gnv: true }
    expect(priceEntries(form({ prices, activeFuels }))).toEqual([{ fuelType: 'corriente', price: 15900 }])
  })

  it('el borrador lleva solo los servicios que cambian y recorta el comentario', () => {
    const draft = toDraft(form({ services: { svc_tienda: true, svc_bano: true, svc_cafe: false }, comment: '  Hola ' }), station)
    expect(draft).toMatchObject({ comment: 'Hola', services: { svc_bano: true, svc_cafe: false }, outOfRange: false })
  })

  it('no deja enviar vacío, fuera de rango ni comentarios largos', () => {
    const empty = toDraft(INITIAL_FORM, station)
    const tooHigh = toDraft(form({ prices: { ...INITIAL_FORM.prices, corriente: '50000' } }), station)
    const longComment = { ...empty, comment: 'x'.repeat(281) }
    const ok = toDraft(form({ comment: 'Solo efectivo' }), station)
    expect([empty, tooHigh, longComment, ok].map(canSubmit)).toEqual([false, false, false, true])
    expect(tooHigh.outOfRange).toBe(true)
  })
})

describe('submitReport', () => {
  const fake = () => {
    const calls: string[] = []
    const reports: ReportsRepository = {
      reportPrice: ({ fuelType }) => {
        calls.push(`precio:${fuelType}`)
        return Promise.resolve()
      },
      addReport: ({ type }) => {
        calls.push(`reporte:${type}`)
        return Promise.resolve()
      },
      suggestServices: () => {
        calls.push('servicios')
        return Promise.resolve(['svc_bano'])
      },
    }
    return { reports, calls }
  }
  const base: ReportSubmission = { stationId: 's1', prices: [], comment: '', services: {} }

  it('envía precios, luego el comentario y al final los servicios', async () => {
    const { reports, calls } = fake()
    const prices = [{ fuelType: 'corriente', price: 15900 }, { fuelType: 'extra', price: 18900 }] as const
    const outcome = await submitReport(reports, { ...base, prices, comment: 'Sin cola', services: { svc_bano: true } })
    expect(calls).toEqual(['precio:corriente', 'precio:extra', 'reporte:price', 'servicios'])
    expect(outcome).toEqual({ suggestedServices: true, appliedServices: ['svc_bano'] })
  })

  it('un comentario sin precios es de tipo comment y sin servicios no los sugiere', async () => {
    const { reports, calls } = fake()
    await expect(submitReport(reports, { ...base, comment: 'Hola' })).resolves.toEqual({ suggestedServices: false, appliedServices: [] })
    expect(calls).toEqual(['reporte:comment'])
  })

  it('el mensaje dice si los servicios se aplicaron o esperan confirmación', () => {
    expect(submitMessage({ suggestedServices: false, appliedServices: [] })).toMatch(/Gracias/)
    expect(submitMessage({ suggestedServices: true, appliedServices: ['svc_bano'] })).toMatch(/actualizados/)
    expect(submitMessage({ suggestedServices: true, appliedServices: [] })).toMatch(/otra persona/)
  })
})

describe('useSubmitReport', () => {
  it('envía con sesión y refresca solo los promedios por zona', async () => {
    const reports = createMockReportsRepository(0)
    const reportPrice = vi.spyOn(reports, 'reportPrice')
    const { result, queryClient } = renderWithProviders(() => useSubmitReport(), { reports })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(() => result.current.mutateAsync({ stationId: 's1', prices: [{ fuelType: 'diesel', price: 11000 }], comment: '', services: {} }))
    expect(reportPrice).toHaveBeenCalledWith({ stationId: 's1', fuelType: 'diesel', price: 11000 })
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: queryKeys.zoneAverages })
  })
})
