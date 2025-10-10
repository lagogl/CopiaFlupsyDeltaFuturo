import { storage } from "../../../storage";

export interface FlupsyStats {
  totalBaskets: number;
  activeBaskets: number;
  availableBaskets: number;
  maxPositions: number;
  freePositions: number;
  totalAnimals: number;
  avgAnimalDensity: number;
  activeBasketPercentage: number;
  sizeDistribution: Record<string, number>;
}

export class FlupsyService {
  async calculateFlupsyStats(flupsyId: number): Promise<FlupsyStats> {
    const baskets = await storage.getBasketsByFlupsy(flupsyId);
    const flupsy = await storage.getFlupsy(flupsyId);
    
    if (!flupsy) {
      throw new Error("FLUPSY not found");
    }

    const totalBaskets = baskets.length;
    const activeBaskets = baskets.filter(basket => basket.currentCycleId !== null).length;
    const availableBaskets = baskets.filter(basket => basket.currentCycleId === null).length;
    const maxPositions = flupsy.maxPositions;
    const freePositions = Math.max(0, maxPositions - totalBaskets);

    let totalAnimals = 0;
    let basketsWithAnimals = 0;
    const sizeDistribution: Record<string, number> = {};

    for (const basket of baskets.filter(b => b.currentCycleId !== null)) {
      if (basket.currentCycleId) {
        const cycleOperations = await storage.getOperationsByCycle(basket.currentCycleId);
        const operations = cycleOperations.filter(op => op.basketId === basket.id);
        
        const operationsWithCount = operations
          .filter(op => op.animalCount !== null)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (operationsWithCount.length > 0) {
          const lastOperation = operationsWithCount[0];
          if (lastOperation.animalCount) {
            totalAnimals += lastOperation.animalCount;
            basketsWithAnimals++;

            if (lastOperation.sizeId) {
              const size = await storage.getSize(lastOperation.sizeId);
              if (size) {
                const sizeCode = size.code;
                if (!sizeDistribution[sizeCode]) {
                  sizeDistribution[sizeCode] = 0;
                }
                sizeDistribution[sizeCode] += lastOperation.animalCount;
              }
            }
          }
        }
      }
    }

    const avgAnimalDensity = basketsWithAnimals > 0 ? Math.round(totalAnimals / basketsWithAnimals) : 0;
    const activeBasketPercentage = maxPositions > 0 ? Math.round((activeBaskets / maxPositions) * 100) : 0;

    return {
      totalBaskets,
      activeBaskets,
      availableBaskets,
      maxPositions,
      freePositions,
      totalAnimals,
      avgAnimalDensity,
      activeBasketPercentage,
      sizeDistribution
    };
  }

  async getFlupsyPositions(flupsyId: number) {
    const flupsy = await storage.getFlupsy(flupsyId);
    if (!flupsy) {
      throw new Error("FLUPSY not found");
    }

    const basketsInFlupsy = await storage.getBasketsByFlupsy(flupsyId);
    const positions: any[] = [];

    basketsInFlupsy.forEach(basket => {
      positions.push({
        row: basket.row,
        position: basket.position,
        occupied: true,
        basketId: basket.id,
        basketNumber: basket.physicalNumber,
        active: basket.currentCycleId !== null
      });
    });

    if (positions.length < flupsy.maxPositions) {
      const positionsPerRow = Math.ceil(flupsy.maxPositions / 2);
      const occupiedPositions: Record<string, number[]> = { DX: [], SX: [] };

      positions.forEach(pos => {
        occupiedPositions[pos.row].push(pos.position);
      });

      ['DX', 'SX'].forEach(row => {
        for (let i = 1; i <= positionsPerRow; i++) {
          if ((row === 'DX' ? i : i + positionsPerRow) <= flupsy.maxPositions) {
            if (!occupiedPositions[row].includes(i)) {
              positions.push({
                row,
                position: i,
                occupied: false
              });
            }
          }
        }
      });
    }

    return {
      id: flupsy.id,
      name: flupsy.name,
      maxPositions: flupsy.maxPositions,
      positions
    };
  }

