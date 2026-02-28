import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet'
import { Locate } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
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

// ── Internal: listens to map zoom changes and updates store ─────────────────
function ZoomWatcher({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) })
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
  const { mapZoom, setMapZoom, setSelectedStation, setMapCenter } = useAppStore()
  const mapRef      = useRef(null)
  const showClusters = mapZoom < MAP_CLUSTER_ZOOM_THRESHOLD

  // Fly to user on first GPS fix at driving zoom
  const handleFirstFix = useCallback(({ lat, lng }) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], DRIVING_ZOOM, { duration: 1.2 })
    }
  }, [])

  const { position: userPos } = useGeolocation({ onFirstFix: handleFirstFix })

  const locateUser = () => {
    if (userPos && mapRef.current) {
      mapRef.current.flyTo([userPos.lat, userPos.lng], DRIVING_ZOOM, { duration: 0.8 })
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

        <ZoomWatcher onZoomChange={setMapZoom} />
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
          className="absolute bottom-6 right-4 z-[500] w-10 h-10 rounded-full bg-surface-card border border-white/10 shadow-lg flex items-center justify-center text-fuel-400 hover:text-fuel-300 hover:border-fuel-400/40 transition-all"
        >
          <Locate size={18} />
        </button>
      )}
    </div>
  )
}

