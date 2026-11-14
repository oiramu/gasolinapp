import type { FormEvent } from 'react'
import { useHasSession } from '@/features/auth/model/session'
import { SERVICE_COLUMNS, type StationFields } from '@/features/stations/api/types'
import { toUserMessage } from '@/shared/api/rpcErrors'
import { useSubmitReport } from '../model/mutations'
import { canSubmit, REPORTABLE_FUELS } from '../model/reportForm'
import { submitMessage } from '../model/submitReport'
import { useReportForm } from '../model/useReportForm'
import { CommentField } from './CommentField'
import { FuelPriceField } from './FuelPriceField'
import { ReportDialog } from './ReportDialog'
import { ServicesPicker } from './ServicesPicker'
import { SubmitButton } from './SubmitButton'

export type ToastType = 'success' | 'error'

const SUBMIT_FAILED = 'Error al enviar. Intenta de nuevo.'

export interface ReportPriceModalProps {
  readonly station: StationFields
  /** Feature flag `serviceSuggestions`. */
  readonly servicesEnabled: boolean
  readonly expandServices: boolean
  readonly onClose: () => void
  readonly notify: (message: string, type: ToastType) => void
}

/** Contenedor del reporte de una estación: formulario, sesión, envío por RPC y avisos. */
export function ReportPriceModal({ station, servicesEnabled, expandServices, onClose, notify }: ReportPriceModalProps) {
  const report = useReportForm(station)
  const hasSession = useHasSession()
  const { mutate, isPending } = useSubmitReport()
  const ready = hasSession && canSubmit(report.draft)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!ready) return
    const { prices, comment, services } = report.draft
    mutate({ stationId: station.id, prices, comment, services }, {
      onSuccess: (outcome) => {
        notify(submitMessage(outcome), 'success')
        onClose()
      },
      onError: (error) => {
        notify(toUserMessage(error, SUBMIT_FAILED), 'error')
      },
    })
  }

  return (
    <ReportDialog stationLabel={`${station.name} · ${station.brand}`} onClose={onClose}>
      <form onSubmit={submit} className="flex-1 overflow-y-auto p-4 space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1.5">Combustibles disponibles & precios</legend>
          {REPORTABLE_FUELS.map((fuelType) => (
            <FuelPriceField
              key={fuelType}
              fuelType={fuelType}
              active={report.form.activeFuels[fuelType]}
              price={report.form.prices[fuelType]}
              onToggle={() => { report.toggleFuel(fuelType) }}
              onPriceChange={(value) => { report.setPrice(fuelType, value) }}
            />
          ))}
        </fieldset>

        {servicesEnabled && (
          <ServicesPicker
            knownCount={SERVICE_COLUMNS.filter((key) => station[key] === true).length}
            defaultExpanded={expandServices}
            isOn={report.isServiceOn}
            onToggle={report.toggleService}
          />
        )}

        <CommentField value={report.form.comment} onChange={report.setComment} />
        <SubmitButton disabled={!ready} submitting={isPending} />

        <p className="text-[10px] text-gray-700 text-center pb-1">
          Al reportar confirmas que los precios son correctos. Datos verificados por la comunidad.
        </p>
      </form>
    </ReportDialog>
  )
}
