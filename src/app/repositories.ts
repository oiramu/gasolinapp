import { createMockAuthRepository } from '@/features/auth/api/mockAuthRepository'
import { createSupabaseAuthRepository } from '@/features/auth/api/supabaseAuthRepository'
import type { AuthRepository } from '@/features/auth/api/types'
import { createMockPricesRepository } from '@/features/prices/api/mockPricesRepository'
import { createSupabasePricesRepository } from '@/features/prices/api/supabasePricesRepository'
import type { PricesRepository } from '@/features/prices/api/types'
import { createMockReportsRepository } from '@/features/reports/api/mockReportsRepository'
import { createSupabaseReportsRepository } from '@/features/reports/api/supabaseReportsRepository'
import type { ReportsRepository } from '@/features/reports/api/types'
import { MOCK_STATIONS } from '@/features/stations/api/mockStations'
import { createMockStationsRepository } from '@/features/stations/api/mockStationsRepository'
import { createSupabaseStationsRepository } from '@/features/stations/api/supabaseStationsRepository'
import type { StationsRepository } from '@/features/stations/api/types'
import { createMockZonesRepository, MOCK_ZONES } from '@/features/zones/api/mockZonesRepository'
import { createSupabaseZonesRepository } from '@/features/zones/api/supabaseZonesRepository'
import type { ZonesRepository } from '@/features/zones/api/types'
import { createSupabaseClient, type AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { AppEnv } from '@/shared/config/env'
import { MOCK_LATENCY_MS } from '@/shared/lib/delay'

export interface Repositories {
  readonly auth: AuthRepository
  readonly stations: StationsRepository
  readonly zones: ZonesRepository
  readonly prices: PricesRepository
  readonly reports: ReportsRepository
}

export function createMockRepositories(latencyMs = MOCK_LATENCY_MS): Repositories {
  return {
    auth: createMockAuthRepository(),
    stations: createMockStationsRepository(MOCK_STATIONS, latencyMs),
    zones: createMockZonesRepository(MOCK_ZONES, latencyMs),
    prices: createMockPricesRepository(latencyMs),
    reports: createMockReportsRepository(latencyMs),
  }
}

export function createSupabaseRepositories(client: AppSupabaseClient): Repositories {
  return {
    auth: createSupabaseAuthRepository(client),
    stations: createSupabaseStationsRepository(client),
    zones: createSupabaseZonesRepository(client),
    prices: createSupabasePricesRepository(client),
    reports: createSupabaseReportsRepository(client),
  }
}

/** Strategy: el único lugar que decide entre Supabase y Mock. */
export function createRepositories(env: AppEnv): Repositories {
  return env.dataSource === 'mock' ? createMockRepositories() : createSupabaseRepositories(createSupabaseClient(env.supabase))
}
