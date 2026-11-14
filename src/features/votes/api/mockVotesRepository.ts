import { applyVote, EMPTY_TALLY, type VoteOutcome, type VoteTally, type VoteTarget } from '@/shared/domain/votes'
import { delay, MOCK_LATENCY_MS } from '@/shared/lib/delay'
import type { VotesRepository } from './types'

const keyOf = ({ targetType, targetId }: VoteTarget) => `${targetType}:${targetId}`

/**
 * Modo mock: los votos viven en memoria con las mismas reglas que `cast_vote`.
 * `initialTally` da los contadores de partida de cada objetivo (los de los datos mock).
 */
export function createMockVotesRepository(
  initialTally: (target: VoteTarget) => VoteTally = () => EMPTY_TALLY,
  latencyMs = MOCK_LATENCY_MS,
): VotesRepository {
  const outcomes = new Map<string, VoteOutcome>()
  const current = (target: VoteTarget): VoteOutcome => outcomes.get(keyOf(target)) ?? { ...initialTally(target), myVote: null }

  return {
    async cast(command) {
      await delay(latencyMs)
      const next = applyVote(current(command), command.value)
      outcomes.set(keyOf(command), next)
      return next
    },

    async listMine(targetType, targetIds) {
      await delay(latencyMs)
      return Object.fromEntries(targetIds.map((targetId) => [targetId, current({ targetType, targetId }).myVote]))
    },
  }
}
