import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { ZoneAverage, ZonesRepository } from './types'

interface MockZone {
  readonly id: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  readonly corriente: number
  readonly extra: number
  readonly diesel: number
  readonly stations: number
}

const zone = ({ id, name, lat, lng, corriente, extra, diesel, stations }: MockZone): ZoneAverage => ({
  id,
  name,
  city: 'Barranquilla',
  dept: 'Atlántico',
  code: null,
  lat,
  lng,
  avg_corriente: corriente,
  avg_extra: extra,
  avg_diesel: diesel,
  avg_gnv: null,
  avg_urea: null,
  station_count: stations,
})

export const MOCK_ZONES: readonly ZoneAverage[] = [
  zone({ id: 'z1', name: 'Norte', lat: 11.01, lng: -74.81, corriente: 15950, extra: 18900, diesel: 10900, stations: 8 }),
  zone({ id: 'z2', name: 'Centro', lat: 10.985, lng: -74.8, corriente: 15900, extra: 18990, diesel: 10950, stations: 12 }),
  zone({ id: 'z3', name: 'Suroccidente', lat: 10.96, lng: -74.82, corriente: 15850, extra: 18800, diesel: 10850, stations: 6 }),
  zone({ id: 'z4', name: 'El Prado', lat: 11, lng: -74.788, corriente: 16050, extra: 19150, diesel: 11000, stations: 5 }),
  zone({ id: 'z5', name: 'Riomar', lat: 11.018, lng: -74.85, corriente: 16000, extra: 18850, diesel: 10900, stations: 7 }),
]

export function createMockZonesRepository(
  zones: readonly ZoneAverage[] = MOCK_ZONES,
  latencyMs = MOCK_LATENCY_MS,
): ZonesRepository {
  return {
    async listAverages() {
      await delay(latencyMs)
      return [...zones]
    },
  }
}
