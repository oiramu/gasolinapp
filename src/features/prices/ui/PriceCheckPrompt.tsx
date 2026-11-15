import { Check, X } from 'lucide-react'
import { formatPriceValue } from '@/shared/domain/format'
import { THANKS, type PriceCheck } from '../model/usePriceCheck'
import { ActionButton } from './ActionButton'

export interface PriceCheckPromptProps {
  readonly check: PriceCheck
  readonly answered: boolean
  readonly pending: boolean
  readonly onYes: () => void
  readonly onNo: () => void
}

type Source = PriceCheck['source']

/** Lo visible es corto (el precio ya está a la vista); el nombre accesible lleva la pregunta completa. */
const SHORT_QUESTIONS: Readonly<Record<Source, string>> = { community: '¿Sigue así?', reference: '¿Es este?' }
const FULL_QUESTIONS = {
  community: (price) => `¿Sigue en $${formatPriceValue(price)}?`,
  reference: () => '¿Es este el precio?',
} as const satisfies Record<Source, (price: number) => string>

const ICON_SIZE = 16

/** "¿Sigue así? ✓ ✕" (comunitario) o "¿Es este? ✓ ✕" (oficial); respondida, "✓ ¡Gracias!". */
export function PriceCheckPrompt({ check, answered, pending, onYes, onNo }: PriceCheckPromptProps) {
  if (answered) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-fuel-500">
        <Check size={ICON_SIZE} aria-hidden />
        {THANKS}
      </span>
    )
  }
  return (
    <div role="group" aria-label={FULL_QUESTIONS[check.source](check.price)} className="flex shrink-0 items-center gap-1.5">
      <span className="text-xs text-gray-400" aria-hidden>{SHORT_QUESTIONS[check.source]}</span>
      <ActionButton label="Sí" tone="positive" disabled={pending} onClick={onYes}>
        <Check size={ICON_SIZE} aria-hidden />
      </ActionButton>
      <ActionButton label="No" tone="neutral" disabled={pending} onClick={onNo}>
        <X size={ICON_SIZE} aria-hidden />
      </ActionButton>
    </div>
  )
}
