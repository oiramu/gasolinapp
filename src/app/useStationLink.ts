import { useEffect, useRef } from 'react'
import type { FuelType } from '@/shared/domain/fuel'
import { readStationLink, writeStationLink } from './stationLink'

interface LinkableStation {
  readonly id: string
}

export interface StationLinkOptions<S extends LinkableStation> {
  readonly stations: readonly S[]
  /** Las estaciones ya cargaron: recién ahí se sabe si el id del enlace existe. */
  readonly ready: boolean
  /** La estación con el panel abierto, o null. */
  readonly openStationId: string | null
  readonly fuelType: FuelType
  readonly onOpen: (station: S, fuelType: FuelType | null) => void
}

/**
 * 3.2: al cargar, abre la estación del enlace (un id que no existe deja el mapa normal) y, desde
 * entonces, mantiene la URL al día con la estación abierta y su combustible. Usa `replaceState`:
 * abrir y cerrar estaciones no llena el historial del navegador.
 */
export function useStationLink<S extends LinkableStation>({ stations, ready, openStationId, fuelType, onOpen }: StationLinkOptions<S>): void {
  const resolved = useRef(false)

  useEffect(() => {
    if (!ready || resolved.current) return
    resolved.current = true
    const link = readStationLink(window.location.search)
    const station = link && stations.find((candidate) => candidate.id === link.stationId)
    if (station) onOpen(station, link.fuelType)
  }, [ready, stations, onOpen])

  useEffect(() => {
    if (!resolved.current) return
    const { pathname, search, hash } = window.location
    const next = writeStationLink(search, openStationId ? { stationId: openStationId, fuelType } : null)
    if (next !== search) window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`)
  }, [ready, openStationId, fuelType])
}
