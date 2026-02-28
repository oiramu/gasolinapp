/**
 * useZonesData
 *
 * React hook that fetches zone-level price averages.
 * Used at low map zoom levels to render cluster markers.
 */

import { useState, useEffect, useCallback } from 'react'
import { fetchZoneAverages } from '@/services/zones.service'
import { MOCK_ZONES } from '@/lib/mockData'
import { env } from '@/config/env'

export function useZonesData() {
  const [zones, setZones]   = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)

    if (env.useMockData) {
      await new Promise(r => setTimeout(r, 200))
      setZones(MOCK_ZONES)
      setLoading(false)
      return
    }

    const { data } = await fetchZoneAverages()
    setZones(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { zones, loading, refresh }
}
