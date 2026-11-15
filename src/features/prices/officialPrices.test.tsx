import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createMockRepositories } from '@/app/repositories'
import { server } from '@/test/msw/server'
import { fuelPrice, station } from '@/test/fixtures/stations'
import { createTestQueryClient, renderWithProviders } from '@/test/renderWithProviders'
import { createTestClient, REST_URL } from '@/test/supabase'
import { createMockPricesRepository, MOCK_OFFICIAL_PRICES } from './api/mockPricesRepository'
import { createSupabasePricesRepository } from './api/supabasePricesRepository'
import { buildOfficialLookup, useOfficialPrices } from './model/useOfficialPrices'
import { FuelPriceRow } from './ui/FuelPriceRow'
import { StationFuelPrices } from './ui/StationFuelPrices'

const SOURCE = 'https://creg.gov.co/publicaciones/15565/precios-de-combustibles-liquidos/'

describe('repositorios de precios oficiales', () => {
  it('Supabase lee current_reference_prices y descarta combustibles que el dominio no conoce', async () => {
    server.use(
      http.get(`${REST_URL}/current_reference_prices`, () =>
        HttpResponse.json([
          { city: 'Barranquilla', fuel_type: 'corriente', price: 15964, valid_from: '2026-11-01', source_url: SOURCE },
          { city: 'Barranquilla', fuel_type: 'super', price: 15000, valid_from: '2026-11-01', source_url: SOURCE },
        ]),
      ),
    )
    await expect(createSupabasePricesRepository(createTestClient()).officialPrices()).resolves.toEqual([
      { city: 'Barranquilla', fuelType: 'corriente', price: 15964, validFrom: '2026-11-01' },
    ])
  })

  it('el mock trae los precios de Barranquilla', async () => {
    await expect(createMockPricesRepository(0).officialPrices()).resolves.toEqual(MOCK_OFFICIAL_PRICES)
  })
})

describe('buildOfficialLookup', () => {
  const lookup = buildOfficialLookup(MOCK_OFFICIAL_PRICES)

  it('busca por ciudad sin importar tildes ni mayúsculas', () => {
    expect(lookup('BARRANQUILLA', 'diesel')).toEqual({ price: 11291, validFrom: '2026-11-01' })
  })

  it('sin ciudad, sin precio para ese combustible o en otra ciudad no hay oficial', () => {
    expect(lookup(null, 'corriente')).toBeUndefined()
    expect(lookup('Barranquilla', 'extra')).toBeUndefined()
    expect(lookup('Santa Marta', 'corriente')).toBeUndefined()
  })
})

describe('useOfficialPrices', () => {
  it('carga los precios del repositorio inyectado', async () => {
    const { result } = renderWithProviders(() => useOfficialPrices())
    await waitFor(() => {
      expect(result.current('Barranquilla', 'corriente')).toEqual({ price: 15964, validFrom: '2026-11-01' })
    })
  })
})

describe('FuelPriceRow', () => {
  const renderRow = (props: Parameters<typeof FuelPriceRow>[0]) => render(<ul><FuelPriceRow {...props} /></ul>)

  it('oficial: precio y fuente con el mes, en una línea corta', () => {
    const { container } = renderRow({ fuelType: 'corriente', display: { source: 'reference', price: 15964, validFrom: '2026-11-01' }, confirmedAt: null })
    expect(screen.getByText('$15.964')).toBeInTheDocument()
    expect(screen.getByText('Oficial · nov 2026')).toBeInTheDocument()
    expect(container.querySelector('[data-source="reference"]')).not.toBeNull()
  })

  it('sin precio: "Sin precio" y que nadie lo ha reportado, sin promedio de zona', () => {
    renderRow({ fuelType: 'extra', display: { source: 'none' }, confirmedAt: null })
    expect(screen.getByText('Sin precio')).toBeInTheDocument()
    expect(screen.getByText('Nadie lo ha reportado')).toBeInTheDocument()
    expect(screen.queryByText(/promedio/i)).not.toBeInTheDocument()
  })
})

describe('StationFuelPrices', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.parse('2026-11-14T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderPrices = (city: string | null) =>
    render(
      <AppProviders repositories={createMockRepositories(0)} queryClient={createTestQueryClient()}>
        <StationFuelPrices
          station={station({ fuel_prices: [fuelPrice({ fuel_type: 'corriente', price: 15900 })] })}
          city={city}
          onReport={vi.fn()}
          notify={vi.fn()}
        />
      </AppProviders>,
    )

  it('en Barranquilla: comunitario fresco, diésel oficial, extra y GNV sin precio y la urea oculta', async () => {
    const { container } = renderPrices('Barranquilla')
    expect(screen.getByText('$15.900')).toBeInTheDocument()
    expect(screen.getByText(/hace 1d/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('$11.291')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Sin precio')).toHaveLength(2)
    expect(screen.queryByText('AdBlue/Urea')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-source="reference"]')).toHaveLength(1)
    // La aclaración del oficial va una sola vez, al pie
    expect(screen.getAllByText(/Cada estación puede variar/)).toHaveLength(1)
  })

  it('en una ciudad sin precio oficial, el diésel también queda "Sin precio"', async () => {
    renderPrices('Santa Marta')
    await waitFor(() => {
      expect(screen.getAllByText('Sin precio')).toHaveLength(3)
    })
    expect(screen.queryByText(/Cada estación puede variar/)).not.toBeInTheDocument()
  })
})
