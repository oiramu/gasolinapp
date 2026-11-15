import { describe, expect, it } from 'vitest'
import { applyVote, toTally, toVoteValue, VOTE_DOWN, VOTE_UP, type VoteOutcome, type VoteValue } from './votes'

const outcome = (votesUp: number, votesDown: number, myVote: VoteOutcome['myVote'] = null): VoteOutcome => ({ votesUp, votesDown, myVote })

describe('applyVote (mismas reglas que cast_vote)', () => {
  it.each<{ name: string; current: VoteOutcome; value: VoteValue; expected: VoteOutcome }>([
    { name: 'sin voto, +1', current: outcome(5, 1), value: VOTE_UP, expected: outcome(6, 1, VOTE_UP) },
    { name: 'sin voto, -1', current: outcome(5, 1), value: VOTE_DOWN, expected: outcome(5, 2, VOTE_DOWN) },
    { name: '+1 otra vez quita el voto', current: outcome(6, 1, VOTE_UP), value: VOTE_UP, expected: outcome(5, 1) },
    { name: 'de +1 a -1 ajusta ambos', current: outcome(6, 1, VOTE_UP), value: VOTE_DOWN, expected: outcome(5, 2, VOTE_DOWN) },
    { name: 'de -1 a +1 ajusta ambos', current: outcome(5, 2, VOTE_DOWN), value: VOTE_UP, expected: outcome(6, 1, VOTE_UP) },
  ])('$name', ({ current, value, expected }) => {
    expect(applyVote(current, value)).toEqual(expected)
  })
})

describe('adaptadores', () => {
  it('toTally convierte null en 0', () => {
    expect(toTally({ votes_up: 3, votes_down: null })).toEqual({ votesUp: 3, votesDown: 0 })
    expect(toTally({ votes_up: null, votes_down: 2 })).toEqual({ votesUp: 0, votesDown: 2 })
  })

  it('toVoteValue solo acepta +1 y -1', () => {
    expect([1, -1, 0, 2, null].map(toVoteValue)).toEqual([1, -1, null, null, null])
  })
})
