/** Etiqueta e ícono por tipo de reporte. Las claves coinciden con `reports.type`. */
export const REPORT_TYPE_LABELS = {
  price: { label: 'Precio', icon: '💰' },
  promotion: { label: 'Promoción', icon: '🏷️' },
  warning: { label: 'Aviso', icon: '⚠️' },
  correction: { label: 'Corrección', icon: '✏️' },
  comment: { label: 'Comentario', icon: '💬' },
} as const

export type ReportType = keyof typeof REPORT_TYPE_LABELS

/** Largo máximo de un comentario. `add_report` y `report_price` lo validan (pgTAP 003, generado desde aquí). */
export const REPORT_CONTENT_MAX_LENGTH = 280
