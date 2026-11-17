import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders'
import { createMockRepositories } from './app/repositories'
import { createMockStationsRepository } from './features/stations/api/mockStationsRepository'
import type { Station } from './features/stations/api/types'
import { station, stationFields } from './test/fixtures/stations'
import { createTestQueryClient } from './test/renderWithProviders'

// 2.4: lo que el mapa recibe y cuántas veces se monta, sin depender de Leaflet en jsdom
const mapView = vi.hoisted(() => ({ mounts: 0, stationIds: [] as string[] }))

vi.mock('@/components/map/MapView', () => ({
  default: function MapViewProbe({ stations, onBoundsChange }: { stations: readonly Station[]; onBoundsChange: (bounds: unknown) => void }) {
    useEffect(() => {
      mapView.mounts += 1
      // Como Leaflet al cargar: informa los límites visibles (aquí, todo) para calcular el mejor precio
      onBoundsChange({ contains: () => true })
    }, [onBoundsChange])
    mapView.stationIds = stations.map((s) => s.id)
    return null
  },
}))

// El usuario está en el centro de Barranquilla
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: { lat: 10.98, lng: -74.8, accuracy: 10 } }),
}))

const near = station({ ...stationFields({ id: 'cerca', lat: 10.985, lng: -74.805 }) })
const far = station({ ...stationFields({ id: 'lejos', lat: 4.6, lng: -74.08 }) }) // Bogotá

function renderApp() {
  const repositories = { ...createMockRepositories(0), stations: createMockStationsRepository([near, far], 0) }
  render(
    <AppProviders repositories={repositories} queryClient={createTestQueryClient()}>
      <App />
    </AppProviders>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  mapView.mounts = 0
  mapView.stationIds = []
})

describe('Mejor precio y leyenda en el celular (S0.2)', () => {
  it('van apilados en la misma columna (tarjeta arriba, leyenda abajo), sin alturas fijas que se desfasen', async () => {
    renderApp()
    const dock = await screen.findByTestId('map-dock')
    await waitFor(() => {
      expect(dock.children).toHaveLength(2)
    })
    const [card, legend] = [...dock.children]
    expect(card).toHaveTextContent('Mejor precio')
    expect(legend).toHaveTextContent('Visor')
    // La causa del bug: la tarjeta adivinaba la altura de la leyenda con bottom-[80px]/bottom-[240px]
    expect(card?.className).not.toMatch(/(^|\s)bottom-\[/)
  })
})

describe('App y el mapa (2.4)', () => {
  it('"Cercano" filtra los marcadores del mapa, no solo la tarjeta', async () => {
    const user = renderApp()
    await waitFor(() => {
      expect(mapView.stationIds).toEqual(['cerca'])
    })
    await user.click(screen.getByRole('button', { name: 'Todo' }))
    await waitFor(() => {
      expect(mapView.stationIds).toEqual(['cerca', 'lejos'])
    })
    await user.click(screen.getByRole('button', { name: 'Cercano' }))
    await waitFor(() => {
      expect(mapView.stationIds).toEqual(['cerca'])
    })
  })

  it('cambiar de combustible no vuelve a montar el mapa (conserva centro y zoom)', async () => {
    const user = renderApp()
    await waitFor(() => {
      expect(mapView.stationIds).toEqual(['cerca'])
    })
    expect(mapView.mounts).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Extra' }))
    await user.click(screen.getByRole('button', { name: 'Diésel' }))
    expect(mapView.mounts).toBe(1)
  })
})
