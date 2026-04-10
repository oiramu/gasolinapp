import { WifiOff, Fuel, Camera, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES } from '@/lib/fuel'
import { MAP_CLUSTER_ZOOM_THRESHOLD } from '@/config/map'
import { cn } from '@/lib/utils'

export default function MapLegend({ loading, realtimeConnected = true }) {
  const { defaultFuelType, mapZoom, setMapZoom, setSettingsModalOpen, legendOpen, setLegendOpen } = useAppStore()
  const fuelConfig = FUEL_TYPES[defaultFuelType]
  const fuelColor = fuelConfig?.color || '#00E5A0'
  const isClusterMode = mapZoom < MAP_CLUSTER_ZOOM_THRESHOLD

  const toggleZoomMode = () => {
    if (isClusterMode) {
      setMapZoom(MAP_CLUSTER_ZOOM_THRESHOLD+1) // Fly to individual station view
    } else {
      setMapZoom(MAP_CLUSTER_ZOOM_THRESHOLD-1) // Zoom out to cluster view
    }
  }

  return (
    <div className="absolute bottom-6 left-4 z-[400] w-[256px] bg-surface-card/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      
      {/* ── Header: Title & Realtime Status ── */}
      <button
        onClick={() => setLegendOpen(!legendOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
      >
        <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-mono font-bold">
          Visor
        </p>

        <div className="flex items-center gap-2.5">
          {realtimeConnected ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: fuelColor }}>
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping" style={{ backgroundColor: fuelColor }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: fuelColor }} />
              </span>
              <span>En vivo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-mono font-medium">
              <WifiOff size={11} />
              <span>Sin datos</span>
            </div>
          )}
          <ChevronDown 
            size={14} 
            className={cn("text-gray-500 transition-transform duration-300", legendOpen && "rotate-180")} 
          />
        </div>
      </button>

      {/* ── Body: Status & Legend (Collapsible) ── */}
      <div className={cn(
        "grid transition-all duration-300",
        legendOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <div className="px-4 py-3.5 space-y-4">
        
        {/* Active Settings (Fuel & Zoom Mode) */}
        <div className="flex items-center gap-2">
          {/* Fuel selection */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border ${fuelConfig.borderClass} bg-surface-muted/30 hover:bg-white/5 transition-colors cursor-pointer`}
          >
            <Fuel size={12} style={{ color: fuelColor }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: fuelColor }} />
            <span className={`text-[10px] font-mono ${fuelConfig.textClass}`}>{fuelConfig.label}</span>
          </button>

          {/* Zoom mode */}
          <button
            onClick={toggleZoomMode}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-white/10 bg-surface-muted/30 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Camera size={12} className="text-gray-400" />
            <div className={`w-1.5 h-1.5 rounded-full ${isClusterMode ? 'bg-amber-400' : 'bg-fuel-500'} ${loading ? 'animate-pulse' : ''}`} style={{ backgroundColor: !isClusterMode && fuelColor ? fuelColor : undefined }} />
            <span className="text-[10px] font-mono text-gray-300">
              {isClusterMode ? 'Zonas' : 'Individual'}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] w-full bg-white/5" />

        {/* Map Legend Indicators */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-300">
            <div className="w-3.5 h-3.5 rounded-md border-2 flex-shrink-0" style={{ borderColor: fuelColor }} />
            <span>Zona / promedio</span>
          </div>
          
          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-300">
            <div className="w-3.5 h-3.5 rounded-md border-2 flex-shrink-0" style={{ borderColor: fuelColor, backgroundColor: fuelColor + '33' }} />
            <span>Con datos</span>
          </div>
          
          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
            <div className="w-3.5 h-3.5 rounded-md border-2 border-gray-600 flex-shrink-0" />
            <span>Sin datos</span>
          </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