  async populateFlupsy(flupsyId: number, broadcastMessage: Function) {
    const flupsy = await storage.getFlupsy(flupsyId);
    if (!flupsy) {
      throw new Error("FLUPSY not found");
    }

    const startMessage = `🚀 INIZIO POPOLAMENTO FLUPSY "${flupsy.name}" - Creazione automatica cestelli`;
    console.log(startMessage);
    broadcastMessage("flupsy_populate_progress", { message: startMessage, step: "start", flupsyName: flupsy.name });

    const existingBaskets = await storage.getBasketsByFlupsy(flupsyId);
    const occupiedPositions = new Set();
    existingBaskets.forEach(basket => {
      if (basket.row && basket.position) {
        occupiedPositions.add(`${basket.row}_${basket.position}`);
      }
    });

    const maxPositions = flupsy.maxPositions || 20;
    const positionsPerSide = Math.ceil(maxPositions / 2);
    
    const freePositions = {
      'DX': [] as number[],
      'SX': [] as number[]
    };

    for (let row of ['DX', 'SX'] as const) {
      for (let pos = 1; pos <= positionsPerSide; pos++) {
        if (!occupiedPositions.has(`${row}_${pos}`)) {
          freePositions[row].push(pos);
        }
      }
    }

    const totalFreePositions = freePositions['DX'].length + freePositions['SX'].length;

    if (totalFreePositions === 0) {
      return {
        success: true,
        alreadyPopulated: true,
        message: "Il FLUPSY è già completamente popolato, nessuna nuova cesta creata.",
        totalCreated: 0
      };
    }

    let highestPhysicalNumber = 0;
    if (existingBaskets.length > 0) {
      const maxPhysicalNumber = Math.max(...existingBaskets.map(b => b.physicalNumber || 0));
      highestPhysicalNumber = maxPhysicalNumber;
    }

    const basketsToCreate = [];

    for (const position of freePositions['DX']) {
      highestPhysicalNumber++;
      basketsToCreate.push({
        physicalNumber: highestPhysicalNumber,
        flupsyId: flupsyId,
        row: 'DX',
        position: position,
        state: 'available'
      });
    }

    for (const position of freePositions['SX']) {
      highestPhysicalNumber++;
      basketsToCreate.push({
        physicalNumber: highestPhysicalNumber,
        flupsyId: flupsyId,
        row: 'SX',
        position: position,
        state: 'available'
      });
    }

    const newBaskets = [];
    let created = 0;
    for (const basketData of basketsToCreate) {
      try {
        const newBasket = await storage.createBasket(basketData);
        newBaskets.push(newBasket);
        created++;

        const progressMessage = `✅ Cestello ${basketData.physicalNumber} creato in ${basketData.row}-${basketData.position}`;
        console.log(progressMessage);
        broadcastMessage("flupsy_populate_progress", {
          message: progressMessage,
          step: "creating",
          flupsyName: flupsy.name,
          progress: { created, total: basketsToCreate.length }
        });
      } catch (error) {
        console.error(`❌ Errore creazione cestello ${basketData.physicalNumber}:`, error);
      }
    }

    const completionMessage = `🎉 POPOLAMENTO COMPLETATO - ${created} cestelli creati nel FLUPSY "${flupsy.name}"`;
    console.log(completionMessage);
    broadcastMessage("flupsy_populate_progress", {
      message: completionMessage,
      step: "complete",
      flupsyName: flupsy.name,
      totalCreated: created
    });

    // Invalida la cache dei cestelli per aggiornamenti immediati
    try {
      const { invalidateCache } = await import("../../../controllers/baskets-controller");
      if (typeof invalidateCache === 'function') {
        invalidateCache();
        console.log("✅ Cache cestelli invalidata dopo popolamento FLUPSY");
      }
    } catch (err: any) {
      console.log("⚠️ Errore invalidazione cache cestelli:", err.message || err);
    }

    return {
      success: true,
      message: `Popolamento FLUPSY completato con successo. ${created} nuovi cestelli creati.`,
      totalCreated: created,
      baskets: newBaskets
    };
  }
}

export const flupsyService = new FlupsyService();
