import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumberWithCommas(value: number): string {
  // Formato europeo: 1.000,00 (punto come separatore delle migliaia, virgola per i decimali)
  const [integerPart, decimalPart] = value.toString().split(".");
  
  // Formatta la parte intera con punti ogni 3 cifre
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Se esiste una parte decimale, restituisci l'intero con la virgola e i decimali
  if (decimalPart) {
    return `${formattedIntegerPart},${decimalPart}`;
  }
  
  // Altrimenti restituisci solo la parte intera
  return formattedIntegerPart;
}

export function calculateAverageWeight(animalsPerKg: number): number | null {
  if (!animalsPerKg || animalsPerKg <= 0) {
    return null;
  }
  return 1000000 / animalsPerKg;
}

export function getOperationTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'prima-attivazione': 'Prima Attivazione',
    'pulizia': 'Pulizia',
    'vagliatura': 'Vagliatura',
    'trattamento': 'Trattamento',
    'misura': 'Misura',
    'vendita': 'Vendita',
    'selezione-vendita': 'Selezione per Vendita',
    'cessazione': 'Cessazione',
  };
  
  return typeMap[type] || type;
}

export function getOperationTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'prima-attivazione': 'bg-secondary/10 text-secondary',
    'pulizia': 'bg-info/10 text-info',
    'vagliatura': 'bg-primary-light/10 text-primary-light',
    'trattamento': 'bg-warning/10 text-warning',
    'misura': 'bg-primary-light/10 text-primary',
    'vendita': 'bg-success/10 text-success',
    'selezione-vendita': 'bg-success/10 text-success',
    'cessazione': 'bg-destructive/10 text-destructive',
  };
  
  return colorMap[type] || 'bg-gray-100 text-gray-800';
}

// Definizione delle taglie target per ciascuna dimensione
export type TargetSize = {
  code: string;
  name: string;
  minWeight: number; // peso minimo in mg
  maxWeight: number; // peso massimo in mg
  color: string;  // Colore Tailwind per la visualizzazione
};

export const TARGET_SIZES: TargetSize[] = [
  {
    code: 'T0',
    name: 'Seme',
    minWeight: 0,
    maxWeight: 10,
    color: 'bg-slate-200 border-slate-300'
  },
  {
    code: 'T1',
    name: 'Nursery',
    minWeight: 10,
    maxWeight: 50,
    color: 'bg-sky-100 border-sky-300'
  },
  {
    code: 'T2',
    name: 'Pre-ingrasso',
    minWeight: 50,
    maxWeight: 200,
    color: 'bg-blue-100 border-blue-300'
  },
  {
    code: 'T3',
    name: 'Ingrasso iniziale',
    minWeight: 200,
    maxWeight: 500,
    color: 'bg-teal-100 border-teal-300'
  },
  {
    code: 'T4',
    name: 'Ingrasso avanzato',
    minWeight: 500,
    maxWeight: 1000,
    color: 'bg-green-100 border-green-300'
  },
  {
    code: 'T5',
    name: 'Pre-vendita',
    minWeight: 1000,
    maxWeight: 2000,
    color: 'bg-lime-100 border-lime-300'
  },
  {
    code: 'T6',
    name: 'Commerciale',
    minWeight: 2000,
    maxWeight: 5000,
    color: 'bg-amber-100 border-amber-300'
  },
  {
    code: 'T7',
    name: 'Premium',
    minWeight: 5000,
    maxWeight: 10000,
    color: 'bg-orange-100 border-orange-300'
  }
];

export function getTargetSizeForWeight(weight: number): TargetSize | null {
  if (!weight || weight <= 0) return null;
  
  return TARGET_SIZES.find(
    size => weight >= size.minWeight && weight <= size.maxWeight
  ) || null;
}

export function getSizeFromAnimalsPerKg(animalsPerKg: number): TargetSize | null {
  if (!animalsPerKg || animalsPerKg <= 0) return null;
  
  // Converti animali/kg in peso medio in mg
  const weight = 1000000 / animalsPerKg;
  return getTargetSizeForWeight(weight);
}

export function getSizeColor(sizeCode: string): string {
  if (!sizeCode) return 'bg-gray-100 text-gray-800';
  
  if (sizeCode.startsWith('T')) {
    // Trova la taglia target corrispondente
    const targetSize = TARGET_SIZES.find(size => size.code === sizeCode);
    if (targetSize) {
      // Restituisci il colore del testo in base alla taglia target
      return `${targetSize.color.replace('border-', 'text-')}`;
    }
    return 'bg-yellow-100 text-yellow-800';
  } else if (sizeCode.startsWith('M')) {
    return 'bg-green-100 text-green-800';
  }
  
  return 'bg-blue-100 text-blue-800';
}

export function getBasketColorBySize(targetSizeCode: string | null): string {
  if (!targetSizeCode) return 'bg-slate-100 border border-slate-200';
  
  const targetSize = TARGET_SIZES.find(size => size.code === targetSizeCode);
  if (targetSize) {
    return `${targetSize.color} border`;
  }
  
  return 'bg-slate-100 border border-slate-200';
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
