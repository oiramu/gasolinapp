import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders'
import { createMockRepositories } from './app/repositories'
import { createMockStationsRepository } from './features/stations/api/mockStationsRepository'
import type { Station } from './features/stations/api/types'
import { useAppStore } from './store/appStore'
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

/** El store es JS legado (hasta la 0.5): se tipa aquí solo lo que el test lee. */
interface LinkState {
  readonly selectedStation: { readonly id: string } | null
  readonly panelOpen: boolean
  readonly selectionSource: string
  readonly defaultFuelType: string
  readonly mapCenter: readonly number[]
  readonly mapFocusZoom: number | null
  readonly setPanelOpen: (open: boolean) => void
}
const appState = () => useAppStore.getState() as LinkState

describe('Enlace directo a una estación (3.2)', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedStation: null, panelOpen: false, selectionSource: 'map', defaultFuelType: 'corriente', mapFocusZoom: null })
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('?estacion=&combustible= abre el panel de esa estación con su combustible y enfoca el mapa', async () => {
    window.history.replaceState(null, '', '/?estacion=lejos&combustible=diesel')
    renderApp()
    await waitFor(() => {
      expect(appState()).toMatchObject({ selectedStation: { id: 'lejos' }, panelOpen: true, selectionSource: 'link', defaultFuelType: 'diesel' })
    })
    expect(appState()).toMatchObject({ mapCenter: [far.lat, far.lng], mapFocusZoom: 16 })
    expect(window.location.search).toBe('?estacion=lejos&combustible=diesel')
    act(() => {
      appState().setPanelOpen(false)
    })
    expect(window.location.search).toBe('')
  })

  it('un id que no existe abre el mapa normal, sin errores, y limpia la URL', async () => {
    window.history.replaceState(null, '', '/?estacion=no-existe&combustible=extra')
    renderApp()
    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
    expect(appState()).toMatchObject({ selectedStation: null, panelOpen: false, defaultFuelType: 'corriente' })
  })
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

describe('Compartir desde "Mejor precio" (3.3)', () => {
  it('sin hoja nativa (escritorio) abre WhatsApp con el precio y el enlace directo a la estación', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = renderApp()
    const dock = await screen.findByTestId('map-dock')
    const share = await within(dock).findByRole('button', { name: 'Compartir' })
    await user.click(share)
    await waitFor(() => {
      expect(open).toHaveBeenCalledOnce()
    })
    const [url] = open.mock.calls[0] ?? []
    const text = decodeURIComponent(String(url).replace('https://wa.me/?text=', ''))
    expect(text).toMatch(/^⛽ Corriente a \$15\.900\/galón en Terpel El Recreo/)
    expect(text).toContain('?estacion=cerca&combustible=corriente')
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
