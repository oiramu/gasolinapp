/**
 * Reports Service
 *
 * Pure async functions for submitting price reports and casting votes.
 * Extracted from the old useStations hook to keep the hook layer thin.
 */

import { supabase } from '@/lib/supabase'
import { getFuelUnit } from '@/lib/fuel'

/**
 * Submit a price report for one or more fuel types at a station.
 * Each fuel type gets its own row in `fuel_prices`; the previous
 * active price for that type is expired first.
 *
 * GNV reports automatically use price_unit = 'm3'.
 * All other fuel types use price_unit = 'gallon'.
 *
 * @param {object} params
 * @param {string} params.stationId
 * @param {Record<string, string|number>} params.fuels  - { extra: '1.20', gnv: '2500' }
 * @param {string} params.comment
 * @param {Object} params.modifiedServices - Map of boolean keys like { svc_tienda: true }
 * @param {string} params.userDisplayName
 */
export async function submitPriceReport({ stationId, fuels, comment, modifiedServices, userDisplayName }) {
  const reporter = userDisplayName || 'Anónimo'
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  for (const [fuelType, price] of Object.entries(fuels)) {
    const parsed = parseFloat(price)
    if (!price || isNaN(parsed)) continue

    // Expire the current active price for this fuel type
    await supabase
      .from('fuel_prices')
      .update({ is_active: false })
      .eq('station_id', stationId)
      .eq('fuel_type', fuelType)
      .eq('is_active', true)

    // Insert the new price with appropriate unit
    await supabase.from('fuel_prices').insert({
      station_id: stationId,
      fuel_type:  fuelType,
      price:      parsed,
      price_unit: getFuelUnit(fuelType),  // 'm3' para GNV, 'gallon' para el resto
      currency:   'COP',
      comment,
      reported_by: reporter,
      is_active:   true,
      expires_at:  expiresAt,
    })
  }

  // Attach a comment/report record if the user wrote something
  if (comment) {
    await supabase.from('reports').insert({
      station_id:        stationId,
      type:              'price',
      content:           comment,
      user_display_name: reporter,
    })
  }

  // Handle boolean flat services and ATMs modification
  const payload = {}
  if (modifiedServices && Object.keys(modifiedServices).length > 0) {
    Object.assign(payload, modifiedServices)
  }
  
  if (Object.keys(payload).length > 0) {
    await supabase.from('stations').update(payload).eq('id', stationId)
  }
}

/**
 * Increment the up or down vote count on a report.
 *
 * @param {string} reportId
 * @param {'up' | 'down'} voteType
 */
export async function voteOnReport(reportId, voteType) {
  const column = voteType === 'up' ? 'votes_up' : 'votes_down'

  const { data: current } = await supabase
    .from('reports')
    .select(column)
    .eq('id', reportId)
    .single()

  return supabase
    .from('reports')
    .update({ [column]: (current?.[column] ?? 0) + 1 })
    .eq('id', reportId)
}
