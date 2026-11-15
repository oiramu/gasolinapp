import type { FuelPrice, Report, Station, StationFields } from '@/features/stations/api/types'

export const stationFields = (overrides: Partial<StationFields> = {}): StationFields => ({
  id: 's1', name: 'Terpel El Recreo', brand: 'Terpel', address: 'Cra. 46', lat: 11, lng: -74.8, zone_id: 'z1', has_gnv: false,
  svc_montallantas: false, svc_cambio_aceite: false, svc_serviteca: false, svc_tienda: true, svc_lavadero: false,
  svc_bano: false, svc_cafe: false, svc_electrico: false, svc_atm: false,
  ...overrides,
})

export const fuelPrice = (overrides: Partial<FuelPrice> = {}): FuelPrice => ({
  id: 'p1', fuel_type: 'corriente', price: 15900, price_unit: 'gallon', currency: 'COP', comment: null,
  votes_up: 0, votes_down: 0, created_at: '2026-11-13T10:00:00Z', confirmed_at: '2026-11-13T10:00:00Z', reported_by: 'MK', is_active: true,
  ...overrides,
})

export const report = (overrides: Partial<Report> = {}): Report => ({
  id: 'r1', type: 'comment', content: 'Sin cola', votes_up: 2, votes_down: 0, created_at: '2026-11-13T10:00:00Z', user_display_name: 'JR',
  ...overrides,
})

export const station = (overrides: Partial<Station> = {}): Station => ({
  ...stationFields(),
  fuel_prices: [fuelPrice()],
  reports: [report()],
  ...overrides,
})
