import { db } from "../../../db";
import { 
  basketLotComposition, 
  lots
} from "../../../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { balancedRounding } from "../../../utils/balanced-rounding";

export interface LotComposition {
  lotId: number;
  animalCount: number;
  percentage: number;
}

export interface SourceBasket {
  basketId: number;
  cycleId: number;
  animalCount: number;
  lotId: number | null;
}

export interface DestinationBasket {
  basketId: number;
  cycleId: number | null;
  animalCount: number;
}

/**
 * Ottiene la composizione lotto di un cestello
 */
export async function getBasketLotComposition(basketId: number, cycleId: number) {
  return await db.select({
    lotId: basketLotComposition.lotId,
    animalCount: basketLotComposition.animalCount,
    percentage: basketLotComposition.percentage,
    sourceSelectionId: basketLotComposition.sourceSelectionId,
    notes: basketLotComposition.notes
  })
  .from(basketLotComposition)
  .where(
    and(
      eq(basketLotComposition.basketId, basketId),
      eq(basketLotComposition.cycleId, cycleId)
    )
  );
}

/**
 * Calcola la composizione aggregata dai cestelli origine
 */
export async function calculateAggregatedComposition(sourceBaskets: SourceBasket[]): Promise<{
  aggregatedComposition: LotComposition[];
  totalSourceAnimals: number;
}> {
  const totalComposition = new Map<number, number>();
  let grandTotal = 0;

  for (const source of sourceBaskets) {
    const existingComposition = await getBasketLotComposition(source.basketId, source.cycleId);
    
    if (existingComposition.length > 0) {
      for (const comp of existingComposition) {
        const current = totalComposition.get(comp.lotId) || 0;
        totalComposition.set(comp.lotId, current + comp.animalCount);
        grandTotal += comp.animalCount;
      }
      console.log(`📦 Cestello ${source.basketId} (composizione mista):`, existingComposition);
    } else {
      if (source.lotId && source.animalCount) {
        const current = totalComposition.get(source.lotId) || 0;
        totalComposition.set(source.lotId, current + source.animalCount);
        grandTotal += source.animalCount;
        console.log(`📦 Cestello ${source.basketId} (puro) - Lotto ${source.lotId}: ${source.animalCount} animali`);
      }
    }
  }

  const aggregatedComposition = Array.from(totalComposition.entries()).map(([lotId, animalCount]) => ({
    lotId,
    animalCount,
    percentage: grandTotal > 0 ? (animalCount / grandTotal) * 100 : 0
  }));

  console.log(`🧮 Composizione aggregata (${grandTotal} animali totali):`, aggregatedComposition);
  return { aggregatedComposition, totalSourceAnimals: grandTotal };
}

/**
 * Distribuisce la composizione nei cestelli destinazione con balanced rounding
 */
export async function distributeCompositionToDestinations(
  destinationBaskets: DestinationBasket[],
  aggregatedComposition: LotComposition[],
  operationId: number,
  operationType: 'vagliatura' | 'screening'
): Promise<void> {
  console.log(`🎯 Distribuzione composizione in ${destinationBaskets.length} cestelli destinazione`);

  for (const destination of destinationBaskets) {
    if (!destination.cycleId) {
      console.log(`⚠️ Cestello ${destination.basketId} senza cycleId - skip`);
      continue;
    }

    const destAnimalCount = destination.animalCount || 0;
    
    // Skip basket con 0 animali (balancedRounding richiede totalQuantity > 0)
    if (destAnimalCount <= 0) {
      console.log(`⚠️ Cestello ${destination.basketId}: 0 animali - skip`);
      continue;
    }

    console.log(`📦 Cestello destinazione ${destination.basketId}: ${destAnimalCount} animali`);

    // Usa balanced rounding per evitare sovra/sotto allocazione
    const percentagesMap = new Map<number, number>();
    for (const lot of aggregatedComposition) {
      percentagesMap.set(lot.lotId, lot.percentage / 100);
    }

    const allocations = balancedRounding(destAnimalCount, percentagesMap);

    for (const allocation of allocations.lots) {
      if (allocation.quantity > 0) {
        // Calcola percentuale EFFETTIVA post-rounding per questo basket
        const actualPercentage = (allocation.quantity / destAnimalCount) * 100;

        await db.insert(basketLotComposition).values({
          basketId: destination.basketId,
          cycleId: destination.cycleId,
          lotId: allocation.lotId,
          animalCount: allocation.quantity,
          percentage: actualPercentage,
          sourceSelectionId: operationType === 'vagliatura' ? operationId : null,
          notes: `${operationType === 'vagliatura' ? 'Vagliatura' : 'Screening'} #${operationId} - ${actualPercentage.toFixed(2)}% del cestello`
        });

        console.log(`  ├── Lotto ${allocation.lotId}: ${allocation.quantity} animali (${actualPercentage.toFixed(2)}% del cestello)`);
      }
    }

    console.log(`  ✅ Totale allocato: ${allocations.totalAllocated} / ${destAnimalCount} animali`);
  }
}

/**
 * Calcola e registra la mortalità per ogni lotto con balanced rounding
 */
export async function calculateAndRegisterMortality(
  aggregatedComposition: LotComposition[],
  totalSourceAnimals: number,
  totalDestinationAnimals: number,
  operationDate: string,
  operationId: number,
  operationType: 'vagliatura' | 'screening'
): Promise<void> {
  const totalMortality = totalSourceAnimals - totalDestinationAnimals;
  
  if (totalMortality <= 0) {
    console.log(`✅ Nessuna mortalità registrata (differenza: ${totalMortality})`);
    return;
  }

  console.log(`💀 MORTALITÀ TOTALE: ${totalMortality} animali da distribuire con balanced rounding`);

  // Usa balanced rounding per evitare over-counting della mortalità
  const percentagesMap = new Map<number, number>();
  for (const lot of aggregatedComposition) {
    percentagesMap.set(lot.lotId, lot.percentage / 100);
  }

  const allocations = balancedRounding(totalMortality, percentagesMap);

  for (const allocation of allocations.lots) {
    if (allocation.quantity > 0) {
      // Calcola percentuale EFFETTIVA post-rounding della mortalità
      const actualMortalityPercentage = (allocation.quantity / totalMortality) * 100;
      
      await db.update(lots)
        .set({ 
          totalMortality: sql`COALESCE(total_mortality, 0) + ${allocation.quantity}`,
          lastMortalityDate: operationDate,
          mortalityNotes: sql`COALESCE(mortality_notes, '') || ${`${operationType === 'vagliatura' ? 'Vagliatura' : 'Screening'} #${operationId}: -${allocation.quantity} animali (${actualMortalityPercentage.toFixed(2)}% della mortalità). `}`
        })
        .where(eq(lots.id, allocation.lotId));

      console.log(`  💀 Lotto ${allocation.lotId}: -${allocation.quantity} animali (${actualMortalityPercentage.toFixed(2)}% della mortalità)`);
    }
  }

  console.log(`  ✅ Totale mortalità distribuita: ${allocations.totalAllocated} / ${totalMortality} animali`);
}
