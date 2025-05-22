/**
 * Controller per la gestione delle mappe dei FLUPSY
 * Fornisce accesso ottimizzato ai dati delle mappe dei FLUPSY utilizzando le viste materializzate
 */

/**
 * Recupera i dati delle ceste per la visualizzazione della mappa del FLUPSY
 * Utilizza le viste materializzate per migliorare le prestazioni
 * 
 * @param {Object} db - Connessione al database
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 */
export async function getFlupsyMapData(db, req, res) {
  try {
    console.log("Richiesta dati mappa FLUPSY");
    
    const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId) : null;
    
    let query = db.query;
    let results;
    
    // Se è specificato un ID FLUPSY, filtra per quel FLUPSY
    if (flupsyId) {
      console.log(`Recupero dati per FLUPSY specifico: ${flupsyId}`);
      
      // Combina i dati dalle due viste materializzate per avere informazioni complete
      results = await query`
        SELECT 
          b.id, 
          b.physical_number,
          b.flupsy_id,
          b.row,
          b.position,
          b.state,
          b.current_cycle_id,
          b.nfc_data,
          COALESCE(m.row, p.row) AS actual_row,
          COALESCE(m.position, p.position) AS actual_position,
          f.name AS flupsy_name,
          f.location AS flupsy_location,
          f.max_positions,
          m.animal_count,
          m.last_operation_id,
          m.last_operation_type,
          m.last_operation_date,
          m.last_weight_average,
          m.size_id,
          m.size_code,
          s.name AS size_name,
          s.color AS size_color
        FROM 
          baskets b
        JOIN 
          flupsys f ON b.flupsy_id = f.id
        LEFT JOIN 
          mv_active_baskets m ON b.id = m.basket_id
        LEFT JOIN 
          mv_current_basket_positions p ON b.id = p.basket_id
        LEFT JOIN
          sizes s ON m.size_id = s.id
        WHERE 
          b.flupsy_id = ${flupsyId}
        ORDER BY 
          COALESCE(m.row, p.row, b.row),
          COALESCE(m.position, p.position, b.position)
      `;
    } else {
      console.log("Recupero dati per tutti i FLUPSY");
      
      // Se non è specificato un FLUPSY, restituisci i dati per tutti i FLUPSY
      results = await query`
        SELECT 
          b.id, 
          b.physical_number,
          b.flupsy_id,
          b.row,
          b.position,
          b.state,
          b.current_cycle_id,
          b.nfc_data,
          COALESCE(m.row, p.row) AS actual_row,
          COALESCE(m.position, p.position) AS actual_position,
          f.name AS flupsy_name,
          f.location AS flupsy_location,
          f.max_positions,
          m.animal_count,
          m.last_operation_id,
          m.last_operation_type,
          m.last_operation_date,
          m.last_weight_average,
          m.size_id,
          m.size_code,
          s.name AS size_name,
          s.color AS size_color
        FROM 
          baskets b
        JOIN 
          flupsys f ON b.flupsy_id = f.id
        LEFT JOIN 
          mv_active_baskets m ON b.id = m.basket_id
        LEFT JOIN 
          mv_current_basket_positions p ON b.id = p.basket_id
        LEFT JOIN
          sizes s ON m.size_id = s.id
        ORDER BY 
          f.id,
          COALESCE(m.row, p.row, b.row),
          COALESCE(m.position, p.position, b.position)
      `;
    }
    
    console.log(`Recuperati ${results.length} cestelli per la mappa FLUPSY`);
    
    // Trasformazione dei dati per la visualizzazione sulla mappa
    const formattedResults = results.map(basket => {
      return {
        id: basket.id,
        physicalNumber: basket.physical_number,
        flupsyId: basket.flupsy_id,
        row: basket.actual_row || basket.row,
        position: basket.actual_position || basket.position,
        state: basket.state,
        currentCycleId: basket.current_cycle_id,
        nfcData: basket.nfc_data,
        flupsyName: basket.flupsy_name,
        flupsyLocation: basket.flupsy_location,
        animalCount: basket.animal_count,
        lastOperationId: basket.last_operation_id,
        lastOperationType: basket.last_operation_type,
        lastOperationDate: basket.last_operation_date,
        lastWeightAverage: basket.last_weight_average,
        sizeId: basket.size_id,
        sizeCode: basket.size_code,
        sizeName: basket.size_name,
        sizeColor: basket.size_color,
        maxPositions: basket.max_positions
      };
    });
    
    res.json(formattedResults);
  } catch (error) {
    console.error("Errore nel recupero dei dati della mappa FLUPSY:", error);
    res.status(500).json({ 
      success: false, 
      message: "Errore nel recupero dei dati della mappa FLUPSY", 
      error: error.message 
    });
  }
}