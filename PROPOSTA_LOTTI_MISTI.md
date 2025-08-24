# 🧩 PROPOSTA SOLUZIONE LOTTI MISTI

## **PROBLEMA IDENTIFICATO**
Quando durante le vagliature si mescolano lotti diversi nelle destinazioni, diventa difficile tracciare esattamente quanti animali appartengono a ciascun lotto, compromettendo la tracciabilità della mortalità.

## **SOLUZIONE PROPOSTA: SISTEMA DI COMPOSIZIONE LOTTI**

### **1. NUOVA TABELLA: `basket_lot_composition`**
```typescript
export const basketLotComposition = pgTable("basket_lot_composition", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(), // Riferimento al cestello
  cycleId: integer("cycle_id").notNull(), // Riferimento al ciclo
  lotId: integer("lot_id").notNull(), // Riferimento al lotto
  animalCount: integer("animal_count").notNull(), // Animali di questo lotto nel cestello
  percentage: real("percentage").notNull(), // Percentuale del lotto nel cestello
  sourceSelectionId: integer("source_selection_id"), // Da quale vagliatura proviene
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notes: text("notes") // Note aggiuntive
});
```

### **2. LOGICA DI TRACCIAMENTO**

#### **A) Prima attivazione (lotto singolo)**
```typescript
// Cestello con un solo lotto
await tx.insert(basketLotComposition).values({
  basketId: 1,
  cycleId: 5,
  lotId: 3,
  animalCount: 1250000,
  percentage: 100.0,
  sourceSelectionId: null // Prima attivazione
});
```

#### **B) Vagliatura con mescolamento**
```typescript
// Cestello destinazione riceve da 2 cestelli origine con lotti diversi
await tx.insert(basketLotComposition).values([
  {
    basketId: 6, // Cestello destinazione
    cycleId: 7,
    lotId: 3, // Lotto Taylor
    animalCount: 800000, // 64% del totale
    percentage: 64.0,
    sourceSelectionId: 1
  },
  {
    basketId: 6, // Stesso cestello destinazione
    cycleId: 7,
    lotId: 5, // Lotto Supplier XYZ
    animalCount: 450000, // 36% del totale
    percentage: 36.0,
    sourceSelectionId: 1
  }
]);
```

### **3. ALLOCAZIONE PROPORZIONALE DELLA MORTALITÀ**

#### **Algoritmo di calcolo**
```typescript
async function allocateMortalityToLots(mortality: number, selectionId: number) {
  // 1. Ottieni composizione lotti dalle origini
  const sourceComposition = await getSourceLotComposition(selectionId);
  
  // 2. Calcola mortalità per lotto proporzionalmente
  for (const lot of sourceComposition) {
    const lotMortality = Math.round(mortality * (lot.percentage / 100));
    
    // 3. Aggiorna mortalità del lotto
    await tx.update(lots)
      .set({ 
        totalMortality: sql`COALESCE(total_mortality, 0) + ${lotMortality}`,
        lastMortalityDate: selection[0].date,
        mortalityNotes: sql`COALESCE(mortality_notes, '') || ${`Vagliatura #${selectionId}: ${lotMortality} animali (${lot.percentage}%). `}`
      })
      .where(eq(lots.id, lot.lotId));
  }
}
```

### **4. QUERY PER TRACCIABILITÀ**

#### **Composizione attuale di un cestello**
```sql
SELECT 
  l.supplier,
  l.supplier_lot_number,
  blc.animal_count,
  blc.percentage,
  blc.notes
FROM basket_lot_composition blc
JOIN lots l ON blc.lot_id = l.id  
WHERE blc.basket_id = 6 AND blc.cycle_id = 7;
```

#### **Storia mortalità di un lotto**
```sql
SELECT 
  l.supplier_lot_number,
  l.animal_count as animali_iniziali,
  l.total_mortality as mortalita_totale,
  ROUND((l.total_mortality::numeric / l.animal_count * 100), 2) as percentuale_mortalita,
  l.mortality_notes
FROM lots l 
WHERE l.id = 3;
```

### **5. INTERFACCIA UTENTE**

#### **Visualizzazione composizione cestello**
```
🗃️ CESTELLO #6 - Composizione Lotti:
├── 📦 Lotto Taylor TL18-25: 800.000 animali (64%)
├── 📦 Lotto Supplier XYZ: 450.000 animali (36%)
└── 📊 Totale: 1.250.000 animali
```

#### **Report mortalità lotto**
```
📈 LOTTO TAYLOR TL18-25 - Report Mortalità:
├── 🔢 Animali iniziali: 17.500.000
├── 💀 Mortalità totale: -125.000 (-0.71%)
├── 📅 Ultima registrazione: 24/08/2025
└── 📝 Dettagli:
    ├── Vagliatura #1: -80.000 animali (64%)
    └── Vagliatura #3: -45.000 animali (36%)
```

## **VANTAGGI DELLA SOLUZIONE**

### **✅ Tracciabilità Completa**
- Ogni cestello mantiene la composizione esatta dei lotti
- La mortalità viene allocata proporzionalmente
- Storia completa ricostruibile

### **✅ Flessibilità**
- Supporta qualsiasi numero di lotti per cestello
- Percentuali automaticamente calcolate
- Facile aggiunta di nuovi lotti

### **✅ Precisione Contabile**
- Bilanci sempre quadrati
- Allocazione mortalità matematicamente corretta
- Report di controllo automatici

### **✅ Scalabilità**
- Funziona con migliaia di lotti
- Query ottimizzate per performance
- Interfacce intuitive

## **IMPLEMENTAZIONE GRADUALE**

### **Fase 1: Implementazione Base**
1. Aggiungere tabella `basket_lot_composition`
2. Modificare vagliatura per popolare composizione
3. Implementare allocazione mortalità

### **Fase 2: Interfacce**
1. Visualizzazione composizione cestelli
2. Report mortalità per lotto
3. Dashboard controllo bilanci

### **Fase 3: Ottimizzazioni**
1. Query avanzate per analisi
2. Export dati per controlli esterni
3. Alerting automatico per anomalie

## **MIGRAZIONE DATI ESISTENTI**

Per i dati esistenti senza composizione:
```sql
-- Popola composizione per cestelli esistenti con lotto singolo
INSERT INTO basket_lot_composition (basket_id, cycle_id, lot_id, animal_count, percentage)
SELECT DISTINCT
  o.basket_id,
  o.cycle_id,
  o.lot_id,
  o.animal_count,
  100.0
FROM operations o
WHERE o.type = 'prima-attivazione' 
  AND o.lot_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM basket_lot_composition blc 
    WHERE blc.basket_id = o.basket_id AND blc.cycle_id = o.cycle_id
  );
```

Questa soluzione risolve completamente il problema dei lotti misti mantenendo la precisione contabile e la tracciabilità richiesta.