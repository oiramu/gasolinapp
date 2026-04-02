import { useEffect, useRef, useCallback, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet'
import { Locate, LocateFixed, Plus, Minus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES } from '@/lib/fuel'
import { useGeolocation } from '@/hooks/useGeolocation'
import { cn } from '@/lib/utils'
import { createStationIcon, createZoneIcon, createUserLocationIcon } from './markers'
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  MAP_MAX_ZOOM,
  MAP_CLUSTER_ZOOM_THRESHOLD,
} from '@/config/map'

/** Zoom suitable for a driver — close enough to see nearby stations */
const DRIVING_ZOOM = 16

// ── Internal: listens to map events and updates store/state ─────────────────
function MapEventsWatcher({ onZoomChange, onMove, onMoveStart, onMoveEnd, onBoundsChange, onDragStart }) {
  useMapEvents({
    movestart: () => onMoveStart?.(),
    moveend: (e) => {
      onMoveEnd?.()
      onBoundsChange?.(e.target.getBounds())
    },
    zoomend: (e) => {
      onZoomChange(e.target.getZoom())
      onBoundsChange?.(e.target.getBounds())
    },
    move: (e) => onMove(e.target.getCenter()),
    click: () => useAppStore.getState().setPanelOpen(false),
    dragstart: () => onDragStart?.(),
  })
  return null
}

// ── Internal: syncs store mapCenter → actual map view ───────────────────────
function MapSync() {
  const mapCenter = useAppStore((s) => s.mapCenter)
  const map       = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (mapCenter && prevCenter.current?.toString() !== mapCenter.toString()) {
      map.flyTo(mapCenter, map.getZoom(), { duration: 0.8 })
      prevCenter.current = mapCenter
    }
  }, [mapCenter, map])

  return null
}

// ── Internal: imperative map handle exposed via ref ─────────────────────────
function MapController({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

// ── Main MapView ─────────────────────────────────────────────────────────────
export default function MapView({ stations, zones, onMoveStart, onMoveEnd, onBoundsChange }) {
  const { mapZoom, setMapZoom, setSelectedStation, setMapCenter, panelOpen, defaultFuelType } = useAppStore()
  const mapRef       = useRef(null)
  const showClusters = mapZoom < MAP_CLUSTER_ZOOM_THRESHOLD
  const [isLocked, setIsLocked] = useState(false)
  const [fabHover, setFabHover] = useState(false)
  const fuelColor = FUEL_TYPES[defaultFuelType]?.color || '#00E5A0'

  // Fly to user on first GPS fix at driving zoom
  const handleFirstFix = useCallback(({ lat, lng }) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], DRIVING_ZOOM, { duration: 1.2 })
      setIsLocked(true)
    }
  }, [])

  const { position: userPos } = useGeolocation({ onFirstFix: handleFirstFix })

  // ── Lock-on Logic: Follow user if locked ─────────────────────────────────────
  useEffect(() => {
    if (isLocked && userPos && mapRef.current) {
      mapRef.current.panTo([userPos.lat, userPos.lng], { animate: true })
    }
  }, [userPos, isLocked])

  const locateUser = () => {
    if (userPos && mapRef.current) {
      mapRef.current.flyTo([userPos.lat, userPos.lng], DRIVING_ZOOM, { duration: 0.8 })
      setIsLocked(true)
    }
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={MAP_DEFAULT_CENTER}
        zoom={MAP_DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={MAP_TILE_URL}
          attribution={MAP_TILE_ATTRIBUTION}
          maxZoom={MAP_MAX_ZOOM}
        />

        <MapEventsWatcher
          onZoomChange={setMapZoom}
          onMove={() => {}} // No longer needing passive distance check
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}
          onBoundsChange={onBoundsChange}
          onDragStart={() => setIsLocked(false)} // Lock breaks on manual drag
        />
        <MapSync />
        <MapController mapRef={mapRef} />

        {/* ── User location ───────────────────────────────────────────── */}
        {userPos && (
          <>
            {/* Accuracy circle */}
            <Circle
              center={[userPos.lat, userPos.lng]}
              radius={userPos.accuracy}
              pathOptions={{ color: '#00E5A0', fillColor: '#00E5A0', fillOpacity: 0.06, weight: 1 }}
            />
            {/* Location dot */}
            <Marker
              position={[userPos.lat, userPos.lng]}
              icon={createUserLocationIcon()}
              zIndexOffset={1000}
            />
          </>
        )}

        {/* ── Zone clusters — visible at low zoom ─────────────────────── */}
        {showClusters && zones.map((zone) => (
          <Marker
            key={zone.id}
            position={[zone.lat, zone.lng]}
            icon={createZoneIcon(zone)}
            eventHandlers={{
              click: () => {
                setMapCenter([zone.lat, zone.lng])
                setMapZoom(MAP_CLUSTER_ZOOM_THRESHOLD)
              },
            }}
          />
        ))}

        {/* ── Individual stations — visible at high zoom ───────────────── */}
        {!showClusters && stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createStationIcon(station)}
            eventHandlers={{ click: () => setSelectedStation(station) }}
          />
        ))}
      </MapContainer>

      {/* FABs: zoom + locate (Mobile grouping) */}
      <div className={cn(
        "absolute bottom-6 right-4 z-[500] flex flex-col gap-2",
        panelOpen ? "hidden sm:flex" : "flex"
      )}>
        {/* Zoom controls - Mobile only */}
        <div className="flex flex-col gap-2 mb-1 sm:hidden items-center">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-8 h-8 rounded-full border border-white/10 bg-surface-card flex items-center justify-center text-gray-400 active:bg-surface-muted shadow-lg active:scale-90 transition-all"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-8 h-8 rounded-full border border-white/10 bg-surface-card flex items-center justify-center text-gray-400 active:bg-surface-muted shadow-lg active:scale-90 transition-all"
          >
            <Minus size={16} />
          </button>
        </div>

        {userPos && (
          <button
            onClick={locateUser}
            title="Ir a mi ubicación"
            onMouseEnter={() => setFabHover(true)}
            onMouseLeave={() => setFabHover(false)}
            style={{ color: isLocked || fabHover ? fuelColor : undefined }}
            className={cn(
              "w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all bg-surface-card hover:bg-surface-muted",
              isLocked ? "border-fuel-500/40" : "border-white/10 text-gray-500"
            )}
          >
            {isLocked ? <LocateFixed size={18} /> : <Locate size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

