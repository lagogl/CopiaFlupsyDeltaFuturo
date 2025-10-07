import { db } from '../../../db';
import { sql } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

class DiarioService {
  /**
   * Ottieni giacenza giornaliera per taglia
   */
  async getGiacenza(date: string) {
    const cicliAttiviQuery = await db.execute(sql`
      SELECT id AS cycle_id
      FROM cycles
      WHERE start_date <= ${date}
      AND (
        (state = 'active' AND (end_date IS NULL OR end_date > ${date}))
        OR (state = 'closed' AND end_date = ${date})
      )
    `);
    
    const totaliPerTaglia: Record<string, number> = {};
    
    for (const ciclo of cicliAttiviQuery.rows) {
      const cycleId = ciclo.cycle_id;
      
      const operazioneQuery = await db.execute(sql`
        SELECT o.animal_count, o.size_id, s.code AS size_code
        FROM operations o
        LEFT JOIN sizes s ON o.size_id = s.id
        WHERE o.cycle_id = ${cycleId}
          AND o.date <= ${date}
          AND o.animal_count IS NOT NULL
        ORDER BY o.date DESC, o.id DESC
        LIMIT 1
      `);
      
      if (operazioneQuery.rows.length > 0) {
        const operazione = operazioneQuery.rows[0];
        const animalCount = parseInt(operazione.animal_count);
        
        let sizeCode = operazione.size_code;
        
        if (!operazione.size_id) {
          const tagliaQuery = await db.execute(sql`
            SELECT s.code
            FROM operations o
            JOIN sizes s ON o.size_id = s.id
            WHERE o.cycle_id = ${cycleId}
              AND o.date <= ${date}
              AND o.size_id IS NOT NULL
            ORDER BY o.date DESC, o.id DESC
            LIMIT 1
          `);
          
          if (tagliaQuery.rows.length > 0) {
            sizeCode = tagliaQuery.rows[0].code;
          } else {
            sizeCode = 'Non specificata';
          }
        }
        
        if (!sizeCode) sizeCode = 'Non specificata';
        
        if (!totaliPerTaglia[sizeCode]) {
          totaliPerTaglia[sizeCode] = 0;
        }
        
        totaliPerTaglia[sizeCode] += animalCount;
      }
    }
    
    const dettaglioTaglie = [];
    let totaleGiacenza = 0;
    
    for (const [taglia, quantita] of Object.entries(totaliPerTaglia)) {
      const quantitaNum = parseInt(String(quantita));
      totaleGiacenza += quantitaNum;
      dettaglioTaglie.push({
        taglia,
        quantita: quantitaNum
      });
    }
    
    return {
      totale_giacenza: totaleGiacenza,
      dettaglio_taglie: dettaglioTaglie
    };
  }

  /**
   * Ottieni operazioni per data specifica
   */
  async getOperationsByDate(date: string) {
    const operations = await db.execute(sql`
      WITH ops AS (
        SELECT 
          o.id, o.date, o.type, o.notes, o.basket_id, o.cycle_id, o.size_id, 
          o.animal_count, o.animals_per_kg, o.created_at,
          b.physical_number AS basket_number, b.flupsy_id,
          f.name AS flupsy_name,
          CASE 
            WHEN o.size_id IS NOT NULL THEN s.code
            ELSE NULL
          END AS direct_size_code,
          s.name AS size_name
        FROM operations o
        LEFT JOIN baskets b ON o.basket_id = b.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        LEFT JOIN sizes s ON o.size_id = s.id
        WHERE o.date::text = ${date}
      )
      SELECT 
        ops.*,
        CASE 
          WHEN ops.direct_size_code IS NOT NULL THEN ops.direct_size_code
          ELSE (
            SELECT s2.code
            FROM operations o2
            JOIN sizes s2 ON o2.size_id = s2.id
            WHERE o2.cycle_id = ops.cycle_id
              AND o2.date <= ops.date
              AND o2.id < ops.id
              AND o2.size_id IS NOT NULL
            ORDER BY o2.date DESC, o2.id DESC
            LIMIT 1
          )
        END AS inherited_size_code
      FROM ops
      ORDER BY ops.id
    `);
    
    return operations.rows;
  }

  /**
   * Ottieni statistiche per taglia
   */
  async getSizeStats(date: string) {
    const stats = await db.execute(sql`
      SELECT 
        COALESCE(s.code, 'Non specificata') AS taglia,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
            THEN o.animal_count ELSE 0 END) AS entrate,
        SUM(CASE WHEN o.type = 'vendita' THEN o.animal_count ELSE 0 END) AS uscite,
        COUNT(o.id) AS num_operazioni
      FROM operations o
      LEFT JOIN sizes s ON o.size_id = s.id
      WHERE o.date::text = ${date}
      GROUP BY s.code
      ORDER BY s.code
    `);
    
    return stats.rows;
  }

