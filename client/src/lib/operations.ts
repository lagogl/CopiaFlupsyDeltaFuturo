// client/src/lib/operations.ts
// Funzioni di utilità per le operazioni

import { apiRequest } from './queryClient';
import type { InsertOperation } from '@shared/schema';

/**
 * Invia un'operazione al server usando la route diretta che gestisce correttamente le prima attivazioni
 * 
 * @param operationData I dati dell'operazione da inviare
 * @returns Promise con i dati dell'operazione creata
 */
export async function createDirectOperation(operationData: InsertOperation) {
  console.log("USANDO ROUTE DIRETTA PER OPERAZIONE:", operationData);
  
  // Usiamo la route diretta che bypassa i problemi con cycleId
  return apiRequest({
    url: '/api/direct-operations',
    method: 'POST',
    body: operationData
  });
}

/**
 * Calcola automaticamente averageWeight basandosi su animalsPerKg
 * 
 * @param animalsPerKg Numero di animali per kg
 * @returns peso medio calcolato in milligrammi
 */
export function calculateAverageWeight(animalsPerKg: number): number {
  if (!animalsPerKg || animalsPerKg <= 0) return 0;
  return 1000000 / animalsPerKg;
}

/**
 * Determina se è necessario creare un nuovo ciclo per questa operazione
 * 
 * @param type Il tipo di operazione
 * @returns true se l'operazione richiede un nuovo ciclo
 */
export function requiresNewCycle(type: string): boolean {
  return type === 'prima-attivazione';
}

/**
 * Formatta i dati dell'operazione per la validazione e l'invio
 * 
 * @param data Dati grezzi del form
 * @returns Dati formattati dell'operazione
 */
export function formatOperationData(data: any): InsertOperation {
  const formattedData: any = { ...data };
  
  // Converti stringhe vuote in null
  Object.keys(formattedData).forEach(key => {
    if (formattedData[key] === "") {
      formattedData[key] = null;
    }
  });
  
  // Se è una prima attivazione, il cycleId dovrebbe essere null perché verrà creato dal server
  if (formattedData.type === 'prima-attivazione') {
    formattedData.cycleId = null;
  }
  
  // Se abbiamo animalsPerKg ma non averageWeight, calcoliamolo
  if (formattedData.animalsPerKg && !formattedData.averageWeight) {
    formattedData.averageWeight = calculateAverageWeight(formattedData.animalsPerKg);
  }
  
  return formattedData as InsertOperation;
}