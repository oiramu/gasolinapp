import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PricesRepositoryProvider } from '@/features/prices/model/pricesRepository'
import { ReportsRepositoryProvider } from '@/features/reports/model/reportsRepository'
import { StationsRepositoryProvider } from '@/features/stations/model/stationsRepository'
import { ZonesRepositoryProvider } from '@/features/zones/model/zonesRepository'
import type { Repositories } from './repositories'

interface AppProvidersProps {
  readonly repositories: Repositories
  readonly queryClient: QueryClient
  readonly children: ReactNode
}

/** Inyecta la caché del servidor y los repositorios elegidos para este entorno. */
export function AppProviders({ repositories, queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <StationsRepositoryProvider value={repositories.stations}>
        <ZonesRepositoryProvider value={repositories.zones}>
          <PricesRepositoryProvider value={repositories.prices}>
            <ReportsRepositoryProvider value={repositories.reports}>{children}</ReportsRepositoryProvider>
          </PricesRepositoryProvider>
        </ZonesRepositoryProvider>
      </StationsRepositoryProvider>
    </QueryClientProvider>
  )
}
