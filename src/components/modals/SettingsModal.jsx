import { X, Settings, Fuel, Droplets, ChevronDown, RefreshCw, Wind } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER } from '@/lib/fuel'
import { cn } from '@/lib/utils'

const FUEL_ICONS = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }

export default function SettingsModal() {
  const { settingsModalOpen, setSettingsModalOpen, defaultFuelType, setDefaultFuelType } = useAppStore()

  if (!settingsModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && setSettingsModalOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-sm bg-surface-card border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-fuel-500/20 border border-fuel-500/30 flex items-center justify-center">
              <Settings size={14} className="text-fuel-500" />
            </div>
            <h2 className="font-display font-bold text-[18px]">Configuración</h2>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">

          {/* Default fuel type */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-2">
              Combustible por defecto en el mapa
            </label>
            <p className="text-[11px] text-gray-600 mb-3">
              El precio mostrado en cada gasolinera del mapa corresponderá a este combustible.
            </p>
            <div className="space-y-2">
              {FUEL_ORDER.map((ft) => {
                const config = FUEL_TYPES[ft]
                const Icon = FUEL_ICONS[ft]
                const isSelected = defaultFuelType === ft

                return (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setDefaultFuelType(ft)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                      isSelected
                        ? `${config.borderClass} bg-surface-muted/40`
                        : 'border-white/8 bg-surface-muted/10 hover:border-white/15'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                      isSelected ? config.bgClass : 'bg-white/5'
                    )}>
                      <Icon size={14} className={isSelected ? config.textClass : 'text-gray-600'} />
                    </div>
                    <span className={cn(
                      'text-[13px] font-body font-medium flex-1 transition-colors',
                      isSelected ? 'text-white' : 'text-gray-500'
                    )}>
                      {config.label}
                    </span>

                    {/* Radio indicator */}
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                      isSelected ? `${config.borderClass.replace('/40', '')} bg-opacity-100` : 'border-white/20'
                    )}>
                      {isSelected && (
                        <div className={cn('w-2 h-2 rounded-full', config.bgClass.replace('/10', ''))} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[10px] text-gray-700 text-center pb-1 border-t border-white/5 pt-3">
            La preferencia se guarda automáticamente en este dispositivo.
          </p>
        </div>
      </div>
    </div>
  )
}
