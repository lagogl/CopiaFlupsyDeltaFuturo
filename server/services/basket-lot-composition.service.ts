/**
 * Service per gestione composizione lotti misti nei cestelli
 * Gestisce l'impatto delle operazioni sulla composizione dei lotti
 */

/**
 * Gestisce l'impatto dell'eliminazione di un'operazione sulla composizione lotti misti
 * @param operation - L'operazione che sta per essere eliminata
 */
export async function handleBasketLotCompositionOnDelete(operation: any) {
  try {
    console.log(`🎯 Verifica impatto eliminazione operazione ${operation.id} su lotti misti del cestello ${operation.basketId}`);
    
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    
    // Verifica se il cestello ha una composizione mista
    const composition = await db.execute(sql`
      SELECT COUNT(*) as count FROM basket_lot_composition 
      WHERE basket_id = ${operation.basketId}
    `);
    
    if (composition[0]?.count > 1) {
      console.log(`🎯 Cestello ${operation.basketId} ha composizione mista (${composition[0].count} lotti)`);
      
      // Se l'operazione cancellata era di tipo critico per i lotti misti
      if (operation.metadata && typeof operation.metadata === 'string') {
        const metadata = JSON.parse(operation.metadata);
        if (metadata.operation_type === 'mixed_lot' || metadata.operation_type === 'screening_source') {
          console.log(`🎯 Operazione critica per lotti misti - ricalcolo composizione`);
          
          // Verifica se ci sono altre operazioni che mantengono il lotto misto
          const otherMixedOps = await db.execute(sql`
            SELECT COUNT(*) as count FROM operations o
            WHERE o.basket_id = ${operation.basketId} 
            AND o.id != ${operation.id}
            AND (o.metadata::text LIKE '%mixed_lot%' OR o.metadata::text LIKE '%screening%')
          `);
          
          if (otherMixedOps[0]?.count === 0) {
            console.log(`🎯 Nessun'altra operazione mantiene il lotto misto - eliminazione composizione`);
            await db.execute(sql`
              DELETE FROM basket_lot_composition WHERE basket_id = ${operation.basketId}
            `);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Errore gestione composizione lotti misti su eliminazione:', error);
  }
}

/**
 * Gestisce l'impatto della modifica di un'operazione sulla composizione lotti misti
 * @param operation - L'operazione originale
 * @param updateData - I dati aggiornati
 */
export async function handleBasketLotCompositionOnUpdate(operation: any, updateData: any) {
  try {
    console.log(`🎯 Verifica impatto modifica operazione ${operation.id} su lotti misti del cestello ${operation.basketId}`);
    
    // Se cambia il lotto o il conteggio animali, potrebbe influire sulla composizione
    if (updateData.lotId || updateData.animalCount) {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      // Verifica se il cestello ha una composizione mista
      const composition = await db.execute(sql`
        SELECT COUNT(*) as count FROM basket_lot_composition 
        WHERE basket_id = ${operation.basketId}
      `);
      
      if (composition[0]?.count > 1) {
        console.log(`🎯 Cestello ${operation.basketId} ha composizione mista - aggiornamento necessario`);
        
        // Se cambia il lotto, potrebbe trasformare da misto a puro o viceversa
        if (updateData.lotId && updateData.lotId !== operation.lotId) {
          console.log(`🎯 Cambio lotto da ${operation.lotId} a ${updateData.lotId}`);
          
          // Aggiorna la composizione basandosi sul nuovo lotto
          await db.execute(sql`
            UPDATE basket_lot_composition 
            SET lot_id = ${updateData.lotId},
                notes = CONCAT(notes, ' - Aggiornato da modifica operazione ${operation.id}')
            WHERE basket_id = ${operation.basketId} 
            AND cycle_id = ${operation.cycleId}
          `);
        }
        
        // Se cambia il conteggio animali, ricalcola le percentuali
        if (updateData.animalCount && updateData.animalCount !== operation.animalCount) {
          console.log(`🎯 Cambio conteggio da ${operation.animalCount} a ${updateData.animalCount}`);
          
          // Ottieni tutte le composizioni per questo cestello/ciclo
          const compositions = await db.execute(sql`
            SELECT * FROM basket_lot_composition 
            WHERE basket_id = ${operation.basketId} 
            AND cycle_id = ${operation.cycleId}
          `);
          
          // Calcola il nuovo totale
          const totalAnimals = compositions.reduce((sum: number, comp: any) => {
            if (comp.lot_id === operation.lotId) {
              return sum + (updateData.animalCount || 0);
            }
            return sum + (comp.animal_count || 0);
          }, 0);
          
          // Aggiorna le percentuali
          for (const comp of compositions) {
            const animalCount = comp.lot_id === operation.lotId 
              ? (updateData.animalCount || 0) 
              : (comp.animal_count || 0);
            const percentage = totalAnimals > 0 ? (animalCount / totalAnimals) * 100 : 0;
            
            await db.execute(sql`
              UPDATE basket_lot_composition 
              SET animal_count = ${animalCount},
                  percentage = ${percentage}
              WHERE id = ${comp.id}
            `);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Errore gestione composizione lotti misti su modifica:', error);
  }
}

/**
 * Verifica se un cestello ha composizione mista
 * @param basketId - ID del cestello
 * @returns true se il cestello ha più di un lotto
 */
export async function isBasketMixedLot(basketId: number): Promise<boolean> {
  try {
    const { db } = await import("../db");
    const { sql } = await import("drizzle-orm");
    
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT lot_id) as lot_count 
      FROM basket_lot_composition 
      WHERE basket_id = ${basketId}
    `);
    
    return result[0]?.lot_count > 1;
  } catch (error) {
    console.error('❌ Errore verifica lotto misto:', error);
    return false;
  }
}

/**
 * Ottiene la composizione completa di un cestello
 * @param basketId - ID del cestello
 * @param cycleId - ID del ciclo (opzionale)
 */
export async function getBasketLotComposition(basketId: number, cycleId?: number) {
  try {
    const { db } = await import("../db");
    const { sql, and, eq } = await import("drizzle-orm");
    const { basketLotComposition } = await import("../../shared/schema");
    
    let query = db.select().from(basketLotComposition).where(eq(basketLotComposition.basketId, basketId));
    
    if (cycleId) {
      query = query.where(and(
        eq(basketLotComposition.basketId, basketId),
        eq(basketLotComposition.cycleId, cycleId)
      ));
    }
    
    return await query;
  } catch (error) {
    console.error('❌ Errore recupero composizione cestello:', error);
    return [];
  }
}