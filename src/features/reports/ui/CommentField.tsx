import { MessageSquare } from 'lucide-react'
import { REPORT_CONTENT_MAX_LENGTH } from '@/shared/domain/reports'

const ICON_SIZE = 10
const ROWS = 3

export interface CommentFieldProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function CommentField({ value, onChange }: CommentFieldProps) {
  return (
    <div>
      <label htmlFor="report-comment" className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-1.5">
        <MessageSquare size={ICON_SIZE} />
        Comentario / Promoción
        <span className="ml-auto normal-case">{value.length}/{REPORT_CONTENT_MAX_LENGTH}</span>
      </label>
      <textarea
        id="report-comment"
        value={value}
        maxLength={REPORT_CONTENT_MAX_LENGTH}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder="Ej: descuento con Nequi, solo efectivo hoy, cola larga…"
        rows={ROWS}
        className="w-full bg-surface-muted/30 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-fuel-500/40 transition-colors font-body resize-none"
      />
    </div>
  )
}
