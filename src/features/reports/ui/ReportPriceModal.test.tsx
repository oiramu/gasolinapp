import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories, type Repositories } from '@/app/repositories'
import type { AuthRepository } from '@/features/auth/api/types'
import { stationFields } from '@/test/fixtures/stations'
import { createTestQueryClient } from '@/test/renderWithProviders'
import type { ReportsRepository } from '../api/types'
import { ReportPriceModal } from './ReportPriceModal'
import { SubmitButton } from './SubmitButton'

const station = stationFields({ svc_tienda: true })

function renderModal({ overrides = {}, servicesEnabled = true }: { overrides?: Partial<Repositories>; servicesEnabled?: boolean } = {}) {
  const onClose = vi.fn()
  const notify = vi.fn()
  render(
    <AppProviders repositories={{ ...createMockRepositories(0), ...overrides }} queryClient={createTestQueryClient()}>
      <ReportPriceModal station={station} servicesEnabled={servicesEnabled} expandServices={false} onClose={onClose} notify={notify} />
    </AppProviders>,
  )
  const submit = () => screen.getByRole('button', { name: /Enviar reporte|Enviando/ })
  return { onClose, notify, submit, user: userEvent.setup() }
}

const reportsWith = (overrides: Partial<ReportsRepository>): ReportsRepository => ({
  reportPrice: () => Promise.resolve(),
  addReport: () => Promise.resolve(),
  suggestServices: () => Promise.resolve([]),
  ...overrides,
})

describe('ReportPriceModal', () => {
  it('reporta un precio por RPC, avisa y cierra', async () => {
    const reportPrice = vi.fn(() => Promise.resolve())
    const { user, submit, notify, onClose } = renderModal({ overrides: { reports: reportsWith({ reportPrice }) } })
    expect(submit()).toBeDisabled()
    await user.type(screen.getByLabelText('Precio de Corriente'), '15900')
    await waitFor(() => {
      expect(submit()).toBeEnabled()
    })
    await user.click(submit())
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })
    expect(reportPrice).toHaveBeenCalledWith({ stationId: 's1', fuelType: 'corriente', price: 15900 })
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/Gracias/), 'success')
  })

  it('un precio fuera de rango se marca y bloquea el envío', async () => {
    const { user, submit } = renderModal()
    await user.type(screen.getByLabelText('Precio de Corriente'), '50000')
    expect(screen.getByRole('alert')).toHaveTextContent(/Fuera del rango permitido/)
    expect(submit()).toBeDisabled()
  })

  it('activa otros combustibles, muestra la pista del GNV y traduce el error de la RPC', async () => {
    const reportPrice = vi.fn(() => Promise.reject(new Error('RATE_LIMIT')))
    const { user, submit, notify, onClose } = renderModal({ overrides: { reports: reportsWith({ reportPrice }) } })
    await user.click(screen.getByRole('button', { name: /Corriente/, pressed: true }))
    await user.click(screen.getByRole('button', { name: /Gas/, pressed: false }))
    expect(screen.getByText(/metros cúbicos/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Precio de Gas'), '2500')
    await user.click(submit())
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith(expect.stringMatching(/Espera un rato/), 'error')
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('sugiere servicios y un comentario sin precios', async () => {
    const suggestServices = vi.fn(() => Promise.resolve(['svc_bano']))
    const addReport = vi.fn(() => Promise.resolve())
    const { user, submit, notify } = renderModal({ overrides: { reports: reportsWith({ suggestServices, addReport }) } })
    await user.click(screen.getByRole('button', { name: /Corriente/, pressed: true }))
    await user.click(screen.getByRole('button', { name: /Servicios de la estación/ }))
    expect(screen.getByText(/1 servicios registrados/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Baño público/ }))
    await user.click(screen.getByRole('button', { name: /Tienda de conveniencia/ }))
    await user.type(screen.getByLabelText(/Comentario/), 'Baños nuevos')
    expect(screen.getByText('12/280')).toBeInTheDocument()
    await user.click(submit())
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith(expect.stringMatching(/actualizados/), 'success')
    })
    expect(addReport).toHaveBeenCalledWith({ stationId: 's1', type: 'comment', content: 'Baños nuevos' })
    expect(suggestServices).toHaveBeenCalledWith({ stationId: 's1', services: { svc_bano: true, svc_tienda: false } })
  })

  it('mientras envía, el botón dice "Enviando…" y no se puede volver a tocar', () => {
    render(<SubmitButton disabled={false} submitting />)
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  })

  it('sin el flag no muestra servicios; sin sesión no envía; cerrar avisa al contenedor', async () => {
    const noSession: AuthRepository = { getSession: () => new Promise(() => undefined), signInAnonymously: () => new Promise(() => undefined) }
    const { user, submit, onClose } = renderModal({ overrides: { auth: noSession }, servicesEnabled: false })
    expect(screen.queryByText('Servicios de la estación')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Precio de Corriente'), '15900')
    expect(submit()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cerrar reporte' }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
