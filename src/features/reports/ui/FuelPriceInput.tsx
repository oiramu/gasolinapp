import { AlertTriangle, Wind } from 'lucide-react'
import { formatPriceValue } from '@/shared/domain/format'
import { FUEL_PRICE_RANGES, FUEL_TYPES, getFuelUnitLabel, isPriceOutlier, type FuelType } from '@/shared/domain/fuel'
import { cn } from '@/shared/lib/cn'
import { parsePrice } from '../model/reportForm'

const PLACEHOLDERS: Record<FuelType, string> = { corriente: '15000', extra: '15000', diesel: '15000', urea: '15000', gnv: '2500' }
const HINT_ICON_SIZE = 9
const ALERT_ICON_SIZE = 11

export interface FuelPriceInputProps {
  readonly fuelType: FuelType
  readonly price: string
  readonly onChange: (value: string) => void
}

/** Precio en COP por unidad; avisa si se sale del rango (el servidor lo rechazaría). */
export function FuelPriceInput({ fuelType, price, onChange }: FuelPriceInputProps) {
  const config = FUEL_TYPES[fuelType]
  const unit = getFuelUnitLabel(fuelType)
  const { min, max } = FUEL_PRICE_RANGES[fuelType]
  const parsed = parsePrice(price)
  const outOfRange = parsed !== null && isPriceOutlier(parsed, fuelType)

  return (
    <div className="px-3 pb-3">
      {config.unit === 'm3' && (
        <p className="text-[10px] text-orange-400/70 font-mono mb-2 flex items-center gap-1">
          <Wind size={HINT_ICON_SIZE} />
          El Gas se mide en metros cúbicos (m³)
        </p>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">$</span>
        <input
          type="number"
          step="1"
          min={min}
          max={max}
          aria-label={`Precio de ${config.label}`}
          placeholder={PLACEHOLDERS[fuelType]}
          value={price}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          className={cn('w-full bg-surface border rounded-lg pl-6 pr-20 py-2 font-mono text-sm text-white placeholder-gray-700 outline-none transition-colors', config.borderClass)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px] font-mono">COP/{unit}</span>
      </div>

      {outOfRange && (
        <div role="alert" className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-amber-400/8 border border-amber-400/20">
          <AlertTriangle size={ALERT_ICON_SIZE} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/80 leading-relaxed">
            Fuera del rango permitido para {config.label}: {formatPriceValue(min, 0)}–{formatPriceValue(max, 0)} COP/{unit}.
          </p>
        </div>
      )}
    </div>
  )
}
