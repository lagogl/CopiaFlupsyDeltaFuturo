// Tipi di dati comuni utilizzati nell'applicazione

// Tipo FLUPSY
export interface Flupsy {
  id: number;
  name: string;
  maxPositions: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  rows?: string[];
}

// Tipo cestello
export interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number | null;
  position: number | null;
  row: string | null;
  state: string;
  currentCycleId: number | null;
  createdAt?: string;
  updatedAt?: string;
  flupsy?: Flupsy;
  lastOperation?: {
    id: number;
    date: string;
    type: string;
    basketId: number;
    cycleId: number;
    animalCount: number;
    totalWeight: number | null;
    animalsPerKg: number | null;
    mortalityRate?: number | null;
    sizeId?: number | null;
  };
  cycle?: {
    id: number;
    basketId: number;
    startDate: string;
    endDate: string | null;
    state: string;
    animalCount?: number | null;
  };
  size?: {
    id: number;
    code: string;
    min: number;
    max: number;
    color?: string;
  };
}

// Tipo vagliatura (selezione)
export interface Selection {
  id: number;
  date: string;
  selectionNumber: number;
  status: 'draft' | 'completed' | 'cancelled';
  referenceSizeId?: number | null;
  notes?: string | null;
  purpose: string;
  screeningType: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo cestello origine di una vagliatura
export interface SourceBasket {
  id?: number;
  selectionId: number;
  basketId: number;
  cycleId: number;
  animalCount: number;
  totalWeight: number | null;
  animalsPerKg: number | null;
  flupsyId?: number | null;
  position?: string | null;
  physicalNumber?: number;
  createdAt?: string;
}

// Tipo cestello destinazione di una vagliatura
export interface DestinationBasket {
  id?: number;
  selectionId: number;
  basketId: number;
  physicalNumber: number | any;
  flupsyId: number | null;
  position: string | null;
  destinationType: 'placed' | 'sold';
  animalCount: number | null;
  deadCount: number | null;
  sampleWeight: number | null;
  sampleCount: number | null;
  totalWeight: number | null;
  animalsPerKg: number | null;
  sizeId?: number | null;
  saleDate?: string | null;
  saleClient?: string | null;
  createdAt?: string;
  isAlsoSource?: boolean; // Flag per identificare cestelli che sono anche origine
}

// Tipo operazione
export interface Operation {
  id: number;
  date: string;
  type: string;
  basketId: number;
  cycleId: number;
  animalCount?: number | null;
  totalWeight?: number | null;
  animalsPerKg?: number | null;
  averageWeight?: number | null;
  deadCount?: number | null;
  mortalityRate?: number | null;
  sizeId?: number | null;
  lotId?: number | null;
  notes?: string | null;
  selectionId?: number | null;
  metadata?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo ciclo
export interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: string;
  animalCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo taglia
export interface Size {
  id: number;
  code: string;
  name?: string;
  min: number;
  max: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo lotto
export interface Lot {
  id: number;
  arrivalDate: string;
  supplier: string;
  animalCount: number;
  totalWeight?: number | null;
  animalsPerKg?: number | null;
  sizeId?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}