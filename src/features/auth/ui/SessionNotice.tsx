import { AlertTriangle } from 'lucide-react'
import { useSessionFailure, type SessionFailure } from '../model/session'

const ICON_SIZE = 16

/** Aviso fijo bajo la barra superior: la app se sigue viendo, solo se avisa que no se puede aportar aún. */
export function SessionNoticeView({ message, retrying, retry }: SessionFailure) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-16 z-[900] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-amber-400/30 bg-surface-card px-4 py-3 shadow-lg"
    >
      <AlertTriangle size={ICON_SIZE} className="shrink-0 text-amber-400" aria-hidden />
      <p className="flex-1 text-xs leading-snug text-gray-300">{message}</p>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="h-9 shrink-0 rounded-lg bg-white/5 px-3 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 disabled:opacity-40"
      >
        {retrying ? 'Verificando…' : 'Reintentar'}
      </button>
    </div>
  )
}

/** Contenedor: solo aparece si el alta anónima falló (captcha bloqueado o sin red). */
export function SessionNotice() {
  const failure = useSessionFailure()
  return failure ? <SessionNoticeView {...failure} /> : null
}
