import { lazy, Suspense } from 'react'
import { useAppStore } from '@/store/appStore'
import { features } from '@/config/features'

/** El formulario de reporte no va en el bundle inicial: se descarga al abrirlo (App lo precarga en segundo plano). */
export const loadReportPriceModal = () => import('@/features/reports/ui/ReportPriceModal')
const ReportPriceModalView = lazy(() => loadReportPriceModal().then((module) => ({ default: module.ReportPriceModal })))

/**
 * Adaptador del store legado (hasta la 0.5): el modal en TSX no conoce Zustand.
 * Se monta solo abierto, así cada apertura empieza con el formulario vacío.
 */
export default function ReportPriceModal({ station }) {
  const open = useAppStore((state) => state.reportModalOpen)
  const expandServices = useAppStore((state) => state.reportModalPreExpand)
  const initialFuel = useAppStore((state) => state.reportModalFuel)
  const setReportModalOpen = useAppStore((state) => state.setReportModalOpen)
  const showToast = useAppStore((state) => state.showToast)

  if (!open || !station) return null

  return (
    <Suspense fallback={null}>
      <ReportPriceModalView
        station={station}
        servicesEnabled={features.serviceSuggestions}
        expandServices={expandServices}
        initialFuel={initialFuel}
        onClose={() => setReportModalOpen(false)}
        notify={showToast}
      />
    </Suspense>
  )
}
