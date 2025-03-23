import { 
  Flupsy, InsertFlupsy,
  Basket, InsertBasket, 
  Operation, InsertOperation, 
  Cycle, InsertCycle, 
  Size, InsertSize, 
  Sgr, InsertSgr, 
  Lot, InsertLot,
  BasketPositionHistory, InsertBasketPositionHistory,
  SgrGiornaliero, InsertSgrGiornaliero,
  operationTypes
} from "@shared/schema";

export interface IStorage {
  // FLUPSY methods
  getFlupsys(): Promise<Flupsy[]>;
  getFlupsy(id: number): Promise<Flupsy | undefined>;
  getFlupsyByName(name: string): Promise<Flupsy | undefined>;
  createFlupsy(flupsy: InsertFlupsy): Promise<Flupsy>;
  updateFlupsy(id: number, flupsy: Partial<Flupsy>): Promise<Flupsy | undefined>;
  
  // Basket methods
  getBaskets(): Promise<Basket[]>;
  getBasketsByFlupsy(flupsyId: number): Promise<Basket[]>;
  getBasket(id: number): Promise<Basket | undefined>;
  getBasketByPhysicalNumber(physicalNumber: number): Promise<Basket | undefined>;
  createBasket(basket: InsertBasket): Promise<Basket>;
  updateBasket(id: number, basket: Partial<Basket>): Promise<Basket | undefined>;
  deleteBasket(id: number): Promise<boolean>;
  
  // Operation methods
  getOperations(): Promise<Operation[]>;
  getOperation(id: number): Promise<Operation | undefined>;
  getOperationsByBasket(basketId: number): Promise<Operation[]>;
  getOperationsByCycle(cycleId: number): Promise<Operation[]>;
  getOperationsByDate(date: Date): Promise<Operation[]>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  updateOperation(id: number, operation: Partial<Operation>): Promise<Operation | undefined>;
  deleteOperation(id: number): Promise<boolean>;
  
  // Cycle methods
  getCycles(): Promise<Cycle[]>;
  getActiveCycles(): Promise<Cycle[]>;
  getCycle(id: number): Promise<Cycle | undefined>;
  getCyclesByBasket(basketId: number): Promise<Cycle[]>;
  getCyclesByFlupsy(flupsyId: number): Promise<Cycle[]>;
  createCycle(cycle: InsertCycle): Promise<Cycle>;
  closeCycle(id: number, endDate: string | Date): Promise<Cycle | undefined>;
  
  // Size methods
  getSizes(): Promise<Size[]>;
  getSize(id: number): Promise<Size | undefined>;
  getSizeByCode(code: string): Promise<Size | undefined>;
  createSize(size: InsertSize): Promise<Size>;
  updateSize(id: number, size: Partial<Size>): Promise<Size | undefined>;
  
  // SGR methods
  getSgrs(): Promise<Sgr[]>;
  getSgr(id: number): Promise<Sgr | undefined>;
  getSgrByMonth(month: string): Promise<Sgr | undefined>;
  createSgr(sgr: InsertSgr): Promise<Sgr>;
  updateSgr(id: number, sgr: Partial<Sgr>): Promise<Sgr | undefined>;
  
  // SGR Giornalieri methods
  getSgrGiornalieri(): Promise<SgrGiornaliero[]>;
  getSgrGiornaliero(id: number): Promise<SgrGiornaliero | undefined>;
  getSgrGiornalieriByDateRange(startDate: Date, endDate: Date): Promise<SgrGiornaliero[]>;
  createSgrGiornaliero(sgrGiornaliero: InsertSgrGiornaliero): Promise<SgrGiornaliero>;
  updateSgrGiornaliero(id: number, sgrGiornaliero: Partial<SgrGiornaliero>): Promise<SgrGiornaliero | undefined>;
  deleteSgrGiornaliero(id: number): Promise<boolean>;
  
