import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // ── Map state ────────────────────────────────────────────
  mapZoom: 13,
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

  // ── Toast ────────────────────────────────────────────────
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
