import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Station } from '@/features/stations/api/types'
import type { ZoneAverage } from '@/features/zones/api/types'
import type { FuelType } from '@/shared/domain/fuel'
import { stationPinModel, zonePinModel, type PinOptions } from '../model/pins'
import { StationPin } from './StationPin'
import { UserLocationDot, ZonePin } from './ZonePin'

// Factory pura de íconos de Leaflet: todo lo que cambia el ícono entra por parámetro.
//
// El HTML se cachea por identidad del objeto (WeakMap). La caché de estaciones crea un
// objeto nuevo solo para la estación que cambió (precio nuevo, corrección, votos), así
// que su pin se vuelve a pintar y los demás se reutilizan. Sin clearIconCache.

// Tamaño en px de cada pin; el ancla se deriva: la punta del pin de estación, el centro de los demás
const STATION_PIN = { width: 62, height: 48 } as const
const ZONE_PIN = { width: 90, height: 44 } as const
const USER_DOT = 20
const POPUP_GAP = 2

const STATION_ICON = {
  iconSize: [STATION_PIN.width, STATION_PIN.height],
  iconAnchor: [STATION_PIN.width / 2, STATION_PIN.height],
  popupAnchor: [0, -(STATION_PIN.height + POPUP_GAP)],
} as const satisfies L.DivIconOptions
const ZONE_ICON = { iconSize: [ZONE_PIN.width, ZONE_PIN.height], iconAnchor: [ZONE_PIN.width / 2, ZONE_PIN.height / 2] } as const satisfies L.DivIconOptions
const USER_ICON = { iconSize: [USER_DOT, USER_DOT], iconAnchor: [USER_DOT / 2, USER_DOT / 2] } as const satisfies L.DivIconOptions

type HtmlCache<T> = (owner: T, key: string, render: () => string) => string

/** HTML cacheado por objeto y por clave; se libera solo cuando el objeto deja de usarse. */
function createHtmlCache<T extends object>(): HtmlCache<T> {
  const cache = new WeakMap<T, Map<string, string>>()
  return (owner, key, render) => {
    const byKey = cache.get(owner) ?? new Map<string, string>()
    cache.set(owner, byKey)
    const html = byKey.get(key) ?? render()
    byKey.set(key, html)
    return html
  }
}

const stationHtml = createHtmlCache<Station>()
const zoneHtml = createHtmlCache<ZoneAverage>()

/** El pin se vuelve a pintar cuando cambian el combustible, el favorito, la fuente, la frescura o el precio. */
export function createStationIcon(station: Station, options: PinOptions): L.DivIcon {
  const model = stationPinModel(station, options)
  const key = [options.fuelType, String(options.isFavorite), model.source, model.freshness ?? '-', model.label].join(':')
  const html = stationHtml(station, key, () =>
    renderToStaticMarkup(<StationPin model={model} />),
  )
  return L.divIcon({ ...STATION_ICON, html, className: '' })
}

export function createZoneIcon(zone: ZoneAverage, fuelType: FuelType): L.DivIcon {
  const html = zoneHtml(zone, fuelType, () => renderToStaticMarkup(<ZonePin model={zonePinModel(zone, fuelType)} />))
  return L.divIcon({ ...ZONE_ICON, html, className: '' })
}

let userLocationIcon: L.DivIcon | null = null

/** Siempre el mismo ícono: Leaflet no lo vuelve a crear en cada movimiento del GPS. */
export function createUserLocationIcon(): L.DivIcon {
  userLocationIcon ??= L.divIcon({ ...USER_ICON, html: renderToStaticMarkup(<UserLocationDot />), className: '' })
  return userLocationIcon
}
