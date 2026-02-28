/**
 * useGeolocation
 *
 * Tracks the user's real-time GPS position using `watchPosition`.
 * Calls `onFirstFix` once with the initial coords so the map can fly there.
 */

import { useState, useEffect, useRef } from 'react'

export function useGeolocation({ onFirstFix } = {}) {
  const [position, setPosition]   = useState(null) // { lat, lng, accuracy }
  const [error, setError]         = useState(null)
  const hasFiredFirstFix          = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        setPosition(coords)

        if (!hasFiredFirstFix.current) {
          hasFiredFirstFix.current = true
          onFirstFix?.(coords)
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [onFirstFix])

  return { position, error }
}
