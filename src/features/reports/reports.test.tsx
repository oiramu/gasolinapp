import { act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/queryKeys'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, postgrestError, REST_URL } from '@/test/supabase'
import { createMockReportsRepository } from './api/mockReportsRepository'
import { createSupabaseReportsRepository } from './api/supabaseReportsRepository'
import type { ReportsRepository } from './api/types'
import { useSubmitPriceReport } from './model/mutations'

const repository = () => createSupabaseReportsRepository(createTestClient())
const report = { stationId: 's1', fuels: { corriente: '15900', extra: '18900' }, comment: 'Sin cola' }

describe('submitPriceReport', () => {
  it('inserta todos los precios en un solo INSERT y luego el comentario', async () => {
    const bodies: { table: string; body: unknown }[] = []
    server.use(
      http.post(`${REST_URL}/:table`, async ({ request, params }) => {
        bodies.push({ table: String(params.table), body: await request.json() })
        return new HttpResponse(null, { status: 201 })
      }),
    )
    await repository().submitPriceReport(report)
    expect(bodies.map((b) => b.table)).toEqual(['fuel_prices', 'reports'])
    expect(bodies[0]?.body).toHaveLength(2)
    expect(bodies[1]?.body).toMatchObject({ type: 'price', content: 'Sin cola', user_display_name: 'Anónimo' })
  })

  it('sin precios válidos ni comentario no escribe nada', async () => {
    await expect(repository().submitPriceReport({ stationId: 's1', fuels: { extra: '' }, comment: '' })).resolves.toBeUndefined()
  })

  it('propaga el error de la escritura', async () => {
    server.use(http.post(`${REST_URL}/fuel_prices`, () => postgrestError('fuera de rango')))
    await expect(repository().submitPriceReport(report)).rejects.toThrow('fuera de rango')
  })
})

describe('createMockReportsRepository', () => {
  it('acepta escrituras sin persistir', async () => {
    const mock = createMockReportsRepository(0)
    await expect(mock.submitPriceReport(report)).resolves.toBeUndefined()
    vi.useFakeTimers()
    const pending = createMockReportsRepository().submitPriceReport(report)
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})

describe('mutaciones', () => {
  const fake = () => {
    const submitPriceReport = vi.fn(() => Promise.resolve())
    const reports: ReportsRepository = { submitPriceReport }
    return { reports, submitPriceReport }
  }

  it('reportar invalida estaciones y promedios por zona', async () => {
    const { reports, submitPriceReport } = fake()
    const { result, queryClient } = renderWithProviders(() => useSubmitPriceReport(), { reports })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await act(() => result.current.mutateAsync(report))
    expect(submitPriceReport).toHaveBeenCalledWith(report)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.stations })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.zoneAverages })
  })

})
