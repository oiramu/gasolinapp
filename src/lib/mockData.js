// ── Mock data used when Supabase is not yet configured ──────────────────────
// Switch VITE_USE_MOCK_DATA=true in .env to use this

export const MOCK_ZONES = [
  { id: 'z1', name: 'Norte', lat: 11.010, lng: -74.810, avg_extra: 3.24, avg_diesel: 2.95, station_count: 8 },
  { id: 'z2', name: 'Centro', lat: 10.985, lng: -74.800, avg_extra: 3.29, avg_diesel: 2.99, station_count: 12 },
  { id: 'z3', name: 'Suroccidente', lat: 10.960, lng: -74.820, avg_extra: 3.21, avg_diesel: 2.91, station_count: 6 },
  { id: 'z4', name: 'El Prado', lat: 11.000, lng: -74.788, avg_extra: 3.31, avg_diesel: 3.01, station_count: 5 },
  { id: 'z5', name: 'Riomar', lat: 11.018, lng: -74.850, avg_extra: 3.26, avg_diesel: 2.97, station_count: 7 },
]

export const MOCK_STATIONS = [
  {
    id: '1', name: 'Terpel El Recreo', brand: 'Terpel', zone_id: 'z1',
    lat: 11.012, lng: -74.812,
    address: 'Cra. 46 #76-15, Barranquilla',
    fuel_prices: [
      { id: 'p1', fuel_type: 'extra', price: 3.25, currency: 'USD', votes_up: 5, votes_down: 0, created_at: new Date(Date.now() - 2*60*60*1000).toISOString(), reported_by: 'MK', is_active: true },
      { id: 'p2', fuel_type: 'diesel', price: 2.94, currency: 'USD', votes_up: 3, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), reported_by: 'MK', is_active: true },
      { id: 'p3', fuel_type: 'urea', price: 1.80, currency: 'USD', votes_up: 2, votes_down: 0, created_at: new Date(Date.now() - 4*60*60*1000).toISOString(), reported_by: 'JR', is_active: true },
    ],
    reports: [
      { id: 'r1', type: 'promotion', content: 'Descuento 3% pagando con Nequi. Atención rápida.', votes_up: 8, votes_down: 0, created_at: new Date(Date.now() - 2*60*60*1000).toISOString(), user_display_name: 'MK' },
      { id: 'r2', type: 'comment', content: 'Sin cola a esta hora.', votes_up: 4, votes_down: 1, created_at: new Date(Date.now() - 5*60*60*1000).toISOString(), user_display_name: 'JR' },
    ],
  },
  {
    id: '2', name: 'Biomax Centro', brand: 'Biomax', zone_id: 'z2',
    lat: 10.986, lng: -74.802,
    address: 'Cl. 45 #41-30, Barranquilla',
    fuel_prices: [
      { id: 'p4', fuel_type: 'extra', price: 3.28, currency: 'USD', votes_up: 7, votes_down: 0, created_at: new Date(Date.now() - 1*60*60*1000).toISOString(), reported_by: 'AL', is_active: true },
      { id: 'p5', fuel_type: 'super', price: 3.45, currency: 'USD', votes_up: 12, votes_down: 1, created_at: new Date(Date.now() - 1*60*60*1000).toISOString(), reported_by: 'AL', is_active: true },
      { id: 'p6', fuel_type: 'diesel', price: 2.98, currency: 'USD', votes_up: 6, votes_down: 0, created_at: new Date(Date.now() - 90*60*1000).toISOString(), reported_by: 'AL', is_active: true },
    ],
    reports: [
      { id: 'r3', type: 'promotion', content: '¡Tienen súper! Único en la zona. Un poco caro pero vale.', votes_up: 12, votes_down: 0, created_at: new Date(Date.now() - 60*60*1000).toISOString(), user_display_name: 'AL' },
    ],
  },
  {
    id: '3', name: 'Primax Sur', brand: 'Primax', zone_id: 'z3',
    lat: 10.962, lng: -74.822,
    address: 'Av. Murillo #18-20, Barranquilla',
    fuel_prices: [],
    reports: [],
  },
  {
    id: '4', name: 'Shell Prado', brand: 'Shell', zone_id: 'z4',
    lat: 11.001, lng: -74.790,
    address: 'Cra. 53 #68-40, Barranquilla',
    fuel_prices: [
      { id: 'p7', fuel_type: 'extra', price: 3.30, currency: 'USD', votes_up: 5, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), reported_by: 'CG', is_active: true },
      { id: 'p8', fuel_type: 'super', price: 3.48, currency: 'USD', votes_up: 4, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), reported_by: 'CG', is_active: true },
      { id: 'p9', fuel_type: 'diesel', price: 3.02, currency: 'USD', votes_up: 3, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), reported_by: 'CG', is_active: true },
      { id: 'p10', fuel_type: 'urea', price: 1.85, currency: 'USD', votes_up: 2, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), reported_by: 'CG', is_active: true },
    ],
    reports: [
      { id: 'r4', type: 'comment', content: 'Pago con tarjeta sin problema. Instalaciones muy limpias.', votes_up: 6, votes_down: 0, created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), user_display_name: 'CG' },
    ],
  },
  {
    id: '5', name: 'Terpel Riomar', brand: 'Terpel', zone_id: 'z5',
    lat: 11.019, lng: -74.852,
    address: 'Cra. 72B #98-12, Barranquilla',
    fuel_prices: [
      { id: 'p11', fuel_type: 'extra', price: 3.24, currency: 'USD', votes_up: 9, votes_down: 1, created_at: new Date(Date.now() - 30*60*1000).toISOString(), reported_by: 'FB', is_active: true },
      { id: 'p12', fuel_type: 'diesel', price: 2.96, currency: 'USD', votes_up: 7, votes_down: 0, created_at: new Date(Date.now() - 30*60*1000).toISOString(), reported_by: 'FB', is_active: true },
    ],
    reports: [
      { id: 'r5', type: 'warning', content: 'Cola larga a las 6pm pero el precio está bien. Recomendado venir en la mañana.', votes_up: 9, votes_down: 0, created_at: new Date(Date.now() - 30*60*1000).toISOString(), user_display_name: 'FB' },
    ],
  },
  {
    id: '6', name: 'Mobil Circunvalar', brand: 'Mobil', zone_id: 'z1',
    lat: 11.008, lng: -74.805,
    address: 'Av. Circunvalar #34-10, Barranquilla',
    fuel_prices: [],
    reports: [],
  },
  {
    id: '7', name: 'Biomax La Castellana', brand: 'Biomax', zone_id: 'z4',
    lat: 10.998, lng: -74.786,
    address: 'Cl. 74 #60-25, Barranquilla',
    fuel_prices: [
      { id: 'p13', fuel_type: 'extra', price: 3.32, currency: 'USD', votes_up: 10, votes_down: 2, created_at: new Date(Date.now() - 45*60*1000).toISOString(), reported_by: 'RO', is_active: true },
      { id: 'p14', fuel_type: 'super', price: 3.50, currency: 'USD', votes_up: 8, votes_down: 1, created_at: new Date(Date.now() - 45*60*1000).toISOString(), reported_by: 'RO', is_active: true },
      { id: 'p15', fuel_type: 'diesel', price: 3.00, currency: 'USD', votes_up: 6, votes_down: 0, created_at: new Date(Date.now() - 45*60*1000).toISOString(), reported_by: 'RO', is_active: true },
    ],
    reports: [
      { id: 'r6', type: 'warning', content: '⚠️ Solo efectivo esta mañana, falla en el sistema de tarjetas.', votes_up: 15, votes_down: 0, created_at: new Date(Date.now() - 45*60*1000).toISOString(), user_display_name: 'RO' },
    ],
  },
]
