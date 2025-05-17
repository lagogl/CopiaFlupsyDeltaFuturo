import { storage } from "../storage";

/**
 * Ottiene le posizioni disponibili in un determinato FLUPSY
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
export async function getAvailablePositions(req, res) {
  try {
    const flupsyId = parseInt(req.params.id);
    if (isNaN(flupsyId)) {
      return res.status(400).json({ success: false, message: "ID FLUPSY non valido" });
    }
    
    console.log(`Ricerca flupsy con ID: ${flupsyId}`);
    
    // Verifica se il FLUPSY esiste (tramite database direttamente)
    let flupsy = null;
    
    try {
      // Prova a recuperare dal database
      const flupsys = await storage.getFlupsys();
      flupsy = flupsys.find(f => f.id === flupsyId);
      
      if (!flupsy) {
        console.log(`FLUPSY con ID ${flupsyId} non trovato nella lista completa`);
        return res.status(404).json({ success: false, message: "FLUPSY non trovato" });
      }
      
      console.log(`FLUPSY trovato: ${flupsy.name}`);
    } catch (dbError) {
      console.error("Errore durante il recupero del flupsy dal database:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Errore durante il recupero del flupsy dal database" 
      });
    }
    
    // Ottieni tutte le ceste per questo FLUPSY
    const flupsyBaskets = await storage.getBasketsByFlupsy(flupsyId);
    console.log(`Trovati ${flupsyBaskets.length} cestelli per il flupsy ${flupsy.name}`);
    
    // Raccogli le posizioni già occupate in questo FLUPSY
    const occupiedPositions = flupsyBaskets.reduce((acc, basket) => {
      if (basket.row && basket.position !== null) {
        if (!acc[basket.row]) {
          acc[basket.row] = [];
        }
        acc[basket.row].push(basket.position);
      }
      return acc;
    }, {});
    
    // Determina quali file sono in uso (generalmente SX, DX, C - ma potrebbe esserci qualsiasi valore)
    const usedRows = Object.keys(occupiedPositions);
    console.log(`File in uso: ${usedRows.join(', ') || 'nessuna'}`);
    
    // Se non ci sono file in uso, proponi le file standard
    const availableRows = usedRows.length > 0 ? usedRows : ['SX', 'DX', 'C'];
    
    // Trova il numero massimo di posizione per ogni fila
    const maxPositions = flupsyBaskets.reduce((acc, basket) => {
      if (basket.row && basket.position !== null) {
        if (!acc[basket.row] || basket.position > acc[basket.row]) {
          acc[basket.row] = basket.position;
        }
      }
      return acc;
    }, {});
    
    // Determina le posizioni disponibili per ogni fila
    const availablePositions = {};
    
    availableRows.forEach(row => {
      const occupied = occupiedPositions[row] || [];
      // Usa max_positions dal flupsy se disponibile, altrimenti 12 come default
      const maxPos = flupsy.max_positions || maxPositions[row] || 12;
      
      console.log(`Fila ${row}: posizioni occupate ${occupied.join(', ') || 'nessuna'}, max posizioni ${maxPos}`);
      
      // Genera tutte le posizioni possibili da 1 a maxPos
      const allPositions = Array.from({ length: maxPos }, (_, i) => i + 1);
      
      // Filtra le posizioni che non sono occupate
      availablePositions[row] = allPositions.filter(pos => !occupied.includes(pos));
    });
    
    res.json({
      success: true,
      flupsyName: flupsy.name,
      availableRows,
      availablePositions
    });
  } catch (error) {
    console.error("Errore durante il recupero delle posizioni disponibili:", error);
    res.status(500).json({ 
      success: false, 
      message: "Errore durante il recupero delle posizioni disponibili" 
    });
  }
}