import type { Database } from '@/shared/api/database.types'

/** Lista cerrada: el enum `event_name` de la migración es la única fuente. */
export type EventName = Database['public']['Enums']['event_name']

/** Datos chicos y sin información personal (ids, combustibles, contadores). El servidor acepta hasta 1 KB. */
export type EventProps = Readonly<Record<string, string | number | boolean>>

export interface TrackedEvent {
  readonly name: EventName
  readonly props: EventProps
}

/** Puerto de eventos de producto. Supabase usa la RPC `track`; el mock no registra nada. */
export interface AnalyticsRepository {
  track(event: TrackedEvent): Promise<void>
}
