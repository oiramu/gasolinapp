/**
 * useStationsData
 *
 * React hook that owns the stations data lifecycle:
 * - Fetches all active stations on mount
 * - Subscribes to realtime updates (fuel_prices, reports)
 * - Exposes loading / error state
 *
 * Consumers don't need to know anything about Supabase or realtime.
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchStations, subscribeToStationUpdates } from '@/services/stations.service'
import { MOCK_STATIONS } from '@/lib/mockData'
import { env } from '@/config/env'

export function useStationsData() {
  const [stations, setStations] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (env.useMockData) {
      await new Promise(r => setTimeout(r, 300))
      setStations(MOCK_STATIONS)
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await fetchStations()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setStations(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    if (env.useMockData) return

    // Keep data fresh via realtime subscription
    const channel = subscribeToStationUpdates(refresh)
    return () => channel.unsubscribe()
  }, [refresh])

  return { stations, loading, error, refresh }
}
