/** Latencia simulada de los repositorios mock, para que la UI muestre sus estados de carga. */
export const MOCK_LATENCY_MS = 300

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
