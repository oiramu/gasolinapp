import { Plus } from 'lucide-react'
import type { Station } from '@/features/stations/api/types'
import { resolveDisplayPrice, type DisplayPrice } from '@/shared/domain/displayPrice'
import { FUEL_ORDER, FUEL_TYPES, getLatestPrices, type FuelType } from '@/shared/domain/fuel'
import { useNow } from '@/shared/lib/useNow'
import type { Notify } from '@/shared/ui/notify'
import { useOfficialPrices } from '../model/useOfficialPrices'
import { toPriceCheck, usePriceCheck, type PriceCheck, type PriceCheckState } from '../model/usePriceCheck'
import { ActionButton } from './ActionButton'
import { FuelPriceRow } from './FuelPriceRow'
import { PriceCheckPrompt } from './PriceCheckPrompt'

export interface StationFuelPricesProps {
  readonly station: Station
  /** Ciudad de la zona de la estación (para el precio oficial). */
  readonly city: string | null
  /** "No" o "Reportar": abrir el reporte con ese combustible ya elegido. */
  readonly onReport: (fuelType: FuelType) => void
  readonly notify: Notify
}

const ICON_SIZE = 14

interface FuelLine {
  readonly fuel: FuelType
  readonly display: DisplayPrice
  readonly confirmedAt: string | null
  readonly check: PriceCheck | null
}

/**
 * Contenedor: un precio por combustible, eligiendo entre comunitario y oficial (resolveDisplayPrice),
 * con su pregunta "¿Sigue así?". Se monta por estación: las respuestas no pasan de una a otra.
 */
export function StationFuelPrices({ station, city, onReport, notify }: StationFuelPricesProps) {
  const officialPriceFor = useOfficialPrices()
  const now = useNow()
  const priceCheck = usePriceCheck(station.id, notify)
  const latest = getLatestPrices(station.fuel_prices)
  // La urea solo se muestra si alguien la reportó en esta estación
  const lines = FUEL_ORDER.filter((fuel) => fuel !== 'urea' || latest.urea !== undefined).map((fuel): FuelLine => {
    const community = latest[fuel]
    const display = resolveDisplayPrice(community && { price: community.price, confirmedAt: community.confirmed_at }, officialPriceFor(city, fuel), now)
    return { fuel, display, confirmedAt: community?.confirmed_at ?? null, check: toPriceCheck(fuel, display, community) }
  })

  return (
    <div className="px-4 pt-4">
      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-surface-card">
        {lines.map((line) => (
          <FuelPriceRow key={line.fuel} fuelType={line.fuel} display={line.display} confirmedAt={line.confirmedAt}>
            <RowAction line={line} priceCheck={priceCheck} onReport={onReport} />
          </FuelPriceRow>
        ))}
      </ul>
      {lines.some((line) => line.display.source === 'reference') && (
        <p className="mt-2 px-1 text-[11px] leading-snug text-gray-500">
          Oficial: precio de referencia de la CREG para la ciudad. Cada estación puede variar.
        </p>
      )}
    </div>
  )
}

interface RowActionProps {
  readonly line: FuelLine
  readonly priceCheck: PriceCheckState
  readonly onReport: (fuelType: FuelType) => void
}

/** Con precio a la vista, "¿Sigue así?"; sin precio, "Reportar". */
function RowAction({ line: { fuel, check }, priceCheck, onReport }: RowActionProps) {
  if (!check) {
    return (
      <ActionButton label={`Reportar precio de ${FUEL_TYPES[fuel].label}`} tone="neutral" onClick={() => { onReport(fuel) }}>
        <Plus size={ICON_SIZE} aria-hidden />
        Reportar
      </ActionButton>
    )
  }
  return (
    <PriceCheckPrompt
      check={check}
      answered={priceCheck.isAnswered(fuel)}
      pending={priceCheck.isPending}
      onYes={() => { priceCheck.answerYes(check) }}
      onNo={() => { onReport(fuel) }}
    />
  )
}
