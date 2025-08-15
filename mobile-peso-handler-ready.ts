// File pronto per il tuo Repl mobile - Mobile Peso Handler
// Copia questo file nel tuo progetto mobile esistente

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, serial, integer, real, text, date } from "drizzle-orm/pg-core";

// Schema minimo necessario per operazioni peso (usa lo stesso database)
const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  basketId: integer("basket_id").notNull(),
  cycleId: integer("cycle_id"),
  sizeId: integer("size_id"),
  sgrId: integer("sgr_id"),
  lotId: integer("lot_id"),
  animalCount: integer("animal_count"),
  totalWeight: real("total_weight"), // in grammi
  animalsPerKg: integer("animals_per_kg"), // CRITICO per calcoli
  averageWeight: real("average_weight"), // calcolato automaticamente
  deadCount: integer("dead_count"),
  mortalityRate: real("mortality_rate"),
  notes: text("notes"),
  operatorName: text("operator_name"),
  temperature: real("temperature"),
  metadata: text("metadata"),
});

const sizes = pgTable("sizes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  sizeMm: real("size_mm"),
  minAnimalsPerKg: integer("min_animals_per_kg"),
  maxAnimalsPerKg: integer("max_animals_per_kg"),
  notes: text("notes"),
  color: text("color"),
});

// Connessione database (stesso del sistema principale)
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class MobilePesoHandler {
  
  /**
   * Registra operazione peso con calcoli automatici completi
   * INPUT: peso totale, numero animali, cestello
   * OUTPUT: operazione completa con tutti i campi calcolati
   */
  async registraPeso(dati: {
    basketId: number;
    cycleId: number;
    date: string;
    totalWeight: number; // grammi
    animalCount: number;
    operatorName?: string;
    notes?: string;
    temperature?: number;
  }) {
    
    const { totalWeight, animalCount } = dati;
    
    // 1. CALCOLO ANIMALI PER KG
    const weightInKg = totalWeight / 1000;
    const animalsPerKg = Math.round(animalCount / weightInKg);
    
    console.log(`📱 Mobile Peso - animalsPerKg: ${animalCount} ÷ ${weightInKg}kg = ${animalsPerKg}`);
    
    // 2. CALCOLO PESO MEDIO (formula sistema principale)
    const averageWeight = 1000000 / animalsPerKg; // milligrammi
    
    console.log(`📱 Mobile Peso - averageWeight: 1,000,000 ÷ ${animalsPerKg} = ${averageWeight}mg`);
    
    // 3. DETERMINAZIONE AUTOMATICA TAGLIA
    const sizeId = await this.determinaTaglia(animalsPerKg);
    
    // 4. CREAZIONE OPERAZIONE COMPLETA
    const operazioneCompleta = {
      ...dati,
      type: "peso",
      animalsPerKg,
      averageWeight,
      sizeId,
      deadCount: 0,
      mortalityRate: 0,
    };
    
    console.log("📱 Mobile Peso - Operazione completa:", operazioneCompleta);
    
    // 5. SALVATAGGIO NEL DATABASE
    const risultato = await db.insert(operations).values(operazioneCompleta).returning();
    
    console.log(`✅ Mobile Peso - Operazione salvata con ID: ${risultato[0].id}`);
    
    return risultato[0];
  }
  
  /**
   * Determina automaticamente la taglia dal numero animali per kg
   */
  private async determinaTaglia(animalsPerKg: number): Promise<number | null> {
    try {
      const taglie = await db.select().from(sizes);
      
      const tagliaCorrispondente = taglie.find(taglia => 
        taglia.minAnimalsPerKg !== null && 
        taglia.maxAnimalsPerKg !== null && 
        animalsPerKg >= taglia.minAnimalsPerKg && 
        animalsPerKg <= taglia.maxAnimalsPerKg
      );
      
      if (tagliaCorrispondente) {
        console.log(`📱 Taglia determinata: ${tagliaCorrispondente.code} per ${animalsPerKg} animali/kg`);
        return tagliaCorrispondente.id;
      }
      
      console.log(`⚠️ Nessuna taglia trovata per ${animalsPerKg} animali/kg`);
      return null;
      
    } catch (error) {
      console.error("❌ Errore determinazione taglia:", error);
      return null;
    }
  }
  
  /**
   * Valida i dati prima del calcolo
   */
  validaDati(dati: { totalWeight: number; animalCount: number; basketId: number; cycleId: number }) {
    const errori: string[] = [];
    
    if (!dati.totalWeight || dati.totalWeight <= 0) {
      errori.push("Peso totale deve essere maggiore di zero");
    }
    
    if (!dati.animalCount || dati.animalCount <= 0) {
      errori.push("Numero animali deve essere positivo");
    }
    
    if (!dati.basketId) {
      errori.push("ID cestello richiesto");
    }
    
    if (!dati.cycleId) {
      errori.push("ID ciclo richiesto");
    }
    
    // Controllo peso medio ragionevole
    if (dati.totalWeight && dati.animalCount) {
      const pesoMedioGrammi = dati.totalWeight / dati.animalCount;
      if (pesoMedioGrammi < 0.1 || pesoMedioGrammi > 1000) {
        errori.push("Peso medio per animale non ragionevole");
      }
    }
    
    return {
      valido: errori.length === 0,
      errori
    };
  }
  
  /**
   * Ottieni lista taglie per reference
   */
  async getTaglie() {
    return await db.select().from(sizes);
  }
}

// Instance pronta all'uso
export const mobilePeso = new MobilePesoHandler();

/* 
ESEMPIO DI UTILIZZO NEL TUO REPL MOBILE:

import { mobilePeso } from './mobile-peso-handler';

// Registra operazione peso
const operazione = await mobilePeso.registraPeso({
  basketId: 1,
  cycleId: 1,
  date: '2025-08-15',
  totalWeight: 2500, // grammi
  animalCount: 150,
  operatorName: 'Mario Rossi',
  notes: 'Pesatura mattutina'
});

// Operazione salvata con tutti i campi calcolati automaticamente:
// - animalsPerKg: 60
// - averageWeight: 16,667 mg
// - sizeId: determinato automaticamente
*/