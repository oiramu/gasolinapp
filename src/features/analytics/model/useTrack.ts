import { useCallback, useEffect } from 'react'
import { useEnsureSession } from '@/features/auth/model/session'
import type { EventName, EventProps } from '../api/types'
import { useAnalyticsRepository } from './analyticsRepository'
import { isAutomatedBrowser } from './automation'

export type Track = (name: EventName, props?: EventProps) => void

const NO_PROPS: EventProps = {}

/**
 * Registra un evento sin bloquear la UI: espera la sesión (el uid anónimo es la única
 * identidad) y descarta los errores, porque una métrica nunca rompe la app. Los navegadores
 * automatizados no se miden. Estable entre renders.
 */
export function useTrack(): Track {
  const repository = useAnalyticsRepository()
  const ensureSession = useEnsureSession()
  return useCallback<Track>(
    (name, props = NO_PROPS) => {
      if (isAutomatedBrowser(navigator)) return
      void ensureSession()
        .then(() => repository.track({ name, props }))
        .catch(() => undefined)
    },
    [ensureSession, repository],
  )
}

/** `app_open`, una vez al montar la app. */
export function useTrackAppOpen(): void {
  const track = useTrack()
  useEffect(() => {
    track('app_open')
  }, [track])
}

/** De dónde llegó la persona a la estación: un enlace compartido, el mapa o la búsqueda. */
export type StationOpenSource = 'link' | 'map' | 'search'

/** `station_open` cada vez que se abre el panel de otra estación, con su origen. */
export function useTrackStationOpen(stationId: string | null, source: StationOpenSource): void {
  const track = useTrack()
  useEffect(() => {
    if (stationId !== null) track('station_open', { station_id: stationId, source })
  }, [track, stationId, source])
}
