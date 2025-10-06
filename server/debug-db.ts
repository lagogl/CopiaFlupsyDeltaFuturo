// File server/debug-db.ts
// Script di diagnostica per verificare la connessione al database

import { pool, db } from './db';
import { operations, flupsys, baskets } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Funzione che testa la connessione e le operazioni di base sul database
 */
export async function testDatabaseConnection() {
  console.log("===== AVVIO TEST DIAGNOSTICI DATABASE =====");
  
  try {
    // 1. Test Connessione Base
    console.log("Test 1: Connessione diretta con pool...");
    const connectionResult = await pool.query('SELECT 1 as test');
    console.log("Risultato test connessione diretta:", connectionResult);
    
    // 2. Test Query Semplice con drizzle
    console.log("Test 2: Query semplice con drizzle...");
    const drizzleResult = await db.execute(sql`SELECT current_database(), current_user`);
    console.log("Risultato test drizzle:", drizzleResult);
    
    // 3. Test Lettura Tabella con drizzle
    console.log("Test 3: Conteggio righe nelle tabelle principali...");
    
    const flupsyCount = await db.select({ count: sql`count(*)` }).from(flupsys);
    console.log(`- Tabella flupsys: ${flupsyCount[0].count} righe`);
    
    const basketsCount = await db.select({ count: sql`count(*)` }).from(baskets);
    console.log(`- Tabella baskets: ${basketsCount[0].count} righe`);
    
    const operationsCount = await db.select({ count: sql`count(*)` }).from(operations);
    console.log(`- Tabella operations: ${operationsCount[0].count} righe`);
    
    // 4. Test Inserimento e Cancellazione
    console.log("Test 4: Test di inserimento e cancellazione...");
    
    // Inserimento di un record di test
    console.log("Tentativo inserimento record di test...");
    const testData = {
      name: `test-flupsy-${Date.now()}`,
      location: "TEST-LOCATION",
      description: "Record di test per diagnostica",
      active: true
    };
    
    const insertResult = await db.insert(flupsys).values(testData).returning();
    console.log("Risultato inserimento:", insertResult);
    
    if (insertResult && insertResult.length > 0) {
      const testId = insertResult[0].id;
      console.log(`Record di test inserito con ID: ${testId}`);
      
      // Cancellazione del record di test
      console.log("Tentativo cancellazione record di test...");
      const deleteResult = await db.delete(flupsys).where(sql`id = ${testId}`).returning();
      console.log("Risultato cancellazione:", deleteResult);
    }
    
    console.log("===== DIAGNOSTICA DATABASE COMPLETATA CON SUCCESSO =====");
    return true;
  } catch (error) {
    console.error("===== ERRORE DURANTE I TEST DIAGNOSTICI DEL DATABASE =====");
    console.error("Dettagli errore:", error);
    console.error("Stack trace:", (error as Error).stack);
    return false;
  }
}