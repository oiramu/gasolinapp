/**
 * Zones Service
 *
 * Pure async functions for Supabase operations on the `zones` table
 * and the `get_zone_averages` RPC (PostgreSQL function).
 */

import { supabase } from '@/lib/supabase'

/**
 * Fetch zone-level price averages computed by the Postgres function.
 * Used at low zoom levels to show cluster markers.
 *
 * @returns {{ data: ZoneAverage[] | null, error: Error | null }}
 */
export async function fetchZoneAverages() {
  const { data, error } = await supabase.rpc('get_zone_averages')
  return { data, error }
}
