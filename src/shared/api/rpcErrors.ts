// Códigos que lanzan las RPC (RAISE EXCEPTION '<CÓDIGO>') y su mensaje para el usuario.

const RPC_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'No hay sesión en este dispositivo. Recarga la página e intenta de nuevo.',
  RATE_LIMIT: 'Vas muy rápido. Espera un rato antes de volver a reportar.',
  STATION_NOT_FOUND: 'Esta estación ya no está disponible.',
  INVALID_FUEL: 'Ese combustible no es válido.',
  OUT_OF_RANGE: 'Ese precio está fuera del rango permitido. Revísalo.',
  INVALID_COMMENT: 'El comentario puede tener hasta 280 caracteres.',
  INVALID_CONTENT: 'El comentario debe tener entre 1 y 280 caracteres.',
  INVALID_TYPE: 'Ese tipo de reporte no es válido.',
  INVALID_SERVICES: 'Esos servicios no son válidos.',
  TARGET_NOT_FOUND: 'Ese reporte ya no está disponible.',
} as const satisfies Record<string, string>

type RpcErrorCode = keyof typeof RPC_ERROR_MESSAGES

const isRpcErrorCode = (message: string): message is RpcErrorCode => Object.hasOwn(RPC_ERROR_MESSAGES, message)

/** Mensaje en español para un error de una RPC; los demás errores usan `fallback`. */
export function toUserMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  return isRpcErrorCode(message) ? RPC_ERROR_MESSAGES[message] : fallback
}
