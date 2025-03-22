import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumberWithCommas(value: number): string {
  // Gestisci i casi in cui value è undefined o null
  if (value === undefined || value === null) {
    return "0";
  }
  
  // Formato europeo: 1.000,00 (punto come separatore delle migliaia, virgola per i decimali)
  const [integerPart, decimalPart] = value.toString().split(".");
  
  // Formatta la parte intera con punti ogni 3 cifre
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Se esiste una parte decimale, restituisci l'intero con la virgola e i decimali
  if (decimalPart) {
    return `${formattedIntegerPart},${decimalPart}`;
  }
  
  // Altrimenti restituisci solo la parte intera
  return formattedIntegerPart;
}

export function calculateAverageWeight(animalsPerKg: number): number | null {
  if (!animalsPerKg || animalsPerKg <= 0) {
    return null;
  }
  return 1000000 / animalsPerKg;
}

export function getOperationTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'prima-attivazione': 'Prima Attivazione',
    'pulizia': 'Pulizia',
    'vagliatura': 'Vagliatura',
    'trattamento': 'Trattamento',
    'misura': 'Misura',
    'vendita': 'Vendita',
    'selezione-vendita': 'Selezione per Vendita',
    'cessazione': 'Cessazione',
  };
  
  return typeMap[type] || type;
}

export function getOperationTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'prima-attivazione': 'bg-secondary/10 text-secondary',
    'pulizia': 'bg-info/10 text-info',
    'vagliatura': 'bg-primary-light/10 text-primary-light',
    'trattamento': 'bg-warning/10 text-warning',
    'misura': 'bg-primary-light/10 text-primary',
    'vendita': 'bg-success/10 text-success',
    'selezione-vendita': 'bg-success/10 text-success',
    'cessazione': 'bg-destructive/10 text-destructive',
  };
  
  return colorMap[type] || 'bg-gray-100 text-gray-800';
}

// Definizione delle taglie target per ciascuna dimensione
export type TargetSize = {
  code: string;
  name: string;
  minWeight: number; // peso minimo in mg
  maxWeight: number; // peso massimo in mg
  color: string;  // Colore Tailwind per la visualizzazione
};

export const TARGET_SIZES: TargetSize[] = [
  {
    code: 'T0',
    name: 'Seme',
    minWeight: 0,
    maxWeight: 10,
    color: 'bg-slate-200 border-slate-300'
  },
  {
    code: 'T1',
    name: 'Nursery',
    minWeight: 10,
    maxWeight: 50,
    color: 'bg-sky-100 border-sky-300'
  },
  {
    code: 'T2',
    name: 'Pre-ingrasso',
    minWeight: 50,
    maxWeight: 200,
    color: 'bg-blue-100 border-blue-300'
  },
  {
    code: 'T3',
    name: 'Ingrasso iniziale',
    minWeight: 200,
    maxWeight: 500,
    color: 'bg-teal-100 border-teal-300'
  },
  {
    code: 'T4',
    name: 'Ingrasso avanzato',
    minWeight: 500,
    maxWeight: 1000,
    color: 'bg-green-100 border-green-300'
  },
  {
    code: 'T5',
    name: 'Pre-vendita',
    minWeight: 1000,
    maxWeight: 2000,
    color: 'bg-lime-100 border-lime-300'
  },
  {
    code: 'T6',
    name: 'Commerciale',
    minWeight: 2000,
    maxWeight: 5000,
    color: 'bg-amber-100 border-amber-300'
  },
  {
    code: 'T7',
    name: 'Premium',
    minWeight: 5000,
    maxWeight: 10000,
    color: 'bg-orange-100 border-orange-300'
  }
];

export function getTargetSizeForWeight(weight: number): TargetSize | null {
  if (!weight || weight <= 0) return null;
  
  return TARGET_SIZES.find(
    size => weight >= size.minWeight && weight <= size.maxWeight
  ) || null;
}

export function getSizeFromAnimalsPerKg(animalsPerKg: number): TargetSize | null {
  if (!animalsPerKg || animalsPerKg <= 0) return null;
  
  // Converti animali/kg in peso medio in mg
  const weight = 1000000 / animalsPerKg;
  return getTargetSizeForWeight(weight);
}

