import { FUEL_TYPES, FUEL_ORDER } from '@/lib/fuel'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { Fuel } from 'lucide-react'
import FilterSelect from '@/components/FilterSelect'

const FUEL_OPTIONS = FUEL_ORDER.filter(f => f !== 'urea')

const DISTANCE_OPTIONS = [
  { value: 'near', label: 'Cercano' },
  { value: 'all',  label: 'Todo' },
]

export default function FilterChips({ activeFuelType, distanceMode, userPos, onFuelChange, onDistanceChange }) {
  const { panelOpen } = useAppStore()
  const hasLocation = !!userPos

  return (
    <div className={cn(
      "absolute top-16 sm:top-3 left-1/2 -translate-x-1/2 z-[450] flex items-center gap-2 pointer-events-none transition-all duration-300",
      panelOpen ? "hidden sm:flex" : "flex"
    )}>
      
      {/* Fuel selection: Select on mobile, Chips on desktop */}
      <FilterSelect
        className="sm:hidden pointer-events-auto"
        icon={Fuel}
        value={activeFuelType}
        activeColor={FUEL_TYPES[activeFuelType].color}
        options={FUEL_OPTIONS.map(ft => ({ 
          value: ft, 
          label: FUEL_TYPES[ft].label,
          color: FUEL_TYPES[ft].color
        }))}
        onChange={onFuelChange}
      />

      {/* Fuel chips - Desktop only */}
      <div className="hidden sm:flex items-center gap-1 bg-surface-card/90 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1 shadow-2xl pointer-events-auto">
        {FUEL_OPTIONS.map(ft => {
          const cfg = FUEL_TYPES[ft]
          const isActive = activeFuelType === ft
          return (
            <button
              key={ft}
              onClick={() => onFuelChange(ft)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all duration-200 ${
                isActive
                  ? `text-white`
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={isActive ? { backgroundColor: cfg.color + '30', color: cfg.color, boxShadow: `0 0 0 1px ${cfg.color}50` } : {}}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Distance chips */}
      <div className="flex items-center gap-1 bg-surface-card/90 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1 shadow-2xl pointer-events-auto">
        {DISTANCE_OPTIONS.map(opt => {
          const isActive = distanceMode === opt.value
          const isDisabled = opt.value === 'near' && !hasLocation
          return (
            <button
              key={opt.value}
              onClick={() => !isDisabled && onDistanceChange(opt.value)}
              disabled={isDisabled}
              title={isDisabled ? 'Activa la ubicación para usar este filtro' : undefined}
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-all duration-200 ${
                isDisabled
                  ? 'text-gray-700 cursor-not-allowed'
                  : isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
