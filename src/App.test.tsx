import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders'
import { createMockRepositories } from './app/repositories'
import { MOCK_ZONES } from './features/zones/api/mockZonesRepository'
import { createTestQueryClient } from './test/renderWithProviders'

// jsdom no implementa ResizeObserver, que usa el mapa
const ResizeObserverStub = vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }))

describe('App', () => {
  it('arranca con los repositorios inyectados y pinta las zonas en el mapa sin errores', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    const consoleError = vi.spyOn(console, 'error')
    const { container } = render(
      <AppProviders repositories={createMockRepositories(0)} queryClient={createTestQueryClient()}>
        <App />
      </AppProviders>,
    )
    await waitFor(() => {
      expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(MOCK_ZONES.length)
    })
    expect(consoleError).not.toHaveBeenCalled()
  })
})
