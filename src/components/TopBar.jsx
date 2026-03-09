import { Fuel, Settings, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function TopBar() {
  const { setSettingsModalOpen, setSpotlightOpen, panelOpen } = useAppStore()

  return (
    <header className={cn(
      "h-14 flex items-center px-4 gap-3 z-[500] pointer-events-none fixed top-0 inset-x-0 sm:absolute transition-colors duration-300",
      panelOpen ? "bg-surface-card sm:bg-transparent" : "bg-transparent"
    )}>
      {/* Logo - clickable area enabled */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="w-8 h-8 rounded-xl bg-surface-card border border-white/10 flex items-center justify-center shadow-lg">
          <Fuel size={16} className="text-fuel-500" />
        </div>
        <span className="font-display font-bold text-[18px] tracking-tight drop-shadow-md">
          Gasolin<span className="text-fuel-500">App</span>
        </span>
      </div>

      {/* Right side: search + settings as FABs */}
      <div className={cn(
        "ml-auto flex items-center gap-2 pointer-events-auto transition-all duration-300",
        panelOpen ? "sm:mr-[360px]" : "mr-0"
      )}>
        {/* Search / Spotlight FAB */}
        <button
          onClick={() => setSpotlightOpen(true)}
          title="Buscar estación (Cmd+K)"
          className="w-10 h-10 rounded-full bg-surface-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 shadow-xl transition-all active:scale-95"
        >
          <Search size={18} />
        </button>

        {/* Settings FAB */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          title="Configuración"
          className="w-10 h-10 rounded-full bg-surface-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 shadow-xl transition-all active:scale-95"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
