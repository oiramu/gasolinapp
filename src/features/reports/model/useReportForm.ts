import { useState } from 'react'
import type { ServiceKey, StationFields } from '@/features/stations/api/types'
import type { FuelType } from '@/shared/domain/fuel'
import { INITIAL_FORM, serviceValue, toDraft, type ReportDraft, type ReportForm } from './reportForm'

type StationServices = Pick<StationFields, ServiceKey>

export interface ReportFormState {
  readonly form: ReportForm
  readonly draft: ReportDraft
  readonly isServiceOn: (key: ServiceKey) => boolean
  readonly toggleFuel: (fuelType: FuelType) => void
  readonly setPrice: (fuelType: FuelType, value: string) => void
  readonly toggleService: (key: ServiceKey) => void
  readonly setComment: (comment: string) => void
}

/** Estado del formulario de reporte de una estación; el borrador se deriva, no se guarda. */
export function useReportForm(station: StationServices): ReportFormState {
  const [form, setForm] = useState(INITIAL_FORM)
  const isServiceOn = (key: ServiceKey) => serviceValue(form, station, key)

  return {
    form,
    draft: toDraft(form, station),
    isServiceOn,
    toggleFuel: (fuelType) => {
      setForm((prev) => ({ ...prev, activeFuels: { ...prev.activeFuels, [fuelType]: !prev.activeFuels[fuelType] } }))
    },
    setPrice: (fuelType, value) => {
      setForm((prev) => ({ ...prev, prices: { ...prev.prices, [fuelType]: value } }))
    },
    toggleService: (key) => {
      setForm((prev) => ({ ...prev, services: { ...prev.services, [key]: !serviceValue(prev, station, key) } }))
    },
    setComment: (comment) => {
      setForm((prev) => ({ ...prev, comment }))
    },
  }
}
