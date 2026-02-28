import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
}

export default function Toast() {
  const { toast } = useAppStore()

  if (!toast) return null

  const Icon = ICONS[toast.type] || CheckCircle

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]',
      'flex items-center gap-2.5 px-4 py-3 rounded-2xl',
      'border shadow-2xl animate-fade-up',
      'font-body text-[13px] font-medium whitespace-nowrap',
      toast.type === 'success'
        ? 'bg-fuel-500 text-surface border-fuel-600'
        : toast.type === 'error'
        ? 'bg-red-500 text-white border-red-600'
        : 'bg-amber-400 text-surface border-amber-500'
    )}>
      <Icon size={15} strokeWidth={2.5} />
      {toast.message}
    </div>
  )
}
