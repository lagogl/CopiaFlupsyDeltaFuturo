/**
 * Template report pre-configurati per AI Report Generator
 * Ogni template include prompt ottimizzato e parametri opzionali
 */

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'quality' | 'forecast' | 'operations' | 'sales';
  prompt: string;
  parameters?: {
    name: string;
    type: 'date' | 'dateRange' | 'flupsyId' | 'sizeId' | 'lotId' | 'number';
    label: string;
    required: boolean;
    defaultValue?: any;
  }[];
  icon?: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'monthly-performance',
    name: 'Performance Mensile',
    description: 'Analisi completa delle performance operative del mese corrente',
    category: 'performance',
    icon: 'TrendingUp',
    prompt: `Genera un report di performance mensile che includa:
- Numero totale di operazioni per tipo (peso, misura, screening, etc.)
- Distribuzione operazioni per FLUPSY
- Tassi di mortalità medi per lotto
- Numero di cestelli attivi vs disponibili
- Crescita media SGR per taglia
- Operazioni per operatore (se disponibile source)

Ordina i risultati per FLUPSY e includi totali e medie.`,
    parameters: [
      {
        name: 'month',
        type: 'date',
        label: 'Mese di riferimento',
        required: false,
        defaultValue: 'current_month'
      }
    ]
  },
  {
    id: 'mortality-analysis',
    name: 'Analisi Mortalità',
    description: 'Report dettagliato sui tassi di mortalità per lotto e periodo',
    category: 'quality',
    icon: 'AlertTriangle',
    prompt: `Analizza i tassi di mortalità con i seguenti dati:
- Mortalità totale per lotto (ordinata decrescente)
- Mortalità media per fornitore
- Trend mortalità nel tempo (ultimi 30 giorni)
- Cestelli con mortalità >5%
- Confronto mortalità per taglia

Includi sia valori assoluti che percentuali.`,
    parameters: [
      {
        name: 'days',
        type: 'number',
        label: 'Giorni di analisi',
        required: false,
        defaultValue: 30
      }
    ]
  },
  {
    id: 'growth-forecast',
    name: 'Previsione Crescita',
    description: 'Stima date raggiungimento taglie target per cestelli attivi',
    category: 'forecast',
    icon: 'Calendar',
    prompt: `Genera previsioni di crescita basate su:
- Cestelli attivi con ciclo in corso
- Ultima operazione di pesatura/misura
- SGR corrente per taglia
- Data stimata raggiungimento taglia successiva
- Giorni rimanenti stimati

Ordina per data stimata più vicina.`,
    parameters: [
      {
        name: 'targetSizeId',
        type: 'sizeId',
        label: 'Taglia target',
        required: false
      },
      {
        name: 'flupsyId',
        type: 'flupsyId',
        label: 'FLUPSY specifico',
        required: false
      }
    ]
  },
  {
    id: 'flupsy-comparison',
    name: 'Confronto FLUPSY',
    description: 'Confronta performance tra diversi impianti FLUPSY',
    category: 'performance',
    icon: 'GitCompare',
    prompt: `Confronta le performance tra FLUPSY:
- Numero cestelli attivi per FLUPSY
- Numero totale operazioni per FLUPSY
- SGR medio per FLUPSY
- Tasso mortalità medio per FLUPSY
- Utilizzo capacità (cestelli attivi/max_positions)

Ordina per numero operazioni decrescente.`,
    parameters: [
      {
        name: 'dateRange',
        type: 'dateRange',
        label: 'Periodo di confronto',
        required: false
      }
    ]
  },
  {
    id: 'lot-inventory',
    name: 'Inventario Lotti',
    description: 'Stato attuale inventario per lotto con conteggio animali',
    category: 'operations',
    icon: 'Package',
    prompt: `Mostra inventario attuale dei lotti:
- Lotto (fornitore + numero lotto)
- Animali iniziali
- Animali attuali nei cestelli attivi
- Mortalità totale
- Percentuale utilizzato
- Cestelli che usano il lotto
- Taglia attuale media

Ordina per lotti con maggiori animali rimanenti.`,
    parameters: []
  },
  {
    id: 'operations-by-operator',
    name: 'Operazioni per Operatore',
    description: 'Analisi produttività operatori (desktop vs mobile NFC)',
    category: 'operations',
    icon: 'Users',
    prompt: `Analizza le operazioni per sorgente:
- Numero operazioni desktop_manager vs mobile_nfc
- Tipologie operazioni per sorgente
- Distribuzione temporale (ore del giorno)
- FLUPSY più utilizzati per sorgente
- Media operazioni giornaliere

Usa il campo 'source' per distinguere desktop da mobile.`,
    parameters: [
      {
        name: 'days',
        type: 'number',
        label: 'Giorni di analisi',
        required: false,
        defaultValue: 7
      }
    ]
  },
  {
    id: 'sales-pipeline',
    name: 'Pipeline Vendite',
    description: 'Report vendite avanzate e DDT generati',
    category: 'sales',
    icon: 'DollarSign',
    prompt: `Genera report vendite con:
- Vendite per cliente (nome + importo totale)
- Vendite per stato (draft, confirmed, delivered, cancelled)
- DDT generati (numero + data)
- Distribuzione per taglia venduta
- Totale kg venduti
- Valore medio vendita

Ordina per data vendita decrescente.`,
    parameters: [
      {
        name: 'dateRange',
        type: 'dateRange',
        label: 'Periodo vendite',
        required: false
      }
    ]
  },
  {
    id: 'quality-control',
    name: 'Controllo Qualità',
    description: 'Monitoraggio parametri qualità (peso medio, animali/kg)',
    category: 'quality',
    icon: 'CheckCircle',
    prompt: `Analizza parametri di qualità:
- Operazioni con peso medio anomalo (>10% o <-5% variazione giornaliera)
- Cestelli con animals_per_kg fuori range per taglia
- Operazioni senza dati completi (NULL values)
- Cestelli con metadata misto-lotto
- Trend peso medio per taglia negli ultimi 30 giorni

Evidenzia anomalie per revisione manuale.`,
    parameters: []
  },
  {
    id: 'sgr-performance',
    name: 'Performance SGR',
    description: 'Analisi tassi di crescita specifici (SGR) per taglia',
    category: 'performance',
    icon: 'Activity',
    prompt: `Analizza i tassi di crescita:
- SGR per taglia (dalla tabella sgr_per_taglia)
- Numero campioni per calcolo
- Data ultimo calcolo
- Confronto con SGR generico
- Taglie senza dati SGR specifici
- Variabilità SGR mensile

Ordina per SGR decrescente.`,
    parameters: []
  },
  {
    id: 'cycle-duration',
    name: 'Durata Cicli',
    description: 'Analisi durata cicli produttivi per lotto e taglia',
    category: 'operations',
    icon: 'Clock',
    prompt: `Analizza la durata dei cicli:
- Durata media cicli chiusi (giorni)
- Durata cicli attivi (giorni dall'inizio)
- Confronto durata per lotto/fornitore
- Confronto durata per taglia iniziale
- Cicli più lunghi in corso (top 10)
- Distribuzione durate per range (0-30, 31-60, 61-90, 90+)

Calcola differenze in giorni tra start_date ed end_date (o data corrente per attivi).`,
    parameters: []
  }
];

/**
 * Ottiene tutti i template disponibili
 */
export function getAllTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES;
}

/**
 * Ottiene template per categoria
 */
export function getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Ottiene un template specifico per ID
 */
export function getTemplateById(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find(t => t.id === id);
}

/**
 * Applica parametri al prompt del template
 */
export function applyTemplateParameters(
  template: ReportTemplate,
  params: Record<string, any>
): string {
  let finalPrompt = template.prompt;

  // Sostituisci variabili nel prompt se presenti
  if (template.parameters) {
    for (const param of template.parameters) {
      const value = params[param.name] ?? param.defaultValue;
      if (value !== undefined) {
        // Aggiungi contesto al prompt se il parametro è valorizzato
        finalPrompt += `\n\nParametri: ${param.label} = ${value}`;
      }
    }
  }

  return finalPrompt;
}
