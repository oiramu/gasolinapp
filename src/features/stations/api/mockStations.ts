import { getFuelUnit, type FuelType } from '@/shared/domain/fuel'
import type { ReportType } from '@/shared/domain/reports'
import { SERVICE_COLUMNS, type FuelPrice, type Report, type Station, type StationFields } from './types'

// Datos de desarrollo para VITE_USE_MOCK_DATA=true (Barranquilla, precios en COP)

const MS_PER_MINUTE = 60_000

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * MS_PER_MINUTE).toISOString()

type ServiceColumn = (typeof SERVICE_COLUMNS)[number]

const NO_SERVICES = Object.fromEntries(SERVICE_COLUMNS.map((column) => [column, false])) as Record<ServiceColumn, boolean>

interface MockPrice {
  readonly id: string
  readonly fuel: FuelType
  readonly price: number
  readonly minutes: number
  readonly by: string
}

const price = ({ id, fuel, price: value, minutes, by }: MockPrice): FuelPrice => ({
  id,
  fuel_type: fuel,
  price: value,
  price_unit: getFuelUnit(fuel),
  currency: 'COP',
  comment: null,
  votes_up: 0,
  votes_down: 0,
  created_at: minutesAgo(minutes),
  reported_by: by,
  is_active: true,
})

interface MockReport {
  readonly id: string
  readonly type: ReportType
  readonly content: string
  readonly minutes: number
  readonly by: string
}

const report = ({ id, type, content, minutes, by }: MockReport): Report => ({
  id,
  type,
  content,
  votes_up: 0,
  votes_down: 0,
  created_at: minutesAgo(minutes),
  user_display_name: by,
})

type MockStation = Pick<StationFields, 'id' | 'name' | 'brand' | 'zone_id' | 'lat' | 'lng' | 'address'> & {
  readonly services?: readonly ServiceColumn[]
  readonly prices?: readonly FuelPrice[]
  readonly reports?: readonly Report[]
}

const station = ({ services = [], prices = [], reports = [], ...fields }: MockStation): Station => ({
  ...NO_SERVICES,
  ...Object.fromEntries(services.map((column) => [column, true])),
  ...fields,
  has_gnv: prices.some((p) => p.fuel_type === 'gnv'),
  fuel_prices: prices,
  reports,
})

export const MOCK_STATIONS: readonly Station[] = [
  station({
    id: '1', name: 'Terpel El Recreo', brand: 'Terpel', zone_id: 'z1', lat: 11.012, lng: -74.812, address: 'Cra. 46 #76-15, Barranquilla',
    services: ['svc_montallantas', 'svc_cambio_aceite', 'svc_tienda'],
    prices: [
      price({ id: 'p1', fuel: 'extra', price: 18900, minutes: 120, by: 'MK' }),
      price({ id: 'p2', fuel: 'diesel', price: 10900, minutes: 180, by: 'MK' }),
      price({ id: 'p3', fuel: 'gnv', price: 2850, minutes: 240, by: 'JR' }),
    ],
    reports: [
      report({ id: 'r1', type: 'promotion', content: 'Descuento 3% pagando con Nequi. Atención rápida.', minutes: 120, by: 'MK' }),
      report({ id: 'r2', type: 'comment', content: 'Sin cola a esta hora.', minutes: 300, by: 'JR' }),
    ],
  }),
  station({
    id: '2', name: 'Biomax Centro', brand: 'Biomax', zone_id: 'z2', lat: 10.986, lng: -74.802, address: 'Cl. 45 #41-30, Barranquilla',
    services: ['svc_tienda', 'svc_cafe', 'svc_bano', 'svc_atm'],
    prices: [
      price({ id: 'p4', fuel: 'extra', price: 18990, minutes: 60, by: 'AL' }),
      price({ id: 'p5', fuel: 'corriente', price: 15900, minutes: 60, by: 'AL' }),
      price({ id: 'p6', fuel: 'diesel', price: 10950, minutes: 90, by: 'AL' }),
    ],
    reports: [report({ id: 'r3', type: 'promotion', content: 'Atención rápida y baños limpios.', minutes: 60, by: 'AL' })],
  }),
  station({
    id: '3', name: 'Primax Sur', brand: 'Primax', zone_id: 'z3', lat: 10.962, lng: -74.822, address: 'Av. Murillo #18-20, Barranquilla',
    services: ['svc_lavadero'],
  }),
  station({
    id: '4', name: 'Shell Prado', brand: 'Shell', zone_id: 'z4', lat: 11.001, lng: -74.79, address: 'Cra. 53 #68-40, Barranquilla',
    services: ['svc_bano', 'svc_tienda', 'svc_electrico'],
    prices: [
      price({ id: 'p7', fuel: 'extra', price: 19200, minutes: 180, by: 'CG' }),
      price({ id: 'p8', fuel: 'corriente', price: 16100, minutes: 180, by: 'CG' }),
      price({ id: 'p9', fuel: 'diesel', price: 11050, minutes: 180, by: 'CG' }),
      price({ id: 'p10', fuel: 'urea', price: 4500, minutes: 180, by: 'CG' }),
    ],
    reports: [report({ id: 'r4', type: 'comment', content: 'Pago con tarjeta sin problema. Instalaciones muy limpias.', minutes: 180, by: 'CG' })],
  }),
  station({
    id: '5', name: 'Terpel Riomar', brand: 'Terpel', zone_id: 'z5', lat: 11.019, lng: -74.852, address: 'Cra. 72B #98-12, Barranquilla',
    services: ['svc_tienda', 'svc_lavadero'],
    prices: [
      price({ id: 'p11', fuel: 'extra', price: 18850, minutes: 30, by: 'FB' }),
      price({ id: 'p12', fuel: 'diesel', price: 10900, minutes: 30, by: 'FB' }),
    ],
    reports: [report({ id: 'r5', type: 'warning', content: 'Cola larga a las 6pm. Mejor venir en la mañana.', minutes: 30, by: 'FB' })],
  }),
  station({
    id: '6', name: 'Mobil Circunvalar', brand: 'Mobil', zone_id: 'z1', lat: 11.008, lng: -74.805, address: 'Av. Circunvalar #34-10, Barranquilla',
  }),
  station({
    id: '7', name: 'Biomax La Castellana', brand: 'Biomax', zone_id: 'z4', lat: 10.998, lng: -74.786, address: 'Cl. 74 #60-25, Barranquilla',
    services: ['svc_tienda', 'svc_cafe', 'svc_atm'],
    prices: [
      price({ id: 'p13', fuel: 'extra', price: 19100, minutes: 45, by: 'RO' }),
      price({ id: 'p14', fuel: 'corriente', price: 15990, minutes: 45, by: 'RO' }),
      price({ id: 'p15', fuel: 'diesel', price: 11000, minutes: 45, by: 'RO' }),
    ],
    reports: [report({ id: 'r6', type: 'warning', content: 'Solo efectivo esta mañana, falla en el sistema de tarjetas.', minutes: 45, by: 'RO' })],
  }),
]
