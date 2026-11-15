import { formatPriceValue } from '@/shared/domain/format'
import { cn } from '@/shared/lib/cn'
import { THANKS, type PriceCheck } from '../model/usePriceCheck'

export interface PriceCheckPromptProps {
  readonly check: PriceCheck
  readonly answered: boolean
  readonly pending: boolean
  readonly onYes: () => void
  readonly onNo: () => void
}

const QUESTIONS = {
  community: (price) => `¿Sigue en $${formatPriceValue(price)}?`,
  reference: () => '¿Es este el precio?',
} as const satisfies Record<PriceCheck['source'], (price: number) => string>

const BUTTON = 'px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors disabled:opacity-40'

/** "¿Sigue en $15.900? Sí / No" (comunitario) o "¿Es este el precio? Sí / No" (oficial). */
export function PriceCheckPrompt({ check, answered, pending, onYes, onNo }: PriceCheckPromptProps) {
  if (answered) return <span className="mt-1 text-[10px] font-mono text-emerald-400">✓ {THANKS}</span>
  const question = QUESTIONS[check.source](check.price)
  return (
    <div role="group" aria-label={question} className="mt-1 flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 flex-1">{question}</span>
      <button type="button" disabled={pending} onClick={onYes} className={cn(BUTTON, 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25')}>
        Sí
      </button>
      <button type="button" disabled={pending} onClick={onNo} className={cn(BUTTON, 'bg-white/5 text-gray-300 hover:bg-white/10')}>
        No
      </button>
    </div>
  )
}
