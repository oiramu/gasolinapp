import { useHasSession } from '@/features/auth/model/session'
import { toUserMessage } from '@/shared/api/rpcErrors'
import { toTally, type VoteCounts, type VoteValue } from '@/shared/domain/votes'
import { useCastVote } from '../model/useCastVote'
import { useMyVotes } from '../model/useMyVotes'
import { VoteButtons } from './VoteButtons'

export interface ReportVotesProps {
  readonly report: VoteCounts & { readonly id: string }
  /** Ids de todos los reportes visibles: mis votos se piden una sola vez para la lista. */
  readonly reportIds: readonly string[]
  readonly onError: (message: string) => void
}

const VOTE_FAILED = 'No se pudo registrar el voto. Intenta de nuevo.'

/** Contenedor: conecta los botones con mi voto, la sesión y la mutación optimista. */
export function ReportVotes({ report, reportIds, onError }: ReportVotesProps) {
  const myVote = useMyVotes('report', reportIds)[report.id] ?? null
  const hasSession = useHasSession()
  const { mutate, isPending } = useCastVote()

  const tally = toTally(report)

  const vote = (value: VoteValue) => {
    mutate({ targetType: 'report', targetId: report.id, value, current: { ...tally, myVote } }, {
      onError: (error) => {
        onError(toUserMessage(error, VOTE_FAILED))
      },
    })
  }

  return <VoteButtons votesUp={tally.votesUp} myVote={myVote} disabled={!hasSession || isPending} onVote={vote} />
}
