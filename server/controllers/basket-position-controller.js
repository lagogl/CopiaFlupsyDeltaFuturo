import { storage } from "../storage";

/**
 * Aggiorna la posizione di un cestello
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
export async function updateBasketPosition(req, res) {
  try {
    console.log("Ricevuta richiesta di aggiornamento posizione cestello:", req.params, req.body);
    
    const basketId = parseInt(req.params.id);
    if (isNaN(basketId)) {
      return res.status(400).json({ success: false, message: "ID cestello non valido" });
    }
    
    const { row, position, flupsyId } = req.body;
    
    // Validazione dei dati
    if (!row || row.trim() === '') {
      return res.status(400).json({ success: false, message: "Fila non specificata" });
    }
    
    if (!position || isNaN(parseInt(position.toString()))) {
      return res.status(400).json({ success: false, message: "Posizione non valida" });
    }
    
    // Controlla se il cestello esiste
    const basket = await storage.getBasket(basketId);
    if (!basket) {
      return res.status(404).json({ success: false, message: "Cestello non trovato" });
    }
    
    // Prepara i dati di aggiornamento
    const updateData = {
      row: row.toUpperCase(),
      position: parseInt(position.toString())
    };
    
    // Se è stato fornito anche il flupsyId, lo includiamo nell'aggiornamento
    if (flupsyId && !isNaN(parseInt(flupsyId.toString()))) {
      updateData.flupsyId = parseInt(flupsyId.toString());
    } else if (basket.flupsyId) {
      // Se non è fornito, ma il cestello ha già un flupsyId, lo manteniamo
      updateData.flupsyId = basket.flupsyId;
    }
    
    console.log("Aggiornamento cestello con dati:", updateData);
    
    // Aggiorna la posizione del cestello
    const updatedBasket = await storage.updateBasket(basketId, updateData);
    
    if (!updatedBasket) {
      return res.status(500).json({ success: false, message: "Errore durante l'aggiornamento del cestello" });
    }
    
    // Ottieni il cestello aggiornato completo
    const completeBasket = await storage.getBasket(basketId);
    
    // Invia notifica WebSocket se disponibile
    if (typeof (global).broadcastUpdate === 'function' && completeBasket) {
      (global).broadcastUpdate('basket_updated', {
        basket: completeBasket,
        message: `Cestello ${completeBasket.physicalNumber} aggiornato`
      });
    }
    
    console.log("Cestello aggiornato con successo:", completeBasket || updatedBasket);
    
    // Invia risposta al client
    res.json({ 
      success: true, 
      basket: completeBasket || updatedBasket,
      message: "Posizione cestello aggiornata con successo" 
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento della posizione del cestello:", error);
    res.status(500).json({ 
      success: false, 
      message: `Errore durante l'aggiornamento della posizione del cestello: ${error.message || 'Errore sconosciuto'}` 
    });
  }
}