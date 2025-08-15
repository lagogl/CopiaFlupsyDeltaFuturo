# 🚀 Guida Completa Integrazione App Mobile

## Situazione Attuale
- ✅ Sistema FLUPSY principale funzionante su porta 5000
- ✅ Database PostgreSQL condiviso pronto
- ✅ Tuo Repl mobile esistente che vuoi mantenere
- ✅ File handler con calcoli automatici pronto

## 📱 STEP DI INTEGRAZIONE

### 1. Copia il File Principal nel Tuo Repl Mobile

Nel tuo Repl mobile esistente, crea il file `mobile-peso-handler.ts` e copia questo contenuto:

```typescript
// Mobile Peso Handler - Versione finale corretta
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pgTable, serial, integer, real, text, date } from "drizzle-orm/pg-core";

// Schema operations (stesso database sistema principale)
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
  totalWeight: real("total_weight"),
  animalsPerKg: integer("animals_per_kg"),
  averageWeight: real("average_weight"),
  deadCount: integer("dead_count"),
  mortalityRate: real("mortality_rate"),
  notes: text("notes"),
  metadata: text("metadata"),
});

const sizes = pgTable("sizes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  minAnimalsPerKg: integer("min_animals_per_kg"),
  maxAnimalsPerKg: integer("max_animals_per_kg"),
});

// Connessione database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class MobilePesoHandler {
  
  async registraPeso(dati: {
    basketId: number;
    cycleId: number;
    date: string;
    totalWeight: number; // grammi
    animalCount: number;
    operatorName?: string;
    notes?: string;
  }) {
    
    // CALCOLI AUTOMATICI IDENTICI AL SISTEMA PRINCIPALE
    const weightInKg = dati.totalWeight / 1000;
    const animalsPerKg = Math.round(dati.animalCount / weightInKg);
    const averageWeight = 1000000 / animalsPerKg; // milligrammi
    const sizeId = await this.determinaTaglia(animalsPerKg);
    
    const operazioneCompleta = {
      ...dati,
      type: "peso",
      animalsPerKg,
      averageWeight,
      sizeId,
      deadCount: 0,
      mortalityRate: 0,
    };
    
    const risultato = await db.insert(operations).values(operazioneCompleta).returning();
    console.log(`✅ Operazione peso salvata: ID ${risultato[0].id}`);
    return risultato[0];
  }
  
  private async determinaTaglia(animalsPerKg: number) {
    const taglie = await db.select().from(sizes);
    const tagliaCorrispondente = taglie.find(t => 
      t.minAnimalsPerKg !== null && 
      t.maxAnimalsPerKg !== null && 
      animalsPerKg >= t.minAnimalsPerKg && 
      animalsPerKg <= t.maxAnimalsPerKg
    );
    return tagliaCorrispondente?.id || null;
  }
  
  validaDati(dati: any) {
    const errori: string[] = [];
    if (!dati.totalWeight || dati.totalWeight <= 0) errori.push("Peso totale richiesto");
    if (!dati.animalCount || dati.animalCount <= 0) errori.push("Numero animali richiesto");
    if (!dati.basketId) errori.push("ID cestello richiesto");
    if (!dati.cycleId) errori.push("ID ciclo richiesto");
    return { valido: errori.length === 0, errori };
  }
}

export const mobilePeso = new MobilePesoHandler();
```

### 2. Aggiungi nel package.json del Tuo Repl Mobile

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "drizzle-orm": "^0.39.1"
  }
}
```

### 3. Configura la DATABASE_URL

Nel file `.env` del tuo Repl mobile:
```
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR_ENDPOINT.us-east-2.aws.neon.tech/neondb?sslmode=require
```
*(Usa la stessa DATABASE_URL del sistema principale)*

### 4. Esempio di Utilizzo

```typescript
// Nel tuo codice mobile
import { mobilePeso } from './mobile-peso-handler';

// Operatore inserisce dati semplici
const operazione = await mobilePeso.registraPeso({
  basketId: 1,
  cycleId: 1,
  date: '2025-08-15',
  totalWeight: 2500, // grammi 
  animalCount: 150,
  operatorName: 'Mario Rossi',
  notes: 'Pesatura mattutina'
});

// Risultato automatico:
// animalsPerKg: 60
// averageWeight: 16,667 mg  
// sizeId: determinato automaticamente
// Salvato nel database condiviso
```

## ✅ VANTAGGI SOLUZIONE

1. **Zero Duplicazione**: Stesso database, stessi dati
2. **Calcoli Identici**: Stessa logica del sistema principale
3. **Integrazione Semplice**: Un solo file da aggiungere
4. **Mantenimento Lavoro**: Il tuo Repl esistente rimane intatto
5. **Operazioni Complete**: Tutti i campi calcolati automaticamente

## 🎯 RISULTATO FINALE

L'operatore mobile inserisce solo:
- Peso totale
- Numero animali  
- Cestello/ciclo

Il sistema calcola automaticamente tutto il resto e salva l'operazione completa nel database condiviso.

Data: 15 Agosto 2025