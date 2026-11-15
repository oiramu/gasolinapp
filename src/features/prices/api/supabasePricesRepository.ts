import { subDays } from 'date-fns'
import { unwrapList } from '@/shared/api/result'
import type { AppSupabaseClient } from '@/shared/api/supabaseClient'
import { groupByDay, roundedAverage, toDailyPrice } from './priceHistory'
import type { HistoryQuery, PricesRepository, ReferenceQuery } from './types'

/** Ventana de "hace un mes" para la calculadora: entre 35 y 25 días atrás. */
export const REFERENCE_WINDOW_DAYS = { from: 35, to: 25 } as const

/** Muestra de precios vigentes para el promedio de respaldo. */
export const REFERENCE_SAMPLE_SIZE = 50

const daysAgo = (days: number): string => subDays(new Date(), days).toISOString()

export function createSupabasePricesRepository(client: AppSupabaseClient): PricesRepository {
  const rawHistory = async ({ stationId, fuelType, days }: HistoryQuery) => {
    const rows = unwrapList(
      await client
        .from('fuel_prices')
        .select('price, created_at')
        .eq('station_id', stationId)
        .eq('fuel_type', fuelType)
        .eq('is_active', true)
        .gte('created_at', daysAgo(days))
        .order('created_at', { ascending: true }),
    )
    return groupByDay(rows)
  }

  const stationPriceAMonthAgo = async (stationId: string, fuelType: string) => {
    const rows = unwrapList(
      await client
        .from('fuel_prices')
        .select('price')
        .eq('station_id', stationId)
        .eq('fuel_type', fuelType)
        .gte('created_at', daysAgo(REFERENCE_WINDOW_DAYS.from))
        .lte('created_at', daysAgo(REFERENCE_WINDOW_DAYS.to))
        .order('created_at', { ascending: false })
        .limit(1),
    )
    return rows[0]?.price ?? null
  }

  const currentAverage = async (fuelType: string) => {
    const rows = unwrapList(
      await client.from('latest_prices').select('price').eq('fuel_type', fuelType).limit(REFERENCE_SAMPLE_SIZE),
    )
    return roundedAverage(rows.map(({ price }) => price))
  }

  return {
    async history(query) {
      const { stationId, fuelType, days } = query
      const daily = await client
        .from('daily_avg_prices')
        .select('price_date, avg_price, min_price, max_price, report_count')
        .eq('station_id', stationId)
        .eq('fuel_type', fuelType)
        .gte('price_date', daysAgo(days))
        .order('price_date', { ascending: true })
      // Si la vista falla, se agrupa en el cliente
      if (daily.error) return rawHistory(query)
      return daily.data.flatMap(toDailyPrice)
    },

    async referencePrice({ stationId, fuelType }: ReferenceQuery) {
      const stationPrice = stationId ? await stationPriceAMonthAgo(stationId, fuelType) : null
      return stationPrice ?? currentAverage(fuelType)
    },
  }
}
