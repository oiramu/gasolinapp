import type { Station } from '@/features/stations/api/types'
import { resolveDisplayPrice } from '@/shared/domain/displayPrice'
import { FUEL_ORDER, getLatestPrices, type FuelType } from '@/shared/domain/fuel'
import { useNow } from '@/shared/lib/useNow'
import type { Notify } from '@/shared/ui/notify'
import { useOfficialPrices } from '../model/useOfficialPrices'
import { toPriceCheck, usePriceCheck } from '../model/usePriceCheck'
import { FuelPriceCard } from './FuelPriceCard'
import { PriceCheckPrompt } from './PriceCheckPrompt'

export interface StationFuelPricesProps {
  readonly station: Station
  /** Ciudad de la zona de la estación (para el precio oficial). */
  readonly city: string | null
  /** "No": abrir el reporte con ese combustible ya elegido. */
  readonly onReport: (fuelType: FuelType) => void
  readonly notify: Notify
}

/**
 * Contenedor: un precio por combustible, eligiendo entre comunitario y oficial (resolveDisplayPrice),
 * con su pregunta "¿Sigue en $X?". Se monta por estación: las respuestas no pasan de una a otra.
 */
export function StationFuelPrices({ station, city, onReport, notify }: StationFuelPricesProps) {
  const officialPriceFor = useOfficialPrices()
  const now = useNow()
  const priceCheck = usePriceCheck(station.id, notify)
  const latest = getLatestPrices(station.fuel_prices)
  // La urea solo se muestra si alguien la reportó en esta estación
  const fuels = FUEL_ORDER.filter((fuel) => fuel !== 'urea' || latest.urea !== undefined)
  return (
    <div className="p-4 grid grid-cols-2 auto-rows-fr gap-2">
      {fuels.map((fuel) => {
        const community = latest[fuel]
        const display = resolveDisplayPrice(community && { price: community.price, confirmedAt: community.confirmed_at }, officialPriceFor(city, fuel), now)
        const check = toPriceCheck(fuel, display, community)
        return (
          <FuelPriceCard key={fuel} fuelType={fuel} display={display} confirmedAt={community?.confirmed_at ?? null}>
            {check && (
              <PriceCheckPrompt
                check={check}
                answered={priceCheck.isAnswered(fuel)}
                pending={priceCheck.isPending}
                onYes={() => { priceCheck.answerYes(check) }}
                onNo={() => { onReport(fuel) }}
              />
            )}
          </FuelPriceCard>
        )
      })}
    </div>
  )
}
