/**
 * Service per la gestione del database (backup, restore, integrity)
 */

import { 
  createDatabaseBackup, 
  restoreDatabaseFromBackup, 
  getAvailableBackups,
  generateFullDatabaseDump,
  restoreDatabaseFromUploadedFile,
  deleteBackup
} from '../../../database-service';
import { checkDatabaseIntegrityHandler as checkIntegrity } from '../../../controllers/database-integrity-controller';
import { db } from '../../../db';
import { flupsys, baskets, cycles, operations, lots } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

class DatabaseService {
  /**
   * Crea un backup del database
   */
  async createBackup() {
    return await createDatabaseBackup();
  }

  /**
   * Ottiene la lista dei backup disponibili
   */
  getBackups() {
    return getAvailableBackups();
  }

  /**
   * Ripristina il database da un backup specifico
   */
  async restoreFromBackup(backupId: string) {
    return await restoreDatabaseFromBackup(backupId);
  }

  /**
   * Ripristina il database da file caricato
   */
  async restoreFromFile(filePath: string) {
    return await restoreDatabaseFromUploadedFile(filePath);
  }

  /**
   * Elimina un backup
   */
  deleteBackup(backupId: string) {
    return deleteBackup(backupId);
  }

  /**
   * Genera dump SQL completo del database
   */
  async generateDump() {
    return await generateFullDatabaseDump();
  }

  /**
   * Genera snapshot dello stato corrente del database
   */
  async generateSnapshot() {
    console.log('📊 Generazione snapshot database...');
    
    // 1. FLUPSYS CON CESTELLI E CICLI ATTIVI
    const flupsysData = await db
      .select({
        flupsy: flupsys,
        basket: baskets,
        cycle: cycles,
        lastOperation: {
          id: operations.id,
          type: operations.type,
          date: operations.date,
          totalWeight: operations.totalWeight,
          animalCount: operations.animalCount,
          averageWeight: operations.averageWeight,
          sizeId: operations.sizeId
        }
      })
      .from(flupsys)
      .leftJoin(baskets, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(cycles, and(
        eq(cycles.basketId, baskets.id),
        eq(cycles.state, 'active')
      ))
      .leftJoin(operations, sql`${operations.id} = (
        SELECT o.id FROM ${operations} o 
        WHERE o.basket_id = ${baskets.id} 
        ORDER BY o.date DESC, o.id DESC 
        LIMIT 1
      )`)
      .where(eq(flupsys.active, true))
      .orderBy(flupsys.name, baskets.physicalNumber);

    // 2. RAGGRUPPAMENTO PER FLUPSYS
    const flupsysMap = new Map();
    
    for (const row of flupsysData) {
      const flupsyId = row.flupsy.id;
      
      if (!flupsysMap.has(flupsyId)) {
        flupsysMap.set(flupsyId, {
          flupsy: row.flupsy,
          baskets: [],
          totalBaskets: 0,
          activeBaskets: 0,
          totalAnimals: 0,
          totalWeight: 0
        });
      }
      
      const flupsyDataItem = flupsysMap.get(flupsyId);
      
      if (row.basket) {
        const basketInfo = {
          basket: row.basket,
          cycle: row.cycle,
          lastOperation: row.lastOperation,
          animals: row.lastOperation?.animalCount || 0,
          weight: row.lastOperation?.totalWeight || 0,
          averageWeight: row.lastOperation?.averageWeight || 0,
          hasActiveCycle: !!row.cycle
        };
        
        flupsyDataItem.baskets.push(basketInfo);
        flupsyDataItem.totalBaskets++;
        
        if (row.cycle) {
          flupsyDataItem.activeBaskets++;
          flupsyDataItem.totalAnimals += basketInfo.animals;
          flupsyDataItem.totalWeight += basketInfo.weight;
        }
      }
    }

    // 3. LOTTI ATTIVI
    const activeLots = await db
      .select()
      .from(lots)
      .where(eq(lots.active, true));

    // 4. OPERAZIONI RECENTI
    const recentOperations = await db
      .select()
      .from(operations)
      .orderBy(sql`${operations.date} DESC, ${operations.id} DESC`)
      .limit(100);

    // 5. STATISTICHE AGGREGATE
    const stats = {
      totalFlupsys: flupsysMap.size,
      totalBaskets: Array.from(flupsysMap.values()).reduce((sum, f) => sum + f.totalBaskets, 0),
      totalActiveBaskets: Array.from(flupsysMap.values()).reduce((sum, f) => sum + f.activeBaskets, 0),
      totalAnimals: Array.from(flupsysMap.values()).reduce((sum, f) => sum + f.totalAnimals, 0),
      totalWeight: Array.from(flupsysMap.values()).reduce((sum, f) => sum + f.totalWeight, 0),
      activeLots: activeLots.length,
      recentOperations: recentOperations.length
    };

    const snapshot = {
      timestamp: new Date().toISOString(),
      stats,
      flupsys: Array.from(flupsysMap.values()),
      activeLots,
      recentOperations: recentOperations.slice(0, 20)
    };

    console.log(`✅ Snapshot generato: ${stats.totalFlupsys} FLUPSY, ${stats.totalActiveBaskets}/${stats.totalBaskets} cestelli attivi`);
    
    return snapshot;
  }
}

export const databaseService = new DatabaseService();
