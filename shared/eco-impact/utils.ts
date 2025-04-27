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
  // Valori base di impatto per tipo di operazione
  const baseImpacts: Record<string, Record<string, number>> = {
    "pulizia": {
      water: 0.5,     // m³ di acqua
      carbon: 0.2,    // kg CO₂e
      energy: 0.3,    // kWh
      waste: 0.1,     // kg
      biodiversity: 0.05  // indice
    },
    "vagliatura": {
      water: 0.3,
      carbon: 0.15,
      energy: 0.4,
      waste: 0.05,
      biodiversity: 0.03
    },
    "trattamento": {
      water: 0.4,
      carbon: 0.3,
      energy: 0.5,
      waste: 0.2,
      biodiversity: 0.1
    },
    "misura": {
      water: 0.1,
      carbon: 0.05,
      energy: 0.2,
      waste: 0.02,
      biodiversity: 0.01
    },
    "prima-attivazione": {
      water: 0.2,
      carbon: 0.1,
      energy: 0.3,
      waste: 0.05,
      biodiversity: 0.02
    },
    "peso": {
      water: 0.1,
      carbon: 0.05,
      energy: 0.1,
      waste: 0.01,
      biodiversity: 0.01
    },
    "vendita": {
      water: 0.1,
      carbon: 0.5,   // maggiore per trasporto
      energy: 0.3,
      waste: 0.1,
      biodiversity: 0.05
    },
    "cessazione": {
      water: 0.2,
      carbon: 0.1,
      energy: 0.2,
      waste: 0.2,
      biodiversity: 0.03
    },
    "selezione-origine": {
      water: 0.2,
      carbon: 0.1,
      energy: 0.2,
      waste: 0.05,
      biodiversity: 0.02
    },
    "selezione-vendita": {
      water: 0.1,
      carbon: 0.5,
      energy: 0.3,
      waste: 0.1,
      biodiversity: 0.05
    }
  };

  // Impatto predefinito se il tipo non è riconosciuto
  const defaultImpact = {
    water: 0.1,
    carbon: 0.1,
    energy: 0.1,
    waste: 0.05,
    biodiversity: 0.01
  };

  // Seleziona il modello di impatto base in base al tipo di operazione
  const baseImpact = baseImpacts[operationType] || defaultImpact;
  
  // Parametri che influenzano il calcolo
  const basketCount = parameters.basketCount || 1;
  const duration = parameters.duration || 30; // durata in minuti
  
  // Calcola i moltiplicatori basati sui parametri
  const basketMultiplier = Math.sqrt(basketCount); // Scala sublineare con numero di cestelli
  const durationMultiplier = duration / 30; // Normalizzato su 30 minuti
  
  // Applica i moltiplicatori ai valori base
  const impacts: Record<string, number> = {};
  for (const category in baseImpact) {
    impacts[category] = baseImpact[category] * basketMultiplier * durationMultiplier;
  }
  
  return impacts;
}

/**
 * Calcola il punteggio di sostenibilità complessivo da diversi impatti
 * @param impacts - Oggetto con i diversi impatti
 * @returns Punteggio di sostenibilità (0-100, dove 100 è ottimale)
 */
export function calculateSustainabilityScore(impacts: Record<string, number>) {
  // Pesi relativi delle diverse categorie (somma a 1)
  const weights = {
    water: 0.2,
    carbon: 0.25,
    energy: 0.2,
    waste: 0.15,
    biodiversity: 0.2
  };
  
  // Soglie di riferimento per punteggio massimo per categoria
  // (valori oltre i quali il punteggio peggiora rapidamente)
  const thresholds = {
    water: 50, // m³
    carbon: 100, // kg CO₂e
    energy: 200, // kWh
    waste: 30, // kg
    biodiversity: 5 // indice
  };
  
  let weightedScore = 0;
  
  // Calcola il punteggio ponderato per ciascuna categoria
  for (const category in impacts) {
    if (category in weights && category in thresholds) {
      // Normalizza il valore (0-1, dove 0 è ottimale)
      const normalizedValue = Math.min(impacts[category] / thresholds[category], 1);
      
      // Converti in punteggio (100-0, dove 100 è ottimale)
      const categoryScore = 100 * (1 - normalizedValue);
      
      // Aggiungi al punteggio totale ponderato
      weightedScore += categoryScore * weights[category as keyof typeof weights];
    }
  }
  
  return weightedScore;
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
): Record<string, number> {
  const trends: Record<string, number> = {};
  
  // Per ogni categoria di impatto
  for (const category in currentImpacts) {
    const current = currentImpacts[category];
    const previous = previousImpacts[category];
    
    // Se entrambi i valori sono disponibili e il precedente non è zero
    if (previous && previous !== 0) {
      // Calcola la variazione percentuale
      trends[category] = ((current - previous) / previous) * 100;
    } else {
      // Se non ci sono dati precedenti, non c'è trend
      trends[category] = 0;
    }
  }
  
  return trends;
}

/**
 * Genera suggerimenti per migliorare i punteggi di sostenibilità
 * @param impacts - Impatti ambientali attuali
 * @returns Array di suggerimenti
 */
export function generateSustainabilitySuggestions(impacts: Record<string, number>) {
  const suggestions: string[] = [];
  
  // Soglie critiche per categoria
  const thresholds = {
    water: 20, // m³
    carbon: 50, // kg CO₂e
    energy: 80, // kWh
    waste: 15, // kg
    biodiversity: 2 // indice
  };
  
  // Verifica ogni categoria e genera suggerimenti per quelle critiche
  if (impacts.water > thresholds.water) {
    suggestions.push(
      "Ottimizza l'uso dell'acqua durante le operazioni di pulizia e vagliatura. Considera sistemi di riciclo dell'acqua."
    );
  }
  
  if (impacts.carbon > thresholds.carbon) {
    suggestions.push(
      "Riduci le emissioni di carbonio ottimizzando i trasporti e utilizzando energia da fonti rinnovabili."
    );
  }
  
  if (impacts.energy > thresholds.energy) {
    suggestions.push(
      "Riduci il consumo energetico utilizzando attrezzature più efficienti e pianificando meglio le operazioni."
    );
  }
  
  if (impacts.waste > thresholds.waste) {
    suggestions.push(
      "Implementa un sistema di gestione dei rifiuti più efficiente. Considera il riutilizzo dei materiali quando possibile."
    );
  }
  
  if (impacts.biodiversity > thresholds.biodiversity) {
    suggestions.push(
      "Monitora attentamente l'impatto sulla biodiversità locale e implementa misure di mitigazione."
    );
  }
  
  // Se tutte le categorie sono sotto soglia, aggiungi un suggerimento generale
  if (suggestions.length === 0) {
    suggestions.push(
      "I tuoi punteggi di sostenibilità sono buoni. Continua a monitorare e cercare opportunità di miglioramento continuo."
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
  switch (category) {
    case "water":
      return `${value.toFixed(1)} m³`;
    case "carbon":
      return `${value.toFixed(1)} kg CO₂e`;
    case "energy":
      return `${value.toFixed(1)} kWh`;
    case "waste":
      return `${value.toFixed(1)} kg`;
    case "biodiversity":
      return value.toFixed(2);
    default:
      return value.toString();
  }
}

/**
 * Mappa colori per le visualizzazioni in base alla categoria
 */
export const impactColors: Record<string, string> = {
  water: "#3b82f6", // blue
  carbon: "#10b981", // green
  energy: "#f59e0b", // amber
  waste: "#ef4444", // red
  biodiversity: "#8b5cf6", // purple
};