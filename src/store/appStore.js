import { create } from 'zustand'
import { clearIconCache } from '@/components/map/markers'

const STORAGE_KEY = 'gasolinapp_prefs'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function savePrefs(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch {}
}

const savedPrefs = loadPrefs()

export const useAppStore = create((set, get) => ({
  // Map state
  mapZoom: 12,
  mapCenter: [10.99, -74.808],
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setMapCenter: (center) => set({ mapCenter: center }),

  // Selected station
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station, panelOpen: !!station }),

  // Side panel
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open, selectedStation: open ? get().selectedStation : null }),

  // Report modal
  reportModalOpen: false,
  setReportModalOpen: (open) => set({ reportModalOpen: open }),

  // Settings modal
  settingsModalOpen: false,
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),

  // Tank calculator modal
  calculatorOpen: false,
  calculatorStation: null,
  setCalculatorOpen: (open, station = null) => set({ calculatorOpen: open, calculatorStation: station }),

  // Spotlight modal
  spotlightOpen: false,
  setSpotlightOpen: (open) => set({ spotlightOpen: open }),

  // Map Legend (Visor)
  legendOpen: window.innerWidth >= 640,
  setLegendOpen: (open) => set({ legendOpen: open }),

  // User preferences
  defaultFuelType: savedPrefs.defaultFuelType ?? 'corriente',
  setDefaultFuelType: (ft) => {
    clearIconCache()
    savePrefs({ ...loadPrefs(), defaultFuelType: ft })
    set({ defaultFuelType: ft })
  },

  // Toast
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
