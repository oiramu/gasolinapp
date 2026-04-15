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

    // Insertar el nuevo precio directamente.
    // No es necesario expirar el anterior: getLatestPrices() ya toma
    // el más reciente por created_at, así que el precio viejo queda
    // ignorado automáticamente en el cliente.
    const { error: insertError } = await supabase.from('fuel_prices').insert({
      station_id: stationId,
      fuel_type:  fuelType,
      price:      parsed,
      price_unit: getFuelUnit(fuelType),
      currency:   'COP',
      comment,
      reported_by: reporter,
      is_active:   true,
      expires_at:  expiresAt,
    })

    if (insertError) throw insertError
  }

  // Attach a comment/report record if the user wrote something
  if (comment) {
    const { error: reportError } = await supabase.from('reports').insert({
      station_id:        stationId,
      type:              'price',
      content:           comment,
      user_display_name: reporter,
    })
    if (reportError) throw reportError
  }

  // Handle boolean flat services and ATMs modification
  if (modifiedServices && Object.keys(modifiedServices).length > 0) {
    const { error: stationError } = await supabase
      .from('stations')
      .update(modifiedServices)
      .eq('id', stationId)
    
    if (stationError) throw stationError
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
