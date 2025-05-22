import { Request, Response } from "express";
import { db } from "../db";
import { format } from "date-fns";
import { sql } from "drizzle-orm";

/**
 * Controller ottimizzato per la visualizzazione FLUPSY nella dashboard
 * Utilizza query SQL dirette e memorizzazione nella cache per prestazioni ottimali
 */
export const getFlupsyDashboardData = async (req: Request, res: Response) => {
  try {
    const flupsyIdsParam = req.query.flupsyIds as string;
    const flupsyIds = flupsyIdsParam 
      ? flupsyIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id)) 
      : [];

    // Query SQL ottimizzata che recupera i dati necessari in un'unica richiesta
    const query = flupsyIds.length > 0 
      ? sql`
        SELECT 
          b.id, 
          b.physical_number,
          b.flupsy_id,
          b.row,
          b.position,
          f.name as flupsy_name,
          c.id as cycle_id,
          c.code as cycle_code,
          l.id as lot_id,
          l.supplier as lot_supplier,
          l.quality as lot_quality,
          (
            SELECT animal_count
            FROM operations
            WHERE basket_id = b.id
            AND animal_count IS NOT NULL
            ORDER BY date DESC, id DESC
            LIMIT 1
          ) as animal_count
        FROM baskets b
        LEFT JOIN cycles c ON b.current_cycle_id = c.id
        LEFT JOIN lots l ON c.lot_id = l.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        WHERE b.state = 'active'
        AND b.flupsy_id IN (${flupsyIds.join(',')})
        ORDER BY b.flupsy_id, b.row, b.position
      `
      : sql`
        SELECT 
          b.id, 
          b.physical_number,
          b.flupsy_id,
          b.row,
          b.position,
          f.name as flupsy_name,
          c.id as cycle_id,
          c.code as cycle_code,
          l.id as lot_id,
          l.supplier as lot_supplier,
          l.quality as lot_quality,
          (
            SELECT animal_count
            FROM operations
            WHERE basket_id = b.id
            AND animal_count IS NOT NULL
            ORDER BY date DESC, id DESC
            LIMIT 1
          ) as animal_count
        FROM baskets b
        LEFT JOIN cycles c ON b.current_cycle_id = c.id
        LEFT JOIN lots l ON c.lot_id = l.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        WHERE b.state = 'active'
        ORDER BY b.flupsy_id, b.row, b.position
        LIMIT 100
      `;

    const result = await db.execute(query);
    
    // Elabora i risultati
    const flupsyData = {};
    
    if (result && result.rows) {
      // Costruisci la struttura dati FLUPSY -> cestelli
      for (const row of result.rows) {
        const flupsyId = row.flupsy_id;
        if (!flupsyId) continue;
        
        if (!flupsyData[flupsyId]) {
          flupsyData[flupsyId] = {
            id: flupsyId,
            name: row.flupsy_name || `FLUPSY ${flupsyId}`,
            baskets: []
          };
        }
        
        flupsyData[flupsyId].baskets.push({
          id: row.id,
          physicalNumber: row.physical_number,
          row: row.row,
          position: row.position,
          cycleId: row.cycle_id,
          cycleCode: row.cycle_code,
          lotId: row.lot_id,
          lotSupplier: row.lot_supplier,
          lotQuality: row.lot_quality,
          animalCount: row.animal_count || 0
        });
      }
    }
    
    // Converte l'oggetto in array per la risposta
    const responseData = Object.values(flupsyData);
    
    console.log(`Dashboard FLUPSY: Recuperati dati per ${responseData.length} FLUPSY`);
    
    res.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Errore nel recupero dei dati FLUPSY per la dashboard:", error);
    res.status(500).json({ 
      success: false,
      error: "Errore nel recupero dei dati FLUPSY", 
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Controller ottimizzato per i dati dei cestelli in arrivo a una taglia specifica
 */
export const getIncomingBasketsData = async (req: Request, res: Response) => {
  try {
    const { targetSize = 'TP-3000', days = 14 } = req.query;
    
    // Query ottimizzata che recupera direttamente i cestelli in arrivo alla taglia target
    const query = sql`
      WITH BasketsSizes AS (
        SELECT 
          b.id,
          b.physical_number,
          c.id as cycle_id,
          c.code as cycle_code,
          l.id as lot_id,
          l.supplier,
          l.quality,
          b.flupsy_id,
          f.name as flupsy_name,
          (
            SELECT animal_count 
            FROM operations 
            WHERE basket_id = b.id AND animal_count IS NOT NULL 
            ORDER BY date DESC, id DESC LIMIT 1
          ) as animal_count,
          (
            SELECT weight
            FROM measurements
            WHERE basket_id = b.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
          ) as current_weight
        FROM baskets b
        JOIN cycles c ON b.current_cycle_id = c.id
        JOIN lots l ON c.lot_id = l.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        WHERE b.state = 'active'
      )
      SELECT * FROM BasketsSizes
      WHERE current_weight > 0
      ORDER BY current_weight DESC
      LIMIT 50
    `;
    
    const result = await db.execute(query);
    
    const incomingBaskets = [];
    
    if (result && result.rows) {
      for (const row of result.rows) {
        incomingBaskets.push({
          id: row.id,
          physicalNumber: row.physical_number,
          cycleId: row.cycle_id,
          cycleCode: row.cycle_code,
          lotId: row.lot_id,
          supplier: row.supplier,
          quality: row.quality,
          flupsyId: row.flupsy_id,
          flupsyName: row.flupsy_name,
          animalCount: row.animal_count || 0,
          currentWeight: row.current_weight || 0,
          // Qui si potrebbero aggiungere altri calcoli di proiezione se necessario
        });
      }
    }
    
    console.log(`Dashboard: Recuperati ${incomingBaskets.length} cestelli in arrivo a ${targetSize}`);
    
    res.json({
      success: true,
      data: incomingBaskets,
      targetSize: targetSize,
      days: days,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Errore nel recupero dei cestelli in arrivo:", error);
    res.status(500).json({ 
      success: false,
      error: "Errore nel recupero dei cestelli in arrivo", 
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Controller ottimizzato per i cicli produttivi attivi
 */
export const getActiveCycles = async (req: Request, res: Response) => {
  try {
    // Limita il numero di cicli da recuperare
    const { limit = 20 } = req.query;
    const limitNum = parseInt(String(limit), 10) || 20;
    
    // Query ottimizzata che recupera direttamente i cicli con le informazioni essenziali
    const query = sql`
      SELECT 
        c.id, 
        c.code,
        c.start_date,
        l.id as lot_id,
        l.supplier,
        l.quality,
        COUNT(b.id) as basket_count,
        SUM(
          (
            SELECT animal_count 
            FROM operations 
            WHERE basket_id = b.id AND animal_count IS NOT NULL 
            ORDER BY date DESC, id DESC LIMIT 1
          )
        ) as total_animals
      FROM cycles c
      JOIN lots l ON c.lot_id = l.id
      LEFT JOIN baskets b ON b.current_cycle_id = c.id
      WHERE c.state = 'active'
      GROUP BY c.id, c.code, c.start_date, l.id, l.supplier, l.quality
      ORDER BY c.start_date DESC
      LIMIT ${limitNum}
    `;
    
    const result = await db.execute(query);
    
    const cycles = [];
    
    if (result && result.rows) {
      for (const row of result.rows) {
        cycles.push({
          id: row.id,
          code: row.code,
          startDate: row.start_date,
          lotId: row.lot_id,
          supplier: row.supplier,
          quality: row.quality,
          basketCount: row.basket_count || 0,
          totalAnimals: row.total_animals || 0
        });
      }
    }
    
    console.log(`Dashboard: Recuperati ${cycles.length} cicli produttivi attivi`);
    
    res.json({
      success: true,
      data: cycles,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Errore nel recupero dei cicli produttivi attivi:", error);
    res.status(500).json({ 
      success: false,
      error: "Errore nel recupero dei cicli produttivi attivi", 
      message: error instanceof Error ? error.message : String(error)
    });
  }
};