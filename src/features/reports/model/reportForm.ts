import { SERVICE_COLUMNS, type ServiceKey, type StationFields } from '@/features/stations/api/types'
import { FUEL_ORDER, isPriceOutlier, type FuelType } from '@/shared/domain/fuel'
import { REPORT_CONTENT_MAX_LENGTH } from '@/shared/domain/reports'
import type { PriceEntry, ServiceValues } from '../api/types'

// Estado del formulario de reporte y todo lo que se deriva de él (funciones puras, sin React).

/** La urea no se reporta desde el formulario (se muestra solo si una estación ya la tiene). */
export const REPORTABLE_FUELS: readonly FuelType[] = FUEL_ORDER.filter((fuel) => fuel !== 'urea')

export interface ReportForm {
  readonly activeFuels: Readonly<Record<FuelType, boolean>>
  readonly prices: Readonly<Record<FuelType, string>>
  /** Solo los servicios que el usuario tocó; el resto se muestra como está en la estación. */
  readonly services: ServiceValues
  readonly comment: string
}

export const INITIAL_FORM: ReportForm = {
  activeFuels: { corriente: true, extra: false, diesel: false, urea: false, gnv: false },
  prices: { corriente: '', extra: '', diesel: '', urea: '', gnv: '' },
  services: {},
  comment: '',
}

/** Lo que se va a enviar. Se deriva del formulario en cada render; nunca se guarda. */
export interface ReportDraft {
  readonly prices: readonly PriceEntry[]
  readonly comment: string
  readonly services: ServiceValues
  readonly outOfRange: boolean
}

type StationServices = Pick<StationFields, ServiceKey>

/** COP enteros; vacío, cero o no numérico es "sin precio". */
export function parsePrice(value: string): number | null {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

export const serviceValue = (form: ReportForm, station: StationServices, key: ServiceKey): boolean =>
  form.services[key] ?? station[key] === true

export function priceEntries(form: ReportForm): PriceEntry[] {
  return REPORTABLE_FUELS.flatMap((fuelType) => {
    const price = form.activeFuels[fuelType] ? parsePrice(form.prices[fuelType]) : null
    return price === null ? [] : [{ fuelType, price }]
  })
}

function serviceChanges(form: ReportForm, station: StationServices): ServiceValues {
  return Object.fromEntries(SERVICE_COLUMNS.flatMap((key) => {
    const value = form.services[key]
    return value === undefined || value === station[key] ? [] : [[key, value]]
  }))
}

export function toDraft(form: ReportForm, station: StationServices): ReportDraft {
  const prices = priceEntries(form)
  return {
    prices,
    comment: form.comment.trim(),
    services: serviceChanges(form, station),
    outOfRange: prices.some(({ fuelType, price }) => isPriceOutlier(price, fuelType)),
  }
}

export const hasServices = (services: ServiceValues): boolean => Object.keys(services).length > 0

const isEmpty = ({ prices, comment, services }: ReportDraft): boolean =>
  prices.length === 0 && comment === '' && !hasServices(services)

/** Algo que enviar, sin precios fuera de rango (el servidor los rechaza) ni comentarios largos. */
export const canSubmit = (draft: ReportDraft): boolean =>
  !isEmpty(draft) && !draft.outOfRange && draft.comment.length <= REPORT_CONTENT_MAX_LENGTH
