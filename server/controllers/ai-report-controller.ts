import type { Express, Request, Response } from "express";
import { db } from "../db";
import OpenAI from "openai";
import * as XLSX from 'xlsx';
import { sql } from "drizzle-orm";

const AI_API_KEY = process.env.OPENAI_API_KEY;
const AI_BASE_URL = 'https://api.deepseek.com';
const AI_MODEL = 'deepseek-chat';

// Client DeepSeek per report generation
let aiClient: OpenAI | null = null;

function initializeAIClient() {
  const currentApiKey = process.env.OPENAI_API_KEY;
  if (currentApiKey && currentApiKey.length > 10) {
    aiClient = new OpenAI({
      apiKey: currentApiKey,
      baseURL: AI_BASE_URL,
      timeout: 30000
    });
    return true;
  }
  return false;
}

initializeAIClient();

// Schema database completo per l'AI
const DATABASE_SCHEMA = `
TABELLE PRINCIPALI:
- flupsys: id, name, location, description, active, max_positions, production_center
- baskets: id, physical_number, flupsy_id, cycle_code, state, current_cycle_id, row, position
- operations: id, date, type, basket_id, cycle_id, size_id, sgr_id, lot_id, animal_count, total_weight, animals_per_kg, average_weight, dead_count, mortality_rate, notes, metadata
- cycles: id, basket_id, lot_id, start_date, end_date, state
- lots: id, arrival_date, supplier, supplier_lot_number, quality, animal_count, weight, notes, total_mortality
- sizes: id, code, description, tp_number
- basket_lot_composition: id, basket_id, cycle_id, lot_id, animal_count, percentage
- advanced_sales: id, sale_number, sale_date, customer_name, customer_address, customer_vat, total_amount, ddt_status, ddt_number, ddt_date, notes
- sale_bags: id, sale_id, bag_number, size_id, quantity_kg, animals_per_kg, unit_price, total_price
- sale_allocations: id, bag_id, basket_id, cycle_id, quantity_kg

TIPI OPERAZIONE:
prima-attivazione, pulizia, vagliatura, trattamento, misura, vendita, selezione-vendita, cessazione, peso, selezione-origine, dismissione, chiusura-ciclo-vagliatura

JOIN COMUNI:
- operations JOIN baskets ON operations.basket_id = baskets.id
- operations JOIN flupsys ON baskets.flupsy_id = flupsys.id
- operations JOIN cycles ON operations.cycle_id = cycles.id
- operations JOIN lots ON operations.lot_id = lots.id
- operations JOIN sizes ON operations.size_id = sizes.id
- basket_lot_composition JOIN lots ON basket_lot_composition.lot_id = lots.id
- advanced_sales JOIN sale_bags ON advanced_sales.id = sale_bags.sale_id
- sale_bags JOIN sale_allocations ON sale_bags.id = sale_allocations.bag_id
`;

/**
 * Controller per generazione report Excel con AI
 */
