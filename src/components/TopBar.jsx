import { Fuel, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function TopBar({ loading, realtimeConnected = true }) {
  const { mapZoom } = useAppStore()
  const isClusterMode = mapZoom < 13

  return (
    <header className="h-14 bg-surface-card border-b border-white/5 flex items-center px-4 gap-3 z-[500] relative flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-fuel-500/20 border border-fuel-500/30 flex items-center justify-center">
          <Fuel size={14} className="text-fuel-500" />
        </div>
        <span className="font-display font-bold text-[17px] tracking-tight">
          Gasolin<span className="text-fuel-500">App</span>
        </span>
      </div>

      {/* Zoom mode badge */}
      <div className="hidden sm:flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-full px-2.5 py-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isClusterMode ? 'bg-amber-400' : 'bg-fuel-500'} ${loading ? 'animate-pulse' : ''}`} />
        <span className="text-[11px] text-gray-400 font-mono">
          {isClusterMode ? 'Promedios por zona' : 'Gasolineras individuales'}
          {' · '}zoom {mapZoom}
        </span>
      </div>

      {/* Realtime indicator */}
      <div className="ml-auto flex items-center gap-1.5">
        {realtimeConnected ? (
          <div className="flex items-center gap-1 text-[10px] text-fuel-500 font-mono">
            <Wifi size={10} />
            <span className="hidden sm:inline">En vivo</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
            <WifiOff size={10} />
            <span className="hidden sm:inline">Sin conexión</span>
          </div>
        )}
      </div>
    </header>
  )
}
