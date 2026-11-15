import { ChevronDown, Droplets, Fuel, RefreshCw, Wind, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatReferenceMonth, type DisplayPrice } from '@/shared/domain/displayPrice'
import { formatPriceValue } from '@/shared/domain/format'
import { FUEL_TYPES, type FuelType } from '@/shared/domain/fuel'
import { FreshnessTag } from './FreshnessTag'

const FUEL_ICONS: Record<FuelType, LucideIcon> = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }
const ICON_SIZE = 14
const MUTED = '#6B7280'

export interface FuelPriceRowProps {
  readonly fuelType: FuelType
  readonly display: DisplayPrice
  /** Confirmación del precio comunitario (para su frescura). */
  readonly confirmedAt: string | null
  /** A la derecha de la fuente: "¿Sigue así?" o "Reportar". */
  readonly children?: ReactNode
}

/**
 * Un combustible en dos líneas: nombre y precio arriba; fuente (frescura, oficial o sin reportes)
 * y la acción abajo. Pensado para el ancho de un celular.
 */
export function FuelPriceRow({ fuelType, display, confirmedAt, children }: FuelPriceRowProps) {
  const config = FUEL_TYPES[fuelType]
  const Icon = FUEL_ICONS[fuelType]
  const color = display.source === 'none' ? MUTED : config.color
  return (
    <li data-source={display.source} className="flex flex-col gap-2.5 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ color }}>
          <Icon size={ICON_SIZE} aria-hidden />
          {config.label}
        </span>
        <Price display={display} color={color} />
      </div>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <Source display={display} confirmedAt={confirmedAt} />
        {children}
      </div>
    </li>
  )
}

function Price({ display, color }: { readonly display: DisplayPrice; readonly color: string }) {
  if (display.source === 'none') return <span className="text-sm text-gray-500">Sin precio</span>
  return (
    <span className="font-display text-2xl font-bold leading-none tabular-nums" style={{ color }}>
      ${formatPriceValue(display.price)}
    </span>
  )
}

function Source({ display, confirmedAt }: { readonly display: DisplayPrice; readonly confirmedAt: string | null }) {
  if (display.source === 'community') return <FreshnessTag confirmedAt={confirmedAt} />
  if (display.source === 'none') return <span className="text-xs text-gray-500">Nadie lo ha reportado</span>
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-400">
      <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-gray-400" />
      <span className="truncate">Oficial · {formatReferenceMonth(display.validFrom)}</span>
    </span>
  )
}
