import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queryKeys'
import { useStationsRepository } from './stationsRepository'

export function useStationsQuery() {
  const repository = useStationsRepository()
  return useQuery({ queryKey: queryKeys.stations, queryFn: () => repository.list() })
}
