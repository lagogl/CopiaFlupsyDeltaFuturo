/**
 * Script per forzare l'aggiornamento della cache del browser
 * Questo script aggiunge un pulsante di emergenza per invalidare manualmente la cache
 */

// Aggiungi questo codice nella console del browser per forzare l'aggiornamento
function forceCacheRefresh() {
  console.log('🔄 FORZANDO REFRESH CACHE...');
  
  // Accedi al query client globale
  if (window.queryClient) {
    window.queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    window.queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    window.queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
    window.queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    
    // Refetch forzato
    window.queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
    window.queryClient.refetchQueries({ queryKey: ['/api/flupsys'] });
    
    console.log('✅ Cache invalidata e dati ricaricati');
    
    // Ricarica la pagina dopo 1 secondo
    setTimeout(() => {
      console.log('🔄 Ricaricando la pagina...');
      window.location.reload();
    }, 1000);
  } else {
    console.log('❌ QueryClient non trovato, ricarico la pagina');
    window.location.reload();
  }
}

// Rendi la funzione disponibile globalmente
window.forceCacheRefresh = forceCacheRefresh;

console.log('📋 Script caricato. Usa window.forceCacheRefresh() per forzare il refresh della cache');