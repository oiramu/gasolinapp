import { useEffect, useState } from 'react'

/** Cada cuánto avanza el reloj de la UI: la frescura cambia en días, no hace falta más. */
export const CLOCK_TICK_MS = 600_000

/** La hora actual (ms), actualizada cada `intervalMs`. Evita llamar Date.now() en cada render. */
export function useNow(intervalMs: number = CLOCK_TICK_MS): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearInterval(timer)
    }
  }, [intervalMs])
  return now
}
