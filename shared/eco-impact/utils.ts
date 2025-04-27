/**
 * Utility per il calcolo degli impatti ambientali
 */

/**
 * Calcola il punteggio di impatto ambientale per un'operazione
 * @param operationType - Tipo di operazione
 * @param parameters - Parametri dell'operazione
 * @returns Oggetto con i valori di impatto calcolati
 */
export function calculateOperationImpact(operationType: string, parameters: any) {
  // Valori di base per diversi tipi di operazioni
  const baseImpacts = {
    // Consumo acqua (L)
    water: {
      cleaning: 200,   // Pulizia utilizza circa 200L d'acqua
      transfer: 50,    // Trasferimento utilizza circa 50L d'acqua
      screening: 300,  // Vagliatura utilizza circa 300L d'acqua
      selection: 200,  // Selezione utilizza circa 200L d'acqua  
      weight: 10,      // Pesatura utilizza circa 10L d'acqua
      default: 30,     // Valore predefinito per altre operazioni
    },
    // Emissioni CO2 (kgCO2e)
    carbon: {
      cleaning: 0.5,   // Pulizia emette circa 0.5kg CO2e
      transfer: 1.2,   // Trasferimento emette circa 1.2kg CO2e (trasporto)
      screening: 0.8,  // Vagliatura emette circa 0.8kg CO2e
      selection: 0.7,  // Selezione emette circa 0.7kg CO2e
      weight: 0.1,     // Pesatura emette circa 0.1kg CO2e
      default: 0.3,    // Valore predefinito per altre operazioni
    },
    // Energia (kWh)
    energy: {
      cleaning: 0.8,   // Pulizia consuma circa 0.8kWh
      transfer: 1.5,   // Trasferimento consuma circa 1.5kWh
      screening: 2.0,  // Vagliatura consuma circa 2.0kWh
      selection: 1.0,  // Selezione consuma circa 1.0kWh
      weight: 0.2,     // Pesatura consuma circa 0.2kWh
      default: 0.5,    // Valore predefinito per altre operazioni
    }
  };
  
  // Calcola l'impatto base in base al tipo di operazione
  const getBaseImpact = (category: string, type: string) => {
    const categoryValues = baseImpacts[category as keyof typeof baseImpacts];
    if (!categoryValues) return 0;
    
    return type in categoryValues 
      ? categoryValues[type as keyof typeof categoryValues] 
      : categoryValues.default;
  };
  
  // Applica moltiplicatori in base ai parametri dell'operazione
  const applyModifiers = (baseValue: number, parameters: any) => {
    let modifier = 1.0;
    
    // Modifica in base al numero di cestelli coinvolti
    if (parameters.basketCount) {
      // Più cestelli = maggiore efficienza (per cestello)
      if (parameters.basketCount <= 5) {
        modifier = 1.0; // Nessuna modifica per pochi cestelli
      } else if (parameters.basketCount <= 20) {
        modifier = 0.9; // Lieve efficienza per numero medio
      } else {
        modifier = 0.8; // Maggiore efficienza per grandi numeri
      }
      
      // Moltiplica per il numero di cestelli
      return baseValue * parameters.basketCount * modifier;
    }
    
    return baseValue;
  };
  
  // Calcola tutti gli impatti per l'operazione
  return {
    water: applyModifiers(getBaseImpact('water', operationType), parameters),
    carbon: applyModifiers(getBaseImpact('carbon', operationType), parameters),
    energy: applyModifiers(getBaseImpact('energy', operationType), parameters),
    waste: 0, // Per ora settiamo a 0, implementazione futura
    biodiversity: 0, // Per ora settiamo a 0, implementazione futura
  };
}

/**
 * Calcola il punteggio di sostenibilità complessivo da diversi impatti
 * @param impacts - Oggetto con i diversi impatti
 * @returns Punteggio di sostenibilità (0-100, dove 100 è ottimale)
 */
