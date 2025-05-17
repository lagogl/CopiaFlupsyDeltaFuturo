import { storage } from "../storage";

/**
 * Aggiorna la posizione di un cestello
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
export async function updateBasketPosition(req, res) {
  try {
    const basketId = parseInt(req.params.id);
    if (isNaN(basketId)) {
      return res.status(400).json({ success: false, message: "ID cestello non valido" });
    }
    
    const { row, position } = req.body;
    
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
    
    // Aggiorna la posizione del cestello
    const updatedBasket = await storage.updateBasket(basketId, {
      row: row.toUpperCase(),
      position: parseInt(position.toString())
    });
    
    if (!updatedBasket) {
      return res.status(500).json({ success: false, message: "Errore durante l'aggiornamento del cestello" });
    }
    
    res.json({ success: true, basket: updatedBasket });
  } catch (error) {
    console.error("Errore durante l'aggiornamento della posizione del cestello:", error);
    res.status(500).json({ success: false, message: "Errore durante l'aggiornamento della posizione del cestello" });
  }
}