import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

const TONES = {
  positive: 'bg-fuel-500/15 text-fuel-500 hover:bg-fuel-500/25',
  neutral: 'bg-white/5 text-gray-300 hover:bg-white/10',
} as const

export interface ActionButtonProps {
  /** Nombre accesible (el contenido puede ser solo un ícono). */
  readonly label: string
  readonly tone: keyof typeof TONES
  readonly disabled?: boolean
  readonly onClick: () => void
  readonly children: ReactNode
}

/** Botón de acción de una fila de precio: 36 px de alto, el mínimo cómodo para el dedo. */
export function ActionButton({ label, tone, disabled = false, onClick, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuel-500/60 disabled:opacity-40',
        TONES[tone],
      )}
    >
      {children}
    </button>
  )
}
