// Implementazione di query ottimizzate con paginazione per una migliore performance
// Questo file contiene helper per le query che utilizzano gli endpoint ottimizzati

import { queryClient } from './queryClient';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  filters?: Record<string, any>;
}

/**
 * Recupera dati paginati utilizzando l'endpoint ottimizzato per le operazioni
 * @param options Opzioni di paginazione e filtri
 * @returns Promise con i dati paginati
 */
export async function fetchPaginatedOperations(options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20, filters = {} } = options;
  
  // Costruisci i parametri della query
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value.toString();
      }
      return acc;
    }, {} as Record<string, string>)
  });
  
  // Esegui la query ottimizzata
  return fetch(`/api/operations-optimized?${params.toString()}`)
    .then(res => {
      if (!res.ok) throw new Error('Errore nel recupero delle operazioni');
      return res.json();
    });
}

/**
 * Recupera dati paginati utilizzando l'endpoint ottimizzato per i cestelli
 * @param options Opzioni di paginazione e filtri
 * @returns Promise con i dati paginati
 */
export async function fetchPaginatedBaskets(options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20, filters = {} } = options;
  
  // Costruisci i parametri della query
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value.toString();
      }
      return acc;
    }, {} as Record<string, string>)
  });
  
  // Esegui la query ottimizzata
  return fetch(`/api/baskets-optimized?${params.toString()}`)
    .then(res => {
      if (!res.ok) throw new Error('Errore nel recupero dei cestelli');
      return res.json();
    });
}

/**
 * Recupera dati paginati utilizzando l'endpoint ottimizzato per i cicli
 * @param options Opzioni di paginazione e filtri
 * @returns Promise con i dati paginati
 */
export async function fetchPaginatedCycles(options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20, filters = {} } = options;
  
  // Costruisci i parametri della query
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value.toString();
      }
      return acc;
    }, {} as Record<string, string>)
  });
  
  // Esegui la query ottimizzata
  return fetch(`/api/cycles-optimized?${params.toString()}`)
    .then(res => {
      if (!res.ok) throw new Error('Errore nel recupero dei cicli');
      return res.json();
    });
}

/**
 * Recupera dati paginati utilizzando l'endpoint ottimizzato per i lotti
 * @param options Opzioni di paginazione e filtri
 * @returns Promise con i dati paginati
 */
export async function fetchPaginatedLots(options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20, filters = {} } = options;
  
  // Costruisci i parametri della query
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value.toString();
      }
      return acc;
    }, {} as Record<string, string>)
  });
  
  // Esegui la query ottimizzata
  return fetch(`/api/lots-optimized?${params.toString()}`)
    .then(res => {
      if (!res.ok) throw new Error('Errore nel recupero dei lotti');
      return res.json();
    });
}

/**
 * Recupera i dati per la dashboard utilizzando l'endpoint ottimizzato
 * @returns Promise con i dati della dashboard
 */
export async function fetchDashboardData() {
  return fetch('/api/dashboard-data')
    .then(res => {
      if (!res.ok) throw new Error('Errore nel recupero dei dati dashboard');
      return res.json();
    });
}

/**
 * Prefetch dei dati comuni utilizzati in tutta l'applicazione
 * Da chiamare quando l'utente è autenticato per precaricare i dati essenziali
 */
export function prefetchCommonData() {
  // Prefetch delle informazioni essenziali
  queryClient.prefetchQuery({ 
    queryKey: ['/api/dashboard-data'],
    queryFn: fetchDashboardData
  });
  
  // Prefetch della prima pagina delle entità principali
  queryClient.prefetchQuery({ 
    queryKey: ['/api/operations-optimized', { page: 1, pageSize: 20 }],
    queryFn: () => fetchPaginatedOperations()
  });
  
  // Prefetch di FLUPSY e taglie che sono dataset piccoli e utili ovunque
  queryClient.prefetchQuery({ queryKey: ['/api/flupsys'] });
  queryClient.prefetchQuery({ queryKey: ['/api/sizes'] });
}