import { RefreshCw, Send } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const ICON_SIZE = 14

export interface SubmitButtonProps {
  readonly disabled: boolean
  readonly submitting: boolean
}

export function SubmitButton({ disabled, submitting }: SubmitButtonProps) {
  const Icon = submitting ? RefreshCw : Send
  return (
    <button
      type="submit"
      disabled={disabled || submitting}
      className={cn(
        'w-full py-3 rounded-xl font-display font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
        'enabled:bg-fuel-500 enabled:hover:bg-fuel-600 enabled:text-surface enabled:active:scale-[0.98]',
        'disabled:bg-surface-muted disabled:text-gray-600 disabled:cursor-not-allowed',
      )}
    >
      <Icon size={ICON_SIZE} className={cn(submitting && 'animate-spin')} />
      {submitting ? 'Enviando…' : 'Enviar reporte'}
    </button>
  )
}
