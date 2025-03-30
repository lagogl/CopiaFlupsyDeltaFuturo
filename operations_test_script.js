/**
 * Script di test per verificare il funzionamento delle operazioni
 * 
 * Questo script è progettato per testare la creazione di operazioni
 * direttamente contro il database, bypassando l'API Express.
 * Può essere utile per identificare se i problemi sono nel layer API
 * o nel layer database.
 */

// Importa la connessione al database e gli schemi
const { db } = require('./server/db');
const { operations } = require('./shared/schema');
const { eq } = require('drizzle-orm');
const { DbStorage } = require('./server/db-storage');

// Crea un'istanza dello storage
const storage = new DbStorage();

// Funzione di test principale
async function runTests() {
  console.log("===== AVVIO TEST OPERAZIONI =====");
  let testOperation;
  let createdOperationId;

  try {
    // 1. Test di connessione al database
    console.log("\n🔍 Test 1: Verifica connessione al database");
    try {
      // Esegui una query semplice
      const result = await db.select({ count: sql`count(*)` }).from(operations);
      console.log("✅ Connessione al database riuscita:", result);
    } catch (error) {
      console.error("❌ Errore di connessione al database:", error);
      process.exit(1);
    }

    // 2. Test creazione operazione di tipo "peso"
    console.log("\n🔍 Test 2: Creazione operazione di tipo 'peso'");
    
    testOperation = {
      type: 'peso',
      date: new Date().toISOString().split('T')[0],
      basketId: 1, // Assicurarsi che questo ID esista
      cycleId: 1,  // Assicurarsi che questo ID esista
      sampleCount: 10,
      totalWeight: 50.5,
      averageWeight: 5.05,
      animalsPerKg: 198,
      notes: 'Test operazione creata da script'
    };
    
    console.log("Dati operazione test:", testOperation);
    
    try {
      const createdOperation = await storage.createOperation(testOperation);
      createdOperationId = createdOperation.id;
      
      console.log("✅ Operazione creata con successo:", createdOperation);
      console.log("  ID:", createdOperation.id);
      console.log("  Data:", createdOperation.date);
      console.log("  Tipo:", createdOperation.type);
    } catch (error) {
      console.error("❌ Errore durante la creazione dell'operazione:", error);
    }
    
    // Se l'operazione è stata creata, proviamo a recuperarla
    if (createdOperationId) {
      console.log("\n🔍 Test 3: Recupero operazione appena creata");
      try {
        const retrievedOperation = await storage.getOperation(createdOperationId);
        
        if (retrievedOperation) {
          console.log("✅ Operazione recuperata con successo:", retrievedOperation);
          
          // Verifica che i dati corrispondano
          const matches = retrievedOperation.type === testOperation.type &&
                         retrievedOperation.basketId === testOperation.basketId &&
                         retrievedOperation.cycleId === testOperation.cycleId;
                         
          console.log("  I dati corrispondono?", matches ? "✅ Sì" : "❌ No");
        } else {
          console.error("❌ Operazione non trovata nel database!");
        }
      } catch (error) {
        console.error("❌ Errore durante il recupero dell'operazione:", error);
      }
      
      // Pulisci dopo il test eliminando l'operazione
      console.log("\n🔍 Test 4: Pulizia - Eliminazione operazione di test");
      try {
        const deleted = await storage.deleteOperation(createdOperationId);
        console.log("✅ Operazione eliminata:", deleted);
      } catch (error) {
        console.error("❌ Errore durante l'eliminazione dell'operazione:", error);
      }
    }
    
    console.log("\n===== TEST COMPLETATI =====");
  } catch (error) {
    console.error("Errore durante l'esecuzione dei test:", error);
  } finally {
    // Chiudi la connessione al database
    try {
      // Se necessario, implementa una logica di chiusura del db
      console.log("Chiusura connessione al database...");
    } catch (err) {
      console.error("Errore durante la chiusura della connessione al database:", err);
    }
  }
}

// Esegui i test
runTests()
  .catch(error => {
    console.error("Errore non gestito:", error);
    process.exit(1);
  });