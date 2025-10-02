/**
 * CORREZIONE LOGICA VAGLIATURA - Implementazione corretta per gestire:
 * 1. Cessazione SEMPRE dei cestelli origine (non riattivazione)
 * 2. Calcolo e registrazione mortalità del lotto
 * 3. Tracciabilità completa della vagliatura
 * 4. Operazione "chiusura-ciclo-vagliatura" per storicizzazione
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, or, isNull, isNotNull, sql } from "drizzle-orm";
import { 
  selections, 
  selectionSourceBaskets, 
  selectionDestinationBaskets, 
  selectionBasketHistory, 
  selectionLotReferences,
  operations,
  cycles,
  baskets,
  basketPositionHistory,
  flupsys,
  sizes,
  lots
} from "../../shared/schema";
import { format } from "date-fns";

/**
 * COMPLETA SELEZIONE - IMPLEMENTAZIONE CORRETTA
 * 
 * LOGICA CORRETTA:
 * 1. TUTTI i cestelli origine vengono SEMPRE cessati (operazione "chiusura-ciclo-vagliatura")
 * 2. I cestelli destinazione ricevono nuovi cicli normalmente
 * 3. La mortalità viene calcolata e registrata sul lotto
 * 4. Tracciabilità completa per ricostruire la storia
 */
