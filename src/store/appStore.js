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
  reportModalPreExpand: false,
  setReportModalOpen: (open, preExpand = false) => set({ reportModalOpen: open, reportModalPreExpand: preExpand }),

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

  // Filters (temporal state)
  activeBrand: savedPrefs.filterByPreferredBrand ? (savedPrefs.preferredBrand || 'Todas') : 'Todas',
  setActiveBrand: (brand) => set({ activeBrand: brand }),
  
  // Custom brands visibility tracker for the visor dynamically
  visibleBrands: [],
  setVisibleBrands: (brands) => set({ visibleBrands: brands }),

  // User preferences
  defaultFuelType: savedPrefs.defaultFuelType ?? 'corriente',
  preferredBrand: savedPrefs.preferredBrand ?? null,
  favoriteStationId: savedPrefs.favoriteStationId ?? null,
  filterByPreferredBrand: savedPrefs.filterByPreferredBrand ?? false,
  filterByFavorite: savedPrefs.filterByFavorite ?? false,

  setDefaultFuelType: (ft) => {
    clearIconCache()
    savePrefs({ ...loadPrefs(), defaultFuelType: ft })
    set({ defaultFuelType: ft })
  },
  
  setPreferredBrand: (brand) => {
    savePrefs({ ...loadPrefs(), preferredBrand: brand })
    set({ 
      preferredBrand: brand,
      activeBrand: brand || 'Todas'
    })
  },
  
  setFavoriteStationId: (id) => {
    clearIconCache()
    savePrefs({ ...loadPrefs(), favoriteStationId: id })
    set({ favoriteStationId: id })
  },
  
  setFilterByPreferredBrand: (active) => {
    savePrefs({ ...loadPrefs(), filterByPreferredBrand: active })
    set({ 
      filterByPreferredBrand: active,
      activeBrand: active ? (get().preferredBrand || 'Todas') : 'Todas'
    })
  },
  
  setFilterByFavorite: (active) => {
    savePrefs({ ...loadPrefs(), filterByFavorite: active })
    set({ filterByFavorite: active })
  },

  // Toast
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
