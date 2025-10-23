import OpenAI from "openai";

const AI_BASE_URL = 'https://api.deepseek.com';
const AI_MODEL = 'deepseek-chat';

/**
 * Servizio per generare insights AI dai dati estratti
 * Identifica pattern, anomalie, trend e correlazioni
 */

interface DataInsights {
  summary: string;
  patterns: string[];
  anomalies: string[];
  trends: string[];
  correlations: string[];
  recommendations: string[];
  keyMetrics: {
    metric: string;
    value: string;
    interpretation: string;
  }[];
}

/**
 * Prepara i dati per l'analisi AI
 * Estrae statistiche di base e sample dei dati
 */
function prepareDataSample(rows: any[]): {
  sampleRows: any[];
  stats: any;
  columnSummary: any;
} {
  // Limita a 100 righe per evitare token overhead
  const sampleRows = rows.slice(0, 100);
  
  // Calcola statistiche base
  const columnSummary: any = {};
  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    
    columns.forEach(col => {
      const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
      const numericValues = values.filter(v => typeof v === 'number');
      
      columnSummary[col] = {
        type: numericValues.length > values.length * 0.8 ? 'numeric' : 'text',
        uniqueCount: new Set(values).size,
        nullCount: rows.length - values.length,
        sampleValues: values.slice(0, 5)
      };
      
      // Statistiche per colonne numeriche
      if (numericValues.length > 0) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        columnSummary[col].min = sorted[0];
        columnSummary[col].max = sorted[sorted.length - 1];
        columnSummary[col].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        columnSummary[col].median = sorted[Math.floor(sorted.length / 2)];
      }
    });
  }
  
  return {
    sampleRows,
    stats: {
      totalRows: rows.length,
      columnsCount: Object.keys(rows[0] || {}).length
    },
    columnSummary
  };
}

/**
 * Genera insights AI dai dati estratti
 */
export async function generateDataInsights(
  rows: any[],
  analysis: any,
  aiClient: OpenAI
): Promise<DataInsights> {
  if (rows.length === 0) {
    return {
      summary: 'Nessun dato disponibile per l\'analisi.',
      patterns: [],
      anomalies: [],
      trends: [],
      correlations: [],
      recommendations: [],
      keyMetrics: []
    };
  }
  
  // Prepara sample e statistiche
  const dataSample = prepareDataSample(rows);
  
  // Prompt per l'AI
  const insightsPrompt = `
Sei un esperto data analyst specializzato in acquacoltura. Analizza i dati estratti e identifica insights utili.

CONTESTO REPORT:
Titolo: ${analysis.reportTitle || 'Report Personalizzato'}
Descrizione: ${analysis.reportDescription || 'N/A'}

DATI ESTRATTI:
- Totale righe: ${dataSample.stats.totalRows}
- Colonne: ${dataSample.stats.columnsCount}

STATISTICHE COLONNE:
${JSON.stringify(dataSample.columnSummary, null, 2)}

SAMPLE DATI (prime ${dataSample.sampleRows.length} righe):
${JSON.stringify(dataSample.sampleRows.slice(0, 10), null, 2)}

COMPITI:
1. Identifica PATTERN ricorrenti nei dati
2. Rileva ANOMALIE o outliers (valori fuori dalla norma)
3. Identifica TREND temporali (se ci sono date)
4. Trova CORRELAZIONI interessanti tra variabili
5. Suggerisci AZIONI operative basate sui dati

Restituisci un JSON con questo formato:
{
  "summary": "Breve sintesi dell'analisi (2-3 frasi)",
  "patterns": ["Pattern 1", "Pattern 2", ...],
  "anomalies": ["Anomalia 1", "Anomalia 2", ...],
  "trends": ["Trend 1", "Trend 2", ...],
  "correlations": ["Correlazione 1", "Correlazione 2", ...],
  "recommendations": ["Raccomandazione 1", "Raccomandazione 2", ...],
  "keyMetrics": [
    {
      "metric": "Nome metrica",
      "value": "Valore",
      "interpretation": "Spiegazione breve"
    }
  ]
}

IMPORTANTE:
- Usa linguaggio semplice e chiaro
- Sii specifico con numeri e percentuali quando possibile
- Concentrati su insights AZIONABILI
- Se non trovi anomalie/trend, lascia array vuoto
- Limita a max 5 elementi per categoria
`;

  try {
    const response = await aiClient.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "Sei un esperto data analyst per sistemi di acquacoltura. Genera insights chiari e azionabili dai dati."
        },
        {
          role: "user",
          content: insightsPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    const insights = JSON.parse(response.choices[0].message.content || '{}');
    console.log('🔍 AI INSIGHTS GENERATED:', {
      patternsCount: insights.patterns?.length || 0,
      anomaliesCount: insights.anomalies?.length || 0,
      trendsCount: insights.trends?.length || 0
    });
    
    return insights;
  } catch (error: any) {
    console.error('❌ ERROR generating insights:', error.message);
    return {
      summary: 'Errore nella generazione degli insights AI.',
      patterns: [],
      anomalies: [],
      trends: [],
      correlations: [],
      recommendations: [],
      keyMetrics: []
    };
  }
}

