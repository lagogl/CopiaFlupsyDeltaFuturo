import { Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Ottiene informazioni sulle sequenze delle tabelle nel database
 * 
 * @param {Request} req - La richiesta HTTP
 * @param {Response} res - La risposta HTTP
 */
export async function getSequencesInfo(req: Request, res: Response) {
  try {
    // Query per ottenere le informazioni sulle sequenze
    const result = await db.execute(sql.raw(`
      SELECT 
        ns.nspname as schema,
        cls.relname as table_name,
        seq.relname as sequence_name,
        pg_get_serial_sequence(cls.relname, 'id') as sequence_path,
        last_value 
      FROM pg_class seq
      JOIN pg_namespace ns ON ns.oid = seq.relnamespace
      JOIN pg_depend dep ON dep.objid = seq.oid
      JOIN pg_class cls ON cls.oid = dep.refobjid
      JOIN pg_attribute att ON att.attrelid = dep.refobjid AND att.attnum = dep.refobjsubid
      LEFT JOIN information_schema.sequences inf ON inf.sequence_schema = ns.nspname AND inf.sequence_name = seq.relname
      WHERE 
        seq.relkind = 'S' 
        AND cls.relname IN ('lots', 'baskets', 'cycles', 'operations')
      ORDER BY cls.relname
    `));

    res.json({
      success: true,
      sequences: result
    });
  } catch (error) {
    console.error("Errore durante il recupero delle informazioni sulle sequenze:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero delle informazioni sulle sequenze"
    });
  }
}

/**
 * Resetta una sequenza di ID a un valore specifico
 * 
 * @param {Request} req - La richiesta HTTP
 * @param {Response} res - La risposta HTTP
 */
export async function resetSequence(req: Request, res: Response) {
  try {
    const { table, startValue, password } = req.body;

    // Verifica della password di sicurezza
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({
        success: false,
        message: "Password di sicurezza non valida"
      });
    }

    // Verifica la tabella specificata
    if (!table || typeof table !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Tabella non specificata o non valida"
      });
    }

    // Verifica che la tabella sia supportata
    const supportedTables = ['lots', 'baskets', 'cycles', 'operations', 'flupsy'];
    if (!supportedTables.includes(table)) {
      return res.status(400).json({
        success: false,
        message: `Tabella '${table}' non supportata. Tabelle supportate: ${supportedTables.join(', ')}`
      });
    }

    // Imposta il valore iniziale predefinito a 1 se non specificato
    const newStartValue = startValue ? parseInt(startValue.toString()) : 1;
    
    if (isNaN(newStartValue) || newStartValue < 1) {
      return res.status(400).json({
        success: false,
        message: "Il valore iniziale deve essere un numero intero positivo"
      });
    }

    // Ottieni il nome della sequenza per la tabella specificata
    const sequenceQueryResult = await db.execute(sql.raw(`
      SELECT pg_get_serial_sequence('${table}', 'id') as sequence_name
    `));

    // Verifica che ci sia un risultato e che abbia la proprietà sequence_name
    if (!sequenceQueryResult || !sequenceQueryResult[0]) {
      return res.status(404).json({
        success: false,
        message: `Sequenza per la tabella '${table}' non trovata`
      });
    }
    
    const sequenceName = String(sequenceQueryResult[0].sequence_name);
    
    if (!sequenceName) {
      return res.status(404).json({
        success: false,
        message: `Sequenza per la tabella '${table}' non trovata`
      });
    }

    // Resetta la sequenza al valore specificato
    await db.execute(sql.raw(`
      ALTER SEQUENCE ${sequenceName} RESTART WITH ${newStartValue}
    `));

    res.json({
      success: true,
      message: `Sequenza ID per la tabella '${table}' resettata a ${newStartValue}`,
      table,
      newStartValue
    });
  } catch (error) {
    console.error("Errore durante il reset della sequenza:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel reset della sequenza"
    });
  }
}