export function calculateSustainabilityScore(impacts: Record<string, number>) {
  // Pesi relativi di ogni categoria (la somma deve essere 1)
  const weights = {
    water: 0.25,
    carbon: 0.30,
    energy: 0.25,
    waste: 0.10,
    biodiversity: 0.10
  };
  
  // Valori di riferimento per il miglior caso (impatto zero)
  const bestCase = {
    water: 0,
    carbon: 0,
    energy: 0,
    waste: 0,
    biodiversity: 0
  };
  
  // Valori di riferimento per il caso peggiore
  const worstCase = {
    water: 1000,  // 1000L d'acqua
    carbon: 10,   // 10kg CO2e
    energy: 5,    // 5kWh
    waste: 5,     // 5kg rifiuti
    biodiversity: 10 // 10 unità impatto biodiversità
  };
  
  // Calcola il punteggio normalizzato per ogni categoria (0-100)
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.keys(impacts).forEach(category => {
    if (category in weights) {
      const weight = weights[category as keyof typeof weights];
      const best = bestCase[category as keyof typeof bestCase];
      const worst = worstCase[category as keyof typeof worstCase];
      const actual = impacts[category];
      
      // Calcola punteggio normalizzato (0-100, dove 100 è ottimo)
      // Formula: 100 - ((actual - best) / (worst - best)) * 100
      const normalizedScore = Math.max(0, Math.min(100, 100 - ((actual - best) / (worst - best)) * 100));
      
      totalScore += normalizedScore * weight;
      totalWeight += weight;
    }
  });
  
  // Restituisci punteggio finale (0-100)
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

/**
 * Calcola il trend degli impatti ambientali rispetto a un periodo precedente
 * @param currentImpacts - Impatti nel periodo attuale
 * @param previousImpacts - Impatti nel periodo precedente
 * @returns Oggetto con le variazioni percentuali per categoria
 */
export function calculateImpactTrend(
  currentImpacts: Record<string, number>,
  previousImpacts: Record<string, number>
) {
  const trends: Record<string, number> = {};
  
  Object.keys(currentImpacts).forEach(category => {
    const current = currentImpacts[category];
    const previous = previousImpacts[category] || 0;
    
    if (previous === 0) {
      trends[category] = 0; // Non c'è un trend se non c'è un valore precedente
    } else {
      // Calcola variazione percentuale
      // Nota: un valore negativo significa un miglioramento (riduzione dell'impatto)
      trends[category] = Math.round(((current - previous) / previous) * 100);
    }
  });
  
  return trends;
}

/**
 * Genera suggerimenti per migliorare i punteggi di sostenibilità
 * @param impacts - Impatti ambientali attuali
 * @returns Array di suggerimenti
 */
export function generateSustainabilitySuggestions(impacts: Record<string, number>) {
  const suggestions: string[] = [];
  
  // Suggerimenti per migliorare il consumo d'acqua
  if (impacts.water > 500) {
    suggestions.push(
      'Ridurre il consumo d\'acqua implementando sistemi di ricircolo durante le operazioni di pulizia e vagliatura.'
    );
  }
  
  // Suggerimenti per ridurre le emissioni di carbonio
  if (impacts.carbon > 5) {
    suggestions.push(
      'Ridurre le emissioni di CO₂ ottimizzando i trasporti e utilizzando apparecchiature a basso consumo energetico.'
    );
  }
  
  // Suggerimenti per il risparmio energetico
  if (impacts.energy > 3) {
    suggestions.push(
      'Ridurre il consumo energetico installando dispositivi a risparmio energetico e pianificando le operazioni nei momenti di minor carico.'
    );
  }
  
  // Suggerimenti generali se non ci sono problemi specifici
  if (suggestions.length === 0) {
    suggestions.push(
      'Mantenere le attuali buone pratiche e considerare l\'installazione di sistemi di monitoraggio in tempo reale per tracciare l\'uso delle risorse.'
    );
  }
  
  return suggestions;
}

/**
 * Formatta un valore di impatto con l'unità appropriata
 * @param value - Valore numerico
 * @param category - Categoria di impatto
 * @returns Stringa formattata
 */
export function formatImpactValue(value: number, category: string): string {
  const units: Record<string, string> = {
    water: 'L',
    carbon: 'kg CO₂e',
    energy: 'kWh',
    waste: 'kg',
    biodiversity: 'unità'
  };
  
  const unit = units[category] || '';
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Mappa colori per le visualizzazioni in base alla categoria
 */
export const impactColors: Record<string, string> = {
  water: '#2196F3', // Blu
  carbon: '#4CAF50', // Verde
  energy: '#FFC107', // Giallo
  waste: '#FF5722', // Arancione
  biodiversity: '#9C27B0' // Viola
};