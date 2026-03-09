import { Fuel, Settings } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES } from '@/lib/fuel'

export default function TopBar({ loading }) {
  const { setSettingsModalOpen, defaultFuelType } = useAppStore()


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



      {/* Right side: fuel badge + settings */}
      <div className="ml-auto flex items-center gap-2">


        {/* Settings button */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          title="Configuración"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-all"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  )
}
