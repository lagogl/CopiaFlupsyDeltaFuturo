/**
 * Fix per l'errore di eliminazione dei FLUPSY
 * 
 * Corregge il problema con la clausola IN quando si eliminano le operazioni associate ai cestelli
 * in un FLUPSY.
 */

// Importa il modulo da correggere
import { and, eq, isNull, desc, gte, lte, sql, inArray, or } from 'drizzle-orm';
import { db } from './server/db';
import { 
  flupsys, baskets, operations, basketPositionHistory,
  screeningSourceBaskets, screeningDestinationBaskets, screeningBasketHistory
} from './shared/schema';

/**
 * Sostituire il metodo deleteFlupsy in server/db-storage.ts con questo metodo corretto:
 */

/*
  async deleteFlupsy(id: number): Promise<{ success: boolean; message: string }> {
    console.log(`deleteFlupsy - Tentativo di eliminazione FLUPSY ID: ${id}`);
    
    // 1. Verifica se il FLUPSY esiste
    const flupsy = await this.getFlupsy(id);
    if (!flupsy) {
      return { success: false, message: "FLUPSY non trovato" };
    }
    
    // 2. Recupera tutte le ceste associate a questo FLUPSY
    const flupsyBaskets = await this.getBasketsByFlupsy(id);
    console.log(`deleteFlupsy - Trovate ${flupsyBaskets.length} ceste associate al FLUPSY ID: ${id}`);
    
    // 3. Verifica se qualche cesta ha un ciclo attivo
    const basketsWithActiveCycles = flupsyBaskets.filter(basket => 
      basket.currentCycleId !== null || basket.state === 'active'
    );
    
    if (basketsWithActiveCycles.length > 0) {
      const basketNumbers = basketsWithActiveCycles.map(b => b.physicalNumber).join(', ');
      return { 
        success: false,
        message: `Impossibile eliminare il FLUPSY. Le seguenti ceste hanno cicli attivi: ${basketNumbers}. Terminare prima i cicli attivi.` 
      };
    }
    
    try {
      // 4. Utilizziamo una transazione per eseguire l'eliminazione in modo consistente
      await db.transaction(async (tx) => {
        // Estrai tutti gli ID delle ceste
        const basketIds = flupsyBaskets.map(basket => basket.id);
        
        if (basketIds.length > 0) {
          // 4.1 Eliminazione di tutte le operazioni associate alle ceste
          // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
          console.log(`deleteFlupsy - Eliminazione operazioni per ${basketIds.length} ceste`);
          await tx
            .delete(operations)
            .where(inArray(operations.basketId, basketIds))
          
          // 4.2 Eliminazione della cronologia delle posizioni
          // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
          console.log(`deleteFlupsy - Eliminazione cronologia posizioni per ${basketIds.length} ceste`);
          await tx
            .delete(basketPositionHistory)
            .where(inArray(basketPositionHistory.basketId, basketIds))
          
          // 4.3 Controlla e pulisci eventuali riferimenti nelle tabelle di screening
          try {
            // Per la tabella screeningSourceBaskets
            // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningSourceBaskets)
              .where(inArray(screeningSourceBaskets.basketId, basketIds))
            
            // Per la tabella screeningDestinationBaskets
            // FIX: Utilizziamo inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningDestinationBaskets)
              .where(inArray(screeningDestinationBaskets.basketId, basketIds))
              
            // Per la tabella screeningBasketHistory
            // FIX: Utilizziamo or e inArray invece di sql template con join per la clausola IN
            await tx
              .delete(screeningBasketHistory)
              .where(
                or(
                  inArray(screeningBasketHistory.sourceBasketId, basketIds),
                  inArray(screeningBasketHistory.destinationBasketId, basketIds)
                )
              )
          } catch (error) {
            console.error("Errore durante pulizia tabelle di screening:", error);
            // Continuiamo con la cancellazione anche se questa parte fallisce
          }
        }
        
        // 4.4 Eliminazione di tutte le ceste
        console.log(`deleteFlupsy - Eliminazione ${basketIds.length} ceste del FLUPSY ${id}`);
        await tx
          .delete(baskets)
          .where(eq(baskets.flupsyId, id))
        
        // 4.5 Infine, elimina il FLUPSY stesso
        console.log(`deleteFlupsy - Eliminazione FLUPSY ${id}`);
        await tx
          .delete(flupsys)
          .where(eq(flupsys.id, id))
      });
      
      // Se arriviamo qui, la transazione è stata completata con successo
      // Notifica WebSocket per l'eliminazione riuscita
      if (typeof (global as any).broadcastUpdate === 'function') {
        console.log(`deleteFlupsy - Invio notifica WebSocket per eliminazione FLUPSY ${id}`);
        (global as any).broadcastUpdate('flupsy_deleted', {
          flupsyId: id,
          message: `FLUPSY ${flupsy.name} eliminato con ${flupsyBaskets.length} ceste associate`
        });
      }
      
      return { 
        success: true,
        message: `FLUPSY ${flupsy.name} eliminato con successo insieme a ${flupsyBaskets.length} ceste associate e tutti i relativi dati` 
      };
      
    } catch (error) {
      console.error(`deleteFlupsy - Errore durante l'eliminazione del FLUPSY ID: ${id}:`, error);
      return { 
        success: false, 
        message: `Errore durante l'eliminazione: ${(error as Error).message}` 
      };
    }
  }
*/

/**
 * Guida all'implementazione:
 * 
 * 1. Apri il file server/db-storage.ts
 * 2. Cerca il metodo deleteFlupsy
 * 3. Sostituisci la vecchia implementazione con quella sopra riportata
 * 4. Assicurati di importare inArray e or da drizzle-orm
 * 
 * Questo risolverà l'errore relativo all'input syntax per il tipo integer che si verifica quando
 * si tenta di eliminare un FLUPSY. Il problema era nell'utilizzo di basketIds.join(',') all'interno
 * della clausola IN SQL, che causava l'invio di una stringa invece di un array di valori.
 */