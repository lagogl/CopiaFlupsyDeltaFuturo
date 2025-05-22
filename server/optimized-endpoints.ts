// File: server/optimized-endpoints.ts
// Implementazione di endpoint ottimizzati per migliorare le prestazioni

import type { Express } from "express";
import { db } from './db';
import { 
  operations, cycles, baskets, lots, sizes, flupsys 
} from '../shared/schema';
import { sql, eq, desc } from 'drizzle-orm';

/**
 * Registra endpoint ottimizzati per migliorare le prestazioni dell'applicazione
 * @param app Express app
 */
export function registerOptimizedEndpoints(app: Express) {
  console.log("Registrazione di endpoint ottimizzati per migliorare le prestazioni");
  
  // Endpoint ottimizzato per le operazioni con paginazione, ordinamento e relazioni precaricate
  app.get('/api/operations-optimized', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      console.time('operations-query');
      
      // Query con JOIN per ottenere i dati correlati in una sola query
      const result = await db.query.operations.findMany({
        limit,
        offset,
        orderBy: [desc(operations.date), desc(operations.id)],
        with: {
          // Definire le relazioni nelle query è necessario per questo approccio
          // Per semplicità qui usiamo una query SQL personalizzata
        }
      });
      
      // In alternativa, usa SQL diretto per ottenere dati con join
      const operationsWithRelations = await db.execute(sql`
        SELECT o.*, 
               b.physical_number as basket_number, b.flupsy_id,
               c.start_date as cycle_start_date,
               s.code as size_code, s.name as size_name,
               l.name as lot_name, l.supplier as lot_supplier
        FROM operations o
        LEFT JOIN baskets b ON o.basket_id = b.id
        LEFT JOIN cycles c ON o.cycle_id = c.id
        LEFT JOIN sizes s ON o.size_id = s.id
        LEFT JOIN lots l ON o.lot_id = l.id
        ORDER BY o.date DESC, o.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      // Ottieni il numero totale di operazioni per la paginazione
      const [countResult] = await db.select({
        count: sql`count(*)`
      }).from(operations);
      
      const totalItems = Number(countResult.count);
      const totalPages = Math.ceil(totalItems / limit);
      
      console.timeEnd('operations-query');
      
      res.json({
        operations: operationsWithRelations,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error("Errore durante il recupero delle operazioni ottimizzate:", error);
      res.status(500).json({ error: "Errore nel recupero delle operazioni" });
    }
  });
  
  // Endpoint ottimizzato per i cestelli con relazioni precaricate
  app.get('/api/baskets-optimized', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      console.time('baskets-query');
      
      // Query con JOIN per ottenere i dati dei cestelli con FLUPSY e ciclo corrente
      const basketsWithRelations = await db.execute(sql`
        SELECT b.*, 
               f.name as flupsy_name, f.rows as flupsy_rows, f.positions as flupsy_positions,
               c.start_date as cycle_start_date, c.state as cycle_state
        FROM baskets b
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        LEFT JOIN cycles c ON b.current_cycle_id = c.id
        ORDER BY b.flupsy_id, b.row, b.position
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      // Ottieni il numero totale di cestelli per la paginazione
      const [countResult] = await db.select({
        count: sql`count(*)`
      }).from(baskets);
      
      const totalItems = Number(countResult.count);
      const totalPages = Math.ceil(totalItems / limit);
      
      console.timeEnd('baskets-query');
      
      res.json({
        baskets: basketsWithRelations,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error("Errore durante il recupero dei cestelli ottimizzati:", error);
      res.status(500).json({ error: "Errore nel recupero dei cestelli" });
    }
  });
  
  // Endpoint ottimizzato per i cicli con relazioni precaricate
  app.get('/api/cycles-optimized', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      console.time('cycles-query');
      
      // Query con JOIN per ottenere i dati dei cicli con cestello e ultima operazione
      const cyclesWithRelations = await db.execute(sql`
        SELECT c.*, 
               b.physical_number as basket_number, b.flupsy_id,
               f.name as flupsy_name
        FROM cycles c
        LEFT JOIN baskets b ON c.basket_id = b.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        ORDER BY c.start_date DESC, c.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      // Ottieni il numero totale di cicli per la paginazione
      const [countResult] = await db.select({
        count: sql`count(*)`
      }).from(cycles);
      
      const totalItems = Number(countResult.count);
      const totalPages = Math.ceil(totalItems / limit);
      
      console.timeEnd('cycles-query');
      
      res.json({
        cycles: cyclesWithRelations,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error("Errore durante il recupero dei cicli ottimizzati:", error);
      res.status(500).json({ error: "Errore nel recupero dei cicli" });
    }
  });
  
  // Endpoint ottimizzato per i lotti con statistiche
  app.get('/api/lots-optimized', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      console.time('lots-query');
      
      // Query con subqueries per statistiche aggregate
      const lotsWithStats = await db.execute(sql`
        SELECT l.*,
              (SELECT COUNT(*) FROM cycles c
               JOIN baskets b ON c.basket_id = b.id
               JOIN operations o ON o.lot_id = l.id AND o.cycle_id = c.id
               WHERE o.lot_id = l.id) as related_cycles,
              (SELECT SUM(animal_count) FROM operations
               WHERE lot_id = l.id AND type = 'arrivo') as initial_count
        FROM lots l
        ORDER BY l.arrival_date DESC, l.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      // Ottieni il numero totale di lotti per la paginazione
      const [countResult] = await db.select({
        count: sql`count(*)`
      }).from(lots);
      
      const totalItems = Number(countResult.count);
      const totalPages = Math.ceil(totalItems / limit);
      
      console.timeEnd('lots-query');
      
      res.json({
        lots: lotsWithStats,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } catch (error) {
      console.error("Errore durante il recupero dei lotti ottimizzati:", error);
      res.status(500).json({ error: "Errore nel recupero dei lotti" });
    }
  });
  
  // Endpoint ottimizzato che precarica i dati principali per il dashboard
  app.get('/api/dashboard-data', async (req, res) => {
    try {
      console.time('dashboard-query');
      
      // 1. Ottieni gli ultimi 10 cicli attivi con dati correlati
      const activeCycles = await db.execute(sql`
        SELECT c.*, 
               b.physical_number as basket_number, b.flupsy_id,
               f.name as flupsy_name,
               (SELECT COUNT(*) FROM operations o WHERE o.cycle_id = c.id) as operation_count
        FROM cycles c
        LEFT JOIN baskets b ON c.basket_id = b.id
        LEFT JOIN flupsys f ON b.flupsy_id = f.id
        WHERE c.state = 'active'
        ORDER BY c.start_date DESC
        LIMIT 10
      `);
      
      // 2. Ottieni le ultime 10 operazioni con dati correlati
      const recentOperations = await db.execute(sql`
        SELECT o.*, 
               b.physical_number as basket_number,
               s.code as size_code, s.name as size_name,
               l.name as lot_name
        FROM operations o
        LEFT JOIN baskets b ON o.basket_id = b.id
        LEFT JOIN sizes s ON o.size_id = s.id
        LEFT JOIN lots l ON o.lot_id = l.id
        ORDER BY o.date DESC, o.id DESC
        LIMIT 10
      `);
      
      // 3. Ottieni statistiche generali
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM cycles WHERE state = 'active') as active_cycles,
          (SELECT COUNT(*) FROM baskets) as total_baskets,
          (SELECT COUNT(*) FROM operations WHERE date >= CURRENT_DATE - INTERVAL '30 days') as recent_operations,
          (SELECT COUNT(*) FROM lots WHERE state = 'active') as active_lots
      `);
      
      console.timeEnd('dashboard-query');
      
      res.json({
        activeCycles,
        recentOperations,
        stats: stats[0]
      });
    } catch (error) {
      console.error("Errore durante il recupero dei dati del dashboard:", error);
      res.status(500).json({ error: "Errore nel recupero dei dati del dashboard" });
    }
  });
  
  console.log("Endpoint ottimizzati registrati con successo");
}