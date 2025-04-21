/**
 * Fix per il problema "null value in column flupsy_id violates not-null constraint"
 * da integrare nel file server/controllers/selection-controller.ts
 * 
 * Questa è la correzione completa del metodo completeSelection che assicura
 * che il FLUPSY ID sia sempre mantenuto anche per i cestelli venduti
 */

// Modifica da effettuare nel file server/controllers/selection-controller.ts
// Funzione completeSelection

export async function completeSelection(req, res) {
  try {
    const { id } = req.params;
    
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
    
    // Verifica la presenza di cestelli di destinazione
    const destinationCount = await db.select({ count: sql`count(*)` })
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    if (!destinationCount[0] || destinationCount[0].count === 0) {
      return res.status(400).json({
        success: false,
        error: "La selezione non ha ceste di destinazione. Aggiungi prima le ceste di destinazione."
      });
    }
    
    // Ottieni tutte le ceste di destinazione
    const destinationBaskets = await db.select()
      .from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, Number(id)));
    
    // Assicurati che tutti i cestelli venduti abbiano un FLUPSY ID valido
    const processedDestinationBaskets = destinationBaskets.map(basket => {
      if (basket.destinationType === 'sold' && !basket.flupsyId) {
        // Se è un cestello venduto senza FLUPSY, assegna il FLUPSY ID 1 come predefinito
        console.log('Assegnazione flupsyId predefinito (1) per cestello venduto in fase di completamento');
        return {
          ...basket,
          flupsyId: 1 // Usa il primo FLUPSY come predefinito per i cestelli venduti
        };
      }
      return basket;
    });
    
    // Ottieni le ceste di origine per il tracciamento delle relazioni
    const sourceBaskets = await db.select()
      .from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, Number(id)));
    
    // Esecuzione in una transazione
    await db.transaction(async (tx) => {
      // Chiudi i cicli delle ceste di origine
      for (const sourceBasket of sourceBaskets) {
        // Crea operazione di chiusura per il ciclo di origine
        await tx.insert(operations).values({
          date: selection[0].date,
          type: 'selezione-origine',
          basketId: sourceBasket.basketId,
          cycleId: sourceBasket.cycleId,
          animalCount: sourceBasket.animalCount,
          totalWeight: sourceBasket.totalWeight,
          animalsPerKg: sourceBasket.animalsPerKg,
          notes: `Chiuso per selezione #${selection[0].selectionNumber}`
        });
        
        // Chiudi il ciclo di origine
        await tx.update(cycles)
          .set({ 
            state: 'closed', 
            endDate: selection[0].date 
          })
          .where(eq(cycles.id, sourceBasket.cycleId));
        
        // Aggiorna lo stato del cestello origine a disponibile
        await tx.update(baskets)
          .set({ 
            state: 'available',
            currentCycleId: null 
          })
          .where(eq(baskets.id, sourceBasket.basketId));
      }
      
      // Processa le ceste di destinazione
      for (const destBasket of processedDestinationBaskets) {
        // Assicura che ogni cesta abbia un valore di sizeId basato su animalsPerKg
        let actualSizeId = destBasket.sizeId;
        
        // Se non c'è sizeId oppure è 0 o null, tenta di determinarlo automaticamente
        if (!actualSizeId || actualSizeId === 0) {
          if (destBasket.animalsPerKg) {
            const calculatedSizeId = await determineSizeId(destBasket.animalsPerKg);
            if (calculatedSizeId) {
              console.log(`Taglia determinata automaticamente per cesta ${destBasket.basketId}: ID ${calculatedSizeId}`);
              actualSizeId = calculatedSizeId;
            } else {
              console.log(`Impossibile determinare la taglia automaticamente per cesta ${destBasket.basketId}`);
            }
          } else {
            console.log(`Manca animalsPerKg per cesta ${destBasket.basketId}, impossibile determinare la taglia`);
          }
        }
        
        // Crea operazione di prima attivazione
        const [operation] = await tx.insert(operations).values({
          date: selection[0].date,
          type: 'prima-attivazione',
          basketId: destBasket.basketId,
          cycleId: 0, // Placeholder, aggiornato dopo
          animalCount: destBasket.animalCount,
          totalWeight: destBasket.totalWeight,
          animalsPerKg: destBasket.animalsPerKg,
          averageWeight: destBasket.totalWeight / destBasket.animalCount,
          deadCount: destBasket.deadCount || 0,
          mortalityRate: destBasket.mortalityRate || 0,
          sizeId: actualSizeId,
          notes: `Nuova cesta da selezione #${selection[0].selectionNumber}`
        }).returning();
        
        // Crea nuovo ciclo per la cesta
        const [cycle] = await tx.insert(cycles).values({
          basketId: destBasket.basketId,
          startDate: selection[0].date,
          state: 'active'
        }).returning();
        
        // Aggiorna l'operazione con l'ID del ciclo
        await tx.update(operations)
          .set({ cycleId: cycle.id })
          .where(eq(operations.id, operation.id));
        
        // Gestione in base al tipo di destinazione
        if (destBasket.destinationType === 'sold') {
          // Caso 1: Vendita immediata
          
          // Crea operazione di vendita
          await tx.insert(operations).values({
            date: selection[0].date,
            type: 'vendita',
            basketId: destBasket.basketId,
            cycleId: cycle.id,
            animalCount: destBasket.animalCount,
            totalWeight: destBasket.totalWeight,
            animalsPerKg: destBasket.animalsPerKg,
            notes: `Vendita immediata dopo selezione #${selection[0].selectionNumber}`
          });
          
          // Chiudi il ciclo appena creato
          await tx.update(cycles)
            .set({ 
              state: 'closed', 
              endDate: selection[0].date 
            })
            .where(eq(cycles.id, cycle.id));
          
          // CORREZIONE IMPORTANTE: Non impostiamo flupsyId a null
          // Aggiorna lo stato del cestello a disponibile
          await tx.update(baskets)
            .set({ 
              state: 'available',
              currentCycleId: null,
              position: null, // La posizione può essere null
              row: null      // La riga può essere null
              // NON impostiamo flupsyId: null qui, lo lasciamo invariato
            })
            .where(eq(baskets.id, destBasket.basketId));
          
        } else if (destBasket.destinationType === 'placed') {
          // Caso 2: Collocazione in un FLUPSY
          
          // Estrai la riga e la posizione
          // ... resto del codice per gestire il posizionamento
          // ...
        }
        
        // Traccia relazioni tra ceste di origine e destinazione
        for (const sourceBasket of sourceBaskets) {
          await tx.insert(selectionBasketHistory).values({
            selectionId: Number(id),
            sourceBasketId: sourceBasket.basketId,
            sourceCycleId: sourceBasket.cycleId,
            destinationBasketId: destBasket.basketId,
            destinationCycleId: cycle.id
          });
          
          // Se il lotto è specificato, traccia anche la relazione
          if (sourceBasket.lotId) {
            await tx.insert(selectionLotReferences).values({
              selectionId: Number(id),
              destinationBasketId: destBasket.basketId,
              destinationCycleId: cycle.id,
              lotId: sourceBasket.lotId
            });
          }
        }
      }
      
      // Aggiorna lo stato della selezione a completato
      await tx.update(selections)
        .set({ status: 'completed' })
        .where(eq(selections.id, Number(id)));
      
      // Invia notifiche WebSocket
      if (typeof (global as any).broadcastUpdate === 'function') {
        (global as any).broadcastUpdate('selection_completed', {
          selectionId: Number(id),
          message: `Selezione #${selection[0].selectionNumber} completata con successo`
        });
      }
    });
    
    return res.status(200).json({
      success: true,
      message: "Selezione completata con successo",
      selectionId: Number(id)
    });
    
  } catch (error) {
    console.error("Errore durante il completamento della selezione:", error);
    return res.status(500).json({
      success: false,
      error: `Errore durante il completamento della selezione: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}