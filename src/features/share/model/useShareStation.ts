import { useTrack } from '@/features/analytics/model/useTrack'
import { useOfficialPrices } from '@/features/prices/model/useOfficialPrices'
import type { Station } from '@/features/stations/api/types'
import { useZones } from '@/features/zones/model/useZones'
import { resolveDisplayPrice } from '@/shared/domain/displayPrice'
import { getLatestPrices, type FuelType } from '@/shared/domain/fuel'
import { stationUrl } from '@/shared/lib/stationLink'
import { buildShareMessage } from './shareMessage'
import { browserShareTarget, shareMessage, type ShareTarget } from './shareTarget'

/** Desde dónde se compartió (para medir qué botón funciona). */
export type ShareFrom = 'panel' | 'best_price'

export interface ShareStationInput {
  readonly station: Station
  readonly fuelType: FuelType
  readonly from: ShareFrom
}

/**
 * Comparte una estación: el precio que se ve en la app para ese combustible (comunitario u oficial),
 * con su enlace directo. Registra `share` solo si se compartió (no si la persona canceló).
 */
export function useShareStation(target: ShareTarget = browserShareTarget()): (input: ShareStationInput) => void {
  const officialPriceFor = useOfficialPrices()
  const zones = useZones()
  const track = useTrack()

  return ({ station, fuelType, from }) => {
    const now = Date.now()
    const city = zones.find((zone) => zone.id === station.zone_id)?.city ?? null
    const community = getLatestPrices(station.fuel_prices)[fuelType]
    const display = resolveDisplayPrice(community && { price: community.price, confirmedAt: community.confirmed_at }, officialPriceFor(city, fuelType), now)
    const message = buildShareMessage({
      stationName: station.name,
      fuelType,
      display,
      confirmedAt: community?.confirmed_at ?? null,
      url: stationUrl(window.location.origin, { stationId: station.id, fuelType }),
      now,
    })
    void shareMessage(message, target).then((via) => {
      if (via) track('share', { via, station_id: station.id, from })
    })
  }
}
