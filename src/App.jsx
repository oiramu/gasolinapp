import { useAppStore } from '@/store/appStore'
import { useStationsData } from '@/hooks/useStationsData'
import { useZonesData } from '@/hooks/useZonesData'
import TopBar from '@/components/TopBar'
import MapView from '@/components/map/MapView'
import StationPanel from '@/components/panels/StationPanel'
import ReportPriceModal from '@/components/modals/ReportPriceModal'
import MapLegend from '@/components/MapLegend'
import Toast from '@/components/Toast'
import { cn } from '@/lib/utils'

export default function App() {
  const { selectedStation, panelOpen, setPanelOpen, setSelectedStation } = useAppStore()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { stations, loading, error, refresh: refreshStations } = useStationsData()
  const { zones, refresh: refreshZones }                        = useZonesData()

  const refreshAll = () => { refreshStations(); refreshZones() }

  // Keep the selected station panel in sync with the freshest data
  const syncedStation = selectedStation
    ? stations.find(s => s.id === selectedStation.id) ?? selectedStation
    : null

  const selectedZone = syncedStation
    ? zones.find(z => z.id === syncedStation.zone_id)
    : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-body">
      <TopBar loading={loading} />

      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className={cn(
          'flex-1 relative transition-all duration-300',
          panelOpen ? 'sm:mr-[360px]' : ''
        )}>
          <MapView stations={stations} zones={zones} />
          <MapLegend />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-[300] flex items-center justify-center bg-surface/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-fuel-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-fuel-500 font-mono">Cargando estaciones…</span>
              </div>
            </div>
          )}

          {/* Connection error banner */}
          {error && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-red-500/90 text-white text-xs font-mono px-4 py-2 rounded-xl shadow-lg whitespace-nowrap">
              Error de conexión: {error}
            </div>
          )}
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div className={cn(
          'fixed sm:absolute right-0 top-0 bottom-0 w-full sm:w-[360px]',
          'transition-transform duration-300 z-[400]',
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          {syncedStation && (
            <StationPanel
              station={syncedStation}
              zoneData={selectedZone}
              onRefetch={refreshAll}
            />
          )}
        </div>

        {/* Mobile backdrop */}
        {panelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[390] sm:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}
      </div>

      {/* ── Modals & toasts ─────────────────────────────────────────────── */}
      <ReportPriceModal
        station={syncedStation}
        onSuccess={refreshAll}
      />
      <Toast />
    </div>
  )
}

