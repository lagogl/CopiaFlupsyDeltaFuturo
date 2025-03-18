import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumberWithCommas(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
  };
  
  return colorMap[type] || 'bg-gray-100 text-gray-800';
}

export function getSizeColor(sizeCode: string): string {
  if (!sizeCode) return 'bg-gray-100 text-gray-800';
  
  if (sizeCode.startsWith('T')) {
    return 'bg-yellow-100 text-yellow-800';
  } else if (sizeCode.startsWith('M')) {
    return 'bg-green-100 text-green-800';
  }
  
  return 'bg-blue-100 text-blue-800';
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
