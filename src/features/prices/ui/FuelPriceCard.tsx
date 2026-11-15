import { ChevronDown, Droplets, Fuel, RefreshCw, Wind, type LucideIcon } from 'lucide-react'
import { formatReferenceMonth, type DisplayPrice } from '@/shared/domain/displayPrice'
import { formatPriceValue } from '@/shared/domain/format'
import { FUEL_TYPES, type FuelType } from '@/shared/domain/fuel'
import { cn } from '@/shared/lib/cn'
import { FreshnessTag } from './FreshnessTag'

const FUEL_ICONS: Record<FuelType, LucideIcon> = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }
const ICON_SIZE = 12
const INACTIVE = '#4B5563'

export interface FuelPriceCardProps {
  readonly fuelType: FuelType
  readonly display: DisplayPrice
  /** Confirmación del precio comunitario (para su frescura). */
  readonly confirmedAt: string | null
}

/** Precio de un combustible en el panel: comunitario con su frescura, oficial de referencia o "Sin precio". */
export function FuelPriceCard({ fuelType, display, confirmedAt }: FuelPriceCardProps) {
  const config = FUEL_TYPES[fuelType]
  const Icon = FUEL_ICONS[fuelType]
  const hasPrice = display.source !== 'none'
  return (
    <div
      data-source={display.source}
      className={cn(
        'rounded-xl border p-3 flex flex-col gap-1 relative overflow-hidden',
        display.source === 'community' && `bg-surface-card ${config.borderClass}`,
        display.source === 'reference' && 'bg-surface-card border-dashed border-white/20',
        display.source === 'none' && 'bg-surface-muted/30 border-white/5',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={ICON_SIZE} style={{ color: hasPrice ? config.color : INACTIVE }} />
        <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: hasPrice ? config.color : INACTIVE, opacity: 0.8 }}>
          {config.label}
        </span>
      </div>
      <PriceBody display={display} color={config.color} confirmedAt={confirmedAt} />
    </div>
  )
}

function PriceBody({ display, color, confirmedAt }: { readonly display: DisplayPrice; readonly color: string; readonly confirmedAt: string | null }) {
  if (display.source === 'none') return <span className="text-[11px] text-gray-600 italic">Sin precio</span>
  const price = <span className="font-display font-bold text-2xl leading-none" style={{ color }}>${formatPriceValue(display.price)}</span>
  if (display.source === 'community') {
    return (
      <>
        {price}
        <FreshnessTag confirmedAt={confirmedAt} />
      </>
    )
  }
  return (
    <>
      <span className="opacity-70">{price}</span>
      <span className="text-[9px] text-gray-400 font-mono">Precio de referencia oficial ({formatReferenceMonth(display.validFrom)})</span>
      <span className="text-[9px] text-gray-600">Cada estación puede variar</span>
    </>
  )
}
