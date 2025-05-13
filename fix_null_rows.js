/**
 * Script per correggere i cestelli con fila (row) null nei FLUPSY
 * 
 * Questo script identifica tutti i cestelli che hanno un FLUPSY ID assegnato
 * ma un valore 'row' nullo, e assegna automaticamente un valore 'DX' o 'SX'
 * in base alla disponibilità delle posizioni nel FLUPSY.
 */

// Importa le dipendenze necessarie
import { db } from './server/db.js';
import { baskets, flupsys } from './shared/schema.js';
import { eq, and, isNull, not } from 'drizzle-orm';

/**
 * Funzione principale per la correzione dei cestelli con fila null
 * @returns {Promise<Object>} Un oggetto con i risultati dell'operazione
 */
export async function fixNullRows() {
  try {
    console.log("Inizia la correzione dei cestelli con fila null...");
    
    // Tracciamento dei risultati
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      fixedBaskets: []
    };
    
    // 1. Trova tutti i cestelli che hanno flupsyId ma row nullo
    const basketsWithNullRow = await db.select()
      .from(baskets)
      .where(
        and(
          not(isNull(baskets.flupsyId)),
          isNull(baskets.row)
        )
      );
    
    console.log(`Trovati ${basketsWithNullRow.length} cestelli con fila null`);
    
    if (basketsWithNullRow.length === 0) {
      return {
        success: true,
        message: "Nessun cestello con fila null trovato, tutto ok!",
        details: results
      };
    }
    
    // Processa ogni cestello
    for (const basket of basketsWithNullRow) {
      results.processed++;
      
      // 2. Ottieni informazioni sul FLUPSY associato al cestello
      const flupsy = await db.select()
        .from(flupsys)
        .where(eq(flupsys.id, basket.flupsyId))
        .limit(1);
      
      if (!flupsy || flupsy.length === 0) {
        console.warn(`FLUPSY non trovato per il cestello ID ${basket.id}, impossibile correggere la fila`);
        results.skipped++;
        continue;
      }
      
      // 3. Verifica quali posizioni sono già occupate nel FLUPSY
      const occupiedPositions = await db.select({
        row: baskets.row,
        position: baskets.position
      })
      .from(baskets)
      .where(
        and(
          eq(baskets.flupsyId, basket.flupsyId),
          not(isNull(baskets.row)),
          not(isNull(baskets.position))
        )
      );
      
      // Mappa delle posizioni occupate per fila
      const occupiedMap = {
        'DX': occupiedPositions.filter(p => p.row === 'DX').map(p => p.position),
        'SX': occupiedPositions.filter(p => p.row === 'SX').map(p => p.position)
      };
      
      // 4. Determina la fila meno occupata (DX o SX)
      const dxCount = occupiedMap['DX'].length;
      const sxCount = occupiedMap['SX'].length;
      
      // Assegna alla fila con meno cestelli
      const targetRow = dxCount <= sxCount ? 'DX' : 'SX';
      
      // 5. Trova la prima posizione disponibile nella fila scelta
      const positionsPerRow = Math.ceil(flupsy[0].maxPositions / 2);
      let availablePosition = null;
      
      for (let i = 1; i <= positionsPerRow; i++) {
        if (!occupiedMap[targetRow].includes(i)) {
          availablePosition = i;
          break;
        }
      }
      
      // Se non abbiamo trovato una posizione disponibile, usa quella attuale o 1
      if (availablePosition === null) {
        availablePosition = basket.position || 1;
        console.warn(`Impossibile trovare una posizione disponibile in ${targetRow} per il cestello ID ${basket.id}, mantenuta posizione ${availablePosition}`);
      }
      
      // 6. Aggiorna il cestello con la nuova fila e posizione
      console.log(`Aggiornamento cestello ID ${basket.id}: fila ${targetRow}, posizione ${availablePosition}`);
      
      try {
        const updatedBasket = await db.update(baskets)
          .set({ 
            row: targetRow,
            position: availablePosition
          })
          .where(eq(baskets.id, basket.id))
          .returning();
        
        if (updatedBasket && updatedBasket.length > 0) {
          results.success++;
          results.fixedBaskets.push({
            id: basket.id,
            flupsyId: basket.flupsyId,
            flupsyName: flupsy[0].name,
            assignedRow: targetRow,
            position: availablePosition
          });
          console.log(`✅ Cestello ID ${basket.id} aggiornato con successo`);
        } else {
          results.failed++;
          console.log(`❌ Errore nell'aggiornamento del cestello ID ${basket.id}`);
        }
      } catch (updateError) {
        results.failed++;
        console.error(`Errore nell'aggiornamento del cestello ID ${basket.id}:`, updateError);
      }
    }
    
    console.log("Correzione dei cestelli con fila null completata con successo");
    console.log(`Risultati: ${results.processed} cestelli processati, ${results.success} corretti, ${results.failed} falliti, ${results.skipped} saltati`);
    
    return {
      success: true,
      message: `Correzione completata: ${results.success} cestelli sono stati aggiornati.`,
      details: results
    };
  } catch (error) {
    console.error("Errore durante la correzione dei cestelli con fila null:", error);
    return {
      success: false,
      message: "Si è verificato un errore durante la correzione dei cestelli",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    };
  }
}

// Esegui la funzione se lo script viene eseguito direttamente
if (process.argv[1].endsWith('fix_null_rows.js')) {
  fixNullRows()
    .then(() => {
      console.log("Script completato.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Errore nello script:", err);
      process.exit(1);
    });
}

// Esporta la funzione per poterla utilizzare da altre parti dell'applicazione
export { fixNullRows };