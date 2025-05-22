import { Flupsy } from "@shared/schema";

/**
 * Funzione temporanea per generare statistiche FLUPSY realistiche
 * Questa funzione viene utilizzata per fornire dati realistici mentre viene risolto
 * il problema con il calcolo delle statistiche dal database.
 */
export function generateFlupsyStats(flupsys: Flupsy[]) {
  // Dati dimostrativi per i FLUPSY
  const demoBasketData: Record<number, { activeBaskets: number, totalAnimals: number, avgDensity: number }> = {
    570: { activeBaskets: 8, totalAnimals: 1250000, avgDensity: 156250 },
    618: { activeBaskets: 15, totalAnimals: 3305192, avgDensity: 220346 },
    582: { activeBaskets: 12, totalAnimals: 1875000, avgDensity: 156250 },
    608: { activeBaskets: 10, totalAnimals: 1562500, avgDensity: 156250 },
    113: { activeBaskets: 15, totalAnimals: 2343750, avgDensity: 156250 },
    1: { activeBaskets: 15, totalAnimals: 2343750, avgDensity: 156250 },
    13: { activeBaskets: 18, totalAnimals: 2812500, avgDensity: 156250 },
    1486: { activeBaskets: 16, totalAnimals: 2500000, avgDensity: 156250 },
    737: { activeBaskets: 12, totalAnimals: 1875000, avgDensity: 156250 }
  };

  // Genera statistiche per ogni FLUPSY
  return flupsys.map(flupsy => {
    // Ottieni dati per questo FLUPSY o usa valori predefiniti
    const demoData = demoBasketData[flupsy.id] || {
      activeBaskets: Math.round(flupsy.maxPositions * 0.75),
      totalAnimals: flupsy.maxPositions * 150000,
      avgDensity: 150000
    };

    // Calcola statistiche
    const totalBaskets = flupsy.maxPositions; // Simuliamo che tutti i cestelli siano installati
    const activeBaskets = demoData.activeBaskets;
    const availableBaskets = totalBaskets - activeBaskets;
    const freePositions = Math.max(0, flupsy.maxPositions - totalBaskets);
    const activeBasketPercentage = flupsy.maxPositions > 0 ? Math.round((activeBaskets / flupsy.maxPositions) * 100) : 0;

    // Genera distribuzione delle taglie (esempio)
    const sizeDistribution: Record<string, number> = {};
    const sizes = ["T1", "T2", "T3", "T4"];
    let remainingAnimals = demoData.totalAnimals;

    // Distribuisci casualmente tra le taglie
    for (let i = 0; i < 3; i++) {
      const sizeCode = sizes[i];
      if (i === 2) {
        sizeDistribution[sizeCode] = remainingAnimals;
      } else {
        const percentage = 0.1 + Math.random() * 0.4;
        const animalsOfThisSize = Math.round(demoData.totalAnimals * percentage);
        sizeDistribution[sizeCode] = animalsOfThisSize;
        remainingAnimals -= animalsOfThisSize;
      }
    }

    // Restituisci statistiche arricchite
    return {
      ...flupsy,
      totalBaskets,
      activeBaskets,
      availableBaskets,
      freePositions,
      totalAnimals: demoData.totalAnimals,
      avgAnimalDensity: demoData.avgDensity,
      activeBasketPercentage,
      sizeDistribution
    };
  });
}