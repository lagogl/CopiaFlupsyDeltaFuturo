import type { Express, Request, Response } from "express";
import { db } from "../db";
import OpenAI from "openai";
import * as XLSX from 'xlsx';
import { sql } from "drizzle-orm";
import { getDatabaseSchema, getTableStats } from "../services/ai-report/schema-service";
import { getAllTemplates, getTemplatesByCategory, getTemplateById, applyTemplateParameters } from "../services/ai-report/report-templates";

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

/**
 * Genera file CSV da array di righe
 */
function generateCSV(rows: any[], analysis: any): { buffer: Buffer; filename: string } {
  const header = Object.keys(rows[0] || {})
    .map(key => analysis.columnTitles?.[key] || key);
  
  const csvRows = rows.map(row => 
    Object.values(row).map(val => {
      // Escape virgole e virgolette
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  const csvContent = [header.join(','), ...csvRows].join('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  return {
    buffer: Buffer.from(csvContent, 'utf-8'),
    filename: `report_${timestamp}.csv`
  };
}

/**
 * Genera file JSON da array di righe
 */
function generateJSON(rows: any[], analysis: any): { buffer: Buffer; filename: string } {
  const jsonData = {
    reportTitle: analysis.reportTitle || 'Report Personalizzato',
    reportDescription: analysis.reportDescription || '',
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    data: rows.map((row: any) => {
      const mappedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        const italianTitle = analysis.columnTitles?.[key] || key;
        mappedRow[italianTitle] = value;
      }
      return mappedRow;
    })
  };
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  return {
    buffer: Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8'),
    filename: `report_${timestamp}.json`
  };
}

/**
 * Handler riusabile per generazione report AI
 * Usato sia da /api/ai/generate-report che da /api/ai/generate-from-template
 */
async function generateReportHandler(req: Request, res: Response) {
  try {
    const { prompt, format = 'excel' } = req.body;
    
    // Valida formato
    const validFormats = ['excel', 'csv', 'json'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ 
        success: false, 
        error: `Formato non valido. Formati supportati: ${validFormats.join(', ')}` 
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt richiesto' 
      });
    }

    console.log('📊 AI REPORT REQUEST:', prompt.substring(0, 100) + '...');

    // Verifica disponibilità AI
    if (!aiClient || !AI_API_KEY) {
      return res.status(503).json({ 
        success: false, 
        error: 'Servizio AI non disponibile. Verifica la configurazione della API key.' 
      });
    }

    // Step 1: Ottieni schema database dinamico
    const dbSchema = await getDatabaseSchema();
    console.log(`📋 Schema caricato: ${dbSchema.tables.length} tabelle, ${dbSchema.relationships.length} relazioni`);

    // Step 2: Analizza richiesta e genera query SQL
    const analysisPrompt = `
Sei un esperto di database PostgreSQL e analisi dati per sistemi di acquacoltura.

SCHEMA DATABASE (aggiornato automaticamente):
${dbSchema.schemaText}

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

    // Step 3: Genera file nel formato richiesto
    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const csvResult = generateCSV(rows, analysis);
      fileBuffer = csvResult.buffer;
      filename = csvResult.filename;
      mimeType = 'text/csv';
      console.log(`📄 CSV generato: ${filename} (${rows.length} righe)`);
      
    } else if (format === 'json') {
      const jsonResult = generateJSON(rows, analysis);
      fileBuffer = jsonResult.buffer;
      filename = jsonResult.filename;
      mimeType = 'application/json';
      console.log(`📋 JSON generato: ${filename} (${rows.length} righe)`);
      
    } else {
      // Excel (default)
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

      fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `report_${timestamp}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      console.log(`📊 Excel generato: ${filename} (${rows.length} righe)`);
    }

    // Converti buffer in base64 per trasmissione
    const base64File = fileBuffer.toString('base64');

    // Preview dei primi 3 record
    const preview = rows.slice(0, 3).map((row: any) => 
      Object.entries(row)
        .map(([k, v]) => `${analysis.columnTitles?.[k] || k}: ${v}`)
        .join(', ')
    ).join('\n');

    res.json({
      success: true,
      message: `Report ${format.toUpperCase()} generato con successo! ${rows.length} righe estratte.`,
      report: {
        filename,
        downloadUrl: `data:${mimeType};base64,${base64File}`,
        preview: `Anteprima (prime 3 righe):\n\n${preview}\n\n... e altre ${rows.length - 3} righe`,
        rowCount: rows.length,
        title: analysis.reportTitle || 'Report Personalizzato',
        description: analysis.reportDescription || '',
        format: format
      }
    });

  } catch (error: any) {
    console.error('❌ ERRORE GENERAZIONE REPORT:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Errore durante la generazione del report' 
    });
  }
}

/**
 * Controller per generazione report Excel con AI
 */
export function registerAIReportRoutes(app: Express) {
  console.log('🚀 REGISTRAZIONE ROUTE AI REPORT - INIZIO');
  
  /**
   * Visualizza schema database corrente
   */
  app.get("/api/ai/schema", async (req: Request, res: Response) => {
    console.log('📊 GET /api/ai/schema chiamato');
    try {
      const includeStats = req.query.includeStats === 'true';
      const schema = await getDatabaseSchema();
      
      const response: any = {
        success: true,
        schema: {
          tables: schema.tables.length,
          relationships: schema.relationships.length,
          lastUpdate: schema.lastUpdate,
          tableNames: schema.tables.map(t => t.name)
        },
        schemaText: schema.schemaText
      };

      // Stats opzionali (possono essere lenti su DB grandi)
      if (includeStats) {
        response.schema.stats = await getTableStats();
      }
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Forza aggiornamento schema database
   */
  app.post("/api/ai/schema/refresh", async (req: Request, res: Response) => {
    try {
      const schema = await getDatabaseSchema(true); // Force refresh
      res.json({
        success: true,
        message: 'Schema aggiornato con successo',
        tables: schema.tables.length,
        lastUpdate: schema.lastUpdate
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Ottieni tutti i template report disponibili
   */
  app.get("/api/ai/templates", (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      
      const templates = category
        ? getTemplatesByCategory(category as any)
        : getAllTemplates();
      
      res.json({
        success: true,
        templates,
        count: templates.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Ottieni singolo template per ID
   */
  app.get("/api/ai/templates/:id", (req: Request, res: Response) => {
    try {
      const template = getTemplateById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template non trovato'
        });
      }
      
      res.json({
        success: true,
        template
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Genera report da template con parametri
   * Applica il template e genera effettivamente il report Excel
   */
  app.post("/api/ai/generate-from-template", async (req: Request, res: Response) => {
    try {
      const { templateId, parameters } = req.body;

      if (!templateId) {
        return res.status(400).json({ 
          success: false, 
          error: 'templateId richiesto' 
        });
      }

      const template = getTemplateById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template non trovato'
        });
      }

      // Applica parametri al template
      const finalPrompt = applyTemplateParameters(template, parameters || {});
      
      // Imposta il prompt e chiama la logica di generazione
      req.body.prompt = finalPrompt;
      
      // Delega alla logica standard ma modifica il body per passare il prompt
      // Re-route internamente (no HTTP redirect)
      console.log(`📋 TEMPLATE REPORT: "${template.name}" (${template.category})`);
      
      // Chiama direttamente la funzione handler (non l'endpoint)
      // Questo evita duplicazione del codice mantenendo un singolo punto di generazione
      return generateReportHandler(req, res);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Endpoint principale per generazione report AI
   * Usa l'handler riusabile
   */
  app.post("/api/ai/generate-report", generateReportHandler);

  console.log('✅ Route AI Report registrate con successo');
}
