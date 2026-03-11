import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { useStationsData } from '@/hooks/useStationsData'
import { useZonesData } from '@/hooks/useZonesData'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getLatestPrices } from '@/lib/fuel'
import TopBar from '@/components/TopBar'
import MapView from '@/components/map/MapView'
import StationPanel from '@/components/panels/StationPanel'
import ReportPriceModal from '@/components/modals/ReportPriceModal'
import SettingsModal from '@/components/modals/SettingsModal'
import SpotlightModal from '@/components/modals/SpotlightModal'
import MapLegend from '@/components/MapLegend'
import FilterChips from '@/components/FilterChips'
import BestPriceCard from '@/components/BestPriceCard'
import Toast from '@/components/Toast'
import { cn } from '@/lib/utils'

// ── Haversine distance in meters ─────────────────────────────────────────────
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Find best-priced station within the given map bounds ──────────────────────
function getBestStation(stations, bounds, fuelType) {
  if (!bounds || !stations.length) return null

  let candidates = stations.filter(s => {
    if (!s.lat || !s.lng) return false
    if (!bounds.contains([s.lat, s.lng])) return false
    const prices = getLatestPrices(s.fuel_prices ?? [])
    return !!prices[fuelType]
  })

  if (!candidates.length) return null

  return candidates.reduce((best, s) => {
    const sPrice = getLatestPrices(s.fuel_prices ?? [])[fuelType]?.price ?? Infinity
    const bPrice = getLatestPrices(best.fuel_prices ?? [])[fuelType]?.price ?? Infinity
    return sPrice < bPrice ? s : best
  })
}

export default function App() {
  const { 
    selectedStation, 
    panelOpen, 
    setPanelOpen, 
    setSelectedStation, 
    defaultFuelType, 
    setDefaultFuelType 
  } = useAppStore()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { stations, loading, error, refresh: refreshStations } = useStationsData()
  const { zones, refresh: refreshZones }                        = useZonesData()
  const { position: userPos }                                   = useGeolocation({})

  const refreshAll = () => { refreshStations(); refreshZones() }

  // Keep the selected station panel in sync with the freshest data
  const syncedStation = selectedStation
    ? stations.find(s => s.id === selectedStation.id) ?? selectedStation
    : null

  const selectedZone = syncedStation
    ? zones.find(z => z.id === syncedStation.zone_id)
    : null

  // ── Active filter state ───────────────────────────────────────────────────
  // Fuel type is now synced directly with global store (defaultFuelType)
  const [distanceMode, setDistanceMode] = useState('near') // 'all' | 'near'

  const filteredStations = useMemo(() => {
    if (distanceMode === 'all' || !userPos) return stations
    
    // 15km radius for the "near" filter
    const RADIUS = 15000 
    
    return stations.filter(s => 
      distanceMeters(userPos.lat, userPos.lng, s.lat, s.lng) <= RADIUS
    )
  }, [stations, distanceMode, userPos])

  // ── Map bounds → best price card ──────────────────────────────────────────
  const [mapBounds, setMapBounds] = useState(null)
  const [bestStation, setBestStation] = useState(null)
  const boundsTimerRef = useRef(null)

  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds)
  }, [])

  // Recalculate best station with 400ms debounce
  useEffect(() => {
    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
    boundsTimerRef.current = setTimeout(() => {
      setBestStation(getBestStation(filteredStations, mapBounds, defaultFuelType))
    }, 400)
    return () => clearTimeout(boundsTimerRef.current)
  }, [filteredStations, mapBounds, defaultFuelType])

  // ── Keyboard shortcut Cmd+K / Ctrl+K ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useAppStore.getState().setSpotlightOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-body relative">
      <TopBar />

      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Map ─────────────────────────────────────────────────────────── */}
        <div className={cn(
          'flex-1 relative transition-all duration-300',
          panelOpen ? 'sm:mr-[360px]' : ''
        )}>
          <MapView
            key={defaultFuelType}
            stations={stations}
            zones={zones}
            onBoundsChange={handleBoundsChange}
          />
          <MapLegend loading={loading} />

          {/* Filter Chips — elevated higher up */}
          <FilterChips
            activeFuelType={defaultFuelType}
            distanceMode={distanceMode}
            userPos={userPos}
            onFuelChange={setDefaultFuelType}
            onDistanceChange={setDistanceMode}
          />

          {/* Best Price Card — floating bottom-center (adjusting its own internal mobile bottom) */}
          {!panelOpen && (
            <BestPriceCard
              station={bestStation}
              fuelType={defaultFuelType}
              userPos={userPos}
              onSelect={(s) => setSelectedStation(s)}
            />
          )}

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
          'fixed sm:absolute right-0 top-14 sm:top-0 bottom-0 w-full sm:w-[360px]',
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
            className="fixed top-14 inset-x-0 bottom-0 bg-black/50 z-[390] sm:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}
      </div>

      {/* ── Modals & toasts ─────────────────────────────────────────────── */}
      <ReportPriceModal
        station={syncedStation}
        onSuccess={refreshAll}
      />
      <SettingsModal />
      <SpotlightModal
        stations={filteredStations}
        activeFuelType={defaultFuelType}
        userPos={userPos}
        onSelect={(s) => setSelectedStation(s)}
      />
      <Toast />
    </div>
  )
}