/**
 * Formatta gli insights per visualizzazione utente
 */
export function formatInsightsForUser(insights: DataInsights): string {
  let formatted = `\n📊 **ANALISI AI DEI DATI**\n\n`;
  
  formatted += `${insights.summary}\n\n`;
  
  if (insights.keyMetrics && insights.keyMetrics.length > 0) {
    formatted += `**📈 Metriche Chiave:**\n`;
    insights.keyMetrics.forEach(m => {
      formatted += `• ${m.metric}: ${m.value} - ${m.interpretation}\n`;
    });
    formatted += `\n`;
  }
  
  if (insights.patterns && insights.patterns.length > 0) {
    formatted += `**🔍 Pattern Identificati:**\n`;
    insights.patterns.forEach(p => formatted += `• ${p}\n`);
    formatted += `\n`;
  }
  
  if (insights.trends && insights.trends.length > 0) {
    formatted += `**📈 Trend:**\n`;
    insights.trends.forEach(t => formatted += `• ${t}\n`);
    formatted += `\n`;
  }
  
  if (insights.anomalies && insights.anomalies.length > 0) {
    formatted += `**⚠️ Anomalie Rilevate:**\n`;
    insights.anomalies.forEach(a => formatted += `• ${a}\n`);
    formatted += `\n`;
  }
  
  if (insights.correlations && insights.correlations.length > 0) {
    formatted += `**🔗 Correlazioni:**\n`;
    insights.correlations.forEach(c => formatted += `• ${c}\n`);
    formatted += `\n`;
  }
  
  if (insights.recommendations && insights.recommendations.length > 0) {
    formatted += `**💡 Raccomandazioni:**\n`;
    insights.recommendations.forEach(r => formatted += `• ${r}\n`);
  }
  
  return formatted;
}

/**
 * Crea un sheet Excel con gli insights
 */
export function createInsightsSheet(insights: DataInsights): any[][] {
  const sheetData: any[][] = [];
  
  // Header
  sheetData.push(['ANALISI AI DEI DATI']);
  sheetData.push([]);
  
  // Summary
  sheetData.push(['Sintesi']);
  sheetData.push([insights.summary]);
  sheetData.push([]);
  
  // Key Metrics
  if (insights.keyMetrics && insights.keyMetrics.length > 0) {
    sheetData.push(['Metriche Chiave', 'Valore', 'Interpretazione']);
    insights.keyMetrics.forEach(m => {
      sheetData.push([m.metric, m.value, m.interpretation]);
    });
    sheetData.push([]);
  }
  
  // Patterns
  if (insights.patterns && insights.patterns.length > 0) {
    sheetData.push(['Pattern Identificati']);
    insights.patterns.forEach(p => sheetData.push([p]));
    sheetData.push([]);
  }
  
  // Trends
  if (insights.trends && insights.trends.length > 0) {
    sheetData.push(['Trend']);
    insights.trends.forEach(t => sheetData.push([t]));
    sheetData.push([]);
  }
  
  // Anomalies
  if (insights.anomalies && insights.anomalies.length > 0) {
    sheetData.push(['Anomalie Rilevate']);
    insights.anomalies.forEach(a => sheetData.push([a]));
    sheetData.push([]);
  }
  
  // Correlations
  if (insights.correlations && insights.correlations.length > 0) {
    sheetData.push(['Correlazioni']);
    insights.correlations.forEach(c => sheetData.push([c]));
    sheetData.push([]);
  }
  
  // Recommendations
  if (insights.recommendations && insights.recommendations.length > 0) {
    sheetData.push(['Raccomandazioni']);
    insights.recommendations.forEach(r => sheetData.push([r]));
  }
  
  return sheetData;
}
