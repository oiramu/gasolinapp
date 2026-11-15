import { describe, expect, it } from 'vitest'
import type { ZoneAverage } from '@/features/zones/api/types'
import { FUEL_TYPES } from '@/shared/domain/fuel'
import { fuelPrice, station } from '@/test/fixtures/stations'
import { PIN_COLORS, stationPinModel, zonePinModel } from './model/pins'
import { createStationIcon, createUserLocationIcon, createZoneIcon } from './ui/mapIcons'

const html = (icon: { options: { html?: unknown } }) => String(icon.options.html)
const zone: ZoneAverage = {
  id: 'z1', name: 'Norte', city: 'Barranquilla', dept: 'Atlántico', code: null, lat: 11.01, lng: -74.81,
  avg_corriente: 15950, avg_extra: 18900, avg_diesel: 10900, avg_gnv: null, avg_urea: null, station_count: 8,
}

describe('stationPinModel', () => {
  const withPrices = station({ fuel_prices: [fuelPrice({ fuel_type: 'corriente', price: 15900 }), fuelPrice({ id: 'p2', fuel_type: 'extra', price: 18900 })] })

  it('muestra el precio del combustible elegido con su color y un punto por combustible', () => {
    expect(stationPinModel(withPrices, 'extra', false)).toMatchObject({
      label: '$18.900', color: FUEL_TYPES.extra.color, hasData: true, fuelDots: [FUEL_TYPES.corriente.color, FUEL_TYPES.extra.color],
    })
  })

  it('sin el combustible elegido muestra otro disponible en verde; sin precios, S/D en gris', () => {
    expect(stationPinModel(withPrices, 'diesel', false)).toMatchObject({ label: '$15.900', color: PIN_COLORS.active })
    expect(stationPinModel(station({ fuel_prices: [] }), 'corriente', true)).toMatchObject({
      label: 'S/D', color: PIN_COLORS.inactive, hasData: false, fuelDots: [], isFavorite: true,
    })
  })

  it('con GNV elegido atenúa las estaciones sin GNV', () => {
    expect(stationPinModel(station({ has_gnv: false }), 'gnv', false).dimmed).toBe(true)
    expect(stationPinModel(station({ has_gnv: true }), 'gnv', false)).toMatchObject({ dimmed: false, hasGnv: true })
  })
})

describe('zonePinModel', () => {
  it('usa el promedio del combustible o, si falta, el de corriente', () => {
    expect(zonePinModel(zone, 'extra').label).toBe('$18.900')
    expect(zonePinModel(zone, 'gnv')).toMatchObject({ label: '$15.950', caption: `${zone.name} · ${String(zone.station_count)} est.` })
    expect(zonePinModel({ ...zone, avg_corriente: null }, 'urea').label).toBe('S/D')
  })
})

describe('mapIcons', () => {
  it('el ícono cambia con el combustible y el favorito, sin leer el store', () => {
    const s = station({ has_gnv: true })
    expect(html(createStationIcon(s, { fuelType: 'corriente', isFavorite: false }))).not.toContain('data-favorite')
    expect(html(createStationIcon(s, { fuelType: 'corriente', isFavorite: true }))).toContain('data-favorite')
    expect(html(createStationIcon(s, { fuelType: 'gnv', isFavorite: false }))).toContain('GAS')
  })

  it('con varios combustibles pinta un punto de color por cada uno', () => {
    const twoFuels = station({ fuel_prices: [fuelPrice({ fuel_type: 'corriente' }), fuelPrice({ id: 'p2', fuel_type: 'diesel', price: 11000 })] })
    const pin = html(createStationIcon(twoFuels, { fuelType: 'corriente', isFavorite: false }))
    expect(pin).toContain(`background:${FUEL_TYPES.diesel.color}`)
  })

  it('una estación sin precios se pinta apagada y con S/D', () => {
    const pin = html(createStationIcon(station({ fuel_prices: [] }), { fuelType: 'corriente', isFavorite: false }))
    expect(pin).toContain('S/D')
    expect(pin).toContain(`background:${PIN_COLORS.surfaceMuted}`)
  })

  it('cachea por objeto: la misma estación reutiliza el HTML; un objeto nuevo (precio corregido) lo vuelve a pintar', () => {
    const before = station({ fuel_prices: [fuelPrice({ price: 15900 })] })
    const corrected = { ...before, fuel_prices: [fuelPrice({ price: 15950 })] }
    const first = createStationIcon(before, { fuelType: 'corriente', isFavorite: false })
    expect(createStationIcon(before, { fuelType: 'corriente', isFavorite: false }).options.html).toBe(first.options.html)
    expect(html(createStationIcon(corrected, { fuelType: 'corriente', isFavorite: false }))).toContain('$15.950')
  })

  it('pinta zonas por combustible y reutiliza el ícono de la ubicación', () => {
    expect(html(createZoneIcon(zone, 'diesel'))).toContain('$10.900')
    expect(createUserLocationIcon()).toBe(createUserLocationIcon())
  })
})