export function registerAIReportRoutes(app: Express) {
  
  /**
   * Endpoint principale per generazione report AI
   */
  app.post("/api/ai/generate-report", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'Prompt richiesto' 
        });
      }

      console.log('📊 AI REPORT REQUEST:', prompt);

      // Verifica disponibilità AI
      if (!aiClient || !AI_API_KEY) {
        return res.status(503).json({ 
          success: false, 
          error: 'Servizio AI non disponibile. Verifica la configurazione della API key.' 
        });
      }

      // Step 1: Analizza richiesta e genera query SQL
      const analysisPrompt = `
Sei un esperto di database PostgreSQL e analisi dati per sistemi di acquacoltura.

SCHEMA DATABASE:
${DATABASE_SCHEMA}

RICHIESTA UTENTE:
"${prompt}"

COMPITI:
1. Analizza la richiesta dell'utente
2. Genera una query SQL PostgreSQL ottimizzata per estrarre i dati richiesti
3. Specifica quali colonne includere nel report Excel
4. Suggerisci formattazione e aggregazioni

Restituisci un JSON con questo formato:
{
  "analysis": "Breve analisi della richiesta",
  "sqlQuery": "Query SQL completa (usa alias chiari per le colonne)",
  "columns": ["colonna1", "colonna2", ...],
  "columnTitles": {"colonna1": "Titolo Italiano", "colonna2": "Titolo Italiano", ...},
  "aggregations": ["SUM(total_weight) as peso_totale", ...],
  "groupBy": ["flupsy_name", ...],
  "orderBy": ["date DESC", ...],
  "reportTitle": "Titolo del Report",
  "reportDescription": "Descrizione breve del report"
}

IMPORTANTE:
- Usa SEMPRE alias chiari e descrittivi per le colonne
- Includi date in formato leggibile (TO_CHAR per le date)
- Aggrega i dati quando necessario (SUM, COUNT, AVG)
- Filtra per periodo temporale se richiesto
- Usa LEFT JOIN per evitare perdita di dati
- Limita i risultati a max 10000 righe per performance
`;

      const analysisResponse = await aiClient.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "Sei un esperto database analyst specializzato in acquacoltura. Genera query SQL ottimizzate e ben strutturate."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3000
      });

      const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');
      console.log('🔍 AI ANALYSIS:', analysis);

      if (!analysis.sqlQuery) {
        return res.status(500).json({ 
          success: false, 
          error: 'L\'AI non è riuscita a generare una query SQL valida' 
        });
      }

      // Step 2: Esegui query SQL
      console.log('🔍 EXECUTING SQL:', analysis.sqlQuery);
      
      let queryResult;
      try {
        queryResult = await db.execute(sql.raw(analysis.sqlQuery));
      } catch (sqlError: any) {
        console.error('❌ SQL ERROR:', sqlError);
        
        // Chiedi all'AI di correggere la query
        const fixPrompt = `
La query SQL ha generato questo errore:
${sqlError.message}

Query originale:
${analysis.sqlQuery}

Correggi la query e restituisci un JSON con:
{
  "sqlQuery": "Query SQL corretta",
  "explanation": "Spiegazione della correzione"
}
`;
        
        const fixResponse = await aiClient.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: "Sei un esperto SQL debugger." },
            { role: "user", content: fixPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        });
        
        const fix = JSON.parse(fixResponse.choices[0].message.content || '{}');
        console.log('🔧 AI FIX:', fix);
        
        if (fix.sqlQuery) {
          queryResult = await db.execute(sql.raw(fix.sqlQuery));
        } else {
          throw sqlError;
        }
      }

      const rows = Array.isArray(queryResult) ? queryResult : queryResult.rows || [];
      console.log(`✅ QUERY SUCCESS: ${rows.length} righe estratte`);

      if (rows.length === 0) {
        return res.json({
          success: true,
          message: 'Query eseguita con successo, ma nessun dato trovato per i criteri specificati.',
          report: null
        });
      }

      // Step 3: Genera Excel
      const workbook = XLSX.utils.book_new();
      
      // Prepara dati con titoli italiani
      const excelData = rows.map((row: any) => {
        const mappedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          const italianTitle = analysis.columnTitles?.[key] || key;
          mappedRow[italianTitle] = value;
        }
        return mappedRow;
      });

      // Crea worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Imposta larghezza colonne automatica
      const columnWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = columnWidths;

      // Aggiungi worksheet al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dati');

      // Aggiungi sheet di riepilogo se ci sono aggregazioni
      if (analysis.aggregations && analysis.aggregations.length > 0) {
        const summaryData = [{
          'Report': analysis.reportTitle || 'Report Personalizzato',
          'Descrizione': analysis.reportDescription || '',
          'Data Generazione': new Date().toLocaleDateString('it-IT'),
          'Totale Righe': rows.length
        }];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Riepilogo');
      }

      // Converti in buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Genera filename univoco
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `report_${timestamp}.xlsx`;

      // Converti buffer in base64 per trasmissione
      const base64Excel = excelBuffer.toString('base64');

      // Preview dei primi 3 record
      const preview = rows.slice(0, 3).map((row: any) => 
        Object.entries(row)
          .map(([k, v]) => `${analysis.columnTitles?.[k] || k}: ${v}`)
          .join(', ')
      ).join('\n');

      res.json({
        success: true,
        message: `Report generato con successo! ${rows.length} righe estratte.`,
        report: {
          filename,
          downloadUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Excel}`,
          preview: `Anteprima (prime 3 righe):\n\n${preview}\n\n... e altre ${rows.length - 3} righe`,
          rowCount: rows.length,
          title: analysis.reportTitle || 'Report Personalizzato',
          description: analysis.reportDescription || ''
        }
      });

    } catch (error: any) {
      console.error('❌ ERRORE GENERAZIONE REPORT:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Errore durante la generazione del report' 
      });
    }
  });
}