export function getSizeColor(sizeCode: string): string {
  if (!sizeCode) return 'bg-gray-100 text-gray-800';
  
  if (sizeCode.startsWith('T')) {
    // Trova la taglia target corrispondente
    const targetSize = TARGET_SIZES.find(size => size.code === sizeCode);
    if (targetSize) {
      // Restituisci il colore del testo in base alla taglia target
      return `${targetSize.color.replace('border-', 'text-')}`;
    }
    return 'bg-yellow-100 text-yellow-800';
  } else if (sizeCode.startsWith('M')) {
    return 'bg-green-100 text-green-800';
  }
  
  return 'bg-blue-100 text-blue-800';
}

/**
 * Calcola lo spessore del bordo in base alla taglia (peso)
 * @param weight - Peso in mg
 * @returns Classe CSS per lo spessore del bordo
 */
export function getBorderThicknessByWeight(weight: number | null): string {
  if (!weight || weight <= 0) return 'border';
  
  if (weight < 300) return 'border';
  if (weight < 800) return 'border-2';
  if (weight < 2000) return 'border-4';
  if (weight < 5000) return 'border-[6px]';
  return 'border-[8px]';
}

/**
 * Ottiene il colore del bordo in base alla taglia (peso)
 * @param weight - Peso in mg
 * @returns Classe CSS per il colore del bordo
 */
export function getBorderColorByWeight(weight: number | null): string {
  if (!weight || weight <= 0) return 'border-slate-200';
  
  // Se la taglia è TP-3000 o superiore (peso > 3000 mg), bordo rosso
  if (weight >= 3000) {
    return 'border-red-500';
  }
  
  return 'border-slate-200'; // Colore predefinito per taglie inferiori
}

/**
 * Formatta il numero di animali in formato più leggibile
 * @param animalsPerKg - Numero di animali per kg
 * @param weight - Peso medio in mg
 * @returns Stringa formattata con il numero di animali
 */
export function formatAnimalCount(animalsPerKg: number | null, weight: number | null): string {
  if (!animalsPerKg || !weight) return 'N/A';
  
  // Per un peso in milligrammi, calcoliamo quanti animali ci sono in un kg
  const animalsPerGram = animalsPerKg / 1000;
  
  // Poi calcoliamo il peso in grammi
  const weightInGrams = weight / 1000;
  
  // Quindi, un numero approssimativo di animali è animali per grammo moltiplicato per il peso in grammi
  const approximateAnimals = Math.round(animalsPerGram * weightInGrams);
  
  if (approximateAnimals < 1000) {
    return `${approximateAnimals}`;
  } else {
    return `${(approximateAnimals / 1000).toFixed(1)}K`;
  }
}