export async function completeSelectionFixed(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    console.log(`🔄 AVVIO COMPLETAMENTO VAGLIATURA CORRETTO - Selezione ID: ${id}`);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID selezione non fornito"
      });
    }

    // Verifica che la selezione esista
    const selection = await db.select().from(selections)
      .where(eq(selections.id, Number(id)))
      .limit(1);
      
    if (!selection || selection.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Selezione con ID ${id} non trovata`
      });
    }

    // Verifica che la selezione sia in stato draft
    if (selection[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: `La selezione non può essere completata perché è in stato "${selection[0].status}"`
      });
    }

    // Recupera i cestelli di origine
    const sourceBaskets = await db.select({
      basketId: selectionSourceBaskets.basketId,
      animalCount: selectionSourceBaskets.animalCount,
      lotId: selectionSourceBaskets.lotId,
      cycleId: selectionSourceBaskets.cycleId
    })
    .from(selectionSourceBaskets)
    .where(eq(selectionSourceBaskets.selectionId, Number(id)));

    // Recupera i cestelli di destinazione
    const destinationBaskets = await db.select({
      basketId: selectionDestinationBaskets.basketId,
      destinationType: selectionDestinationBaskets.destinationType,
      flupsyId: selectionDestinationBaskets.flupsyId,
      position: selectionDestinationBaskets.position,
      animalCount: selectionDestinationBaskets.animalCount,
      totalWeight: selectionDestinationBaskets.totalWeight,
      animalsPerKg: selectionDestinationBaskets.animalsPerKg,
      sizeId: selectionDestinationBaskets.sizeId,
      deadCount: selectionDestinationBaskets.deadCount,
      mortalityRate: selectionDestinationBaskets.mortalityRate
    })
    .from(selectionDestinationBaskets)
    .where(eq(selectionDestinationBaskets.selectionId, Number(id)));

    if (sourceBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun cestello di origine trovato per questa selezione"
      });
    }

    if (destinationBaskets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun cestello di destinazione trovato per questa selezione"
      });
    }

    // CALCOLA MORTALITÀ
    const totalAnimalsOrigin = sourceBaskets.reduce((sum, sb) => sum + (sb.animalCount || 0), 0);
    const totalAnimalsDestination = destinationBaskets.reduce((sum, db) => sum + (db.animalCount || 0), 0);
    const mortality = totalAnimalsOrigin - totalAnimalsDestination;
    
    console.log(`📊 CALCOLO MORTALITÀ:`);
    console.log(`   Animali origine: ${totalAnimalsOrigin}`);
    console.log(`   Animali destinazione: ${totalAnimalsDestination}`);
    console.log(`   Mortalità calcolata: ${mortality} (${mortality > 0 ? 'perdita' : 'guadagno'})`);

    // TRANSAZIONE CORRETTA
    await db.transaction(async (tx) => {
      
      // ====== IDENTIFICAZIONE CESTELLI DUPLICATI ======
      // Identifica cestelli che sono sia origine che destinazione
      const overlappingBasketIds = new Set(
        sourceBaskets
          .filter(sb => destinationBaskets.some(db => db.basketId === sb.basketId))
          .map(sb => sb.basketId)
      );
      
      if (overlappingBasketIds.size > 0) {
        console.log(`⚠️ Cestelli sia origine che destinazione: ${Array.from(overlappingBasketIds).join(', ')}`);
      }
      
      // ====== FASE 1: CHIUSURA CESTELLI ORIGINE (TUTTI) ======
      console.log(`🔒 FASE 1: Chiusura ${sourceBaskets.length} cestelli origine`);
      
      for (const sourceBasket of sourceBaskets) {
        console.log(`   Processando cestello origine ${sourceBasket.basketId}...`);
        
        // Controlla se questo cestello è anche destinazione
        const isAlsoDestination = overlappingBasketIds.has(sourceBasket.basketId);
        
        // Ottieni info cestello
        const basketInfo = await tx.select()
          .from(baskets)
          .where(eq(baskets.id, sourceBasket.basketId))
          .limit(1);

        if (basketInfo.length > 0 && basketInfo[0].currentCycleId) {
          
          // 1. OPERAZIONE CHIUSURA-CICLO-VAGLIATURA (specifica per tracciabilità)
          await tx.insert(operations).values({
            date: selection[0].date,
            type: 'chiusura-ciclo-vagliatura',
            basketId: sourceBasket.basketId,
            cycleId: basketInfo[0].currentCycleId,
            animalCount: sourceBasket.animalCount,
            notes: `Chiusura per vagliatura #${selection[0].selectionNumber} del ${selection[0].date}. ` +
                   `Animali distribuiti: ${totalAnimalsDestination}. Mortalità: ${mortality}`
          });

          // 2. CHIUDI IL CICLO
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
            })
            .where(eq(cycles.id, basketInfo[0].currentCycleId));

          // 3. LIBERA IL CESTELLO SOLO SE NON È ANCHE DESTINAZIONE
          // Se è anche destinazione, la fase 2 gestirà lo stato finale
          if (!isAlsoDestination) {
            await tx.update(baskets)
              .set({ 
                state: 'available',
                currentCycleId: null
              })
              .where(eq(baskets.id, sourceBasket.basketId));
            console.log(`   ✅ Cestello ${sourceBasket.basketId} cessato e reso disponibile`);
          } else {
            console.log(`   ⚠️ Cestello ${sourceBasket.basketId} cessato ma è anche destinazione (stato gestito dopo)`);
          }
        }
      }

      // ====== FASE 2: ATTIVAZIONE CESTELLI DESTINAZIONE ======
      console.log(`🆕 FASE 2: Attivazione ${destinationBaskets.length} cestelli destinazione`);
      
      // Raccogli lotti dalle origini per destinazioni
      const sourceLots = [...new Set(sourceBaskets.map(sb => sb.lotId).filter(lotId => lotId !== null))];
      const primaryLotId = sourceLots.length > 0 ? sourceLots[0] : null;
      
      for (const destBasket of destinationBaskets) {
        const wasAlsoSource = overlappingBasketIds.has(destBasket.basketId);
        console.log(`   Processando cestello destinazione ${destBasket.basketId}${wasAlsoSource ? ' (era anche origine)' : ''}...`);
        
        // 1. CREA NUOVO CICLO
        const [newCycle] = await tx.insert(cycles).values({
          basketId: destBasket.basketId,
          startDate: selection[0].date,
          state: 'active'
        }).returning();

        // 2. DETERMINA TAGLIA
        let actualSizeId = destBasket.sizeId;
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            actualSizeId = await determineSizeId(destBasket.animalsPerKg);
          }
        }

        // 3. OPERAZIONE PRIMA-ATTIVAZIONE
        await tx.insert(operations).values({
          date: selection[0].date,
          type: 'prima-attivazione',
          basketId: destBasket.basketId,
          cycleId: newCycle.id,
          animalCount: destBasket.animalCount,
          totalWeight: destBasket.totalWeight,
          animalsPerKg: destBasket.animalsPerKg,
          averageWeight: destBasket.totalWeight && destBasket.animalCount 
                        ? Math.round((destBasket.totalWeight / destBasket.animalCount) * 1000) 
                        : 0,
          deadCount: destBasket.deadCount || 0,
          mortalityRate: destBasket.mortalityRate || 0,
          sizeId: actualSizeId,
          lotId: primaryLotId, // Eredita lotto dalle origini
          notes: `Da vagliatura #${selection[0].selectionNumber} del ${selection[0].date}${wasAlsoSource ? ' (cestello riutilizzato)' : ''}`
        });

        // 4. GESTISCI POSIZIONAMENTO O VENDITA
        if (destBasket.destinationType === 'sold') {
          // VENDITA IMMEDIATA
          await tx.insert(operations).values({
            date: selection[0].date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: newCycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            averageWeight: destBasket.totalWeight && destBasket.animalCount 
                          ? Math.round((destBasket.totalWeight / destBasket.animalCount) * 1000) 
                          : 0,
            deadCount: destBasket.deadCount || 0,
            mortalityRate: destBasket.mortalityRate || 0,
            sizeId: actualSizeId,
            lotId: primaryLotId,
            notes: `Vendita diretta da vagliatura #${selection[0].selectionNumber}`
          });

          // Chiudi ciclo per vendita
          await tx.update(cycles)
            .set({ state: 'closed', endDate: selection[0].date })
            .where(eq(cycles.id, newCycle.id));

          // Rendi cestello disponibile per nuovo ciclo
          // Il cestello rimane nel FLUPSY ma è disponibile per essere riutilizzato
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              position: destBasket.position || null,  // Mantiene la posizione fisica
              row: destBasket.position ? String(destBasket.position).match(/^([A-Z]+)/)?.[1] || null : null,
              flupsyId: destBasket.flupsyId || 1  // Rimane nel FLUPSY
            })
            .where(eq(baskets.id, destBasket.basketId));
          
          console.log(`   ✅ Cestello ${destBasket.basketId} venduto - ciclo chiuso, cestello disponibile nel FLUPSY`);

        } else {
          // POSIZIONAMENTO NORMALE
          const positionStr = String(destBasket.position || '');
          const match = positionStr.match(/^([A-Z]+)(\d+)$/);
          
          if (match) {
            const row = match[1];
            const position = parseInt(match[2]);
            
            await tx.update(baskets)
              .set({
                flupsyId: destBasket.flupsyId,
                row: row,
                position: position,
                state: 'active',
                currentCycleId: newCycle.id
              })
              .where(eq(baskets.id, destBasket.basketId));
          }
          
          console.log(`   ✅ Cestello ${destBasket.basketId} riposizionato con ciclo attivo`);
        }
      }

      // ====== FASE 3: REGISTRAZIONE MORTALITÀ SUL LOTTO ======
      if (primaryLotId && mortality !== 0) {
        console.log(`📈 FASE 3: Registrazione mortalità ${mortality} su lotto ${primaryLotId}`);
        
        // Aggiorna mortalità del lotto
        await tx.update(lots)
          .set({ 
            totalMortality: sql`COALESCE(total_mortality, 0) + ${mortality}`,
            lastMortalityDate: selection[0].date,
            mortalityNotes: sql`COALESCE(mortality_notes, '') || ${`Vagliatura #${selection[0].selectionNumber}: ${mortality} animali. `}`
          })
          .where(eq(lots.id, primaryLotId));
      }

      // ====== FASE 4: STORICIZZAZIONE RELAZIONI ======
      console.log(`📝 FASE 4: Storicizzazione relazioni vagliatura`);
      
      // Registra relazioni fonte->destinazione per tracciabilità
      for (const sourceBasket of sourceBaskets) {
        for (const destBasket of destinationBaskets) {
          await tx.insert(selectionBasketHistory).values({
            selectionId: Number(id),
            sourceBasketId: sourceBasket.basketId,
            sourceCycleId: sourceBasket.cycleId,
            destinationBasketId: destBasket.basketId,
            destinationCycleId: 0 // Sarà aggiornato con l'ID reale del nuovo ciclo
          });
        }
      }

      // ====== FASE 5: FINALIZZAZIONE SELEZIONE ======
      await tx.update(selections)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(selections.id, Number(id)));

      console.log(`✅ VAGLIATURA COMPLETATA CORRETTAMENTE!`);
    });

    // Invia notifiche WebSocket
    if (typeof (global as any).broadcastUpdate === 'function') {
      (global as any).broadcastUpdate('selection_completed', {
        selectionId: Number(id),
        message: `Vagliatura #${selection[0].selectionNumber} completata con successo`,
        mortality: mortality,
        totalAnimalsOrigin: totalAnimalsOrigin,
        totalAnimalsDestination: totalAnimalsDestination
      });
    }

    return res.status(200).json({
      success: true,
      message: `Vagliatura #${selection[0].selectionNumber} completata con successo`,
      selectionId: Number(id),
      mortality: mortality,
      totalAnimalsOrigin: totalAnimalsOrigin,
      totalAnimalsDestination: totalAnimalsDestination,
      sourceBasketsClosed: sourceBaskets.length,
      destinationBasketsActivated: destinationBaskets.length
    });

  } catch (error) {
    console.error("❌ ERRORE DURANTE COMPLETAMENTO VAGLIATURA:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il completamento della vagliatura: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Determina automaticamente l'ID della taglia basandosi sugli animali per kg
 */
async function determineSizeId(animalsPerKg: number): Promise<number | null> {
  try {
    const sizeResult = await db.select()
      .from(sizes)
      .where(
        and(
          sql`${animalsPerKg} >= ${sizes.minAnimalsPerKg}`,
          sql`${animalsPerKg} <= ${sizes.maxAnimalsPerKg}`
        )
      )
      .limit(1);
    
    return sizeResult.length > 0 ? sizeResult[0].id : null;
  } catch (error) {
    console.error("Errore determinazione taglia:", error);
    return null;
  }
}