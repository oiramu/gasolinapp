/**
 * @deprecated
 * This file has been split into:
 *   - src/services/stations.service.js  (fetchStations, subscribeToStationUpdates)
 *   - src/services/reports.service.js   (submitPriceReport, voteOnReport)
 *   - src/hooks/useStationsData.js      (useStations hook)
 *   - src/hooks/useZonesData.js         (useZones hook)
 *
 * Re-exported here only for backwards compatibility during migration.
 * Delete this file once all imports have been updated.
 */

export { submitPriceReport, voteOnReport } from '@/services/reports.service'
export { useStationsData as useStations } from '@/hooks/useStationsData'
export { useZonesData as useZones } from '@/hooks/useZonesData'
