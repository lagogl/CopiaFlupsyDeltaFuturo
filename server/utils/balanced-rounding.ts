/**
 * Balanced Rounding Utility per Lot Ledger
 * Implementa arrotondamento bilanciato che preserva totali esatti
 * per evitare perdite/sovracconteggi nell'allocazione degli animali per lotto
 */

export interface LotAllocation {
  lotId: number;
  percentage: number;
  exactQuantity: number;  // Quantità esatta (con decimali)
  roundedQuantity: number; // Quantità arrotondata finale
}

export interface AllocationResult {
  allocations: LotAllocation[];
  totalAllocated: number;
  totalRemainder: number;
  isExact: boolean; // True se non ci sono stati arrotondamenti
}

/**
 * Esegue arrotondamento bilanciato per preservare totali esatti
 * 
 * @param totalQuantity Quantità totale da distribuire (es: 1000 animali)
 * @param percentages Mappa lotId -> percentuale (es: {1: 0.667, 2: 0.333})
 * @returns Risultato con allocazioni bilanciate
 * 
 * Algoritmo:
 * 1. Calcola quantità esatte: q_i = totalQuantity * percentage_i
 * 2. Arrotonda in basso: f_i = Math.floor(q_i)
 * 3. Calcola frazione residua: r_i = q_i - f_i  
 * 4. Distribuisce remainder ai lotti con frazioni più grandi
 * 5. GARANTISCE: Σ roundedQuantity = totalQuantity
 */
export function balancedRounding(
  totalQuantity: number,
  percentages: Map<number, number>
): AllocationResult {
  
  if (totalQuantity <= 0) {
    throw new Error("Total quantity must be positive");
  }
  
  if (percentages.size === 0) {
    throw new Error("At least one percentage must be provided");
  }
  
  // Verifica che le percentuali sommino a ~1.0 (con tolleranza per arrotondamenti)
  const percentageSum = Array.from(percentages.values()).reduce((sum, p) => sum + p, 0);
  if (Math.abs(percentageSum - 1.0) > 0.001) {
    console.warn(`⚠️ Percentages sum to ${percentageSum}, expected ~1.0. Auto-normalizing.`);
  }
  
  const allocations: LotAllocation[] = [];
  let totalFloor = 0;
  
  // FASE 1: Calcola quantità esatte e arrotondamenti per difetto
  for (const [lotId, percentage] of Array.from(percentages.entries())) {
    const exactQuantity = totalQuantity * percentage;
    const floorQuantity = Math.floor(exactQuantity);
    const fractionalPart = exactQuantity - floorQuantity;
    
    allocations.push({
      lotId,
      percentage,
      exactQuantity,
      roundedQuantity: floorQuantity // Inizializza con floor, sarà aggiustato dopo
    });
    
    totalFloor += floorQuantity;
  }
  
  // FASE 2: Calcola remainder da distribuire
  const remainder = totalQuantity - totalFloor;
  
  if (remainder === 0) {
    // Caso perfetto: nessun arrotondamento necessario
    return {
      allocations,
      totalAllocated: totalQuantity,
      totalRemainder: 0,
      isExact: true
    };
  }
  
  // FASE 3: Ordina per frazione decrescente e distribuisce remainder
  const sortedByFraction = allocations
    .map(alloc => ({
      ...alloc,
      fractionalPart: alloc.exactQuantity - Math.floor(alloc.exactQuantity)
    }))
    .sort((a, b) => b.fractionalPart - a.fractionalPart);
  
  // Distribuisce 1 unità a ciascuno dei primi 'remainder' lotti
  for (let i = 0; i < remainder && i < sortedByFraction.length; i++) {
    sortedByFraction[i].roundedQuantity += 1;
  }
  
  // FASE 4: Riordina secondo l'ordine originale
  const finalAllocations = allocations.map(original => 
    sortedByFraction.find(sorted => sorted.lotId === original.lotId)!
  );
  
  const totalAllocated = finalAllocations.reduce((sum, alloc) => sum + alloc.roundedQuantity, 0);
  
  // VERIFICA: Deve sempre sommare esattamente a totalQuantity
  if (totalAllocated !== totalQuantity) {
    throw new Error(
      `CRITICAL: Balanced rounding failed! ` +
      `Expected ${totalQuantity}, got ${totalAllocated}. ` +
      `This should never happen.`
    );
  }
  
  return {
    allocations: finalAllocations,
    totalAllocated,
    totalRemainder: remainder,
    isExact: false
  };
}

/**
 * Genera chiave di idempotenza per evitare duplicazioni nel ledger
 */
export function generateIdempotencyKey(
  type: string,
  selectionId: number,
  lotId: number,
  cycleId?: number
): string {
  const cycleKey = cycleId ? `_cycle_${cycleId}` : '';
  return `${type}_sel_${selectionId}_lot_${lotId}${cycleKey}`;
}

/**
 * Crea allocation basis JSON per audit trail
 */
export function createAllocationBasis(
  method: 'proportional' | 'measured',
  sourceComposition: Map<number, number>,
  totalSourceAnimals: number,
  algorithm: string = 'balanced_rounding_v1'
): object {
  return {
    method,
    algorithm,
    totalSourceAnimals,
    sourceComposition: Object.fromEntries(sourceComposition),
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
}

/**
 * Utility di test per verificare correttezza matematica
 */
export function validateAllocation(
  result: AllocationResult,
  expectedTotal: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (result.totalAllocated !== expectedTotal) {
    errors.push(`Total mismatch: expected ${expectedTotal}, got ${result.totalAllocated}`);
  }
  
  const sumCheck = result.allocations.reduce((sum, alloc) => sum + alloc.roundedQuantity, 0);
  if (sumCheck !== expectedTotal) {
    errors.push(`Sum check failed: allocations sum to ${sumCheck}, expected ${expectedTotal}`);
  }
  
  for (const alloc of result.allocations) {
    if (alloc.roundedQuantity < 0) {
      errors.push(`Negative allocation for lot ${alloc.lotId}: ${alloc.roundedQuantity}`);
    }
    
    if (!Number.isInteger(alloc.roundedQuantity)) {
      errors.push(`Non-integer allocation for lot ${alloc.lotId}: ${alloc.roundedQuantity}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}