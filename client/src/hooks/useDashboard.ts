import { useQuery } from '@tanstack/react-query';
import { dashboardRepository } from '@/repositories/dashboardRepository';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardRepository.summary(),
  });
}
