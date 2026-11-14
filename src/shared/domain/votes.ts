/** Lo que se puede votar: un reporte de la comunidad o un precio (tabla `votes.target_type`). */
export type VoteTargetType = 'report' | 'price'

/** +1 = útil / correcto, -1 = incorrecto (CHECK `votes.value IN (-1, 1)`). */
export type VoteValue = 1 | -1

export const VOTE_UP = 1 satisfies VoteValue
export const VOTE_DOWN = -1 satisfies VoteValue

export interface VoteTarget {
  readonly targetType: VoteTargetType
  readonly targetId: string
}

export interface VoteTally {
  readonly votesUp: number
  readonly votesDown: number
}

export interface VoteOutcome extends VoteTally {
  readonly myVote: VoteValue | null
}

/** Contadores tal como vienen en las filas de `reports` y `fuel_prices`. */
export interface VoteCounts {
  readonly votes_up: number | null
  readonly votes_down: number | null
}

export const EMPTY_TALLY: VoteTally = { votesUp: 0, votesDown: 0 }

export const toTally = ({ votes_up, votes_down }: VoteCounts): VoteTally => ({ votesUp: votes_up ?? 0, votesDown: votes_down ?? 0 })

/** Valor de la DB a voto; cualquier otra cosa (incluido null) es "sin voto". */
export const toVoteValue = (value: number | null): VoteValue | null => (value === VOTE_UP || value === VOTE_DOWN ? value : null)

const counterOf = (vote: VoteValue): keyof VoteTally => (vote === VOTE_UP ? 'votesUp' : 'votesDown')

const shift = (tally: VoteTally, vote: VoteValue | null, delta: number): VoteTally => {
  if (vote === null) return tally
  const counter = counterOf(vote)
  return { ...tally, [counter]: tally[counter] + delta }
}

/**
 * Predicción local de `cast_vote` para la UI optimista: el mismo voto lo quita (toggle)
 * y otro valor lo cambia. La respuesta del servidor siempre reemplaza esta predicción.
 */
export function applyVote(current: VoteOutcome, value: VoteValue): VoteOutcome {
  const myVote = current.myVote === value ? null : value
  return { ...shift(shift(current, current.myVote, -1), myVote, 1), myVote }
}