  /**
   * Ottieni totali giornalieri
   */
  async getDailyTotals(date: string) {
    const result = await db.execute(sql`
      SELECT
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
            THEN o.animal_count ELSE 0 END) AS totale_entrate,
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS totale_uscite,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') 
            THEN o.animal_count ELSE 0 END) - 
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS bilancio_netto,
        COUNT(DISTINCT o.id) AS numero_operazioni
      FROM operations o
      WHERE o.date::text = ${date}
    `);
    
    return result.rows[0];
  }

  /**
   * Ottieni dati mensili completi
   */
  async getMonthData(month: string) {
    const startDate = startOfMonth(new Date(`${month}-01`));
    const endDate = endOfMonth(new Date(`${month}-01`));
    
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");
    
    // Step 1: Taglie attive nel mese
    const taglieAttiveResult = await db.execute(sql`
      SELECT DISTINCT s.code
      FROM operations o
      JOIN sizes s ON o.size_id = s.id
      WHERE 
        EXISTS (
          SELECT 1 
          FROM operations o2 
          WHERE o2.size_id = s.id 
          AND o2.date < ${startDateStr}
          AND o2.type NOT IN ('cessazione', 'vendita')
          GROUP BY o2.size_id
          HAVING SUM(o2.animal_count) > 0
        )
        OR
        EXISTS (
          SELECT 1 
          FROM operations o3 
          WHERE o3.size_id = s.id 
          AND o3.date BETWEEN ${startDateStr} AND ${endDateStr}
        )
      ORDER BY s.code
    `);
    
    const taglieAttiveList = taglieAttiveResult.rows.map((row: any) => row.code).filter(Boolean);
    
    // Crea array con tutti i giorni del mese
    const daysInMonth = eachDayOfInterval({
      start: startDate,
      end: endDate
    });

    const monthData: Record<string, any> = {};
    
    const taglieVuote = taglieAttiveList.map((code: any) => ({
      taglia: code,
      quantita: 0
    }));
    
    daysInMonth.forEach(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      monthData[dateKey] = {
        operations: [],
        totals: { totale_entrate: 0, totale_uscite: 0, bilancio_netto: 0, numero_operazioni: 0 },
        giacenza: 0,
        taglie: [],
        dettaglio_taglie: [...taglieVuote]
      };
    });

    // Step 2: Recupera operazioni del mese
    const allOperationsResult = await db.execute(sql`
      SELECT 
        o.id, o.date, o.type, o.basket_id, o.animal_count, o.created_at,
        b.physical_number as basket_physical_number,
        f.name as flupsy_name,
        s.code as size_code
      FROM operations o
      LEFT JOIN baskets b ON o.basket_id = b.id
      LEFT JOIN flupsys f ON b.flupsy_id = f.id
      LEFT JOIN sizes s ON o.size_id = s.id
      WHERE o.date BETWEEN ${startDateStr} AND ${endDateStr}
    `);
    
    // Organizza operazioni per data
    const operationsByDate: Record<string, any[]> = {};
    allOperationsResult.rows.forEach((op: any) => {
      if (!op.date) return;
      
      const dateStr = typeof op.date === 'string' 
        ? op.date 
        : format(new Date(op.date), "yyyy-MM-dd");
        
      if (!operationsByDate[dateStr]) {
        operationsByDate[dateStr] = [];
      }
      operationsByDate[dateStr].push(op);
    });
    
    // Popola i dati per ogni giorno
    for (const [dateKey, operations] of Object.entries(operationsByDate)) {
      if (monthData[dateKey]) {
        monthData[dateKey].operations = operations;
        
        // Calcola totali
        let totaleEntrate = 0;
        let totaleUscite = 0;
        
        operations.forEach(op => {
          const count = parseInt(op.animal_count) || 0;
          if (['prima-attivazione', 'prima-attivazione-da-vagliatura'].includes(op.type)) {
            totaleEntrate += count;
          } else if (['vendita', 'cessazione'].includes(op.type)) {
            totaleUscite += count;
          }
        });
        
        monthData[dateKey].totals = {
          totale_entrate: totaleEntrate,
          totale_uscite: totaleUscite,
          bilancio_netto: totaleEntrate - totaleUscite,
          numero_operazioni: operations.length
        };
      }
    }
    
    return monthData;
  }
}

export const diarioService = new DiarioService();
