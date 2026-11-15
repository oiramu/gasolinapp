import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories } from '@/app/repositories'
import ReportPriceModalAdapter from '@/components/modals/ReportPriceModal'
import { createMockReportsRepository } from '@/features/reports/api/mockReportsRepository'
import type { ReportsRepository } from '@/features/reports/api/types'
import { restoreStations, useConfirmPrice } from '@/features/reports/model/useConfirmPrice'
import type { Station } from '@/features/stations/api/types'
import { queryKeys } from '@/shared/api/queryKeys'
import type { FuelType } from '@/shared/domain/fuel'
import { useAppStore } from '@/store/appStore'
import { fuelPrice, station, stationFields } from '@/test/fixtures/stations'
import { createTestQueryClient, renderWithProviders } from '@/test/renderWithProviders'
import { toPriceCheck } from './model/usePriceCheck'
import { PriceCheckPrompt } from './ui/PriceCheckPrompt'
import { StationFuelPrices } from './ui/StationFuelPrices'

const NOW = '2026-11-14T10:00:00.000Z'
const CONFIRMED = '2026-11-13T10:00:00Z' // el de la fixture: hace 1 día

/** Promesa que el test resuelve o rechaza cuando quiere, para ver el estado optimista. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toPriceCheck', () => {
  it('comunitario → confirmar ese precio; oficial → reportarlo; "Sin precio" → nada', () => {
    const community = fuelPrice()
    expect(toPriceCheck('corriente', { source: 'community', price: 15900, freshness: 'fresh' }, community))
      .toEqual({ source: 'community', fuelType: 'corriente', price: 15900, priceId: 'p1' })
    expect(toPriceCheck('diesel', { source: 'reference', price: 11291, validFrom: '2026-11-01' }, undefined))
      .toEqual({ source: 'reference', fuelType: 'diesel', price: 11291 })
    expect(toPriceCheck('extra', { source: 'none' }, undefined)).toBeNull()
  })
})

describe('PriceCheckPrompt', () => {
  const check = { source: 'community', fuelType: 'corriente', price: 15900, priceId: 'p1' } as const
  const noop = () => undefined

  it('mientras responde deshabilita Sí y No; ya respondida muestra el agradecimiento', () => {
    const { rerender } = render(<PriceCheckPrompt check={check} answered={false} pending onYes={noop} onNo={noop} />)
    // Visible corto (el precio ya está a la vista); el nombre accesible lleva la pregunta completa
    expect(screen.getByText('¿Sigue así?')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '¿Sigue en $15.900?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sí' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'No' })).toBeDisabled()
    rerender(<PriceCheckPrompt check={check} answered pending={false} onYes={noop} onNo={noop} />)
    expect(screen.getByText('¡Gracias!')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('useConfirmPrice (Command con rollback)', () => {
  function setup(confirmPrice: ReportsRepository['confirmPrice']) {
    const reports = { ...createMockReportsRepository(0), confirmPrice }
    const rendered = renderWithProviders(() => useConfirmPrice(), { reports })
    rendered.queryClient.setQueryData(queryKeys.stations, [station()])
    const confirmedAt = () => rendered.queryClient.getQueryData<readonly Station[]>(queryKeys.stations)?.[0]?.fuel_prices[0]?.confirmed_at
    return { ...rendered, confirmedAt }
  }

  it('confirma al instante y luego usa la hora del servidor', async () => {
    const server = deferred<string>()
    const { result, confirmedAt } = setup(() => server.promise)
    act(() => {
      result.current.mutate('p1')
    })
    await waitFor(() => {
      expect(confirmedAt()).toBe(NOW)
    })
    await act(async () => {
      server.resolve('2026-11-14T10:00:02Z')
      await server.promise
    })
    await waitFor(() => {
      expect(confirmedAt()).toBe('2026-11-14T10:00:02Z')
    })
  })

  it('si la RPC falla vuelve a la confirmación anterior', async () => {
    const { result, confirmedAt } = setup(() => Promise.reject(new Error('ALREADY_CONFIRMED')))
    await act(async () => {
      await result.current.mutateAsync('p1').catch(() => undefined)
    })
    expect(confirmedAt()).toBe(CONFIRMED)
  })

  it('sin estaciones en caché no escribe nada y sin snapshot no revierte nada', async () => {
    const { result, queryClient } = renderWithProviders(() => useConfirmPrice())
    await act(() => result.current.mutateAsync('p1'))
    expect(queryClient.getQueryData(queryKeys.stations)).toBeUndefined()
    restoreStations(queryClient, undefined)
    expect(queryClient.getQueryData(queryKeys.stations)).toBeUndefined()
  })
})

describe('StationFuelPrices: "¿Sigue en $X?"', () => {
  function renderPrices(reports: Partial<ReportsRepository> = {}) {
    const onReport = vi.fn()
    const notify = vi.fn()
    const current = station()
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(queryKeys.stations, [current])
    const repositories = { ...createMockRepositories(0), reports: { ...createMockReportsRepository(0), ...reports } }
    render(
      <AppProviders repositories={repositories} queryClient={queryClient}>
        <StationFuelPrices station={current} city="Barranquilla" onReport={onReport} notify={notify} />
      </AppProviders>,
    )
    const prompt = (question: string) => within(screen.getByRole('group', { name: question }))
    return { onReport, notify, prompt, user: userEvent.setup() }
  }

  it('pregunta por el comunitario y por el oficial; "Sin precio" no pregunta', async () => {
    renderPrices()
    expect(screen.getByRole('group', { name: '¿Sigue en $15.900?' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByRole('group', { name: '¿Es este el precio?' })).toHaveLength(1)
    })
    expect(screen.getAllByRole('button', { name: 'Sí' })).toHaveLength(2)
  })

  it('Sí en el comunitario lo confirma, agradece y deja de preguntar', async () => {
    const confirmPrice = vi.fn(() => Promise.resolve(NOW))
    const { prompt, notify, user } = renderPrices({ confirmPrice })
    await user.click(prompt('¿Sigue en $15.900?').getByRole('button', { name: 'Sí' }))
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('¡Gracias!', 'success')
    })
    expect(confirmPrice).toHaveBeenCalledWith('p1')
    expect(screen.getByText('¡Gracias!')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '¿Sigue en $15.900?' })).not.toBeInTheDocument()
  })

  it('Sí en el oficial lo reporta como precio de la estación', async () => {
    const reportPrice = vi.fn(() => Promise.resolve())
    const { prompt, notify, user } = renderPrices({ reportPrice })
    await waitFor(() => {
      expect(screen.getByRole('group', { name: '¿Es este el precio?' })).toBeInTheDocument()
    })
    await user.click(prompt('¿Es este el precio?').getByRole('button', { name: 'Sí' }))
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('¡Gracias!', 'success')
    })
    expect(reportPrice).toHaveBeenCalledWith({ stationId: 's1', fuelType: 'diesel', price: 11291 })
  })

  it('No abre el reporte con ese combustible, sin confirmar nada', async () => {
    const confirmPrice = vi.fn(() => Promise.resolve(NOW))
    const { prompt, onReport, user } = renderPrices({ confirmPrice })
    await user.click(prompt('¿Sigue en $15.900?').getByRole('button', { name: 'No' }))
    expect(onReport).toHaveBeenCalledExactlyOnceWith('corriente')
    expect(confirmPrice).not.toHaveBeenCalled()
  })

  it('si la RPC falla avisa con el mensaje traducido y sigue preguntando', async () => {
    const { prompt, notify, user } = renderPrices({ confirmPrice: () => Promise.reject(new Error('ALREADY_CONFIRMED')) })
    await user.click(prompt('¿Sigue en $15.900?').getByRole('button', { name: 'Sí' }))
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('Ya confirmaste este precio hoy. ¡Gracias!', 'error')
    })
    expect(screen.getByRole('group', { name: '¿Sigue en $15.900?' })).toBeInTheDocument()
  })

  it('sin precio no pregunta: ofrece "Reportar" con ese combustible', async () => {
    const { onReport, user } = renderPrices()
    await user.click(screen.getByRole('button', { name: 'Reportar precio de Extra' }))
    expect(onReport).toHaveBeenCalledExactlyOnceWith('extra')
  })
})

/** El store es JS legado (hasta la 0.5): se tipa aquí solo lo que el test usa. */
interface ReportModalActions {
  readonly openReportFor: (fuelType: FuelType) => void
  readonly setReportModalOpen: (open: boolean, preExpand?: boolean) => void
}
const reportModal = () => useAppStore.getState() as ReportModalActions

describe('"No" → reporte con el combustible preseleccionado', () => {
  afterEach(() => {
    reportModal().setReportModalOpen(false)
  })

  it('el store abre el modal con ese combustible y lo olvida al abrirlo de la forma normal', () => {
    reportModal().openReportFor('diesel')
    expect(useAppStore.getState()).toMatchObject({ reportModalOpen: true, reportModalPreExpand: false, reportModalFuel: 'diesel' })
    reportModal().setReportModalOpen(true, true)
    expect(useAppStore.getState()).toMatchObject({ reportModalOpen: true, reportModalPreExpand: true, reportModalFuel: null })
  })

  it('el modal llega con ese combustible activo y corriente apagado', () => {
    reportModal().openReportFor('diesel')
    render(
      <AppProviders repositories={createMockRepositories(0)} queryClient={createTestQueryClient()}>
        <ReportPriceModalAdapter station={stationFields()} />
      </AppProviders>,
    )
    expect(screen.getByLabelText('Precio de Diésel')).toBeInTheDocument()
    expect(screen.queryByLabelText('Precio de Corriente')).not.toBeInTheDocument()
  })
})
