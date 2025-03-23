import { and, eq, isNull, desc, gte, lte } from 'drizzle-orm';
import { db } from './db';
import { 
  Flupsy, InsertFlupsy, flupsys,
  Basket, Cycle, InsertBasket, InsertCycle, InsertLot, InsertOperation, 
  InsertSgr, InsertSize, Lot, Operation, Size, Sgr, baskets, cycles, lots,
  operations, sgr, sizes, basketPositionHistory, BasketPositionHistory, InsertBasketPositionHistory,
  SgrGiornaliero, InsertSgrGiornaliero, sgrGiornalieri
} from '../shared/schema';
import { IStorage } from './storage';

export class DbStorage implements IStorage {
  // FLUPSY
  async getFlupsys(): Promise<Flupsy[]> {
    return await db.select().from(flupsys);
  }
  
  async getFlupsy(id: number): Promise<Flupsy | undefined> {
    const results = await db.select().from(flupsys).where(eq(flupsys.id, id));
    return results[0];
  }
  
  async getFlupsyByName(name: string): Promise<Flupsy | undefined> {
    const results = await db.select().from(flupsys).where(eq(flupsys.name, name));
    return results[0];
  }
  
  async createFlupsy(flupsy: InsertFlupsy): Promise<Flupsy> {
    const results = await db.insert(flupsys).values(flupsy).returning();
    return results[0];
  }
  
  async updateFlupsy(id: number, flupsyUpdate: Partial<Flupsy>): Promise<Flupsy | undefined> {
    const results = await db.update(flupsys)
      .set(flupsyUpdate)
      .where(eq(flupsys.id, id))
      .returning();
    return results[0];
  }
  
  // BASKETS
  async getBaskets(): Promise<Basket[]> {
    return await db.select().from(baskets);
  }

  async getBasket(id: number): Promise<Basket | undefined> {
    const results = await db.select().from(baskets).where(eq(baskets.id, id));
    return results[0];
  }

  async getBasketByPhysicalNumber(physicalNumber: number): Promise<Basket | undefined> {
    const results = await db.select().from(baskets).where(eq(baskets.physicalNumber, physicalNumber));
    return results[0];
  }
  
  async getBasketsByFlupsy(flupsyId: number): Promise<Basket[]> {
    return await db.select().from(baskets).where(eq(baskets.flupsyId, flupsyId));
  }

  async createBasket(basket: InsertBasket): Promise<Basket> {
    const results = await db.insert(baskets).values(basket).returning();
    return results[0];
  }

  async updateBasket(id: number, basketUpdate: Partial<Basket>): Promise<Basket | undefined> {
    const results = await db.update(baskets)
      .set(basketUpdate)
      .where(eq(baskets.id, id))
      .returning();
    return results[0];
  }
  
  async deleteBasket(id: number): Promise<boolean> {
    const results = await db.delete(baskets).where(eq(baskets.id, id)).returning();
    return results.length > 0;
  }

  // OPERATIONS
  async getOperations(): Promise<Operation[]> {
    return await db.select().from(operations);
  }

  async getOperation(id: number): Promise<Operation | undefined> {
    const results = await db.select().from(operations).where(eq(operations.id, id));
    return results[0];
  }

  async getOperationsByBasket(basketId: number): Promise<Operation[]> {
    return await db.select().from(operations).where(eq(operations.basketId, basketId));
  }

  async getOperationsByCycle(cycleId: number): Promise<Operation[]> {
    return await db.select().from(operations).where(eq(operations.cycleId, cycleId));
  }

  async getOperationsByDate(date: Date): Promise<Operation[]> {
    // Convert Date to string in format YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    return await db.select().from(operations).where(eq(operations.date, dateStr));
  }