  // Lot methods
  getLots(): Promise<Lot[]>;
  getActiveLots(): Promise<Lot[]>;
  getLot(id: number): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<Lot>): Promise<Lot | undefined>;
  
  // Basket position history methods
  getBasketPositionHistory(basketId: number): Promise<BasketPositionHistory[]>;
  getCurrentBasketPosition(basketId: number): Promise<BasketPositionHistory | undefined>;
  createBasketPositionHistory(positionHistory: InsertBasketPositionHistory): Promise<BasketPositionHistory>;
  closeBasketPositionHistory(basketId: number, endDate: Date | string): Promise<BasketPositionHistory | undefined>;
  
  // Growth predictions methods
  calculateActualSgr(operations: Operation[]): Promise<number | null>;
  calculateGrowthPrediction(
    currentWeight: number, 
    measurementDate: Date, 
    days: number, 
    sgrPercentage: number, 
    variationPercentages: {best: number, worst: number}
  ): Promise<any>;
}

export class MemStorage implements IStorage {
  private flupsys: Map<number, Flupsy>;
  private baskets: Map<number, Basket>;
  private operations: Map<number, Operation>;
  private cycles: Map<number, Cycle>;
  private sizes: Map<number, Size>;
  private sgrs: Map<number, Sgr>;
  private lots: Map<number, Lot>;
  private basketPositions: Map<number, BasketPositionHistory>;
  private sgrGiornalieri: Map<number, SgrGiornaliero>;
  
  private flupsyId: number;
  private basketId: number;
  private operationId: number;
  private cycleId: number;
  private sizeId: number;
  private sgrId: number;
  private lotId: number;
  private positionHistoryId: number;
  private sgrGiornalieroId: number;
  
  constructor() {
    this.flupsys = new Map();
    this.baskets = new Map();
    this.operations = new Map();
    this.cycles = new Map();
    this.sizes = new Map();
    this.sgrs = new Map();
    this.lots = new Map();
    this.basketPositions = new Map();
    this.sgrGiornalieri = new Map();
    
    this.flupsyId = 1;
    this.basketId = 1;
    this.operationId = 1;
    this.cycleId = 1;
    this.sizeId = 1;
    this.sgrId = 1;
    this.lotId = 1;
    this.positionHistoryId = 1;
    this.sgrGiornalieroId = 1;
    
    // Initialize with some default sizes
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Initialize default FLUPSY units
    const defaultFlupsys: InsertFlupsy[] = [
      { name: 'FLUPSY 1', location: 'Baia Nord', description: 'Unità principale', active: true },
      { name: 'FLUPSY 2', location: 'Baia Sud', description: 'Unità secondaria', active: true }
    ];

    // Initialize default sizes
    const defaultSizes: InsertSize[] = [
      { code: 'T0', name: 'Tiny 0', sizeMm: 0.5, minAnimalsPerKg: 8000, maxAnimalsPerKg: 12000, notes: 'Smallest size' },
      { code: 'T1', name: 'Tiny 1', sizeMm: 1.0, minAnimalsPerKg: 5000, maxAnimalsPerKg: 8000, notes: 'Very small' },
      { code: 'M1', name: 'Medium 1', sizeMm: 2.0, minAnimalsPerKg: 3000, maxAnimalsPerKg: 5000, notes: 'Small-medium' },
      { code: 'M2', name: 'Medium 2', sizeMm: 3.0, minAnimalsPerKg: 2000, maxAnimalsPerKg: 3000, notes: 'Medium' },
      { code: 'M3', name: 'Medium 3', sizeMm: 4.0, minAnimalsPerKg: 1500, maxAnimalsPerKg: 2000, notes: 'Medium-large' }
    ];
    
    // Initialize default SGR values
    const defaultSgrs: InsertSgr[] = [
      { month: 'Gennaio', percentage: 0.7 },
      { month: 'Febbraio', percentage: 0.7 },
      { month: 'Marzo', percentage: 0.6 },
      { month: 'Aprile', percentage: 0.6 },
      { month: 'Maggio', percentage: 0.5 },
      { month: 'Giugno', percentage: 0.5 },
      { month: 'Luglio', percentage: 0.5 },
      { month: 'Agosto', percentage: 0.5 },
      { month: 'Settembre', percentage: 0.6 },
      { month: 'Ottobre', percentage: 0.6 },
      { month: 'Novembre', percentage: 0.5 },
      { month: 'Dicembre', percentage: 0.6 }
    ];
    
    defaultFlupsys.forEach(flupsy => this.createFlupsy(flupsy));
    defaultSizes.forEach(size => this.createSize(size));
    defaultSgrs.forEach(sgr => this.createSgr(sgr));
  }
  
