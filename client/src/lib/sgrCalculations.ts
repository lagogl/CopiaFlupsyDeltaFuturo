/**
 * Utility per i calcoli di crescita basati su SGR (Specific Growth Rate)
 */

/**
 * Interfacce per i tipi
 */
export interface Size {
  id: number;
  code: string;
  name: string;
  numeric_value?: number; // Valore numerico corrispondente alla taglia (es. 315 per TP-315)
}

// Parsifica un codice di taglia (es. "TP-315") ed estrae il valore numerico
export function parseTagliaCode(tagliaCode: string): number | null {
  if (!tagliaCode) return null;
  
  const match = tagliaCode.match(/TP-(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

// Stima del tempo necessario per raggiungere una taglia target, basato su SGR giornaliero
export function estimateDaysToReachSize(
  currentWeight: number,
  targetWeight: number,
  dailySgrPercentage: number
): number {
  if (!currentWeight || !targetWeight || !dailySgrPercentage || currentWeight >= targetWeight) {
    return 0; // Impossibile stimare
  }
  
  // Conversione del tasso di crescita giornaliero da percentuale a fattore moltiplicativo
  const growthRateFactor = 1 + (dailySgrPercentage / 100);
  
  // Formula: log(targetWeight / currentWeight) / log(growthRateFactor)
  const days = Math.log(targetWeight / currentWeight) / Math.log(growthRateFactor);
  
  // Arrotonda al giorno intero più vicino
  return Math.ceil(days);
}

// Converte la taglia da codice (es. "TP-315") a peso stimato in grammi
export function sizeCodeToWeight(sizeCode: string | null): number | null {
  if (!sizeCode) return null;
  
  const numericValue = parseTagliaCode(sizeCode);
  if (!numericValue) return null;
  
  // Convertire il valore numerico in micron a peso in grammi
  // usando una formula approssimativa per i molluschi
  // La formula è un'approssimazione, dovrebbe essere validata con dati reali
  // Formula approssimativa: peso (g) = (micron / 1000)^3 * 0.5
  const microns = numericValue;
  const weightInGrams = Math.pow(microns / 1000, 3) * 0.5;
  
  return weightInGrams;
}

// Stima la taglia che sarà raggiunta dopo un certo numero di giorni, dato l'SGR
export function estimateSizeAfterDays(
  currentWeight: number,
  dailySgrPercentage: number,
  days: number
): number {
  if (!currentWeight || !dailySgrPercentage || !days) {
    return currentWeight; // Nessun cambiamento
  }
  
  // Conversione del tasso di crescita giornaliero da percentuale a fattore moltiplicativo
  const growthRateFactor = 1 + (dailySgrPercentage / 100);
  
  // Formula: currentWeight * (growthRateFactor ^ days)
  const futureWeight = currentWeight * Math.pow(growthRateFactor, days);
  
  return futureWeight;
}

// Stima il peso medio dato un codice taglia
export function estimateAverageWeightFromSize(sizeCode: string | null): number | null {
  if (!sizeCode) return null;
  
  // Estrai il valore numerico dalla taglia
  const numericValue = parseTagliaCode(sizeCode);
  if (!numericValue) return null;
  
  // Mappa approssimativa del peso per taglia
  // Questo dovrebbe essere calibrato con i dati reali dell'allevamento
  const sizeToWeightMap: Record<number, number> = {
    180: 0.007,  // TP-180: circa 7 mg
    200: 0.01,   // TP-200: circa 10 mg
    315: 0.016,  // TP-315: circa 16 mg
    450: 0.05,   // TP-450: circa 50 mg
    500: 0.08,   // TP-500: circa 80 mg
    600: 0.14,   // TP-600: circa 140 mg
    700: 0.25,   // TP-700: circa 250 mg
    800: 0.35,   // TP-800: circa 350 mg
    1000: 0.5,   // TP-1000: circa 0.5 g
    1140: 0.7,   // TP-1140: circa 0.7 g
    1260: 0.9,   // TP-1260: circa 0.9 g
    1500: 1.2,   // TP-1500: circa 1.2 g
    1800: 1.8,   // TP-1800: circa 1.8 g
    2000: 2.5,   // TP-2000: circa 2.5 g
    3000: 8.0,   // TP-3000: circa 8 g
    4000: 17.0,  // TP-4000: circa 17 g
    5000: 30.0,  // TP-5000: circa 30 g
  };
  
  // Se abbiamo un valore esatto, usalo
  if (numericValue in sizeToWeightMap) {
    return sizeToWeightMap[numericValue];
  }
  
  // Altrimenti, trova il valore più vicino
  const sizes = Object.keys(sizeToWeightMap).map(Number).sort((a, b) => a - b);
  
  // Trova la taglia più vicina inferiore e superiore
  let lowerSize = 0;
  let upperSize = 0;
  
  for (const size of sizes) {
    if (size <= numericValue) {
      lowerSize = size;
    } else {
      upperSize = size;
      break;
    }
  }
  
  // Se non abbiamo una taglia superiore, usa l'ultima disponibile
  if (upperSize === 0 && lowerSize > 0) {
    return sizeToWeightMap[lowerSize];
  }
  
  // Se non abbiamo una taglia inferiore, usa la prima disponibile
  if (lowerSize === 0 && upperSize > 0) {
    return sizeToWeightMap[upperSize];
  }
  
  // Interpola linearmente tra le due taglie più vicine
  const lowerWeight = sizeToWeightMap[lowerSize];
  const upperWeight = sizeToWeightMap[upperSize];
  const ratio = (numericValue - lowerSize) / (upperSize - lowerSize);
  
  return lowerWeight + ratio * (upperWeight - lowerWeight);
}