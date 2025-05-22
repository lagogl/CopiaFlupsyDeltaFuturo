import { db } from './db';
import { sql, eq, and, like, gte, lte, asc, desc, SQL } from 'drizzle-orm';
import { lots } from '../shared/schema';

export class DatabaseStorage {
  /**
   * Ottiene i lotti con paginazione e filtri avanzati - versione ottimizzata
   * @param options Opzioni di filtraggio e paginazione
   * @returns Lotti filtrati con statistiche
   */
  async getLotsOptimized(options: {
    page?: number;
    pageSize?: number;
    supplier?: string;
    quality?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sizeId?: number;
    includeStatistics?: boolean;
  }) {
    const {
      page = 1,
      pageSize = 20,
      supplier,
      quality,
      dateFrom,
      dateTo,
      sizeId,
      includeStatistics = false
    } = options;

    console.log('Richiesta ottimizzazione lotti con opzioni:', options);

    // Costruisce la query di base
    let whereConditions = [];
    const params = [];

    if (supplier) {
      whereConditions.push(`supplier = $${params.length + 1}`);
      params.push(supplier);
    }

    if (quality) {
      whereConditions.push(`quality = $${params.length + 1}`);
      params.push(quality);
    }

    if (dateFrom) {
      whereConditions.push(`arrival_date >= $${params.length + 1}`);
      params.push(dateFrom.toISOString().split('T')[0]);
    }

    if (dateTo) {
      whereConditions.push(`arrival_date <= $${params.length + 1}`);
      params.push(dateTo.toISOString().split('T')[0]);
    }

    if (sizeId !== undefined) {
      whereConditions.push(`size_id = $${params.length + 1}`);
      params.push(sizeId);
    }

    console.log('Numero di filtri applicati:', whereConditions.length);

    // Costruisci la query SQL con le condizioni
    let baseQuery = 'select "id", "arrival_date", "supplier", "supplier_lot_number", "quality", "animal_count", "weight", "size_id", "notes", "state" from "lots"';
    if (whereConditions.length > 0) {
      baseQuery += ' where ' + whereConditions.join(' and ');
    }
    baseQuery += ' order by "arrival_date" desc';

    console.log('Query SQL di base:', baseQuery, params);

    try {
      // Esegui la query principale per ottenere il conteggio totale
      const countResult = await db.execute(sql.raw(`
        select count(*) as total
        from (${baseQuery}) as filtered_lots
      `, params));
      
      const totalCount = parseInt(countResult[0]?.total || '0');
      console.log('Conteggio totale lotti:', totalCount);

      // Calcola offset per la paginazione
      const offset = (page - 1) * pageSize;
      
      // Aggiungi paginazione alla query
      const paginatedQuery = `${baseQuery} limit ${pageSize} offset ${offset}`;
      
      // Ottieni i lotti paginati
      const lotsResult = await db.execute(sql.raw(paginatedQuery, params));
      console.log('Recuperati', lotsResult.length, 'lotti');

      // Calcola il numero totale di pagine
      const totalPages = Math.ceil(totalCount / pageSize);

      // Prepara il risultato
      return {
        lots: lotsResult,
        totalCount,
        currentPage: page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Errore nell\'esecuzione della query ottimizzata dei lotti:', error);
      throw new Error('Errore nel recupero dei lotti ottimizzati');
    }
  }

  /**
   * Ottiene statistiche sui lotti raggruppate per qualità
   * @returns Statistiche sui lotti
   */
  async getLotStatistics() {
    try {
      console.time('js-stats-calculation');
      
      const stats = await db.execute(sql`
        SELECT
          COUNT(*) as total_count,
          COALESCE(SUM(CAST(animal_count AS FLOAT)), 0) as totale,
          COALESCE(SUM(CASE WHEN quality = 'normali' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as normali,
          COALESCE(SUM(CASE WHEN quality = 'teste' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as teste,
          COALESCE(SUM(CASE WHEN quality = 'code' THEN CAST(animal_count AS FLOAT) ELSE 0 END), 0) as code
        FROM lots
      `);
      
      // Estrai i risultati
      const result = stats[0] || { 
        total_count: 0,
        totale: 0, 
        normali: 0, 
        teste: 0, 
        code: 0 
      };
      
      // Converti a numeri
      const totalCount = parseInt(result.total_count) || 0;
      const totale = parseFloat(result.totale) || 0;
      const normali = parseFloat(result.normali) || 0;
      const teste = parseFloat(result.teste) || 0;
      const code = parseFloat(result.code) || 0;
      
      // Calcola percentuali
      const percentages = {
        normali: totale > 0 ? Number(((normali / totale) * 100).toFixed(1)) : 0,
        teste: totale > 0 ? Number(((teste / totale) * 100).toFixed(1)) : 0,
        code: totale > 0 ? Number(((code / totale) * 100).toFixed(1)) : 0
      };
      
      console.timeEnd('js-stats-calculation');
      
      return {
        totalCount,
        counts: { normali, teste, code, totale },
        percentages
      };
    } catch (error) {
      console.error('Errore nel calcolo delle statistiche sui lotti:', error);
      throw new Error('Impossibile calcolare le statistiche sui lotti');
    }
  }
}

export const dbStorage = new DatabaseStorage();