import { useState, useEffect } from 'react'
import { Navigation, Clock, Star, Wind, Calculator } from 'lucide-react'
import { FUEL_TYPES, getLatestPrices, formatPrice, formatRelativeTime } from '@/lib/fuel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

function formatDistance(meters) {
  if (!meters && meters !== 0) return null
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const SIX_HOURS = 6 * 60 * 60 * 1000

export default function BestPriceCard({ station, fuelType, userPos, onSelect, allStations }) {
  const [visible, setVisible] = useState(false)
  const [prevId, setPrevId]   = useState(null)
  const { setCalculatorOpen, legendOpen } = useAppStore()

  const fuelConfig = FUEL_TYPES[fuelType]
  const fuelColor  = fuelConfig?.color || '#00E5A0'
  const isGnv      = fuelType === 'gnv'

  useEffect(() => {
    if (!station) {
      setVisible(false)
      return
    }
    if (station.id !== prevId) {
      setVisible(false)
      const t = setTimeout(() => { setVisible(true); setPrevId(station.id) }, 80)
      return () => clearTimeout(t)
    }
    setVisible(true)
  }, [station, prevId])

  // Estado vacío para GNV: cuando el filtro es GNV pero no hay estaciones
  const noGnvInArea = isGnv && !station

  if (noGnvInArea) {
    return (
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 z-[450] w-[calc(100%-2rem)] sm:w-max min-w-[300px] max-w-[360px] transition-all duration-300",
        legendOpen ? "bottom-[256px] sm:bottom-6" : "bottom-[80px] sm:bottom-6"
      )}>
        <div
          className="bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={{ borderColor: fuelColor + '30' }}
        >
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${fuelColor}, ${fuelColor}80)` }} />
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: fuelColor + '15' }}>
              <Wind size={18} style={{ color: fuelColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white">Sin estaciones de Gas en esta zona</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-relaxed">
                Intenta ampliar el rango o mover el mapa.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!station) return null

  const prices   = getLatestPrices(station.fuel_prices ?? [])
  const price    = prices[fuelType]
  if (!price) return null

  const isOld    = (Date.now() - new Date(price.created_at).getTime()) > SIX_HOURS
  const distance = userPos ? haversine(userPos.lat, userPos.lng, station.lat, station.lng) : null
  const mapsUrl  = `https://maps.google.com/?q=${station.lat},${station.lng}`

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-[450] w-[calc(100%-2rem)] sm:w-max min-w-[300px] max-w-[360px] transition-all duration-300 ease-out",
        legendOpen ? "bottom-[256px] sm:bottom-6" : "bottom-[80px] sm:bottom-6",
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div
        className="bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ borderColor: fuelColor + '30' }}
      >
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${fuelColor}, ${fuelColor}80)` }} />

        <div className="px-4 py-3.5 flex items-center gap-4">
          <div className="flex-shrink-0 text-center">
            <div className="text-[32px] font-display font-bold leading-none" style={{ color: fuelColor }}>
              {price.price.toLocaleString('es-CO')}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: fuelColor + 'aa' }}>
              {isGnv ? 'COP / m³' : 'COP / gal'}
            </div>
          </div>

          <div className="w-px self-stretch bg-white/8" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md" style={{ background: fuelColor + '20', color: fuelColor }}>
                {isGnv ? 'Mejor precio Gas' : 'Mejor precio'}
              </span>
              {isOld && (
                <span className="flex items-center gap-0.5 text-[9px] font-mono text-amber-400/70">
                  <Clock size={9} /> No reciente
                </span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-white truncate">{station.name}</p>
            <p className="text-[10px] text-gray-500 font-mono truncate">{station.brand}</p>
            
            <div className="flex items-center gap-2 mt-1">
              {distance !== null && (
                <span className="text-[10px] font-mono text-gray-400">{formatDistance(distance)}</span>
              )}
              <span className="text-[10px] font-mono text-gray-600">{formatRelativeTime(price.created_at)}</span>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110"
                style={{ background: fuelColor + '25', color: fuelColor }}
              >
                <Navigation size={11} />
                <span>Llegar</span>
              </a>
              <button
                onClick={() => setCalculatorOpen(true, station)}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
              >
                <Calculator size={11} />
                <span>Calcular</span>
              </button>
              <button
                onClick={() => onSelect(station)}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
              >
                <Star size={11} />
                <span>Ver</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