  async createOperation(operation: InsertOperation): Promise<Operation> {
    // Convert any dates to string format
    if (typeof operation.date === 'object' && operation.date && 'toISOString' in operation.date) {
      operation.date = operation.date.toISOString().split('T')[0];
    }
    
    // Calcola automaticamente averageWeight se animalsPerKg è presente
    const operationData = { ...operation };
    if (operationData.animalsPerKg && operationData.animalsPerKg > 0) {
      // Formula: 1,000,000 mg diviso per animalsPerKg = peso medio in milligrammi
      const averageWeight = 1000000 / operationData.animalsPerKg;
      operationData.averageWeight = averageWeight;
      
      // Se l'operazione include animalsPerKg, assegna automaticamente la taglia corretta
      // basandosi sui valori min e max del database
      if (!operationData.sizeId) {
        console.log(`Determinazione automatica della taglia per animalsPerKg: ${operationData.animalsPerKg}`);
        
        // Ottieni tutte le taglie disponibili
        const allSizes = await this.getSizes();
        
        // Trova la taglia corrispondente in base a animalsPerKg
        const matchingSize = allSizes.find(size => 
          operationData.animalsPerKg! >= size.minAnimalsPerKg && 
          operationData.animalsPerKg! <= size.maxAnimalsPerKg
        );
        
        if (matchingSize) {
          console.log(`Taglia determinata automaticamente: ${matchingSize.code} (ID: ${matchingSize.id})`);
          operationData.sizeId = matchingSize.id;
        } else {
          console.log(`Nessuna taglia trovata per animalsPerKg: ${operationData.animalsPerKg}`);
        }
      } else {
        // Verifica che la taglia assegnata sia coerente con animalsPerKg
        const assignedSize = await this.getSize(operationData.sizeId);
        if (assignedSize) {
          const isInRange = operationData.animalsPerKg >= assignedSize.minAnimalsPerKg && 
                          operationData.animalsPerKg <= assignedSize.maxAnimalsPerKg;
          
          if (!isInRange) {
            console.log(`Attenzione: La taglia assegnata ${assignedSize.code} non corrisponde a animalsPerKg ${operationData.animalsPerKg}`);
            console.log(`Range atteso: ${assignedSize.minAnimalsPerKg}-${assignedSize.maxAnimalsPerKg}`);
            
            // Ottieni tutte le taglie disponibili
            const allSizes = await this.getSizes();
            
            // Trova la taglia corretta
            const correctSize = allSizes.find(size => 
              operationData.animalsPerKg! >= size.minAnimalsPerKg && 
              operationData.animalsPerKg! <= size.maxAnimalsPerKg
            );
            
            if (correctSize) {
              console.log(`Correzione automatica della taglia da ${assignedSize.code} a ${correctSize.code}`);
              operationData.sizeId = correctSize.id;
            }
          }
        }
      }
    }
    
    const results = await db.insert(operations).values(operationData).returning();
    return results[0];
  }

  async updateOperation(id: number, operationUpdate: Partial<Operation>): Promise<Operation | undefined> {
    // Convert any dates to string format
    if (operationUpdate.date && typeof operationUpdate.date === 'object' && 'toISOString' in operationUpdate.date) {
      operationUpdate.date = operationUpdate.date.toISOString().split('T')[0];
    }
    
    // Calcola automaticamente averageWeight se animalsPerKg è stato aggiornato
    const updateData = { ...operationUpdate };
    if (updateData.animalsPerKg && updateData.animalsPerKg > 0) {
      // Formula: 1,000,000 mg diviso per animalsPerKg = peso medio in milligrammi
      const averageWeight = 1000000 / updateData.animalsPerKg;
      updateData.averageWeight = averageWeight;
    }
    
    const results = await db.update(operations)
      .set(updateData)
      .where(eq(operations.id, id))
      .returning();
    return results[0];
  }
  
  async deleteOperation(id: number): Promise<boolean> {
    const deletedCount = await db.delete(operations)
      .where(eq(operations.id, id))
      .returning({ id: operations.id });
    
    return deletedCount.length > 0;
  }

  // CYCLES
  async getCycles(): Promise<Cycle[]> {
    return await db.select().from(cycles);
  }

  async getActiveCycles(): Promise<Cycle[]> {
    return await db.select().from(cycles).where(eq(cycles.state, 'active'));
  }

  async getCycle(id: number): Promise<Cycle | undefined> {
    const results = await db.select().from(cycles).where(eq(cycles.id, id));
    return results[0];
  }

  async getCyclesByBasket(basketId: number): Promise<Cycle[]> {
    return await db.select().from(cycles).where(eq(cycles.basketId, basketId));
  }
  
