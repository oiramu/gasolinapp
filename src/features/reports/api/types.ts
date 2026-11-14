export interface PriceReport {
  readonly stationId: string
  /** Precio por combustible tal como lo escribió el usuario: `{ extra: '18900', gnv: 2850 }`. */
  readonly fuels: Readonly<Record<string, string | number>>
  readonly comment: string
  readonly userDisplayName?: string
}

export interface ReportsRepository {
  submitPriceReport(report: PriceReport): Promise<void>
}