  // FLUPSY methods
  async getFlupsys(): Promise<Flupsy[]> {
    return Array.from(this.flupsys.values());
  }
  
  async getFlupsy(id: number): Promise<Flupsy | undefined> {
    return this.flupsys.get(id);
  }
  
  async getFlupsyByName(name: string): Promise<Flupsy | undefined> {
    return Array.from(this.flupsys.values()).find(flupsy => flupsy.name === name);
  }
  
  async createFlupsy(flupsy: InsertFlupsy): Promise<Flupsy> {
    const id = this.flupsyId++;
    const newFlupsy: Flupsy = { ...flupsy, id };
    this.flupsys.set(id, newFlupsy);
    return newFlupsy;
  }
  
  async updateFlupsy(id: number, flupsy: Partial<Flupsy>): Promise<Flupsy | undefined> {
    const currentFlupsy = this.flupsys.get(id);
    if (!currentFlupsy) return undefined;
    
    const updatedFlupsy = { ...currentFlupsy, ...flupsy };
    this.flupsys.set(id, updatedFlupsy);
    return updatedFlupsy;
  }
  
  // Basket methods
  async getBasketsByFlupsy(flupsyId: number): Promise<Basket[]> {
    return Array.from(this.baskets.values()).filter(basket => basket.flupsyId === flupsyId);
  }
  
  async getCyclesByFlupsy(flupsyId: number): Promise<Cycle[]> {
    // Get all baskets for this FLUPSY
    const baskets = await this.getBasketsByFlupsy(flupsyId);
    
    // Get cycles for each basket and flatten the array
    const cycles: Cycle[] = [];
    for (const basket of baskets) {
      const basketCycles = await this.getCyclesByBasket(basket.id);
      cycles.push(...basketCycles);
    }
    
    return cycles;
  }
  async getBaskets(): Promise<Basket[]> {
    return Array.from(this.baskets.values());
  }
  
  async getBasket(id: number): Promise<Basket | undefined> {
    return this.baskets.get(id);
  }
  
  async getBasketByPhysicalNumber(physicalNumber: number): Promise<Basket | undefined> {
    return Array.from(this.baskets.values()).find(basket => basket.physicalNumber === physicalNumber);
  }
  
  async createBasket(basket: InsertBasket): Promise<Basket> {
    const id = this.basketId++;
    const newBasket: Basket = { ...basket, id, currentCycleId: null, nfcData: null, state: "available" };
    this.baskets.set(id, newBasket);
    return newBasket;
  }
  
  async updateBasket(id: number, basket: Partial<Basket>): Promise<Basket | undefined> {
    const currentBasket = this.baskets.get(id);
    if (!currentBasket) return undefined;
    
    const updatedBasket = { ...currentBasket, ...basket };
    this.baskets.set(id, updatedBasket);
    return updatedBasket;
  }
  
  async deleteBasket(id: number): Promise<boolean> {
    const exists = this.baskets.has(id);
    if (exists) {
      this.baskets.delete(id);
      return true;
    }
    return false;
  }
  
  // Operation methods
  async getOperations(): Promise<Operation[]> {
    return Array.from(this.operations.values());
  }
  
  async getOperation(id: number): Promise<Operation | undefined> {
    return this.operations.get(id);
  }
  
