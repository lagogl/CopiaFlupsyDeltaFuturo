/**
 * Utility per aggiungere un endpoint di reset degli ID alla tua applicazione Express
 * 
 * Questo file crea un modulo che puoi importare nel file routes.ts per aggiungere
 * un endpoint di amministrazione che permette di resettare i contatori delle sequenze
 * delle tabelle principali.
 */

import { sql } from 'drizzle-orm';

/**
 * Aggiunge gli endpoint di reset degli ID all'app Express
 * @param {object} app - L'istanza Express
 * @param {object} db - L'istanza Drizzle
 */
export function addResetIdEndpoints(app, db) {
  // Endpoint per resettare la sequenza ID di una tabella specifica
  app.post('/api/admin/reset-sequence', async (req, res) => {
    try {
      const { table, startValue = 1, adminToken } = req.body;
      
      // Controllo di sicurezza semplice (da migliorare in produzione)
      const expectedToken = process.env.ADMIN_TOKEN || 'admin_token_default';
      if (adminToken !== expectedToken) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non autorizzato. Token di amministrazione non valido.' 
        });
      }
      
      // Verifica che la tabella sia tra quelle consentite
      const allowedTables = ['lots', 'baskets', 'operations', 'cycles'];
      if (!allowedTables.includes(table)) {
        return res.status(400).json({ 
          success: false, 
          message: `Tabella non valida. Le tabelle consentite sono: ${allowedTables.join(', ')}` 
        });
      }
      
      // Ottieni il nome esatto della sequenza
      const sequenceResult = await db.execute(
        sql`SELECT pg_get_serial_sequence(${table}, 'id') as sequence_name`
      );
      
      if (!sequenceResult || !sequenceResult.length || !sequenceResult[0].sequence_name) {
        return res.status(500).json({ 
          success: false, 
          message: `Impossibile determinare il nome della sequenza per la tabella ${table}.` 
        });
      }
      
      const sequenceName = sequenceResult[0].sequence_name;
      
      // Resetta la sequenza al valore desiderato
      await db.execute(sql`ALTER SEQUENCE ${sql.raw(sequenceName)} RESTART WITH ${startValue}`);
      
      // Restituisci successo
      res.json({ 
        success: true, 
        message: `Sequenza ID per la tabella ${table} resettata. Il prossimo ID sarà: ${startValue}`,
        table,
        sequenceName,
        startValue
      });
      
    } catch (error) {
      console.error('Errore durante il reset della sequenza:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante il reset della sequenza.',
        error: error.message
      });
    }
  });
  
  // Endpoint di utility per ottenere informazioni sulle sequenze
  app.get('/api/admin/sequences', async (req, res) => {
    try {
      const { adminToken } = req.query;
      
      // Controllo di sicurezza
      const expectedToken = process.env.ADMIN_TOKEN || 'admin_token_default';
      if (adminToken !== expectedToken) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non autorizzato. Token di amministrazione non valido.' 
        });
      }
      
      const tables = ['lots', 'baskets', 'operations', 'cycles'];
      const sequences = [];
      
      for (const table of tables) {
        // Ottieni il nome della sequenza
        const sequenceResult = await db.execute(
          sql`SELECT pg_get_serial_sequence(${table}, 'id') as sequence_name`
        );
        
        if (sequenceResult && sequenceResult.length && sequenceResult[0].sequence_name) {
          const sequenceName = sequenceResult[0].sequence_name;
          
          // Ottieni il valore corrente
          const currentValue = await db.execute(
            sql`SELECT last_value, is_called FROM ${sql.raw(sequenceName)}`
          );
          
          sequences.push({
            table,
            sequenceName,
            lastValue: currentValue[0].last_value,
            nextValue: currentValue[0].is_called ? currentValue[0].last_value + 1 : currentValue[0].last_value
          });
        } else {
          sequences.push({
            table,
            sequenceName: null,
            error: 'Sequenza non trovata'
          });
        }
      }
      
      res.json({ 
        success: true, 
        sequences 
      });
      
    } catch (error) {
      console.error('Errore durante il recupero delle informazioni sulle sequenze:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero delle informazioni sulle sequenze.',
        error: error.message
      });
    }
  });
  
  console.log('✅ Endpoint di reset degli ID configurati con successo.');
}