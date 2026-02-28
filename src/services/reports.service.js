/**
 * Reports Service
 *
 * Pure async functions for submitting price reports and casting votes.
 * Extracted from the old useStations hook to keep the hook layer thin.
 */

import { supabase } from '@/lib/supabase'

/**
 * Submit a price report for one or more fuel types at a station.
 * Each fuel type gets its own row in `fuel_prices`; the previous
 * active price for that type is expired first.
 *
 * @param {object} params
 * @param {string} params.stationId
 * @param {Record<string, string|number>} params.fuels  - { extra: '1.20', diesel: '1.05' }
 * @param {string} params.comment
 * @param {string} params.userDisplayName
 */
export async function submitPriceReport({ stationId, fuels, comment, userDisplayName }) {
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

    // Insert the new price
    await supabase.from('fuel_prices').insert({
      station_id: stationId,
      fuel_type: fuelType,
      price: parsed,
      comment,
      reported_by: reporter,
      is_active: true,
      expires_at: expiresAt,
    })
  }

  // Attach a comment/report record if the user wrote something
  if (comment) {
    await supabase.from('reports').insert({
      station_id: stationId,
      type: 'price',
      content: comment,
      user_display_name: reporter,
    })
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
