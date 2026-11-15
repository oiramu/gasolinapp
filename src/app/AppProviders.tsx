import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthRepositoryProvider } from '@/features/auth/model/authRepository'
import { PricesRepositoryProvider } from '@/features/prices/model/pricesRepository'
import { ReportsRepositoryProvider } from '@/features/reports/model/reportsRepository'
import { StationsRepositoryProvider } from '@/features/stations/model/stationsRepository'
import { VotesRepositoryProvider } from '@/features/votes/model/votesRepository'
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
      <AuthRepositoryProvider value={repositories.auth}>
        <StationsRepositoryProvider value={repositories.stations}>
          <ZonesRepositoryProvider value={repositories.zones}>
            <PricesRepositoryProvider value={repositories.prices}>
              <ReportsRepositoryProvider value={repositories.reports}>
                <VotesRepositoryProvider value={repositories.votes}>{children}</VotesRepositoryProvider>
              </ReportsRepositoryProvider>
            </PricesRepositoryProvider>
          </ZonesRepositoryProvider>
        </StationsRepositoryProvider>
      </AuthRepositoryProvider>
    </QueryClientProvider>
  )
}
