import { useEffect, useRef, useCallback, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet'
import { Locate, LocateFixed } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES } from '@/lib/fuel'
import { useGeolocation } from '@/hooks/useGeolocation'
import { createStationIcon, createZoneIcon, createUserLocationIcon } from './markers'
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_CLUSTER_ZOOM_THRESHOLD,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  MAP_MAX_ZOOM,
} from '@/config/map'

/** Zoom suitable for a driver — close enough to see nearby stations */
const DRIVING_ZOOM = 16

// ── Internal: listens to map events and updates store/state ─────────────────
function MapEventsWatcher({ onZoomChange, onMove }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
    move: (e) => onMove(e.target.getCenter()),
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
export default function MapView({ stations, zones }) {
  const { mapZoom, setMapZoom, setSelectedStation, setMapCenter, panelOpen, defaultFuelType } = useAppStore()
  const mapRef       = useRef(null)
  const showClusters = mapZoom < MAP_CLUSTER_ZOOM_THRESHOLD
  const [isCentered, setIsCentered] = useState(false)
  const [fabHover, setFabHover]     = useState(false)
  const fuelColor = FUEL_TYPES[defaultFuelType]?.color || '#00E5A0'

  // Fly to user on first GPS fix at driving zoom
  const handleFirstFix = useCallback(({ lat, lng }) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], DRIVING_ZOOM, { duration: 1.2 })
      setIsCentered(true)
    }
  }, [])

  const { position: userPos } = useGeolocation({ onFirstFix: handleFirstFix })

  const handleMapMove = useCallback((center) => {
    if (!userPos || !mapRef.current) return
    const distance = mapRef.current.distance(center, [userPos.lat, userPos.lng])
    const currentlyCentered = distance < 20 // 20 meters tolerance
    setIsCentered((prev) => (prev !== currentlyCentered ? currentlyCentered : prev))
  }, [userPos])

  const locateUser = () => {
    if (userPos && mapRef.current) {
      mapRef.current.flyTo([userPos.lat, userPos.lng], DRIVING_ZOOM, { duration: 0.8 })
      setIsCentered(true)
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

        <MapEventsWatcher onZoomChange={setMapZoom} onMove={handleMapMove} />
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
                useAppStore.getState().setMapZoom(14)
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

      {/* ── Locate-me button ────────────────────────────────────────────── */}
      {userPos && (
        <button
          onClick={locateUser}
          title="Ir a mi ubicación"
          onMouseEnter={() => setFabHover(true)}
          onMouseLeave={() => setFabHover(false)}
          style={{ color: isCentered || fabHover ? fuelColor : undefined }}
          className={`absolute bottom-6 right-4 z-[500] w-10 h-10 rounded-full border shadow-lg items-center justify-center transition-all bg-surface-card hover:bg-surface-muted ${panelOpen ? 'hidden sm:flex' : 'flex'} ${isCentered ? 'border-fuel-500/40' : 'border-white/10 text-gray-500'}`}
        >
          {isCentered ? <LocateFixed size={18} /> : <Locate size={18} />}
        </button>
      )}
    </div>
  )
}

