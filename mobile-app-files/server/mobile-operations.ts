// Mobile Operations Handler - Logica specifica per app mobile operatori
import { eq } from "drizzle-orm";
import { db } from "./database";
import { operations, sizes } from "../shared/schema";
import type { InsertOperation, Operation, Size } from "../shared/schema";

export class MobileOperationsHandler {
  
  /**
   * Crea un'operazione peso con calcoli automatici
   * Input richiesti: totalWeight, animalCount, basketId, cycleId, date
   * Calcoli automatici: animalsPerKg, averageWeight, sizeId
   */
  async createWeightOperation(operationData: {
    basketId: number;
    cycleId: number;
    date: string;
    totalWeight: number; // in grammi
    animalCount: number;
    operatorName?: string;
    notes?: string;
  }): Promise<Operation> {
    
    const { totalWeight, animalCount } = operationData;
    
    // 1. Calcola animalsPerKg dal peso totale e numero animali
    const weightInKg = totalWeight / 1000; // converti grammi in kg
    const animalsPerKg = Math.round(animalCount / weightInKg);
    
    console.log(`Mobile Operations - Calcolo animalsPerKg: ${animalCount} animali / ${weightInKg}kg = ${animalsPerKg}`);
    
    // 2. Calcola averageWeight usando la formula del sistema principale
    const averageWeight = 1000000 / animalsPerKg; // peso medio in milligrammi
    
    console.log(`Mobile Operations - Calcolo averageWeight: 1,000,000 / ${animalsPerKg} = ${averageWeight}mg`);
    
    // 3. Determina automaticamente la taglia basandosi su animalsPerKg
    const sizeId = await this.determineSizeFromAnimalsPerKg(animalsPerKg);
    
    // 4. Prepara i dati completi per l'operazione
    const completeOperationData: InsertOperation = {
      ...operationData,
      type: "peso",
      totalWeight,
      animalCount,
      animalsPerKg,
      averageWeight,
      sizeId,
      deadCount: 0, // Default per operazioni peso mobile
      mortalityRate: 0, // Default per operazioni peso mobile
    };
    
    console.log("Mobile Operations - Dati operazione completa:", JSON.stringify(completeOperationData, null, 2));
    
    // 5. Inserisci l'operazione nel database
    const results = await db.insert(operations).values(completeOperationData).returning();
    const newOperation = results[0];
    
    console.log(`Mobile Operations - Operazione peso creata con ID: ${newOperation.id}`);
    
    return newOperation;
  }
  
  /**
   * Determina automaticamente la taglia basandosi su animalsPerKg
   */
  private async determineSizeFromAnimalsPerKg(animalsPerKg: number): Promise<number | null> {
    try {
      // Ottieni tutte le taglie disponibili
      const allSizes = await db.select().from(sizes);
      
      // Trova la taglia corrispondente
      const matchingSize = allSizes.find(size => 
        size.minAnimalsPerKg !== null && 
        size.maxAnimalsPerKg !== null && 
        animalsPerKg >= size.minAnimalsPerKg && 
        animalsPerKg <= size.maxAnimalsPerKg
      );
      
      if (matchingSize) {
        console.log(`Mobile Operations - Taglia determinata: ${matchingSize.code} (ID: ${matchingSize.id}) per animalsPerKg: ${animalsPerKg}`);
        return matchingSize.id;
      } else {
        console.log(`Mobile Operations - Nessuna taglia trovata per animalsPerKg: ${animalsPerKg}`);
        return null;
      }
    } catch (error) {
      console.error("Mobile Operations - Errore determinazione taglia:", error);
      return null;
    }
  }
  
  /**
   * Valida i dati di input per operazione peso
   */
  validateWeightOperationInput(data: {
    totalWeight: number;
    animalCount: number;
    basketId: number;
    cycleId: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.totalWeight || data.totalWeight <= 0) {
      errors.push("Peso totale deve essere maggiore di zero");
    }
    
    if (!data.animalCount || data.animalCount <= 0 || !Number.isInteger(data.animalCount)) {
      errors.push("Numero animali deve essere un intero positivo");
    }
    
    if (!data.basketId) {
      errors.push("ID cestello richiesto");
    }
    
    if (!data.cycleId) {
      errors.push("ID ciclo richiesto");
    }
    
    // Validazione logica peso/animali
    if (data.totalWeight && data.animalCount) {
      const averageWeightGrams = data.totalWeight / data.animalCount;
      if (averageWeightGrams < 0.1 || averageWeightGrams > 1000) {
        errors.push("Peso medio per animale fuori range accettabile (0.1g - 1000g)");
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Ottieni lista taglie disponibili per reference
   */
  async getAvailableSizes(): Promise<Size[]> {
    return await db.select().from(sizes).where(eq(sizes.active, true));
  }
}

export const mobileOpsHandler = new MobileOperationsHandler();