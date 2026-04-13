/**
 * Stations Service
 *
 * Pure async functions for Supabase operations on the `stations` table.
 * No React, no side effects — just data in, data out.
 * Easily replaceable with a REST client or mocked in tests.
 */

import { supabase } from '@/lib/supabase'

/** Full select clause reused across queries */
const STATION_SELECT = `
  id, name, brand, address, lat, lng, zone_id, has_gnv,
  svc_montallantas, svc_cambio_aceite, svc_serviteca,
  svc_tienda, svc_lavadero, svc_bano, svc_cafe,
  svc_electrico, svc_atm,
  fuel_prices (
    id, fuel_type, price, price_unit, currency, comment,
    votes_up, votes_down, created_at, reported_by, is_active
  ),
  reports (
    id, type, content, votes_up, votes_down,
    created_at, user_display_name
  )
`

/**
 * Fetch all active stations with their latest fuel prices and reports.
 * @returns {{ data: Station[] | null, error: Error | null }}
 */
export async function fetchStations() {
  const { data, error } = await supabase
    .from('stations')
    .select(STATION_SELECT)
    .eq('is_active', true)

  return { data, error }
}

/**
 * Fetch only stations that have GNV (Gas Natural Vehicular) available.
 * Uses the has_gnv flag for efficient filtering.
 * @returns {{ data: Station[] | null, error: Error | null }}
 */
export async function fetchGnvStations() {
  const { data, error } = await supabase
    .from('stations')
    .select(STATION_SELECT)
    .eq('is_active', true)
    .eq('has_gnv', true)

  return { data, error }
}

/**
 * Subscribe to realtime changes on fuel_prices and reports.
 * Calls `onUpdate` whenever an insert/update/delete happens.
 *
 * @param {() => void} onUpdate - callback triggered on any change
 * @returns {RealtimeChannel} - call `.unsubscribe()` on cleanup
 */
export function subscribeToStationUpdates(onUpdate) {
  return supabase
    .channel('station_updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_prices' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, onUpdate)
    .subscribe()
}
