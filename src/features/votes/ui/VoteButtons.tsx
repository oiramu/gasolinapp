import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { VOTE_DOWN, VOTE_UP, type VoteValue } from '@/shared/domain/votes'
import { cn } from '@/shared/lib/cn'

const ICON_SIZE = 9

const BASE = 'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border transition-all disabled:opacity-40 disabled:cursor-not-allowed'

const STYLES: Record<VoteValue, { readonly active: string; readonly idle: string }> = {
  [VOTE_UP]: { active: 'border-fuel-500/50 text-fuel-500 bg-fuel-500/10', idle: 'border-white/10 text-gray-500 hover:border-fuel-500/40 hover:text-fuel-500' },
  [VOTE_DOWN]: { active: 'border-red-400/50 text-red-400 bg-red-400/10', idle: 'border-white/10 text-gray-500 hover:border-red-400/40 hover:text-red-400' },
}

export interface VoteButtonsProps {
  readonly votesUp: number
  readonly myVote: VoteValue | null
  readonly disabled: boolean
  readonly onVote: (value: VoteValue) => void
}

/** Botones de voto de un reporte: el activo marca mi voto y volver a tocarlo lo quita. */
export function VoteButtons({ votesUp, myVote, disabled, onVote }: VoteButtonsProps) {
  const styleOf = (value: VoteValue) => cn(BASE, myVote === value ? STYLES[value].active : STYLES[value].idle)
  return (
    <div className="flex gap-2 mt-2">
      <button type="button" aria-pressed={myVote === VOTE_UP} disabled={disabled} onClick={() => { onVote(VOTE_UP) }} className={styleOf(VOTE_UP)}>
        <ThumbsUp size={ICON_SIZE} />
        {votesUp}
      </button>
      <button type="button" aria-pressed={myVote === VOTE_DOWN} disabled={disabled} onClick={() => { onVote(VOTE_DOWN) }} className={styleOf(VOTE_DOWN)}>
        <ThumbsDown size={ICON_SIZE} />
        Incorrecto
      </button>
    </div>
  )
}
