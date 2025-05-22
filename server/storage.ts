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
  MortalityRate, InsertMortalityRate,
  TargetSizeAnnotation, InsertTargetSizeAnnotation,
  operationTypes,
  // Importazioni per il modulo di vagliatura
  ScreeningOperation, InsertScreeningOperation,
  ScreeningSourceBasket, InsertScreeningSourceBasket,
  ScreeningDestinationBasket, InsertScreeningDestinationBasket,
  ScreeningBasketHistory, InsertScreeningBasketHistory,
  ScreeningLotReference, InsertScreeningLotReference,
  // Importazioni per l'autenticazione
  User, InsertUser
} from "@shared/schema";

export interface IStorage {
  // Auth methods
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  validateUser(username: string, password: string): Promise<User | null>;
  
  // FLUPSY methods
  getFlupsys(): Promise<Flupsy[]>;
  getFlupsy(id: number): Promise<Flupsy | undefined>;
  getFlupsyByName(name: string): Promise<Flupsy | undefined>;
  createFlupsy(flupsy: InsertFlupsy): Promise<Flupsy>;
  updateFlupsy(id: number, flupsy: Partial<Flupsy>): Promise<Flupsy | undefined>;
  
  // Basket methods
  getBaskets(): Promise<Basket[]>;
  getBasketsOptimized(options: {
    page?: number;
    pageSize?: number;
    flupsyId?: number;
    state?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    includeDetails?: boolean;
  }): Promise<{ baskets: Basket[], totalCount: number }>;
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
  getLastOperationByCycle(cycleId: number): Promise<Operation | undefined>;
  getOperationsByDate(date: Date): Promise<Operation[]>;
  createOperation(operation: InsertOperation): Promise<Operation>;
  updateOperation(id: number, operation: Partial<Operation>): Promise<Operation | undefined>;
  deleteOperation(id: number): Promise<boolean>;
  
  // Optimized Operation methods with pagination and full JOIN support
  getOperationsOptimized(options?: {
    page?: number; 
    pageSize?: number; 
    cycleId?: number;
    flupsyId?: number;
    basketId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    type?: string;
  }): Promise<{operations: Operation[]; totalCount: number}>;
  
  // Screening Operation methods
  getScreeningOperations(): Promise<ScreeningOperation[]>;
  getScreeningOperationsByStatus(status: string): Promise<ScreeningOperation[]>;
  getScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  createScreeningOperation(operation: InsertScreeningOperation): Promise<ScreeningOperation>;
  updateScreeningOperation(id: number, operation: Partial<ScreeningOperation>): Promise<ScreeningOperation | undefined>;
  completeScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  cancelScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  
  // Screening Source Basket methods
  getScreeningSourceBasketsByScreening(screeningId: number): Promise<any[]>;
  addScreeningSourceBasket(basket: InsertScreeningSourceBasket): Promise<ScreeningSourceBasket>;
  updateScreeningSourceBasket(id: number, basket: Partial<ScreeningSourceBasket>): Promise<ScreeningSourceBasket | undefined>;
  dismissScreeningSourceBasket(id: number): Promise<ScreeningSourceBasket | undefined>;
  removeScreeningSourceBasket(id: number): Promise<boolean>;
  
  // Screening Destination Basket methods
  getScreeningDestinationBasketsByScreening(screeningId: number): Promise<any[]>;
  addScreeningDestinationBasket(basket: InsertScreeningDestinationBasket): Promise<ScreeningDestinationBasket>;
  updateScreeningDestinationBasket(id: number, basket: Partial<ScreeningDestinationBasket>): Promise<ScreeningDestinationBasket | undefined>;
  assignPositionToDestinationBasket(id: number, flupsyId: number, row: string, position: number): Promise<ScreeningDestinationBasket | undefined>;
  removeScreeningDestinationBasket(id: number): Promise<boolean>;
  isPositionAvailable(flupsyId: number, row: string, position: number): Promise<boolean>;
  
  // Screening Basket History methods
  getScreeningBasketHistoryByDestination(destinationBasketId: number): Promise<any[]>;
  createScreeningBasketHistory(history: InsertScreeningBasketHistory): Promise<ScreeningBasketHistory>;
  
  // Screening Lot Reference methods
  getScreeningLotReferencesByDestination(destinationBasketId: number): Promise<any[]>;
  createScreeningLotReference(reference: InsertScreeningLotReference): Promise<ScreeningLotReference>;
  
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
  getLotsOptimized(options: {
    page?: number;
    pageSize?: number;
    supplier?: string;
    quality?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sizeId?: number;
  }): Promise<{ lots: Lot[], totalCount: number }>;
  getActiveLots(): Promise<Lot[]>;
  getLot(id: number): Promise<Lot | undefined>;
  createLot(lot: InsertLot): Promise<Lot>;
  updateLot(id: number, lot: Partial<Lot>): Promise<Lot | undefined>;
  deleteLot(id: number): Promise<boolean>;
  
  // Basket position history methods
  getBasketPositionHistory(basketId: number): Promise<BasketPositionHistory[]>;
  getCurrentBasketPosition(basketId: number): Promise<BasketPositionHistory | undefined>;
  createBasketPositionHistory(positionHistory: InsertBasketPositionHistory): Promise<BasketPositionHistory>;
  closeBasketPositionHistory(basketId: number, endDate: Date | string): Promise<BasketPositionHistory | undefined>;
  
