import type { TablesInsert } from '@/shared/api/database.types'
import { getFuelUnit } from '@/shared/domain/fuel'
import type { PriceReport } from './types'

export const ANONYMOUS = 'Anónimo'

// Un nombre vacío también cuenta como anónimo
const reporterName = (name: string | undefined): string => name || ANONYMOUS

const parsePrice = (value: string | number): number | null => {
  if (!value) return null
  const parsed = parseFloat(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

/** Filas de `fuel_prices` para un reporte. Se omiten los combustibles sin precio válido. */
export function toPriceRows({ stationId, fuels, comment, userDisplayName }: PriceReport): TablesInsert<'fuel_prices'>[] {
  return Object.entries(fuels).flatMap(([fuelType, value]) => {
    const price = parsePrice(value)
    if (price === null) return []
    return [{
      station_id: stationId,
      fuel_type: fuelType,
      price,
      price_unit: getFuelUnit(fuelType),
      currency: 'COP',
      comment,
      reported_by: reporterName(userDisplayName),
      is_active: true,
    }]
  })
}

/** Reporte de texto que acompaña los precios, si el usuario escribió un comentario. */
export function toCommentRow({ stationId, comment, userDisplayName }: PriceReport): TablesInsert<'reports'> | null {
  if (!comment) return null
  return { station_id: stationId, type: 'price', content: comment, user_display_name: reporterName(userDisplayName) }
}
