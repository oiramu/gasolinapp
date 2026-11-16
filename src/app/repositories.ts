import { createMockAnalyticsRepository } from '@/features/analytics/api/mockAnalyticsRepository'
import { createSupabaseAnalyticsRepository } from '@/features/analytics/api/supabaseAnalyticsRepository'
import type { AnalyticsRepository } from '@/features/analytics/api/types'
import type { CaptchaProvider } from '@/features/auth/api/captcha'
import { createMockAuthRepository } from '@/features/auth/api/mockAuthRepository'
import { createSupabaseAuthRepository } from '@/features/auth/api/supabaseAuthRepository'
import { createTurnstileCaptcha, createTurnstileLoader } from '@/features/auth/api/turnstileCaptcha'
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
import { findTally } from '@/features/stations/model/stationsCache'
import { createMockVotesRepository } from '@/features/votes/api/mockVotesRepository'
import { createSupabaseVotesRepository } from '@/features/votes/api/supabaseVotesRepository'
import type { VotesRepository } from '@/features/votes/api/types'
import { createMockZonesRepository, MOCK_ZONES } from '@/features/zones/api/mockZonesRepository'
import { createSupabaseZonesRepository } from '@/features/zones/api/supabaseZonesRepository'
import type { ZonesRepository } from '@/features/zones/api/types'
import { createSupabaseClient, type AppSupabaseClient } from '@/shared/api/supabaseClient'
import type { AppEnv } from '@/shared/config/env'
import { EMPTY_TALLY } from '@/shared/domain/votes'
import { MOCK_LATENCY_MS } from '@/shared/lib/delay'

export interface Repositories {
  readonly auth: AuthRepository
  readonly stations: StationsRepository
  readonly zones: ZonesRepository
  readonly prices: PricesRepository
  readonly reports: ReportsRepository
  readonly votes: VotesRepository
  readonly analytics: AnalyticsRepository
}

export function createMockRepositories(latencyMs = MOCK_LATENCY_MS): Repositories {
  return {
    auth: createMockAuthRepository(),
    stations: createMockStationsRepository(MOCK_STATIONS, latencyMs),
    zones: createMockZonesRepository(MOCK_ZONES, latencyMs),
    prices: createMockPricesRepository(latencyMs),
    reports: createMockReportsRepository(latencyMs),
    votes: createMockVotesRepository((target) => findTally(MOCK_STATIONS, target) ?? EMPTY_TALLY, latencyMs),
    analytics: createMockAnalyticsRepository(),
  }
}

export function createSupabaseRepositories(client: AppSupabaseClient, captcha: CaptchaProvider | null = null): Repositories {
  return {
    auth: createSupabaseAuthRepository(client, captcha),
    stations: createSupabaseStationsRepository(client),
    zones: createSupabaseZonesRepository(client),
    prices: createSupabasePricesRepository(client),
    reports: createSupabaseReportsRepository(client),
    votes: createSupabaseVotesRepository(client),
    analytics: createSupabaseAnalyticsRepository(client),
  }
}

const captchaFor = (siteKey: string | null): CaptchaProvider | null =>
  siteKey ? createTurnstileCaptcha({ siteKey, load: createTurnstileLoader() }) : null

/** Strategy: el único lugar que decide entre Supabase y Mock (y si el alta anónima pide captcha). */
export function createRepositories(env: AppEnv): Repositories {
  if (env.dataSource === 'mock') return createMockRepositories()
  return createSupabaseRepositories(createSupabaseClient(env.supabase), captchaFor(env.captchaSiteKey))
}
