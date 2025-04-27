import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Controller per gestire le operazioni relative alle sequenze di autoincrement
 */
export async function resetSequence(req: Request, res: Response) {
  try {
    const { table, startValue = 1, password } = req.body;
    
    // Controllo di sicurezza semplice
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';
    if (password !== expectedPassword) {
      return res.status(401).json({ 
        success: false, 
        message: "Password non valida. Non sei autorizzato ad eseguire questa operazione." 
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
    
  } catch (error: any) {
    console.error('Errore durante il reset della sequenza:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il reset della sequenza.',
      error: error.message
    });
  }
}

/**
 * Controller per ottenere informazioni sulle sequenze
 */
export async function getSequencesInfo(req: Request, res: Response) {
  try {
    const { password } = req.query;
    
    // Controllo di sicurezza semplice
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';
    if (password !== expectedPassword) {
      return res.status(401).json({ 
        success: false, 
        message: "Password non valida. Non sei autorizzato ad eseguire questa operazione." 
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
    
  } catch (error: any) {
    console.error('Errore durante il recupero delle informazioni sulle sequenze:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore durante il recupero delle informazioni sulle sequenze.',
      error: error.message
    });
  }
}