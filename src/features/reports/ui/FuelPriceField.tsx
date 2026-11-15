import { ChevronDown, Droplets, Fuel, RefreshCw, Wind, type LucideIcon } from 'lucide-react'
import { FUEL_TYPES, type FuelType } from '@/shared/domain/fuel'
import { cn } from '@/shared/lib/cn'
import { FuelPriceInput } from './FuelPriceInput'

const FUEL_ICONS: Record<FuelType, LucideIcon> = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }
const ICON_SIZE = 12

type FuelStyle = (typeof FUEL_TYPES)[FuelType]

/** Clases del interruptor según esté activo; un solo lugar decide el estado visual. */
function toggleStyles(config: FuelStyle, active: boolean) {
  return active
    ? { box: `${config.borderClass} bg-surface-muted/40`, badge: config.bgClass, icon: config.textClass, label: 'text-white', track: 'bg-fuel-500/30 border border-fuel-500/50', knob: 'left-4 bg-fuel-500' }
    : { box: 'border-white/8 bg-surface-muted/10', badge: 'bg-white/5', icon: 'text-gray-600', label: 'text-gray-600', track: 'bg-white/5 border border-white/10', knob: 'left-0.5 bg-gray-600' }
}

export interface FuelPriceFieldProps {
  readonly fuelType: FuelType
  readonly active: boolean
  readonly price: string
  readonly onToggle: () => void
  readonly onPriceChange: (value: string) => void
}

/** Interruptor de un combustible y, si está activo, su precio. */
export function FuelPriceField({ fuelType, active, price, onToggle, onPriceChange }: FuelPriceFieldProps) {
  const config = FUEL_TYPES[fuelType]
  const Icon = FUEL_ICONS[fuelType]
  const styles = toggleStyles(config, active)

  return (
    <div className={cn('rounded-xl border transition-all overflow-hidden', styles.box)}>
      <button type="button" aria-pressed={active} onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5">
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-all', styles.badge)}>
          <Icon size={ICON_SIZE} className={styles.icon} />
        </div>
        <span className={cn('text-[12px] font-body font-medium flex-1 text-left transition-colors', styles.label)}>{config.label}</span>
        <div className={cn('w-9 h-5 rounded-full transition-all relative', styles.track)}>
          <div className={cn('absolute top-0.5 w-4 h-4 rounded-full transition-all', styles.knob)} />
        </div>
      </button>
      {active && <FuelPriceInput fuelType={fuelType} price={price} onChange={onPriceChange} />}
    </div>
  )
}
