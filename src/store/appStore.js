import { create } from 'zustand'

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
  // ── Map state ────────────────────────────────────────────
  mapZoom: 12,
  mapCenter: [10.99, -74.808],
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setMapCenter: (center) => set({ mapCenter: center }),

  // ── Selected station ─────────────────────────────────────
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station, panelOpen: !!station }),

  // ── Side panel ───────────────────────────────────────────
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open, selectedStation: open ? get().selectedStation : null }),

  // ── Report modal ─────────────────────────────────────────
  reportModalOpen: false,
  setReportModalOpen: (open) => set({ reportModalOpen: open }),

  // ── Settings modal ───────────────────────────────────────
  settingsModalOpen: false,
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),

  // ── User preferences ─────────────────────────────────────
  defaultFuelType: savedPrefs.defaultFuelType ?? 'corriente',
  setDefaultFuelType: (ft) => {
    savePrefs({ ...loadPrefs(), defaultFuelType: ft })
    set({ defaultFuelType: ft })
  },

  // ── Toast ────────────────────────────────────────────────
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
