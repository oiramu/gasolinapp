/**
 * Claves de caché de TanStack Query. Viven en un solo lugar para que una mutación
 * de un feature pueda invalidar datos de otro sin importarlo.
 */
export const queryKeys = {
  session: ['auth', 'session'] as const,
  stations: ['stations'] as const,
  zoneAverages: ['zones', 'averages'] as const,
  priceHistory: (stationId: string | null, fuelType: string | null, days: number) => ['prices', 'history', stationId, fuelType, days] as const,
  referencePrice: (stationId: string | null, fuelType: string | null) => ['prices', 'reference', stationId, fuelType] as const,
  myVotesAll: ['votes', 'mine'] as const,
  myVotes: (userId: string | null, targetType: string, targetIds: readonly string[]) => ['votes', 'mine', userId, targetType, ...targetIds] as const,
}
