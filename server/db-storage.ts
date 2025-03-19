import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from './db';
import { 
  Flupsy, InsertFlupsy, flupsys,
  Basket, Cycle, InsertBasket, InsertCycle, InsertLot, InsertOperation, 
  InsertSgr, InsertSize, Lot, Operation, Size, Sgr, baskets, cycles, lots,
  operations, sgr, sizes, basketPositionHistory, BasketPositionHistory, InsertBasketPositionHistory
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

  async closeCycle(id: number, endDate: Date): Promise<Cycle | undefined> {
    // Convert date to string format
    const endDateStr = endDate.toISOString().split('T')[0];
    
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
}