  async getOperationsByBasket(basketId: number): Promise<Operation[]> {
    return Array.from(this.operations.values())
      .filter(operation => operation.basketId === basketId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async getOperationsByCycle(cycleId: number): Promise<Operation[]> {
    return Array.from(this.operations.values())
      .filter(operation => operation.cycleId === cycleId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async getOperationsByDate(date: Date): Promise<Operation[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.operations.values()).filter(operation => {
      const opDate = new Date(operation.date);
      opDate.setHours(0, 0, 0, 0);
      return opDate.getTime() === targetDate.getTime();
    });
  }
  
  async createOperation(operation: InsertOperation): Promise<Operation> {
    // Calculate average weight if animals per kg is provided
    let averageWeight = null;
    if (operation.animalsPerKg && operation.animalsPerKg > 0) {
      averageWeight = 1000000 / operation.animalsPerKg;
    }
    
    const id = this.operationId++;
    const newOperation: Operation = { 
      ...operation, 
      id,
      averageWeight
    };
    
    this.operations.set(id, newOperation);
    
    // If this is a cycle closing operation, update the cycle
    if (operation.type === 'vendita' || operation.type === 'selezione-vendita') {
      await this.closeCycle(operation.cycleId, new Date(operation.date));
      
      // Also update the basket state
      const cycle = await this.getCycle(operation.cycleId);
      if (cycle) {
        await this.updateBasket(cycle.basketId, { 
          state: "available",
          currentCycleId: null,
          nfcData: null
        });
      }
    }
    
    // Update NFC data
    const cycle = await this.getCycle(operation.cycleId);
    if (cycle) {
      const basket = await this.getBasket(cycle.basketId);
      if (basket) {
        const nfcData = JSON.stringify({
          cycleId: operation.cycleId,
          lastOperation: {
            id: newOperation.id,
            date: operation.date,
            type: operation.type
          }
        });
        await this.updateBasket(basket.id, { nfcData });
      }
    }
    
    return newOperation;
  }
  
  async updateOperation(id: number, operation: Partial<Operation>): Promise<Operation | undefined> {
    const currentOperation = this.operations.get(id);
    if (!currentOperation) return undefined;
    
    // Recalculate average weight if animals per kg is updated
    let averageWeight = currentOperation.averageWeight;
    if (operation.animalsPerKg && operation.animalsPerKg > 0) {
      averageWeight = 1000000 / operation.animalsPerKg;
    }
    
    const updatedOperation = { 
      ...currentOperation, 
      ...operation,
      averageWeight
    };
    
    this.operations.set(id, updatedOperation);
    return updatedOperation;
  }
  
  async deleteOperation(id: number): Promise<boolean> {
    const exists = this.operations.has(id);
    if (exists) {
      this.operations.delete(id);
      return true;
    }
    return false;
  }
  
  // Cycle methods
  async getCycles(): Promise<Cycle[]> {
    return Array.from(this.cycles.values());
  }
  
  async getActiveCycles(): Promise<Cycle[]> {
    return Array.from(this.cycles.values()).filter(cycle => cycle.state === 'active');
  }
  
  async getCycle(id: number): Promise<Cycle | undefined> {
    return this.cycles.get(id);
  }
  
  async getCyclesByBasket(basketId: number): Promise<Cycle[]> {
    return Array.from(this.cycles.values())
      .filter(cycle => cycle.basketId === basketId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
  
  async createCycle(cycle: InsertCycle): Promise<Cycle> {
    const id = this.cycleId++;
    const newCycle: Cycle = { 
      ...cycle, 
      id,
      endDate: null,
      state: 'active'
    };
    
    this.cycles.set(id, newCycle);
    
    // Update the basket to reference this cycle
    await this.updateBasket(cycle.basketId, { 
      state: 'active',
      currentCycleId: id
    });
    
    return newCycle;
  }
  
  async closeCycle(id: number, endDate: Date): Promise<Cycle | undefined> {
    const currentCycle = this.cycles.get(id);
    if (!currentCycle) return undefined;
    
    const updatedCycle = { 
      ...currentCycle, 
      endDate,
      state: 'closed'
    };
    
    this.cycles.set(id, updatedCycle);
    return updatedCycle;
  }
  
  // Size methods
  async getSizes(): Promise<Size[]> {
    return Array.from(this.sizes.values());
  }
  
  async getSize(id: number): Promise<Size | undefined> {
    return this.sizes.get(id);
  }
  
  async getSizeByCode(code: string): Promise<Size | undefined> {
    return Array.from(this.sizes.values()).find(size => size.code === code);
  }
  
  async createSize(size: InsertSize): Promise<Size> {
    const id = this.sizeId++;
    const newSize: Size = { ...size, id };
    this.sizes.set(id, newSize);
    return newSize;
  }
  
  async updateSize(id: number, size: Partial<Size>): Promise<Size | undefined> {
    const currentSize = this.sizes.get(id);
    if (!currentSize) return undefined;
    
    const updatedSize = { ...currentSize, ...size };
    this.sizes.set(id, updatedSize);
    return updatedSize;
  }
  
  // SGR methods
  async getSgrs(): Promise<Sgr[]> {
    return Array.from(this.sgrs.values());
  }
  
  async getSgr(id: number): Promise<Sgr | undefined> {
    return this.sgrs.get(id);
  }
  
  async getSgrByMonth(month: string): Promise<Sgr | undefined> {
    return Array.from(this.sgrs.values()).find(sgr => sgr.month.toLowerCase() === month.toLowerCase());
  }
  
  async createSgr(sgr: InsertSgr): Promise<Sgr> {
    const id = this.sgrId++;
    const newSgr: Sgr = { ...sgr, id };
    this.sgrs.set(id, newSgr);
    return newSgr;
  }
  
  async updateSgr(id: number, sgr: Partial<Sgr>): Promise<Sgr | undefined> {
    const currentSgr = this.sgrs.get(id);
    if (!currentSgr) return undefined;
    
    const updatedSgr = { ...currentSgr, ...sgr };
    this.sgrs.set(id, updatedSgr);
    return updatedSgr;
  }
  
  // Lot methods
  async getLots(): Promise<Lot[]> {
    return Array.from(this.lots.values());
  }
  
  async getActiveLots(): Promise<Lot[]> {
    return Array.from(this.lots.values()).filter(lot => lot.state === 'active');
  }
  
  async getLot(id: number): Promise<Lot | undefined> {
    return this.lots.get(id);
  }
  
  async createLot(lot: InsertLot): Promise<Lot> {
    const id = this.lotId++;
    const newLot: Lot = { 
      ...lot, 
      id,
      state: 'active'
    };
    this.lots.set(id, newLot);
    return newLot;
  }
  
  async updateLot(id: number, lot: Partial<Lot>): Promise<Lot | undefined> {
    const currentLot = this.lots.get(id);
    if (!currentLot) return undefined;
    
    const updatedLot = { ...currentLot, ...lot };
    this.lots.set(id, updatedLot);
    return updatedLot;
  }
  
  // Basket position history methods
  async getBasketPositionHistory(basketId: number): Promise<BasketPositionHistory[]> {
    return Array.from(this.basketPositions.values())
      .filter(position => position.basketId === basketId)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }
  
  async getCurrentBasketPosition(basketId: number): Promise<BasketPositionHistory | undefined> {
    // Find position history entries for this basket with no end date (current position)
    return Array.from(this.basketPositions.values())
      .find(position => position.basketId === basketId && position.endDate === null);
  }
  
  async createBasketPositionHistory(positionHistory: InsertBasketPositionHistory): Promise<BasketPositionHistory> {
    // Close any current position for this basket
    await this.closeBasketPositionHistory(positionHistory.basketId, new Date(positionHistory.startDate));
    
    // Create the new position history entry
    const id = this.positionHistoryId++;
    const newPositionHistory: BasketPositionHistory = { 
      ...positionHistory, 
      id,
      endDate: null
    };
    
    this.basketPositions.set(id, newPositionHistory);
    
    // Also update the basket with the new position
    await this.updateBasket(positionHistory.basketId, {
      row: positionHistory.row,
      position: positionHistory.position
    });
    
    return newPositionHistory;
  }
  
  async closeBasketPositionHistory(basketId: number, endDate: Date | string): Promise<BasketPositionHistory | undefined> {
    // Find the current position (with no end date)
    const currentPosition = await this.getCurrentBasketPosition(basketId);
    if (!currentPosition) return undefined;
    
    // Update with end date
    const updatedPosition = { 
      ...currentPosition, 
      endDate
    };
    
    this.basketPositions.set(currentPosition.id, updatedPosition);
    return updatedPosition;
  }
  
  // SGR Giornalieri methods
  async getSgrGiornalieri(): Promise<SgrGiornaliero[]> {
    return Array.from(this.sgrGiornalieri.values());
  }
  
  async getSgrGiornaliero(id: number): Promise<SgrGiornaliero | undefined> {
    return this.sgrGiornalieri.get(id);
  }
  
  async getSgrGiornalieriByDateRange(startDate: Date, endDate: Date): Promise<SgrGiornaliero[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return Array.from(this.sgrGiornalieri.values())
      .filter(sgr => {
        const date = new Date(sgr.recordDate);
        return date >= start && date <= end;
      })
      .sort((a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());
  }
  
  async createSgrGiornaliero(sgrGiornaliero: InsertSgrGiornaliero): Promise<SgrGiornaliero> {
    const id = this.sgrGiornalieroId++;
    const newSgrGiornaliero: SgrGiornaliero = {
      ...sgrGiornaliero,
      id,
      notes: sgrGiornaliero.notes || null,
      temperature: sgrGiornaliero.temperature || null,
      pH: sgrGiornaliero.pH || null,
      ammonia: sgrGiornaliero.ammonia || null,
      oxygen: sgrGiornaliero.oxygen || null,
      salinity: sgrGiornaliero.salinity || null
    };
    this.sgrGiornalieri.set(id, newSgrGiornaliero);
    return newSgrGiornaliero;
  }
  
  async updateSgrGiornaliero(id: number, sgrGiornaliero: Partial<SgrGiornaliero>): Promise<SgrGiornaliero | undefined> {
    const currentSgrGiornaliero = this.sgrGiornalieri.get(id);
    if (!currentSgrGiornaliero) return undefined;
    
    const updatedSgrGiornaliero = { ...currentSgrGiornaliero, ...sgrGiornaliero };
    this.sgrGiornalieri.set(id, updatedSgrGiornaliero);
    return updatedSgrGiornaliero;
  }
  
  async deleteSgrGiornaliero(id: number): Promise<boolean> {
    const exists = this.sgrGiornalieri.has(id);
    if (exists) {
      this.sgrGiornalieri.delete(id);
      return true;
    }
    return false;
  }
  
  // Growth predictions methods
  async calculateActualSgr(operations: Operation[]): Promise<number | null> {
    if (operations.length < 2) return null;
    
    // Sort operations by date (oldest first)
    const sortedOps = [...operations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Find operations with weight measurements (animalsPerKg)
    const weightOps = sortedOps.filter(op => op.animalsPerKg && op.animalsPerKg > 0);
    if (weightOps.length < 2) return null;
    
    // Get first and last weight measurement
    const firstOp = weightOps[0];
    const lastOp = weightOps[weightOps.length - 1];
    
    // Calculate starting and ending weight in mg
    const startWeight = firstOp.averageWeight || (firstOp.animalsPerKg ? 1000000 / firstOp.animalsPerKg : 0);
    const endWeight = lastOp.averageWeight || (lastOp.animalsPerKg ? 1000000 / lastOp.animalsPerKg : 0);
    
    if (startWeight <= 0 || endWeight <= 0) return null;
    
    // Calculate days between measurements
    const startDate = new Date(firstOp.date);
    const endDate = new Date(lastOp.date);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) return null;
    
    // Calculate SGR using the formula: SGR = 100 * (ln(final weight) - ln(initial weight)) / days
    const sgr = 100 * (Math.log(endWeight) - Math.log(startWeight)) / daysDiff;
    
    return sgr;
  }
  
  async calculateGrowthPrediction(
    currentWeight: number, 
    measurementDate: Date, 
    days: number, 
    sgrPercentage: number, 
    variationPercentages: {best: number, worst: number}
  ): Promise<any> {
    const predictions = [];
    const baseDate = new Date(measurementDate);
    
    // Convert daily SGR from percentage to decimal
    const dailySGR = sgrPercentage / 100;
    const bestDailySGR = dailySGR * (1 + variationPercentages.best / 100);
    const worstDailySGR = dailySGR * (1 - variationPercentages.worst / 100);
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      // Calculate theoretical weight using the SGR formula: W(t) = W(0) * e^(SGR * t)
      // Where t is time in days and SGR is the specific growth rate in decimal form
      const theoreticalWeight = currentWeight * Math.exp(dailySGR * i);
      const bestWeight = currentWeight * Math.exp(bestDailySGR * i);
      const worstWeight = currentWeight * Math.exp(worstDailySGR * i);
      
      predictions.push({
        day: i,
        date: date.toISOString().split('T')[0],
        theoreticalWeight,
        bestWeight,
        worstWeight
      });
    }
    
    return {
      startWeight: currentWeight,
      startDate: baseDate.toISOString().split('T')[0],
      sgrDaily: dailySGR,
      predictions
    };
  }
}

import { DbStorage } from './db-storage';

// Use DbStorage for PostgreSQL database
export const storage = new DbStorage();