  // Mortality Rate methods
  getMortalityRates(): Promise<MortalityRate[]>;
  getMortalityRate(id: number): Promise<MortalityRate | undefined>;
  getMortalityRatesBySize(sizeId: number): Promise<MortalityRate[]>;
  getMortalityRatesByMonth(month: string): Promise<MortalityRate[]>;
  getMortalityRateByMonthAndSize(month: string, sizeId: number): Promise<MortalityRate | undefined>;
  createMortalityRate(mortalityRate: InsertMortalityRate): Promise<MortalityRate>;
  updateMortalityRate(id: number, mortalityRate: Partial<MortalityRate>): Promise<MortalityRate | undefined>;
  
  // Target Size Annotations methods
  getTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]>;
  getTargetSizeAnnotation(id: number): Promise<TargetSizeAnnotation | undefined>;
  getTargetSizeAnnotationsByBasket(basketId: number): Promise<TargetSizeAnnotation[]>;
  getTargetSizeAnnotationsByTargetSize(targetSizeId: number): Promise<TargetSizeAnnotation[]>;
  getPendingTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]>;
  getBasketsPredictedToReachSize(targetSizeId: number, withinDays: number): Promise<TargetSizeAnnotation[]>;
  createTargetSizeAnnotation(annotation: InsertTargetSizeAnnotation): Promise<TargetSizeAnnotation>;
  updateTargetSizeAnnotation(id: number, annotation: Partial<TargetSizeAnnotation>): Promise<TargetSizeAnnotation | undefined>;
  deleteTargetSizeAnnotation(id: number): Promise<boolean>;
  
  // Growth predictions methods
  calculateActualSgr(operations: Operation[]): Promise<number | null>;
  calculateGrowthPrediction(
    currentWeight: number, 
    measurementDate: Date, 
    days: number, 
    sgrPercentage: number, 
    variationPercentages: {best: number, worst: number}
  ): Promise<any>;
  
  // Screening (Vagliatura) methods
  getScreeningOperations(): Promise<ScreeningOperation[]>;
  getScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  getScreeningOperationsByStatus(status: string): Promise<ScreeningOperation[]>;
  createScreeningOperation(operation: InsertScreeningOperation): Promise<ScreeningOperation>;
  updateScreeningOperation(id: number, operation: Partial<ScreeningOperation>): Promise<ScreeningOperation | undefined>;
  completeScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  cancelScreeningOperation(id: number): Promise<ScreeningOperation | undefined>;
  
  // Screening Source Baskets methods
  getScreeningSourceBasketsByScreening(screeningId: number): Promise<ScreeningSourceBasket[]>;
  addScreeningSourceBasket(sourceBasket: InsertScreeningSourceBasket): Promise<ScreeningSourceBasket>;
  updateScreeningSourceBasket(id: number, sourceBasket: Partial<ScreeningSourceBasket>): Promise<ScreeningSourceBasket | undefined>;
  dismissScreeningSourceBasket(id: number): Promise<ScreeningSourceBasket | undefined>;
  removeScreeningSourceBasket(id: number): Promise<boolean>;
  
  // Screening Destination Baskets methods
  getScreeningDestinationBasketsByScreening(screeningId: number): Promise<ScreeningDestinationBasket[]>;
  addScreeningDestinationBasket(destinationBasket: InsertScreeningDestinationBasket): Promise<ScreeningDestinationBasket>;
  updateScreeningDestinationBasket(id: number, destinationBasket: Partial<ScreeningDestinationBasket>): Promise<ScreeningDestinationBasket | undefined>;
  assignPositionToDestinationBasket(id: number, flupsyId: number, row: string, position: number): Promise<ScreeningDestinationBasket | undefined>;
  removeScreeningDestinationBasket(id: number): Promise<boolean>;
  
  // Screening History methods
  getScreeningBasketHistoryByDestination(destinationBasketId: number): Promise<ScreeningBasketHistory[]>;
  createScreeningBasketHistory(history: InsertScreeningBasketHistory): Promise<ScreeningBasketHistory>;
  
  // Screening Lot Reference methods
  getScreeningLotReferencesByDestination(destinationBasketId: number): Promise<ScreeningLotReference[]>;
  createScreeningLotReference(lotReference: InsertScreeningLotReference): Promise<ScreeningLotReference>;
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
  private mortalityRates: Map<number, MortalityRate>;
  private targetSizeAnnotations: Map<number, TargetSizeAnnotation>;
  
  // Mappe per il modulo di vagliatura
  private screeningOperations: Map<number, ScreeningOperation>;
  private screeningSourceBaskets: Map<number, ScreeningSourceBasket>;
  private screeningDestinationBaskets: Map<number, ScreeningDestinationBasket>;
  private screeningBasketHistory: Map<number, ScreeningBasketHistory>;
  private screeningLotReferences: Map<number, ScreeningLotReference>;
  
  private flupsyId: number;
  private basketId: number;
  private operationId: number;
  private cycleId: number;
  private sizeId: number;
  private sgrId: number;
  private lotId: number;
  private positionHistoryId: number;
  private sgrGiornalieroId: number;
  private mortalityRateId: number;
  private targetSizeAnnotationId: number;
  
  // ID per il modulo di vagliatura
  private screeningOperationId: number;
  private screeningSourceBasketId: number;
  private screeningDestinationBasketId: number;
  private screeningBasketHistoryId: number;
  private screeningLotReferenceId: number;
  
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
    this.mortalityRates = new Map();
    this.targetSizeAnnotations = new Map();
    
    // Inizializzazione delle mappe per il modulo di vagliatura
    this.screeningOperations = new Map();
    this.screeningSourceBaskets = new Map();
    this.screeningDestinationBaskets = new Map();
    this.screeningBasketHistory = new Map();
    this.screeningLotReferences = new Map();
    
    this.flupsyId = 1;
    this.basketId = 1;
    this.operationId = 1;
    this.cycleId = 1;
    this.sizeId = 1;
    
    // Inizializzazione degli ID per il modulo di vagliatura
    this.screeningOperationId = 1;
    this.screeningSourceBasketId = 1;
    this.screeningDestinationBasketId = 1;
    this.screeningBasketHistoryId = 1;
    this.screeningLotReferenceId = 1;
    this.sgrId = 1;
    this.lotId = 1;
    this.positionHistoryId = 1;
    this.sgrGiornalieroId = 1;
    this.mortalityRateId = 1;
    this.targetSizeAnnotationId = 1;
    
    // Inizializzazione degli ID per il modulo di vagliatura
    this.screeningOperationId = 1;
    this.screeningSourceBasketId = 1;
    this.screeningDestinationBasketId = 1;
    this.screeningBasketHistoryId = 1;
    this.screeningLotReferenceId = 1;
    
    // Initialize with some default sizes
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Initialize default FLUPSY units
    const defaultFlupsys: InsertFlupsy[] = [
      { name: 'FLUPSY 1', location: 'Baia Nord', description: 'Unità principale', active: true },
      { name: 'FLUPSY 2', location: 'Baia Sud', description: 'Unità secondaria', active: true }
    ];

    // Initialize default sizes based on actual database
    const defaultSizes: InsertSize[] = [
      { code: 'TP-500', name: 'TP-500', sizeMm: 1, minAnimalsPerKg: 3400001, maxAnimalsPerKg: 5000000, notes: 'Smallest size' },
      { code: 'TP-100', name: 'TP-100', sizeMm: null, minAnimalsPerKg: 4200001, maxAnimalsPerKg: 10000000, notes: 'Very small' },
      { code: 'TP-200', name: 'TP-200', sizeMm: 10, minAnimalsPerKg: 4200001, maxAnimalsPerKg: 4200000, notes: 'Small' },
      { code: 'TP-315', name: 'TP-315', sizeMm: null, minAnimalsPerKg: 7000001, maxAnimalsPerKg: 10000000, notes: 'Small-medium' },
      { code: 'TP-450', name: 'TP-450', sizeMm: null, minAnimalsPerKg: 5000001, maxAnimalsPerKg: 7000000, notes: 'Medium-small' },
      { code: 'TP-600', name: 'TP-600', sizeMm: null, minAnimalsPerKg: 1000001, maxAnimalsPerKg: 3400000, notes: 'Medium' },
      { code: 'TP-700', name: 'TP-700', sizeMm: null, minAnimalsPerKg: 1500001, maxAnimalsPerKg: 1000000, notes: 'Medium-large' },
      { code: 'TP-800', name: 'TP-800', sizeMm: 20, minAnimalsPerKg: 1500001, maxAnimalsPerKg: 1500000, notes: 'Large' },
      { code: 'TP-1000', name: 'TP-1000', sizeMm: null, minAnimalsPerKg: 600001, maxAnimalsPerKg: 800000, notes: 'Large' },
      { code: 'TP-1140', name: 'TP-1140', sizeMm: null, minAnimalsPerKg: 350001, maxAnimalsPerKg: 600000, notes: 'Very large' },
      { code: 'TP-1260', name: 'TP-1260', sizeMm: null, minAnimalsPerKg: 300001, maxAnimalsPerKg: 350000, notes: 'Very large' },
      { code: 'TP-1500', name: 'TP-1500', sizeMm: 30, minAnimalsPerKg: 300001, maxAnimalsPerKg: 300000, notes: 'Extra large' },
      { code: 'TP-1800', name: 'TP-1800', sizeMm: null, minAnimalsPerKg: 120001, maxAnimalsPerKg: 190000, notes: 'Extra large' },
      { code: 'TP-1900', name: 'TP-1900', sizeMm: null, minAnimalsPerKg: 97001, maxAnimalsPerKg: 120000, notes: 'Extra large' },
      { code: 'TP-2000', name: 'TP-2000', sizeMm: null, minAnimalsPerKg: 70001, maxAnimalsPerKg: 97000, notes: 'Extra large' },
      { code: 'TP-2200', name: 'TP-2200', sizeMm: null, minAnimalsPerKg: 60001, maxAnimalsPerKg: 70000, notes: 'Extra large' },
      { code: 'TP-2500', name: 'TP-2500', sizeMm: null, minAnimalsPerKg: 40001, maxAnimalsPerKg: 60000, notes: 'Jumbo' },
      { code: 'TP-2800', name: 'TP-2800', sizeMm: null, minAnimalsPerKg: 32001, maxAnimalsPerKg: 40000, notes: 'Jumbo' },
      { code: 'TP-3000', name: 'TP-3000', sizeMm: null, minAnimalsPerKg: 19001, maxAnimalsPerKg: 32000, notes: 'Jumbo' },
      { code: 'TP-3500', name: 'TP-3500', sizeMm: null, minAnimalsPerKg: 12501, maxAnimalsPerKg: 19000, notes: 'Super jumbo' },
      { code: 'TP-4000', name: 'TP-4000', sizeMm: null, minAnimalsPerKg: 7501, maxAnimalsPerKg: 12500, notes: 'Super jumbo' },
      { code: 'TP-5000', name: 'TP-5000', sizeMm: null, minAnimalsPerKg: 3901, maxAnimalsPerKg: 7500, notes: 'Ultra jumbo' },
      { code: 'TP-6000', name: 'TP-6000', sizeMm: null, minAnimalsPerKg: 3001, maxAnimalsPerKg: 3900, notes: 'Ultra jumbo' }
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
    
    // Initialize default mortality rates
    const defaultMortalityRates: InsertMortalityRate[] = [
      // T0 size mortality rates
      { month: 'Gennaio', sizeId: 1, percentage: 2.5, notes: 'Mortalità invernale T0' },
      { month: 'Febbraio', sizeId: 1, percentage: 2.3, notes: 'Mortalità invernale T0' },
      { month: 'Marzo', sizeId: 1, percentage: 2.0, notes: 'Mortalità primaverile T0' },
      { month: 'Aprile', sizeId: 1, percentage: 1.8, notes: 'Mortalità primaverile T0' },
      { month: 'Maggio', sizeId: 1, percentage: 1.5, notes: 'Mortalità primaverile T0' },
      { month: 'Giugno', sizeId: 1, percentage: 1.3, notes: 'Mortalità estiva T0' },
      { month: 'Luglio', sizeId: 1, percentage: 1.5, notes: 'Mortalità estiva T0' },
      { month: 'Agosto', sizeId: 1, percentage: 1.8, notes: 'Mortalità estiva T0' },
      { month: 'Settembre', sizeId: 1, percentage: 1.7, notes: 'Mortalità autunnale T0' },
      { month: 'Ottobre', sizeId: 1, percentage: 1.9, notes: 'Mortalità autunnale T0' },
      { month: 'Novembre', sizeId: 1, percentage: 2.1, notes: 'Mortalità autunnale T0' },
      { month: 'Dicembre', sizeId: 1, percentage: 2.4, notes: 'Mortalità invernale T0' },
      
      // T1 size mortality rates (generally lower than T0)
      { month: 'Gennaio', sizeId: 2, percentage: 2.0, notes: 'Mortalità invernale T1' },
      { month: 'Febbraio', sizeId: 2, percentage: 1.8, notes: 'Mortalità invernale T1' },
      { month: 'Marzo', sizeId: 2, percentage: 1.5, notes: 'Mortalità primaverile T1' },
      { month: 'Aprile', sizeId: 2, percentage: 1.3, notes: 'Mortalità primaverile T1' },
      { month: 'Maggio', sizeId: 2, percentage: 1.0, notes: 'Mortalità primaverile T1' },
      { month: 'Giugno', sizeId: 2, percentage: 0.8, notes: 'Mortalità estiva T1' },
      { month: 'Luglio', sizeId: 2, percentage: 1.0, notes: 'Mortalità estiva T1' },
      { month: 'Agosto', sizeId: 2, percentage: 1.3, notes: 'Mortalità estiva T1' },
      { month: 'Settembre', sizeId: 2, percentage: 1.2, notes: 'Mortalità autunnale T1' },
      { month: 'Ottobre', sizeId: 2, percentage: 1.4, notes: 'Mortalità autunnale T1' },
      { month: 'Novembre', sizeId: 2, percentage: 1.6, notes: 'Mortalità autunnale T1' },
      { month: 'Dicembre', sizeId: 2, percentage: 1.9, notes: 'Mortalità invernale T1' },
      
      // M1 size mortality rates (lower as they're more mature)
      { month: 'Gennaio', sizeId: 3, percentage: 1.5, notes: 'Mortalità invernale M1' },
      { month: 'Febbraio', sizeId: 3, percentage: 1.3, notes: 'Mortalità invernale M1' },
      { month: 'Marzo', sizeId: 3, percentage: 1.0, notes: 'Mortalità primaverile M1' },
      { month: 'Aprile', sizeId: 3, percentage: 0.8, notes: 'Mortalità primaverile M1' },
      { month: 'Maggio', sizeId: 3, percentage: 0.5, notes: 'Mortalità primaverile M1' },
      { month: 'Giugno', sizeId: 3, percentage: 0.3, notes: 'Mortalità estiva M1' },
      { month: 'Luglio', sizeId: 3, percentage: 0.5, notes: 'Mortalità estiva M1' },
      { month: 'Agosto', sizeId: 3, percentage: 0.8, notes: 'Mortalità estiva M1' },
      { month: 'Settembre', sizeId: 3, percentage: 0.7, notes: 'Mortalità autunnale M1' },
      { month: 'Ottobre', sizeId: 3, percentage: 0.9, notes: 'Mortalità autunnale M1' },
      { month: 'Novembre', sizeId: 3, percentage: 1.1, notes: 'Mortalità autunnale M1' },
      { month: 'Dicembre', sizeId: 3, percentage: 1.4, notes: 'Mortalità invernale M1' }
    ];
    
    defaultFlupsys.forEach(flupsy => this.createFlupsy(flupsy));
    defaultSizes.forEach(size => this.createSize(size));
    defaultSgrs.forEach(sgr => this.createSgr(sgr));
    defaultMortalityRates.forEach(rate => this.createMortalityRate(rate));
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
    const operation = this.operations.get(id);
    if (!operation) {
      return false;
    }
    
    // Verifica se l'operazione è di tipo "prima-attivazione"
    const isPrimaAttivazione = operation.type === 'prima-attivazione';
    const cycleId = operation.cycleId;
    let basketId = operation.basketId;
    
    // Se l'operazione è una prima-attivazione, gestisce la cancellazione speciale
    if (isPrimaAttivazione && cycleId) {
      console.log(`Operazione di prima-attivazione rilevata (ID: ${id}). Procedendo con la cancellazione a cascata.`);
      
      // Ottiene il ciclo associato per recuperare il cestello
      if (!basketId) {
        const cycle = this.cycles.get(cycleId);
        if (cycle) {
          basketId = cycle.basketId;
        }
      }
      
      // 1. Elimina tutte le operazioni associate al ciclo
      const cycleOperations = Array.from(this.operations.values())
        .filter(op => op.cycleId === cycleId);
      
      console.log(`Trovate ${cycleOperations.length} operazioni associate al ciclo ${cycleId}`);
      
      for (const op of cycleOperations) {
        if (op.id !== id) { // Evita di eliminare due volte l'operazione corrente
          console.log(`Eliminazione operazione correlata ID: ${op.id}`);
          this.operations.delete(op.id);
        }
      }
      
      // 2. Elimina i record correlati al ciclo in tutte le tabelle
      console.log(`Eliminazione dati correlati al ciclo ID: ${cycleId} in tutte le tabelle`);
      
      // 2.1 Impatti ambientali
      const cycleImpactsToRemove = [];
      for (const [impactId, impact] of this.cycleImpacts.entries()) {
        if (impact.cycleId === cycleId) {
          cycleImpactsToRemove.push(impactId);
        }
      }
      
      for (const impactId of cycleImpactsToRemove) {
        console.log(`Eliminazione impatto ambientale ID: ${impactId} per il ciclo ${cycleId}`);
        this.cycleImpacts.delete(impactId);
      }
      
      // 2.2 Gestione dati di vagliatura correlati
      // Aggiorna ceste di origine della vagliatura
      for (const [sourceId, source] of this.screeningSourceBaskets.entries()) {
        if (source.cycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo ${cycleId} nella cesta di origine vagliatura ID: ${sourceId}`);
          this.screeningSourceBaskets.set(sourceId, {
            ...source,
            cycleId: null
          });
        }
      }
      
      // Aggiorna ceste di destinazione della vagliatura
      for (const [destId, dest] of this.screeningDestinationBaskets.entries()) {
        if (dest.cycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo ${cycleId} nella cesta di destinazione vagliatura ID: ${destId}`);
          this.screeningDestinationBaskets.set(destId, {
            ...dest,
            cycleId: null
          });
        }
      }
      
      // Aggiorna storia delle ceste nella vagliatura
      for (const [historyId, history] of this.screeningBasketHistory.entries()) {
        let updated = false;
        let newHistory = { ...history };
        
        if (history.sourceCycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo di origine ${cycleId} nella storia ceste vagliatura ID: ${historyId}`);
          newHistory.sourceCycleId = null;
          updated = true;
        }
        
        if (history.destinationCycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo di destinazione ${cycleId} nella storia ceste vagliatura ID: ${historyId}`);
          newHistory.destinationCycleId = null;
          updated = true;
        }
        
        if (updated) {
          this.screeningBasketHistory.set(historyId, newHistory);
        }
      }
      
      // 2.3 Gestione dati di selezione correlati
      // Aggiorna ceste di origine della selezione
      for (const [sourceId, source] of this.selectionSourceBaskets.entries()) {
        if (source.cycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo ${cycleId} nella cesta di origine selezione ID: ${sourceId}`);
          this.selectionSourceBaskets.set(sourceId, {
            ...source,
            cycleId: null
          });
        }
      }
      
      // Aggiorna ceste di destinazione della selezione
      for (const [destId, dest] of this.selectionDestinationBaskets.entries()) {
        if (dest.cycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo ${cycleId} nella cesta di destinazione selezione ID: ${destId}`);
          this.selectionDestinationBaskets.set(destId, {
            ...dest,
            cycleId: null
          });
        }
      }
      
      // Aggiorna storia delle ceste nella selezione
      for (const [historyId, history] of this.selectionBasketHistory.entries()) {
        let updated = false;
        let newHistory = { ...history };
        
        if (history.sourceCycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo di origine ${cycleId} nella storia ceste selezione ID: ${historyId}`);
          newHistory.sourceCycleId = null;
          updated = true;
        }
        
        if (history.destinationCycleId === cycleId) {
          console.log(`Pulizia riferimento al ciclo di destinazione ${cycleId} nella storia ceste selezione ID: ${historyId}`);
          newHistory.destinationCycleId = null;
          updated = true;
        }
        
        if (updated) {
          this.selectionBasketHistory.set(historyId, newHistory);
        }
      }
      
      // 2.4 Infine, elimina il ciclo
      console.log(`Eliminazione ciclo ID: ${cycleId}`);
      this.cycles.delete(cycleId);
      
      // 3. Libera il cestello e resetta la posizione
      if (basketId) {
        console.log(`Aggiornamento stato cestello ID: ${basketId} a disponibile`);
        
        // 3.1. Chiudi qualsiasi posizione attiva nella cronologia
        try {
          // Cerca posizioni attive (senza data di fine)
          const activePositions = Array.from(this.basketPositions.values())
            .filter(pos => pos.basketId === basketId && pos.endDate === null);
          
          if (activePositions && activePositions.length > 0) {
            console.log(`Trovate ${activePositions.length} posizioni attive per il cestello ${basketId}`);
            
            // Imposta la data di fine alla data corrente per tutte le posizioni attive
            const currentDate = new Date();
            
            for (const position of activePositions) {
              console.log(`Chiusura della posizione attiva ID: ${position.id} per il cestello ${basketId}`);
              this.basketPositions.set(position.id, {
                ...position,
                endDate: currentDate
              });
            }
          } else {
            console.log(`Nessuna posizione attiva trovata per il cestello ${basketId}`);
          }
        } catch (error) {
          console.error(`Errore durante la gestione della cronologia posizioni per il cestello ${basketId}:`, error);
        }
        
        // 3.2. Aggiorna lo stato del cestello
        const basket = this.baskets.get(basketId);
        if (basket) {
          this.baskets.set(basketId, {
            ...basket,
            state: 'available',
            currentCycleId: null,
            nfcData: null,
            row: null,
            position: null
          });
        }
      }
    }
    
    // Elimina l'operazione richiesta
    this.operations.delete(id);
    return true;
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
  
  async deleteLot(id: number): Promise<boolean> {
    // Verifica se il lotto esiste
    if (!this.lots.has(id)) return false;
    
    // Verifica se il lotto è usato in qualche operazione attiva prima di eliminarlo
    // Per ora lo eliminiamo semplicemente
    return this.lots.delete(id);
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
  
  // Mortality Rate methods
  async getMortalityRates(): Promise<MortalityRate[]> {
    return Array.from(this.mortalityRates.values());
  }

  async getMortalityRate(id: number): Promise<MortalityRate | undefined> {
    return this.mortalityRates.get(id);
  }

  async getMortalityRatesBySize(sizeId: number): Promise<MortalityRate[]> {
    return Array.from(this.mortalityRates.values())
      .filter(rate => rate.sizeId === sizeId);
  }

  async getMortalityRatesByMonth(month: string): Promise<MortalityRate[]> {
    return Array.from(this.mortalityRates.values())
      .filter(rate => rate.month.toLowerCase() === month.toLowerCase());
  }

  async getMortalityRateByMonthAndSize(month: string, sizeId: number): Promise<MortalityRate | undefined> {
    return Array.from(this.mortalityRates.values())
      .find(rate => 
        rate.month.toLowerCase() === month.toLowerCase() && 
        rate.sizeId === sizeId
      );
  }

  async createMortalityRate(mortalityRate: InsertMortalityRate): Promise<MortalityRate> {
    const id = this.mortalityRateId++;
    const newMortalityRate: MortalityRate = { 
      ...mortalityRate, 
      id,
      notes: mortalityRate.notes || null
    };
    this.mortalityRates.set(id, newMortalityRate);
    return newMortalityRate;
  }

  async updateMortalityRate(id: number, mortalityRateUpdate: Partial<MortalityRate>): Promise<MortalityRate | undefined> {
    const currentMortalityRate = this.mortalityRates.get(id);
    if (!currentMortalityRate) return undefined;
    
    const updatedMortalityRate = { ...currentMortalityRate, ...mortalityRateUpdate };
    this.mortalityRates.set(id, updatedMortalityRate);
    return updatedMortalityRate;
  }
  
  // Target Size Annotations methods
  async getTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]> {
    return Array.from(this.targetSizeAnnotations.values());
  }
  
  async getTargetSizeAnnotation(id: number): Promise<TargetSizeAnnotation | undefined> {
    return this.targetSizeAnnotations.get(id);
  }
  
  async getTargetSizeAnnotationsByBasket(basketId: number): Promise<TargetSizeAnnotation[]> {
    return Array.from(this.targetSizeAnnotations.values())
      .filter(annotation => annotation.basketId === basketId)
      .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }
  
  async getTargetSizeAnnotationsByTargetSize(targetSizeId: number): Promise<TargetSizeAnnotation[]> {
    return Array.from(this.targetSizeAnnotations.values())
      .filter(annotation => annotation.targetSizeId === targetSizeId)
      .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }
  
  async getPendingTargetSizeAnnotations(): Promise<TargetSizeAnnotation[]> {
    return Array.from(this.targetSizeAnnotations.values())
      .filter(annotation => annotation.status === 'pending')
      .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }
  
  async getBasketsPredictedToReachSize(targetSizeId: number, withinDays: number): Promise<TargetSizeAnnotation[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + withinDays);
    
    return Array.from(this.targetSizeAnnotations.values())
      .filter(annotation => {
        if (annotation.targetSizeId !== targetSizeId || annotation.status !== 'pending') {
          return false;
        }
        
        const predictedDate = new Date(annotation.predictedDate);
        return predictedDate >= today && predictedDate <= futureDate;
      })
      .sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
  }
  
  async createTargetSizeAnnotation(annotation: InsertTargetSizeAnnotation): Promise<TargetSizeAnnotation> {
    const id = this.targetSizeAnnotationId++;
    
    // Add default values
    const now = new Date();
    const newAnnotation: TargetSizeAnnotation = {
      ...annotation,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    
    this.targetSizeAnnotations.set(id, newAnnotation);
    return newAnnotation;
  }
  
  async updateTargetSizeAnnotation(id: number, annotation: Partial<TargetSizeAnnotation>): Promise<TargetSizeAnnotation | undefined> {
    const currentAnnotation = this.targetSizeAnnotations.get(id);
    if (!currentAnnotation) return undefined;
    
    const updatedAnnotation = { 
      ...currentAnnotation, 
      ...annotation,
      updatedAt: new Date()
    };
    
    this.targetSizeAnnotations.set(id, updatedAnnotation);
    return updatedAnnotation;
  }
  
  async deleteTargetSizeAnnotation(id: number): Promise<boolean> {
    const exists = this.targetSizeAnnotations.has(id);
    if (exists) {
      this.targetSizeAnnotations.delete(id);
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
  
  // Screening (Vagliatura) methods
  async getScreeningOperations(): Promise<ScreeningOperation[]> {
    return Array.from(this.screeningOperations.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  
  async getScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    return this.screeningOperations.get(id);
  }
  
  async getScreeningOperationsByStatus(status: string): Promise<ScreeningOperation[]> {
    return Array.from(this.screeningOperations.values())
      .filter(operation => operation.status === status)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async createScreeningOperation(operation: InsertScreeningOperation): Promise<ScreeningOperation> {
    const id = this.screeningOperationId++;
    const now = new Date();
    
    const newOperation: ScreeningOperation = { 
      ...operation, 
      id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      notes: operation.notes || null,
      purpose: operation.purpose || null
    };
    
    this.screeningOperations.set(id, newOperation);
    return newOperation;
  }
  
  // Funzione per verificare se una posizione FLUPSY è disponibile
  async isPositionAvailable(flupsyId: number, row: string, position: number): Promise<boolean> {
    // Verifica nelle posizioni attive nei cicli
    const activePositions = Array.from(this.basketPositions.values())
      .filter(pos => pos.endDate === null && pos.flupsyId === flupsyId && 
              pos.row === row && pos.position === position);
    
    // Controlla anche nelle ceste di destinazione della vagliatura con posizioni assegnate
    const occupiedByScreening = Array.from(this.screeningDestinationBaskets.values())
      .filter(basket => basket.flupsyId === flupsyId && basket.row === row && 
              basket.position === position && basket.positionAssigned);
    
    return activePositions.length === 0 && occupiedByScreening.length === 0;
  }
  
  // Funzione per ottenere il prossimo numero sequenziale per le vagliature
  async getNextScreeningNumber(): Promise<number> {
    const operations = Array.from(this.screeningOperations.values());
    
    if (operations.length === 0) {
      return 1; // Primo numero è 1
    }
    
    // Trova il numero di vagliatura più alto attualmente in uso
    const maxNumber = operations.reduce((max, op) => {
      return op.screeningNumber > max ? op.screeningNumber : max;
    }, 0);
    
    // Restituisce il numero successivo
    return maxNumber + 1;
  }
  
  async updateScreeningOperation(id: number, operation: Partial<ScreeningOperation>): Promise<ScreeningOperation | undefined> {
    const currentOperation = this.screeningOperations.get(id);
    if (!currentOperation) return undefined;
    
    const updatedOperation = { 
      ...currentOperation, 
      ...operation,
      updatedAt: new Date()
    };
    
    this.screeningOperations.set(id, updatedOperation);
    return updatedOperation;
  }
  
  async completeScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    const operation = await this.getScreeningOperation(id);
    if (!operation) return undefined;
    
    // Verificare che tutte le ceste di destinazione abbiano una posizione assegnata
    const destinationBaskets = await this.getScreeningDestinationBasketsByScreening(id);
    const allPositioned = destinationBaskets.every(basket => basket.positionAssigned);
    
    if (!allPositioned) {
      throw new Error("Non tutte le ceste di destinazione hanno una posizione assegnata");
    }
    
    // Verificare che tutte le ceste di origine abbiano una dismissione registrata
    const sourceBaskets = await this.getScreeningSourceBasketsByScreening(id);
    const allDismissed = sourceBaskets.every(basket => basket.dismissed);
    
    if (!allDismissed) {
      throw new Error("Non tutte le ceste di origine sono state dismesse");
    }
    
    // Impostare lo stato dell'operazione a "completed"
    const updatedOperation = await this.updateScreeningOperation(id, { status: "completed" });
    
    return updatedOperation;
  }
  
  async cancelScreeningOperation(id: number): Promise<ScreeningOperation | undefined> {
    const operation = await this.getScreeningOperation(id);
    if (!operation) return undefined;
    
    // Impostare lo stato dell'operazione a "cancelled"
    const updatedOperation = await this.updateScreeningOperation(id, { status: "cancelled" });
    
    return updatedOperation;
  }
  
  // Screening Source Baskets methods
  async getScreeningSourceBasketsByScreening(screeningId: number): Promise<ScreeningSourceBasket[]> {
    return Array.from(this.screeningSourceBaskets.values())
      .filter(sourceBasket => sourceBasket.screeningId === screeningId);
  }
  
  async addScreeningSourceBasket(sourceBasket: InsertScreeningSourceBasket): Promise<ScreeningSourceBasket> {
    const id = this.screeningSourceBasketId++;
    const now = new Date();
    
    const newSourceBasket: ScreeningSourceBasket = { 
      ...sourceBasket, 
      id,
      dismissed: false,
      positionReleased: false,
      createdAt: now
    };
    
    this.screeningSourceBaskets.set(id, newSourceBasket);
    return newSourceBasket;
  }
  
  async updateScreeningSourceBasket(id: number, sourceBasket: Partial<ScreeningSourceBasket>): Promise<ScreeningSourceBasket | undefined> {
    const currentSourceBasket = this.screeningSourceBaskets.get(id);
    if (!currentSourceBasket) return undefined;
    
    const updatedSourceBasket = { 
      ...currentSourceBasket, 
      ...sourceBasket
    };
    
    this.screeningSourceBaskets.set(id, updatedSourceBasket);
    return updatedSourceBasket;
  }
  
  async dismissScreeningSourceBasket(id: number): Promise<ScreeningSourceBasket | undefined> {
    const sourceBasket = await this.updateScreeningSourceBasket(id, { dismissed: true });
    if (!sourceBasket) return undefined;
    
    // Chiudere il ciclo associato alla cesta
    if (sourceBasket.cycleId) {
      await this.closeCycle(sourceBasket.cycleId, new Date());
      
      // Aggiornare lo stato della cesta fisica
      const cycle = await this.getCycle(sourceBasket.cycleId);
      if (cycle) {
        await this.updateBasket(cycle.basketId, { 
          state: "available",
          currentCycleId: null,
          nfcData: null
        });
      }
    }
    
    return sourceBasket;
  }
  
  async removeScreeningSourceBasket(id: number): Promise<boolean> {
    const exists = this.screeningSourceBaskets.has(id);
    if (exists) {
      this.screeningSourceBaskets.delete(id);
      return true;
    }
    return false;
  }
  
  // Screening Destination Baskets methods
  async getScreeningDestinationBasketsByScreening(screeningId: number): Promise<ScreeningDestinationBasket[]> {
    return Array.from(this.screeningDestinationBaskets.values())
      .filter(destinationBasket => destinationBasket.screeningId === screeningId);
  }
  
  async addScreeningDestinationBasket(destinationBasket: InsertScreeningDestinationBasket): Promise<ScreeningDestinationBasket> {
    const id = this.screeningDestinationBasketId++;
    const now = new Date();
    
    const newDestinationBasket: ScreeningDestinationBasket = { 
      ...destinationBasket, 
      id,
      cycleId: null,
      positionAssigned: false,
      createdAt: now,
      updatedAt: now
    };
    
    this.screeningDestinationBaskets.set(id, newDestinationBasket);
    return newDestinationBasket;
  }
  
  async updateScreeningDestinationBasket(id: number, destinationBasket: Partial<ScreeningDestinationBasket>): Promise<ScreeningDestinationBasket | undefined> {
    const currentDestinationBasket = this.screeningDestinationBaskets.get(id);
    if (!currentDestinationBasket) return undefined;
    
    const updatedDestinationBasket = { 
      ...currentDestinationBasket, 
      ...destinationBasket,
      updatedAt: new Date()
    };
    
    this.screeningDestinationBaskets.set(id, updatedDestinationBasket);
    return updatedDestinationBasket;
  }
  
  async assignPositionToDestinationBasket(id: number, flupsyId: number, row: string, position: number): Promise<ScreeningDestinationBasket | undefined> {
    const destinationBasket = this.screeningDestinationBaskets.get(id);
    if (!destinationBasket) return undefined;
    
    // Aggiornare la posizione della cesta di destinazione
    const updatedDestinationBasket = await this.updateScreeningDestinationBasket(id, {
      flupsyId,
      row,
      position,
      positionAssigned: true
    });
    
    return updatedDestinationBasket;
  }
  
  async removeScreeningDestinationBasket(id: number): Promise<boolean> {
    const exists = this.screeningDestinationBaskets.has(id);
    if (exists) {
      this.screeningDestinationBaskets.delete(id);
      return true;
    }
    return false;
  }
  
  // Screening History methods
  async getScreeningBasketHistoryByDestination(destinationBasketId: number): Promise<ScreeningBasketHistory[]> {
    return Array.from(this.screeningBasketHistory.values())
      .filter(history => history.destinationBasketId === destinationBasketId);
  }
  
  async createScreeningBasketHistory(history: InsertScreeningBasketHistory): Promise<ScreeningBasketHistory> {
    const id = this.screeningBasketHistoryId++;
    const now = new Date();
    
    const newHistory: ScreeningBasketHistory = { 
      ...history, 
      id,
      createdAt: now
    };
    
    this.screeningBasketHistory.set(id, newHistory);
    return newHistory;
  }
  
  // Screening Lot Reference methods
  async getScreeningLotReferencesByDestination(destinationBasketId: number): Promise<ScreeningLotReference[]> {
    return Array.from(this.screeningLotReferences.values())
      .filter(lotReference => lotReference.destinationBasketId === destinationBasketId);
  }
  
  async createScreeningLotReference(lotReference: InsertScreeningLotReference): Promise<ScreeningLotReference> {
    const id = this.screeningLotReferenceId++;
    const now = new Date();
    
    const newLotReference: ScreeningLotReference = { 
      ...lotReference, 
      id,
      createdAt: now
    };
    
    this.screeningLotReferences.set(id, newLotReference);
    return newLotReference;
  }
  
  async removeScreeningLotReference(id: number): Promise<boolean> {
    if (this.screeningLotReferences.has(id)) {
      this.screeningLotReferences.delete(id);
      return true;
    }
    return false;
  }
  
  // Funzione per ottenere il prossimo numero sequenziale per le vagliature
  async getNextScreeningNumber(): Promise<number> {
    const operations = Array.from(this.screeningOperations.values());
    
    if (operations.length === 0) {
      return 1; // Se non ci sono operazioni, restituisci 1 come primo numero
    }
    
    // Trova il numero di vagliatura più alto
    const maxNumber = Math.max(...operations.map(op => op.screeningNumber));
    
    // Restituisci il numero successivo
    return maxNumber + 1;
  }
}

import { DbStorage } from './db-storage';

// Utilizziamo DbStorage per accedere ai dati reali nel database PostgreSQL
export const storage = new DbStorage();
