/**
 * Funzione per implementare la route di cancellazione delle selezioni
 * Da includere in routes.ts
 */

function implementSelectionCancelRoute(app, db, selections, eq) {
  // Annulla una selezione
  app.post("/api/selections/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ 
          success: false, 
          error: "ID selezione non valido"
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
      
      // Verifica che la selezione non sia già annullata
      if (selection[0].status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: `La selezione è già stata annullata`
        });
      }
      
      // Aggiorna lo stato della selezione a 'cancelled'
      await db.update(selections)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(selections.id, Number(id)));
      
      // Recupera la selezione aggiornata
      const updatedSelection = await db.select().from(selections)
        .where(eq(selections.id, Number(id)))
        .limit(1);
      
      // Notifica via WebSocket
      if (typeof (global.broadcastUpdate) === 'function') {
        global.broadcastUpdate('selection_cancelled', {
          selectionId: Number(id),
          selectionNumber: selection[0].selectionNumber,
          message: `Selezione #${selection[0].selectionNumber} annullata`
        });
      }
      
      return res.status(200).json({
        success: true,
        message: "Selezione annullata con successo",
        selection: updatedSelection[0]
      });
      
    } catch (error) {
      console.error("Errore durante l'annullamento della selezione:", error);
      return res.status(500).json({
        success: false,
        error: `Errore durante l'annullamento della selezione: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  // Completa una selezione
  app.post("/api/selections/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ 
          success: false, 
          error: "ID selezione non valido"
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
      
      // Verifica che la selezione sia in stato 'draft'
      if (selection[0].status !== 'draft') {
        return res.status(400).json({
          success: false,
          error: `La selezione non può essere completata perché è in stato "${selection[0].status}"`
        });
      }
      
      // Aggiorna lo stato della selezione a 'completed'
      await db.update(selections)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(selections.id, Number(id)));
      
      // Recupera la selezione aggiornata
      const updatedSelection = await db.select().from(selections)
        .where(eq(selections.id, Number(id)))
        .limit(1);
      
      // Notifica via WebSocket
      if (typeof (global.broadcastUpdate) === 'function') {
        global.broadcastUpdate('selection_completed', {
          selectionId: Number(id),
          selectionNumber: selection[0].selectionNumber,
          message: `Selezione #${selection[0].selectionNumber} completata`
        });
      }
      
      return res.status(200).json({
        success: true,
        message: "Selezione completata con successo",
        selection: updatedSelection[0]
      });
      
    } catch (error) {
      console.error("Errore durante il completamento della selezione:", error);
      return res.status(500).json({
        success: false,
        error: `Errore durante il completamento della selezione: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
}

export { implementSelectionCancelRoute };