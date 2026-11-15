import type { Station } from '@/features/stations/api/types'
import { resolveDisplayPrice } from '@/shared/domain/displayPrice'
import { FUEL_ORDER, getLatestPrices } from '@/shared/domain/fuel'
import { useNow } from '@/shared/lib/useNow'
import { useOfficialPrices } from '../model/useOfficialPrices'
import { FuelPriceCard } from './FuelPriceCard'

export interface StationFuelPricesProps {
  readonly station: Station
  /** Ciudad de la zona de la estación (para el precio oficial). */
  readonly city: string | null
}

/** Contenedor: un precio por combustible, eligiendo entre comunitario y oficial (resolveDisplayPrice). */
export function StationFuelPrices({ station, city }: StationFuelPricesProps) {
  const officialPriceFor = useOfficialPrices()
  const now = useNow()
  const latest = getLatestPrices(station.fuel_prices)
  // La urea solo se muestra si alguien la reportó en esta estación
  const fuels = FUEL_ORDER.filter((fuel) => fuel !== 'urea' || latest.urea !== undefined)
  return (
    <div className="p-4 grid grid-cols-2 auto-rows-fr gap-2">
      {fuels.map((fuel) => {
        const community = latest[fuel]
        const display = resolveDisplayPrice(community && { price: community.price, confirmedAt: community.confirmed_at }, officialPriceFor(city, fuel), now)
        return <FuelPriceCard key={fuel} fuelType={fuel} display={display} confirmedAt={community?.confirmed_at ?? null} />
      })}
    </div>
  )
}
