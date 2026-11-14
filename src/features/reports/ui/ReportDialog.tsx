import { Fuel, X } from 'lucide-react'
import type { ReactNode } from 'react'

const CLOSE_ICON_SIZE = 18
const STATION_ICON_SIZE = 10

export interface ReportDialogProps {
  readonly stationLabel: string
  readonly onClose: () => void
  readonly children: ReactNode
}

/** Marco del modal: fondo, encabezado con la estación y botón de cerrar. */
export function ReportDialog({ stationLabel, onClose, children }: ReportDialogProps) {
  return (
    <div className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="relative w-full sm:max-w-md bg-surface-card border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-up"
      >
        <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
          <div>
            <h2 id="report-dialog-title" className="font-display font-bold text-[18px]">Reportar precios</h2>
            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
              <Fuel size={STATION_ICON_SIZE} className="text-fuel-500" />
              {stationLabel}
            </p>
          </div>
          <button type="button" aria-label="Cerrar reporte" onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <X size={CLOSE_ICON_SIZE} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
