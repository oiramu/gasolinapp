/**
 * Feature flags.
 *
 * Toggles for capabilities that are temporarily disabled while their
 * backend counterpart is being built. Keep each flag tied to a roadmap task.
 */

export const features = {
  /** Users suggesting station services. Off until RPC `suggest_station_services` (task 1.3). */
  serviceSuggestions: false,
}
