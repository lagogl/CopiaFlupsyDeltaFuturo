import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addDays, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converti il tasso di crescita SGR da percentuale mensile a percentuale giornaliera
 * @param monthlyPercentage - Percentuale mensile di crescita
 * @returns Percentuale giornaliera equivalente
 */
export function monthlyToDaily(monthlyPercentage: number): number {
  // Converti da percentuale mensile a giornaliera con formula: 
  // daily_rate = ((1 + monthly_rate)^(1/30) - 1)
  // Dove monthly_rate è già espresso come decimale (es. 0.37 per 37%)
  
  // Assicurati che il valore passato sia trattato come un decimale
  // se monthlyPercentage è passato come percentuale (es. 37), convertilo in decimale (0.37)
  const monthlyRate = monthlyPercentage >= 1 ? monthlyPercentage / 100 : monthlyPercentage;
  
  // Calcola il tasso giornaliero (che è già un decimale, non serve moltiplicare per 100)
  return (Math.pow(1 + monthlyRate, 1/30) - 1);
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
    'peso': 'Peso',
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
    'peso': 'bg-blue-100 text-blue-600',
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

export function getTargetSizeForWeight(weight: number, availableSizes?: any[]): TargetSize | null {
  if (!weight || weight <= 0) return null;
  
  // Se abbiamo taglie disponibili dal database, le usiamo
  if (availableSizes && availableSizes.length > 0) {
    // Converti peso in animali per kg per utilizzare i range del database
    const estimatedAnimalsPerKg = weight > 0 ? Math.round(1000000 / weight) : 0;
    
    const matchingSize = availableSizes.find(size => {
      // Gestisci sia camelCase che snake_case (dal database)
      const minValue = size.minAnimalsPerKg !== undefined ? size.minAnimalsPerKg : size.min_animals_per_kg;
      const maxValue = size.maxAnimalsPerKg !== undefined ? size.maxAnimalsPerKg : size.max_animals_per_kg;
      
      // Verifica se l'animalsPerKg rientra nel range
      return estimatedAnimalsPerKg >= minValue && estimatedAnimalsPerKg <= maxValue;
    });
    
    if (matchingSize) {
      // Crea un oggetto TargetSize dal formato database
      const minValue = matchingSize.minAnimalsPerKg !== undefined ? matchingSize.minAnimalsPerKg : matchingSize.min_animals_per_kg;
      const maxValue = matchingSize.maxAnimalsPerKg !== undefined ? matchingSize.maxAnimalsPerKg : matchingSize.max_animals_per_kg;
      
      return {
        code: matchingSize.code,
        name: matchingSize.name,
        minWeight: 1000000 / maxValue,
        maxWeight: 1000000 / minValue,
        color: getDefaultColorForSize(matchingSize.code)
      };
    }
  }
  
  // Fallback alle taglie predefinite se non troviamo corrispondenze nel database
  return TARGET_SIZES.find(
    size => weight >= size.minWeight && weight <= size.maxWeight
  ) || null;
}

// Funzione helper per ottenere il colore default per una taglia basata sul codice
function getDefaultColorForSize(code: string): string {
  // TP-XXXX dove XXXX è il numero di animali per kg
  if (code.startsWith('TP-')) {
    const numStr = code.substring(3);
    const num = parseInt(numStr);
    
    if (num >= 6000) {
      return 'bg-red-50 border-red-600 border-4';
    } else if (num >= 4000) {
      return 'bg-red-50 border-red-500 border-3';
    } else if (num >= 3000) {
      return 'bg-orange-50 border-orange-500 border-2';
    } else if (num >= 2000) {
      return 'bg-yellow-50 border-yellow-500 border-2';
    } else if (num >= 1500) {
      return 'bg-green-50 border-green-600 border-2';
    } else if (num >= 1000) {
      return 'bg-sky-50 border-sky-500 border-2';
    } else {
      return 'bg-sky-50 border-sky-400 border-2';
    }
  }
  
  // Fallback per altri formati di codice
  return 'bg-blue-100 border-blue-300';
}

export function getSizeFromAnimalsPerKg(animalsPerKg: number, availableSizes?: any[]): TargetSize | null {
  if (!animalsPerKg || animalsPerKg <= 0) return null;
  
  // Se abbiamo taglie disponibili dal database, le usiamo
  if (availableSizes && availableSizes.length > 0) {
    const matchingSize = availableSizes.find(size => {
      // Gestisci sia camelCase che snake_case (dal database)
      const minValue = size.minAnimalsPerKg !== undefined ? size.minAnimalsPerKg : size.min_animals_per_kg;
      const maxValue = size.maxAnimalsPerKg !== undefined ? size.maxAnimalsPerKg : size.max_animals_per_kg;
      
      // Verifica se l'animalsPerKg rientra nel range
      return animalsPerKg >= minValue && animalsPerKg <= maxValue;
    });
    
    if (matchingSize) {
      // Crea un oggetto TargetSize dal formato database
      const minValue = matchingSize.minAnimalsPerKg !== undefined ? matchingSize.minAnimalsPerKg : matchingSize.min_animals_per_kg;
      const maxValue = matchingSize.maxAnimalsPerKg !== undefined ? matchingSize.maxAnimalsPerKg : matchingSize.max_animals_per_kg;
      
      return {
        code: matchingSize.code,
        name: matchingSize.name,
        minWeight: 1000000 / maxValue,
        maxWeight: 1000000 / minValue,
        color: getDefaultColorForSize(matchingSize.code)
      };
    }
  }
  
  // Fallback alle taglie predefinite se non troviamo corrispondenze nel database
  const weight = 1000000 / animalsPerKg;
  return getTargetSizeForWeight(weight);
}

export function getSizeColor(sizeCode: string): string {
  if (!sizeCode) return 'bg-gray-100 text-gray-800';
  
  if (sizeCode.startsWith('T')) {
    // Trova la taglia target corrispondente
    const targetSize = TARGET_SIZES.find(size => size.code === sizeCode);
    if (targetSize) {
      // Restituisci il colore di sfondo in base alla taglia target
      // Usa il colore ma assicurati che sia un bg-* e non text-* o border-*
      const baseColor = targetSize.color.replace('border-', '').replace('text-', '');
      return `bg-${baseColor} text-white`;
    }
    return 'bg-yellow-500 text-white';
  } else if (sizeCode.startsWith('M')) {
    return 'bg-green-500 text-white';
  }
  
  return 'bg-blue-500 text-white';
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
 * Ottiene il colore del bordo in base al numero di animali per kg
 * @param animalsPerKg - Numero di animali per kg
 * @returns Classe CSS per il colore del bordo
 */
export function getBorderColorByAnimalsPerKg(animalsPerKg: number | null): string {
  if (!animalsPerKg || animalsPerKg <= 0) return 'border-slate-200';
  
  // Se la taglia è TP-3000 o superiore (animalsPerKg <= 32000), bordo rosso
  if (animalsPerKg <= 32000) {
    return 'border-red-500';
  }
  
  return 'border-slate-200'; // Colore predefinito per taglie inferiori
}

/**
 * Funzione centrale per ottenere la classe del bordo per un cestello
 * Combina la logica per decidere sia il colore che lo spessore del bordo
 * @param animalsPerKg - Numero di animali per kg
 * @returns Classe CSS completa per lo stile del bordo
 */
export function getBasketBorderClass(animalsPerKg: number | null): string {
  if (!animalsPerKg || animalsPerKg <= 0) return 'border';
  
  // Se la taglia è TP-3000 o superiore (animalsPerKg <= 32000), bordo rosso più spesso
  if (animalsPerKg <= 32000) {
    return 'border-red-600 border-[4px] ring-2 ring-red-500 ring-offset-1';
  }
  
  // Per taglie medie, bordo più spesso
  if (animalsPerKg <= 80000) {
    return 'border-2';
  }
  
  // Per taglie piccole, bordo normale
  return 'border';
}

/**
 * Ottiene il colore del bordo in base alla taglia (peso)
 * @param weight - Peso in mg
 * @returns Classe CSS per il colore del bordo
 * @deprecated Usa getBorderColorByAnimalsPerKg invece
 */
export function getBorderColorByWeight(weight: number | null): string {
  if (!weight || weight <= 0) return 'border-slate-200';
  
  // Convertire il peso in animali per kg
  const animalsPerKg = weight > 0 ? Math.round(1000000 / weight) : null;
  
  return getBorderColorByAnimalsPerKg(animalsPerKg);
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
 * Ottiene il mese in italiano da una data
 * @param date - Data di cui ottenere il mese
 * @returns Il nome del mese in italiano
 */
export function getMonthNameIT(date: Date): string {
  const months = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  return months[date.getMonth()];
}

/**
 * Calcola le taglie che raggiungerà una cesta nel tempo, considerando i valori SGR specifici per mese
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrMonthlyPercentage - Percentuale SGR mensile (usata come fallback)
 * @param months - Numero di mesi per cui proiettare
 * @param availableSizes - Array delle taglie disponibili
 * @param sgrRates - Array dei tassi SGR mensili
 * @returns Array di previsioni con date di raggiungimento delle varie taglie
 */
export function calculateSizeTimeline(
  currentWeight: number,
  measurementDate: Date,
  sgrMonthlyPercentage: number,
  months: number = 6,
  availableSizes?: any[],
  sgrRates?: any[]
): SizeTimeline[] {
  if (!currentWeight || currentWeight <= 0) {
    return [];
  }

  // Funzione per ottenere il tasso SGR giornaliero in base al mese della data
  const getDailySgrRate = (date: Date): number => {
    if (!sgrRates || sgrRates.length === 0) {
      // Fallback se non abbiamo dati SGR specifici
      // Non dividiamo per 100 perché il valore è già espresso come tasso decimale
      return sgrMonthlyPercentage;
    }
    
    const monthName = getMonthNameIT(date);
    const monthSgr = sgrRates.find(sgr => sgr.month === monthName);
    
    if (monthSgr) {
      // Il campo percentage ora contiene direttamente il tasso giornaliero
      return monthSgr.percentage;
    }
    
    // Fallback se non troviamo il mese
    return sgrMonthlyPercentage;
  };
  
  // Trova la taglia attuale - usa le taglie del database se disponibili
  const currentSize = getTargetSizeForWeight(currentWeight, availableSizes);
  
  // Definisci le taglie target da raggiungere
  let futureTargetSizes: TargetSize[] = [];
  
  // Se abbiamo le taglie del database, usale
  if (availableSizes && availableSizes.length > 0) {
    // Converti il peso corrente in animalsPerKg per confrontare con i range del database
    const currentAnimalsPerKg = currentWeight > 0 ? Math.round(1000000 / currentWeight) : Number.MAX_SAFE_INTEGER;
    
    // Cerca le taglie future che hanno un valore maxAnimalsPerKg inferiore al valore corrente di animalsPerKg
    // (meno animalsPerKg = animali più grandi = fasi più avanzate)
    const dbFutureTargetSizes = availableSizes
      .filter(size => {
        const maxValue = size.maxAnimalsPerKg !== undefined ? size.maxAnimalsPerKg : size.max_animals_per_kg;
        return maxValue < currentAnimalsPerKg;
      })
      .sort((a, b) => {
        const maxValueA = a.maxAnimalsPerKg !== undefined ? a.maxAnimalsPerKg : a.max_animals_per_kg;
        const maxValueB = b.maxAnimalsPerKg !== undefined ? b.maxAnimalsPerKg : b.max_animals_per_kg;
        return maxValueB - maxValueA;
      }); // Ordina in modo crescente per peso 
    
    // Converti in formato TargetSize
    futureTargetSizes = dbFutureTargetSizes.map(size => {
      const minValue = size.minAnimalsPerKg !== undefined ? size.minAnimalsPerKg : size.min_animals_per_kg;
      const maxValue = size.maxAnimalsPerKg !== undefined ? size.maxAnimalsPerKg : size.max_animals_per_kg;
      
      return {
        code: size.code,
        name: size.name,
        minWeight: 1000000 / maxValue,
        maxWeight: 1000000 / minValue,
        color: getDefaultColorForSize(size.code)
      };
    });
  } else {
    // Fallback alle taglie hardcoded
    futureTargetSizes = TARGET_SIZES
      .filter(size => size.minWeight > currentWeight)
      .sort((a, b) => a.minWeight - b.minWeight);
  }
  
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
      // Incrementa la data di un giorno
      const nextDate = new Date(simulationDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Ottieni il tasso SGR specifico per il giorno
      const dailyGrowthRate = getDailySgrRate(nextDate);
      
      // Applica il tasso di crescita giornaliero usando la formula corretta: Pf = Pi * e^(SGR*t)
      simulationWeight = simulationWeight * Math.exp(dailyGrowthRate);
      simulationDate = nextDate;
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
  targetSizeCode: string,
  availableSizes?: any[]
): Date | null {
  const timeline = calculateSizeTimeline(currentWeight, measurementDate, sgrMonthlyPercentage, 6, availableSizes);
  const targetSizeReached = timeline.find(item => item.size?.code === targetSizeCode);
  return targetSizeReached ? targetSizeReached.date : null;
}

/**
 * Calcola il peso previsto a una data futura
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrDailyPercentage - Percentuale SGR giornaliera
 * @param targetDate - Data per cui calcolare il peso previsto
 * @returns Il peso previsto in mg
 */
export function getFutureWeightAtDate(
  currentWeight: number,
  measurementDate: Date,
  sgrDailyPercentage: number,
  targetDate: Date
): number {
  if (!currentWeight || currentWeight <= 0 || !sgrDailyPercentage) {
    return currentWeight;
  }
  
  // Calcola il numero di giorni tra la data di misurazione e la data target
  const diffTime = targetDate.getTime() - new Date(measurementDate).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return currentWeight;
  }
  
  // Usa la formula corretta: Pf = Pi * e^(SGR*t)
  // Dove SGR è il tasso di crescita specifico giornaliero
  const futureWeight = currentWeight * Math.exp(sgrDailyPercentage * diffDays);
  return Math.round(futureWeight);
}

/**
 * Calcola la taglia prevista a una data futura
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrDailyPercentage - Percentuale SGR giornaliera
 * @param targetDate - Data per cui calcolare la taglia prevista
 * @returns La taglia prevista
 */
export function getFutureSizeAtDate(
  currentWeight: number,
  measurementDate: Date,
  sgrDailyPercentage: number,
  targetDate: Date,
  availableSizes?: any[]
): TargetSize | null {
  const futureWeight = getFutureWeightAtDate(currentWeight, measurementDate, sgrDailyPercentage, targetDate);
  return getTargetSizeForWeight(futureWeight, availableSizes);
}

/**
 * Restituisce il tasso di crescita SGR giornaliero per il mese corrente
 * @param sgrs - Array di tassi SGR giornalieri
 * @param targetDate - Data per cui ottenere il tasso SGR
 * @param defaultPercentage - Percentuale di default se non viene trovato un valore
 * @returns Percentuale SGR giornaliera
 */
export function getSgrDailyPercentageForDate(
  sgrs: any[] | undefined, 
  targetDate: Date,
  defaultPercentage: number = 1.0
): number {
  if (!sgrs || sgrs.length === 0) return defaultPercentage;
  
  // Ottieni il mese della data target
  const month = format(targetDate, 'MMMM').toLowerCase();
  
  // Trova il tasso SGR per questo mese
  const monthSgr = sgrs.find(sgr => sgr.month.toLowerCase() === month);
  if (monthSgr && monthSgr.percentage !== null) {
    return monthSgr.percentage;
  }
  
  // Se non trovi un valore specifico, usa la media dei valori mensili
  const avgDailyPercentage = sgrs.reduce((acc, sgr) => acc + (sgr.percentage || 0), 0) / sgrs.length || defaultPercentage;
  return avgDailyPercentage;
}

/**
 * Calcola il peso futuro giorno per giorno utilizzando i valori SGR giornalieri
 * @param currentWeight - Peso attuale in mg
 * @param measurementDate - Data della misurazione
 * @param sgrs - Array di tassi SGR giornalieri
 * @param daysToAdd - Numero di giorni per la previsione
 * @param defaultSgrPercentage - Percentuale SGR di default giornaliera
 * @returns Peso futuro in mg
 */
export function calculateFutureWeightWithDailySgr(
  currentWeight: number,
  measurementDate: Date,
  sgrs: any[] | undefined,
  daysToAdd: number,
  defaultSgrPercentage: number = 1.0
): number {
  if (!currentWeight || currentWeight <= 0) return 0;
  
  const targetDate = addDays(new Date(measurementDate), daysToAdd);
  const days = Math.floor((targetDate.getTime() - new Date(measurementDate).getTime()) / (1000 * 60 * 60 * 24));
  
  let simulatedWeight = currentWeight;
  
  for (let i = 0; i < days; i++) {
    // Per ogni giorno, calcoliamo il mese corrispondente per usare il tasso SGR appropriato
    const currentDate = addDays(new Date(measurementDate), i);
    
    // Trova il tasso SGR per questo giorno
    const dailyRate = getSgrDailyPercentageForDate(sgrs, currentDate, defaultSgrPercentage);
    
    // Applica la crescita giornaliera usando la formula corretta: Pf = Pi * e^(SGR*t)
    // Utilizziamo e^(SGR) dove SGR è già espresso come tasso decimale
    simulatedWeight = simulatedWeight * Math.exp(dailyRate);
  }
  
  return Math.round(simulatedWeight);
}

/**
 * Calcola i giorni necessari per raggiungere un peso target
 * @param currentWeight - Peso attuale in mg
 * @param targetWeight - Peso target in mg
 * @param measurementDate - Data della misurazione
 * @param sgrs - Array di tassi SGR giornalieri
 * @param defaultSgrPercentage - Percentuale SGR di default giornaliera
 * @param maxDays - Numero massimo di giorni per la simulazione
 * @returns Numero di giorni necessari o null se non raggiungibile
 */
export function getDaysToReachWeight(
  currentWeight: number,
  targetWeight: number,
  measurementDate: Date,
  sgrs: any[] | undefined,
  defaultSgrPercentage: number = 1.0,
  maxDays: number = 365
): number | null {
  if (!currentWeight || currentWeight <= 0 || !targetWeight || targetWeight <= 0) return null;
  
  // Se già ha raggiunto il peso target
  if (currentWeight >= targetWeight) return 0;
  
  let simulationWeight = currentWeight;
  let days = 0;
  let currentDate = new Date(measurementDate);
  
  while (simulationWeight < targetWeight && days < maxDays) {
    // Trova il tasso SGR per questo giorno
    const dailyRate = getSgrDailyPercentageForDate(sgrs, currentDate, defaultSgrPercentage);
    
    // Applica la crescita giornaliera usando la formula corretta: Pf = Pi * e^(SGR*t)
    // Utilizziamo e^(SGR) dove SGR è già espresso come tasso decimale
    simulationWeight = simulationWeight * Math.exp(dailyRate);
    days++;
    currentDate = addDays(currentDate, 1);
  }
  
  return days < maxDays ? days : null;
}

/**
 * Determina se un peso raggiungerà un peso target entro un certo numero di giorni
 * @param currentWeight - Peso attuale in mg
 * @param targetWeight - Peso target in mg
 * @param measurementDate - Data della misurazione
 * @param sgrs - Array di tassi SGR giornalieri
 * @param maxDays - Numero massimo di giorni per la simulazione
 * @param defaultSgrPercentage - Percentuale SGR di default giornaliera
 * @returns true se il peso target sarà raggiunto entro maxDays
 */
export function willReachTargetWeight(
  currentWeight: number,
  targetWeight: number,
  measurementDate: Date,
  sgrs: any[] | undefined,
  maxDays: number = 180,
  defaultSgrPercentage: number = 1.0
): boolean {
  if (!currentWeight || !targetWeight) return false;
  
  // Se il peso corrente è già maggiore del peso target, è già raggiunto
  if (currentWeight >= targetWeight) return true;
  
  // Calcola i giorni necessari
  const daysToReach = getDaysToReachWeight(
    currentWeight, 
    targetWeight, 
    measurementDate, 
    sgrs, 
    defaultSgrPercentage,
    maxDays
  );
  
  // Se restituisce un numero (non null), significa che il peso sarà raggiunto entro maxDays
  return daysToReach !== null;
}
