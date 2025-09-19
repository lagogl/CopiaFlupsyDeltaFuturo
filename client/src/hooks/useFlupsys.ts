import { useQuery } from '@tanstack/react-query';
import type { Flupsy } from '@shared/schema';

/**
 * Hook centralizzato per le query FLUPSY
 * Evita chiamate duplicate e ottimizza le performance
 */
export function useFlupsys() {
  return useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
    staleTime: 1800000, // 30 minuti - riduce refetch automatici
    gcTime: 3600000, // 1 ora (React Query v5: gcTime invece di cacheTime)
    refetchOnWindowFocus: false, // Evita refetch inutili
  });
}

/**
 * Hook per singolo FLUPSY
 */
export function useFlupsy(flupsyId?: number) {
  return useQuery<Flupsy>({
    queryKey: ['/api/flupsys', flupsyId],
    enabled: !!flupsyId,
    staleTime: 1800000,
    gcTime: 3600000,
    refetchOnWindowFocus: false,
  });
}