  async getCyclesByFlupsy(flupsyId: number): Promise<Cycle[]> {
    // Prima otteniamo tutti i cestelli associati a questo FLUPSY
    const flupsyBaskets = await this.getBasketsByFlupsy(flupsyId);
    
    if (flupsyBaskets.length === 0) {
      return [];
    }
    
    // Estraiamo gli ID dei cestelli
    const basketIds = flupsyBaskets.map(basket => basket.id);
    
    // Recuperiamo tutti i cicli collegati a questi cestelli
    const allCycles: Cycle[] = [];
    for (const basketId of basketIds) {
      const basketCycles = await this.getCyclesByBasket(basketId);
      allCycles.push(...basketCycles);
    }
    
    return allCycles;
  }

  async createCycle(cycle: InsertCycle): Promise<Cycle> {
    // Convert any dates to string format
    if (cycle.startDate && typeof cycle.startDate === 'object' && 'toISOString' in cycle.startDate) {
      cycle.startDate = cycle.startDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(cycles).values({
      ...cycle,
      state: 'active',
      endDate: null
    }).returning();
    return results[0];
  }

  async closeCycle(id: number, endDate: string | Date): Promise<Cycle | undefined> {
    // Convert date to string format if it's a Date object
    const endDateStr = typeof endDate === 'string' 
      ? endDate 
      : endDate.toISOString().split('T')[0];
    
    const results = await db.update(cycles)
      .set({
        endDate: endDateStr,
        state: 'closed'
      })
      .where(eq(cycles.id, id))
      .returning();
    return results[0];
  }

  // SIZES
  async getSizes(): Promise<Size[]> {
    return await db.select().from(sizes);
  }

  async getSize(id: number): Promise<Size | undefined> {
    const results = await db.select().from(sizes).where(eq(sizes.id, id));
    return results[0];
  }

  async getSizeByCode(code: string): Promise<Size | undefined> {
    const results = await db.select().from(sizes).where(eq(sizes.code, code));
    return results[0];
  }

  async createSize(size: InsertSize): Promise<Size> {
    const results = await db.insert(sizes).values(size).returning();
    return results[0];
  }

  async updateSize(id: number, sizeUpdate: Partial<Size>): Promise<Size | undefined> {
    const results = await db.update(sizes)
      .set(sizeUpdate)
      .where(eq(sizes.id, id))
      .returning();
    return results[0];
  }

  // SGR
  async getSgrs(): Promise<Sgr[]> {
    return await db.select().from(sgr);
  }

  async getSgr(id: number): Promise<Sgr | undefined> {
    const results = await db.select().from(sgr).where(eq(sgr.id, id));
    return results[0];
  }

  async getSgrByMonth(month: string): Promise<Sgr | undefined> {
    const results = await db.select().from(sgr).where(eq(sgr.month, month));
    return results[0];
  }

  async createSgr(sgrData: InsertSgr): Promise<Sgr> {
    const results = await db.insert(sgr).values(sgrData).returning();
    return results[0];
  }

  async updateSgr(id: number, sgrUpdate: Partial<Sgr>): Promise<Sgr | undefined> {
    const results = await db.update(sgr)
      .set(sgrUpdate)
      .where(eq(sgr.id, id))
      .returning();
    return results[0];
  }

  // LOTS
  async getLots(): Promise<Lot[]> {
    return await db.select().from(lots);
  }

  async getActiveLots(): Promise<Lot[]> {
    return await db.select().from(lots).where(eq(lots.state, 'active'));
  }

  async getLot(id: number): Promise<Lot | undefined> {
    const results = await db.select().from(lots).where(eq(lots.id, id));
    return results[0];
  }

  async createLot(lot: InsertLot): Promise<Lot> {
    // Convert any dates to string format
    if (lot.arrivalDate && typeof lot.arrivalDate === 'object' && 'toISOString' in lot.arrivalDate) {
      lot.arrivalDate = lot.arrivalDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(lots).values({
      ...lot,
      state: 'active'
    }).returning();
    return results[0];
  }

  async updateLot(id: number, lotUpdate: Partial<Lot>): Promise<Lot | undefined> {
    // Convert any dates to string format
    if (lotUpdate.arrivalDate && typeof lotUpdate.arrivalDate === 'object' && 'toISOString' in lotUpdate.arrivalDate) {
      lotUpdate.arrivalDate = lotUpdate.arrivalDate.toISOString().split('T')[0];
    }
    
    const results = await db.update(lots)
      .set(lotUpdate)
      .where(eq(lots.id, id))
      .returning();
    return results[0];
  }
  
  // BASKET POSITION HISTORY
  async getBasketPositionHistory(basketId: number): Promise<BasketPositionHistory[]> {
    return await db.select()
      .from(basketPositionHistory)
      .where(eq(basketPositionHistory.basketId, basketId))
      .orderBy(desc(basketPositionHistory.startDate));
  }

  async getCurrentBasketPosition(basketId: number): Promise<BasketPositionHistory | undefined> {
    const results = await db.select()
      .from(basketPositionHistory)
      .where(and(
        eq(basketPositionHistory.basketId, basketId),
        isNull(basketPositionHistory.endDate)
      ));
    return results[0];
  }

  async createBasketPositionHistory(positionHistory: InsertBasketPositionHistory): Promise<BasketPositionHistory> {
    // Convert any dates to string format
    if (positionHistory.startDate && typeof positionHistory.startDate === 'object' && 'toISOString' in positionHistory.startDate) {
      positionHistory.startDate = positionHistory.startDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(basketPositionHistory).values({
      ...positionHistory,
      endDate: null
    }).returning();
    return results[0];
  }

  async closeBasketPositionHistory(basketId: number, endDate: Date): Promise<BasketPositionHistory | undefined> {
    // Convert date to string format
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get the current active position
    const currentPosition = await this.getCurrentBasketPosition(basketId);
    if (!currentPosition) {
      return undefined;
    }
    
    // Close the position
    const results = await db.update(basketPositionHistory)
      .set({
        endDate: endDateStr
      })
      .where(eq(basketPositionHistory.id, currentPosition.id))
      .returning();
    return results[0];
  }
  
  // SGR Giornalieri methods
  async getSgrGiornalieri(): Promise<SgrGiornaliero[]> {
    return await db.select()
      .from(sgrGiornalieri)
      .orderBy(desc(sgrGiornalieri.recordDate));
  }

  async getSgrGiornaliero(id: number): Promise<SgrGiornaliero | undefined> {
    const results = await db.select()
      .from(sgrGiornalieri)
      .where(eq(sgrGiornalieri.id, id));
    return results[0];
  }

  async getSgrGiornalieriByDateRange(startDate: Date, endDate: Date): Promise<SgrGiornaliero[]> {
    // Convert dates to string format for PostgreSQL compatibility
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Using a different approach to avoid type issues with drizzle
    // Get all records then filter by date
    const allRecords = await db.select().from(sgrGiornalieri);
    
    // Filter the records in JavaScript
    return allRecords
      .filter(record => {
        const recordDate = new Date(record.recordDate).getTime();
        return recordDate >= new Date(startDateStr).getTime() && 
               recordDate <= new Date(endDateStr).getTime();
      })
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
  }

  async createSgrGiornaliero(sgrGiornaliero: InsertSgrGiornaliero): Promise<SgrGiornaliero> {
    // Convert date to string format if it's a Date object
    if (sgrGiornaliero.recordDate && typeof sgrGiornaliero.recordDate === 'object' && 'toISOString' in sgrGiornaliero.recordDate) {
      sgrGiornaliero.recordDate = sgrGiornaliero.recordDate.toISOString().split('T')[0];
    }
    
    const results = await db.insert(sgrGiornalieri)
      .values(sgrGiornaliero)
      .returning();
    return results[0];
  }

  async updateSgrGiornaliero(id: number, sgrGiornalieroUpdate: Partial<SgrGiornaliero>): Promise<SgrGiornaliero | undefined> {
    // Convert date to string format if it's a Date object
    if (sgrGiornalieroUpdate.recordDate && typeof sgrGiornalieroUpdate.recordDate === 'object' && 'toISOString' in sgrGiornalieroUpdate.recordDate) {
      sgrGiornalieroUpdate.recordDate = sgrGiornalieroUpdate.recordDate.toISOString().split('T')[0];
    }
    
    const results = await db.update(sgrGiornalieri)
      .set(sgrGiornalieroUpdate)
      .where(eq(sgrGiornalieri.id, id))
      .returning();
    return results[0];
  }

  async deleteSgrGiornaliero(id: number): Promise<boolean> {
    const results = await db.delete(sgrGiornalieri)
      .where(eq(sgrGiornalieri.id, id))
      .returning({
        id: sgrGiornalieri.id
      });
    return results.length > 0;
  }
  
  // Growth calculations
  async calculateActualSgr(operations: Operation[]): Promise<number | null> {
    // Implementation for calculating the actual SGR based on operations
    if (operations.length < 2) {
      return null; // Need at least two measurements to calculate SGR
    }
    
    // Sort operations by date, oldest first
    operations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Get first and last measurement
    const firstMeasurement = operations[0];
    const lastMeasurement = operations[operations.length - 1];
    
    // Check if we have weight data
    if (!firstMeasurement.averageWeight || !lastMeasurement.averageWeight) {
      return null;
    }
    
    // Calculate days between measurements
    const daysDiff = (new Date(lastMeasurement.date).getTime() - new Date(firstMeasurement.date).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) {
      return null;
    }
    
    // Calculate SGR using the formula: SGR = ((ln(Wt) - ln(W0)) / t) * 100
    // Where Wt is the final weight, W0 is the initial weight, and t is time in days
    const sgr = ((Math.log(lastMeasurement.averageWeight) - Math.log(firstMeasurement.averageWeight)) / daysDiff) * 100;
    
    return sgr;
  }
  
  async calculateGrowthPrediction(
    currentWeight: number, 
    measurementDate: Date, 
    days: number, 
    sgrPercentage: number,
    variationPercentages: {best: number, worst: number}
  ): Promise<any> {
    // Convert SGR from percentage to decimal (SGR è già un valore giornaliero percentuale)
    const dailySgr = sgrPercentage / 100; // Convert % to decimal
    
    // Calculate best and worst case scenarios
    const bestDailySgr = dailySgr * (1 + variationPercentages.best / 100);
    const worstDailySgr = dailySgr * (1 - variationPercentages.worst / 100);
    
    // Calculate projected weights for each day
    const projections = [];
    
    for (let day = 0; day <= days; day++) {
      const date = new Date(measurementDate);
      date.setDate(date.getDate() + day);
      
      // Calculate weights using the formula: W(t) = W(0) * e^(SGR * t)
      const theoreticalWeight = currentWeight * Math.exp(dailySgr * day);
      const bestWeight = currentWeight * Math.exp(bestDailySgr * day);
      const worstWeight = currentWeight * Math.exp(worstDailySgr * day);
      
      projections.push({
        day,
        date: date.toISOString().split('T')[0],
        theoretical: Math.round(theoreticalWeight),
        best: Math.round(bestWeight),
        worst: Math.round(worstWeight)
      });
    }
    
    // Calcola dati di riepilogo (necessari per la visualizzazione nel frontend)
    const lastProjection = projections[projections.length - 1];
    const summary = {
      // Pesi finali per ciascuno scenario alla fine della proiezione
      finalTheoreticalWeight: lastProjection.theoretical,
      finalBestWeight: lastProjection.best,
      finalWorstWeight: lastProjection.worst,
      // Percentuali di crescita totale per ciascuno scenario
      growthPercentageTheoretical: Math.round((lastProjection.theoretical / currentWeight - 1) * 100),
      growthPercentageBest: Math.round((lastProjection.best / currentWeight - 1) * 100),
      growthPercentageWorst: Math.round((lastProjection.worst / currentWeight - 1) * 100)
    };
    
    return {
      currentWeight,
      measurementDate: measurementDate.toISOString().split('T')[0],
      sgrPercentage,
      days,
      variationPercentages,
      summary,  // Aggiunto il riepilogo qui
      projections,
      lastMeasurementDate: measurementDate.toISOString().split('T')[0] // Aggiunto esplicitamente per evitare confusione
    };
  }
}