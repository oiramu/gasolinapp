import { useAppStore } from '@/store/appStore'
import { features } from '@/config/features'
import { ReportPriceModal as ReportPriceModalView } from '@/features/reports/ui/ReportPriceModal'

/**
 * Adaptador del store legado (hasta la 0.5): el modal en TSX no conoce Zustand.
 * Se monta solo abierto, así cada apertura empieza con el formulario vacío.
 */
export default function ReportPriceModal({ station }) {
  const open = useAppStore((state) => state.reportModalOpen)
  const expandServices = useAppStore((state) => state.reportModalPreExpand)
  const setReportModalOpen = useAppStore((state) => state.setReportModalOpen)
  const showToast = useAppStore((state) => state.showToast)

  if (!open || !station) return null

  return (
    <ReportPriceModalView
      station={station}
      servicesEnabled={features.serviceSuggestions}
      expandServices={expandServices}
      onClose={() => setReportModalOpen(false)}
      notify={showToast}
    />
  )
}
