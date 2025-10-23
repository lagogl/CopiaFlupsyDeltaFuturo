import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Servizio per pipeline multi-step di elaborazione dati
 * Permette di concatenare operazioni complesse in memoria
 */

export interface PipelineStep {
  type: 'query' | 'filter' | 'aggregate' | 'join' | 'sort';
  name: string;
  config: any;
}

export interface PipelineResult {
  stepResults: Map<string, any[]>;
  finalResult: any[];
  executionTime: number;
  stepsExecuted: number;
}

/**
 * Esegue una pipeline di step di elaborazione dati
 */
export async function executePipeline(steps: PipelineStep[]): Promise<PipelineResult> {
  const startTime = Date.now();
  const stepResults = new Map<string, any[]>();
  let currentData: any[] = [];
  
  console.log(`🔄 Inizio pipeline: ${steps.length} step da eseguire`);
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`📍 Step ${i + 1}/${steps.length}: ${step.name} (${step.type})`);
    
    try {
      switch (step.type) {
        case 'query':
          currentData = await executeQueryStep(step.config);
          break;
          
        case 'filter':
          currentData = executeFilterStep(currentData, step.config);
          break;
          
        case 'aggregate':
          currentData = executeAggregateStep(currentData, step.config);
          break;
          
        case 'join':
          currentData = executeJoinStep(currentData, step.config, stepResults);
          break;
          
        case 'sort':
          currentData = executeSortStep(currentData, step.config);
          break;
          
        default:
          throw new Error(`Step type '${step.type}' non supportato`);
      }
      
      // Salva risultato step
      stepResults.set(step.name, [...currentData]);
      console.log(`✅ Step ${i + 1} completato: ${currentData.length} righe`);
      
    } catch (error: any) {
      console.error(`❌ Errore nello step ${i + 1} (${step.name}):`, error.message);
      throw new Error(`Pipeline fallita allo step '${step.name}': ${error.message}`);
    }
  }
  
  const executionTime = Date.now() - startTime;
  console.log(`✅ Pipeline completata in ${executionTime}ms: ${currentData.length} righe finali`);
  
  return {
    stepResults,
    finalResult: currentData,
    executionTime,
    stepsExecuted: steps.length
  };
}

/**
 * Step: Esegue query SQL (SOLO SELECT)
 */
async function executeQueryStep(config: { sqlQuery: string }): Promise<any[]> {
  // Validazione: permetti solo query SELECT
  const queryTrimmed = config.sqlQuery.trim().toUpperCase();
  
  // Blocca query pericolose
  const dangerousKeywords = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 
    'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
  ];
  
  for (const keyword of dangerousKeywords) {
    if (queryTrimmed.includes(keyword)) {
      throw new Error(`Query non permessa: keyword '${keyword}' rilevata. Solo query SELECT sono consentite.`);
    }
  }
  
  // Deve iniziare con SELECT (o WITH per CTE)
  if (!queryTrimmed.startsWith('SELECT') && !queryTrimmed.startsWith('WITH')) {
    throw new Error('Solo query SELECT (o WITH...SELECT) sono permesse nella pipeline');
  }
  
  const result = await db.execute(sql.raw(config.sqlQuery));
  const rows = Array.isArray(result) ? result : result.rows || [];
  return rows;
}

/**
 * Step: Filtra dati in base a condizione
 */
function executeFilterStep(data: any[], config: { field: string; operator: string; value: any }): any[] {
  const { field, operator, value } = config;
  
  return data.filter(row => {
    const fieldValue = row[field];
    
    switch (operator) {
      case '=':
      case '==':
        return fieldValue == value;
      case '!=':
        return fieldValue != value;
      case '>':
        return fieldValue > value;
      case '<':
        return fieldValue < value;
      case '>=':
        return fieldValue >= value;
      case '<=':
        return fieldValue <= value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'startsWith':
        return String(fieldValue).startsWith(String(value));
      default:
        return true;
    }
  });
}