export function getBasketColorBySize(targetSizeCode: string | null): string {
  if (!targetSizeCode) return 'bg-slate-100 border border-slate-200';
  
  const targetSize = TARGET_SIZES.find(size => size.code === targetSizeCode);
  if (targetSize) {
    return `${targetSize.color} border`;
  }
  
  return 'bg-slate-100 border border-slate-200';
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export interface SizeTimeline {
  date: Date;
  weight: number;
  size: TargetSize | null;
  daysToReach: number;
}

/**
 * Calcola le taglie che raggiungerà una cesta nel tempo, in base al peso attuale e al tasso di crescita
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrMonthlyPercentage - Percentuale SGR mensile
 * @param months - Numero di mesi per cui proiettare
 * @returns Array di previsioni con date di raggiungimento delle varie taglie
 */
export function calculateSizeTimeline(
  currentWeight: number,
  measurementDate: Date,
  sgrMonthlyPercentage: number,
  months: number = 6
): SizeTimeline[] {
  if (!currentWeight || currentWeight <= 0 || !sgrMonthlyPercentage) {
    return [];
  }
  
  // Calcola il tasso di crescita giornaliero
  const dailyGrowthRate = sgrMonthlyPercentage / 30 / 100;
  
  // Trova la taglia attuale
  const currentSize = getTargetSizeForWeight(currentWeight);
  
  // Cerca le taglie future che potrebbero essere raggiunte
  const futureTargetSizes = TARGET_SIZES
    .filter(size => size.minWeight > currentWeight)
    .sort((a, b) => a.minWeight - b.minWeight);
  
  if (futureTargetSizes.length === 0) {
    return []; // Non ci sono taglie future da raggiungere
  }
  
  const timeline: SizeTimeline[] = [];
  let simulationDate = new Date(measurementDate);
  let simulationWeight = currentWeight;
  const maxDays = months * 30; // Massimo numero di giorni da simulare
  
  // Aggiungi il punto iniziale
  timeline.push({
    date: new Date(simulationDate),
    weight: simulationWeight,
    size: currentSize,
    daysToReach: 0
  });
  
  // Per ogni taglia target futura, calcola quando verrà raggiunta
  for (const targetSize of futureTargetSizes) {
    let daysToReach = 0;
    
    // Simula la crescita giorno per giorno fino a raggiungere la taglia target
    while (simulationWeight < targetSize.minWeight && daysToReach < maxDays) {
      daysToReach++;
      simulationDate = new Date(simulationDate);
      simulationDate.setDate(simulationDate.getDate() + 1);
      
      // Applica il tasso di crescita giornaliero
      simulationWeight = simulationWeight * (1 + dailyGrowthRate);
    }
    
    // Se abbiamo raggiunto la taglia target entro il limite temporale
    if (daysToReach < maxDays) {
      timeline.push({
        date: new Date(simulationDate),
        weight: Math.round(simulationWeight),
        size: targetSize,
        daysToReach
      });
    } else {
      // Se non raggiungiamo questa taglia entro il periodo specificato, interrompiamo
      break;
    }
  }
  
  return timeline;
}

/**
 * Ottiene la data prevista in cui una cesta raggiungerà una taglia target specifica
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrMonthlyPercentage - Percentuale SGR mensile
 * @param targetSizeCode - Codice della taglia target da raggiungere
 * @returns La data prevista o null se non raggiungibile entro 6 mesi
 */
export function getTargetSizeReachDate(
  currentWeight: number,
  measurementDate: Date,
  sgrMonthlyPercentage: number,
  targetSizeCode: string
): Date | null {
  const timeline = calculateSizeTimeline(currentWeight, measurementDate, sgrMonthlyPercentage);
  const targetSizeReached = timeline.find(item => item.size?.code === targetSizeCode);
  return targetSizeReached ? targetSizeReached.date : null;
}

/**
 * Calcola il peso previsto a una data futura
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrMonthlyPercentage - Percentuale SGR mensile
 * @param targetDate - Data per cui calcolare il peso previsto
 * @returns Il peso previsto in mg
 */
export function getFutureWeightAtDate(
  currentWeight: number,
  measurementDate: Date,
  sgrMonthlyPercentage: number,
  targetDate: Date
): number {
  if (!currentWeight || currentWeight <= 0 || !sgrMonthlyPercentage) {
    return currentWeight;
  }
  
  // Calcola il tasso di crescita giornaliero
  const dailyGrowthRate = sgrMonthlyPercentage / 30 / 100;
  
  // Calcola il numero di giorni tra la data di misurazione e la data target
  const diffTime = targetDate.getTime() - new Date(measurementDate).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return currentWeight;
  }
  
  // Calcola il peso previsto
  const futureWeight = currentWeight * Math.pow(1 + dailyGrowthRate, diffDays);
  return Math.round(futureWeight);
}

/**
 * Calcola la taglia prevista a una data futura
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrMonthlyPercentage - Percentuale SGR mensile
 * @param targetDate - Data per cui calcolare la taglia prevista
 * @returns La taglia prevista
 */
export function getFutureSizeAtDate(
  currentWeight: number,
  measurementDate: Date,
  sgrMonthlyPercentage: number,
  targetDate: Date
): TargetSize | null {
  const futureWeight = getFutureWeightAtDate(currentWeight, measurementDate, sgrMonthlyPercentage, targetDate);
  return getTargetSizeForWeight(futureWeight);
}