/**
 * Step: Aggrega dati (GROUP BY in memoria)
 */
function executeAggregateStep(data: any[], config: { 
  groupBy: string[]; 
  aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max'; alias: string }[] 
}): any[] {
  const groups = new Map<string, any[]>();
  
  // Raggruppa dati
  data.forEach(row => {
    const key = config.groupBy.map(field => row[field]).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });
  
  // Calcola aggregazioni
  const result: any[] = [];
  groups.forEach((rows, key) => {
    const aggregated: any = {};
    
    // Copia campi groupBy
    config.groupBy.forEach((field, idx) => {
      aggregated[field] = key.split('|')[idx];
    });
    
    // Calcola aggregazioni
    config.aggregations.forEach(agg => {
      const values = rows.map(r => r[agg.field]).filter(v => v !== null && v !== undefined);
      
      switch (agg.operation) {
        case 'sum':
          aggregated[agg.alias] = values.reduce((a, b) => Number(a) + Number(b), 0);
          break;
        case 'avg':
          aggregated[agg.alias] = values.length > 0 
            ? values.reduce((a, b) => Number(a) + Number(b), 0) / values.length 
            : null;
          break;
        case 'count':
          aggregated[agg.alias] = rows.length;
          break;
        case 'min':
          aggregated[agg.alias] = values.length > 0 ? Math.min(...values.map(Number)) : null;
          break;
        case 'max':
          aggregated[agg.alias] = values.length > 0 ? Math.max(...values.map(Number)) : null;
          break;
      }
    });
    
    result.push(aggregated);
  });
  
  return result;
}

/**
 * Step: Join tra dataset corrente e risultato precedente
 */
function executeJoinStep(
  leftData: any[], 
  config: { 
    rightStepName: string; 
    leftKey: string; 
    rightKey: string; 
    type: 'inner' | 'left' 
  },
  stepResults: Map<string, any[]>
): any[] {
  const rightData = stepResults.get(config.rightStepName);
  if (!rightData) {
    throw new Error(`Step '${config.rightStepName}' non trovato per join`);
  }
  
  // Crea mappa per right data per lookup veloce
  const rightMap = new Map<any, any[]>();
  rightData.forEach(row => {
    const key = row[config.rightKey];
    if (!rightMap.has(key)) {
      rightMap.set(key, []);
    }
    rightMap.get(key)!.push(row);
  });
  
  const result: any[] = [];
  
  leftData.forEach(leftRow => {
    const leftKey = leftRow[config.leftKey];
    const rightRows = rightMap.get(leftKey) || [];
    
    if (rightRows.length > 0) {
      // Match trovato
      rightRows.forEach(rightRow => {
        result.push({ ...leftRow, ...rightRow });
      });
    } else if (config.type === 'left') {
      // Left join: mantieni riga left anche senza match
      result.push(leftRow);
    }
  });
  
  return result;
}

/**
 * Step: Ordina dati
 */
function executeSortStep(data: any[], config: { field: string; order: 'asc' | 'desc' }): any[] {
  const sorted = [...data];
  
  sorted.sort((a, b) => {
    const aVal = a[config.field];
    const bVal = b[config.field];
    
    if (aVal < bVal) return config.order === 'asc' ? -1 : 1;
    if (aVal > bVal) return config.order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * Helper: Valida pipeline prima dell'esecuzione
 */
export function validatePipeline(steps: PipelineStep[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (steps.length === 0) {
    errors.push('Pipeline vuota: almeno 1 step richiesto');
  }
  
  // Verifica che il primo step sia una query
  if (steps.length > 0 && steps[0].type !== 'query') {
    errors.push('Il primo step deve essere di tipo "query"');
  }
  
  // Verifica join references
  const stepNames = new Set(steps.map(s => s.name));
  steps.forEach((step, idx) => {
    if (step.type === 'join') {
      if (!stepNames.has(step.config.rightStepName)) {
        errors.push(`Step ${idx + 1} (${step.name}): join reference '${step.config.rightStepName}' non trovato`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
