import { pgTable, text, serial, integer, boolean, timestamp, real, date, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Utenti per autenticazione
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "user", "visitor"] }).notNull().default("user"),
  language: text("language", { enum: ["it", "en", "pt"] }).notNull().default("it"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, lastLogin: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Configurazioni Email
export const emailConfig = pgTable("email_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const insertEmailConfigSchema = createInsertSchema(emailConfig)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfig.$inferSelect;

// FLUPSY (Floating Upweller System)
export const flupsys = pgTable("flupsys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // nome identificativo del FLUPSY
  location: text("location"), // posizione/località del FLUPSY
  description: text("description"), // descrizione opzionale
  active: boolean("active").notNull().default(true), // se il FLUPSY è attualmente attivo
  maxPositions: integer("max_positions").notNull().default(10), // numero massimo di posizioni per fila (da 10 a 20)
  productionCenter: text("production_center"), // centro di produzione (ad es. "Ca Pisani", "Goro", ecc.)
});

// Baskets (Ceste)
export const baskets = pgTable("baskets", {
  id: serial("id").primaryKey(),
  physicalNumber: integer("physical_number").notNull(), // numero fisico della cesta
  flupsyId: integer("flupsy_id").notNull(), // reference to the FLUPSY this basket belongs to
  cycleCode: text("cycle_code"), // codice identificativo del ciclo (formato: numeroCesta-numeroFlupsy-YYMM)
  state: text("state").notNull().default("available"), // available, active
  currentCycleId: integer("current_cycle_id"), // reference to the current active cycle, null when not in a cycle
  nfcData: text("nfc_data"), // data to be stored in NFC tag
  row: text("row"), // fila in cui si trova la cesta (DX o SX)
  position: integer("position"), // posizione numerica nella fila (1, 2, 3, ecc.)
});

// Operation Types (Tipologie operazioni)
export const operationTypes = [
  "prima-attivazione",
  "pulizia",
  "vagliatura",
  "trattamento",
  "misura",
  "vendita",
  "selezione-vendita",
  "cessazione",
  "peso",
  "selezione-origine"
] as const;

// Screening (Operazioni di vagliatura)
export const screeningOperations = pgTable("screening_operations", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(), // Data dell'operazione di vagliatura
  screeningNumber: integer("screening_number").notNull(), // Numero progressivo dell'operazione di vagliatura
  purpose: text("purpose"), // Scopo della vagliatura
  referenceSizeId: integer("reference_size_id").notNull(), // Riferimento alla taglia di vagliatura
  status: text("status").notNull().default("draft"), // draft, completed, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
  notes: text("notes"), // Note aggiuntive
});

// Screening Source Baskets (Ceste di origine per la vagliatura)
export const screeningSourceBaskets = pgTable("screening_source_baskets", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(), // Riferimento all'operazione di vagliatura
  basketId: integer("basket_id").notNull(), // Riferimento alla cesta di origine
  cycleId: integer("cycle_id").notNull(), // Riferimento al ciclo attivo della cesta
  dismissed: boolean("dismissed").notNull().default(false), // Indica se la cesta è stata dismessa
  positionReleased: boolean("position_released").notNull().default(false), // Indica se la posizione è stata liberata temporaneamente
  // Dati della cesta di origine al momento della selezione per la vagliatura
  animalCount: integer("animal_count"), // Numero di animali
  totalWeight: real("total_weight"), // Peso totale in grammi
  animalsPerKg: integer("animals_per_kg"), // Animali per kg
  sizeId: integer("size_id"), // Taglia attuale
  lotId: integer("lot_id"), // Lotto di origine
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di aggiunta alla vagliatura
});

// Screening Destination Baskets (Nuove ceste create dalla vagliatura)
export const screeningDestinationBaskets = pgTable("screening_destination_baskets", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(), // Riferimento all'operazione di vagliatura
  basketId: integer("basket_id").notNull(), // Riferimento alla nuova cesta
  cycleId: integer("cycle_id"), // Riferimento al nuovo ciclo (può essere null se non ancora creato)
  category: text("category").notNull(), // "sopra" o "sotto" vagliatura
  flupsyId: integer("flupsy_id"), // FLUPSY assegnato
  row: text("row"), // Fila assegnata
  position: integer("position"), // Posizione assegnata
  positionAssigned: boolean("position_assigned").notNull().default(false), // Indica se la posizione è stata assegnata
  // Dati della nuova cesta
  animalCount: integer("animal_count"), // Numero di animali stimato
  liveAnimals: integer("live_animals"), // Numero di animali vivi stimato
  totalWeight: real("total_weight"), // Peso totale in grammi
  animalsPerKg: integer("animals_per_kg"), // Animali per kg
  deadCount: integer("dead_count"), // Conteggio animali morti
  mortalityRate: real("mortality_rate"), // Tasso di mortalità
  notes: text("notes"), // Note specifiche per questa cesta
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

// Screening Basket History (Storico delle relazioni tra ceste di origine e destinazione)
export const screeningBasketHistory = pgTable("screening_basket_history", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(), // Riferimento all'operazione di vagliatura
  sourceBasketId: integer("source_basket_id").notNull(), // Riferimento alla cesta di origine
  sourceCycleId: integer("source_cycle_id").notNull(), // Riferimento al ciclo di origine
  destinationBasketId: integer("destination_basket_id").notNull(), // Riferimento alla cesta di destinazione
  destinationCycleId: integer("destination_cycle_id").notNull(), // Riferimento al ciclo di destinazione
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

// Screening Lot References (Riferimenti ai lotti per le ceste di destinazione)
export const screeningLotReferences = pgTable("screening_lot_references", {
  id: serial("id").primaryKey(),
  screeningId: integer("screening_id").notNull(), // Riferimento all'operazione di vagliatura
  destinationBasketId: integer("destination_basket_id").notNull(), // Riferimento alla cesta di destinazione
  destinationCycleId: integer("destination_cycle_id").notNull(), // Riferimento al ciclo di destinazione
  lotId: integer("lot_id").notNull(), // Riferimento al lotto
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

// Selections (Operazioni di Selezione)
export const selections = pgTable("selections", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(), // Data dell'operazione di selezione
  selectionNumber: integer("selection_number").notNull(), // Numero progressivo dell'operazione di selezione
  purpose: text("purpose", { enum: ["vendita", "vagliatura", "altro"] }).notNull(), // Scopo della selezione
  screeningType: text("screening_type", { enum: ["sopra_vaglio", "sotto_vaglio"] }), // Tipo di vagliatura, se pertinente
  referenceSizeId: integer("reference_size_id"), // ID della taglia di riferimento per la selezione
  status: text("status", { enum: ["draft", "completed", "cancelled"] }).notNull().default("draft"), // Stato dell'operazione di selezione
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
  notes: text("notes"), // Note aggiuntive
});

// Selection Source Baskets (Ceste di origine per la selezione)
export const selectionSourceBaskets = pgTable("selection_source_baskets", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // Riferimento all'operazione di selezione
  basketId: integer("basket_id").notNull(), // Riferimento alla cesta di origine
  cycleId: integer("cycle_id").notNull(), // Riferimento al ciclo attivo della cesta
  // Dati della cesta di origine al momento della selezione
  animalCount: integer("animal_count"), // Numero di animali
  totalWeight: real("total_weight"), // Peso totale in grammi
  animalsPerKg: integer("animals_per_kg"), // Animali per kg
  sizeId: integer("size_id"), // Taglia attuale
  lotId: integer("lot_id"), // Lotto di origine
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di aggiunta alla selezione
});

// Selection Destination Baskets (Nuove ceste create dalla selezione)
export const selectionDestinationBaskets = pgTable("selection_destination_baskets", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // Riferimento all'operazione di selezione
  basketId: integer("basket_id").notNull(), // Riferimento alla nuova cesta
  cycleId: integer("cycle_id"), // Riferimento al nuovo ciclo (può essere null se non ancora creato)
  destinationType: text("destination_type", { enum: ["sold", "placed"] }).notNull(), // Venduta o collocata
  flupsyId: integer("flupsy_id"), // FLUPSY assegnato se collocata
  position: text("position"), // Posizione nel FLUPSY se collocata
  // Dati della nuova cesta
  animalCount: integer("animal_count"), // Numero di animali totale
  liveAnimals: integer("live_animals"), // Numero di animali vivi
  totalWeight: real("total_weight"), // Peso totale in grammi
  animalsPerKg: integer("animals_per_kg"), // Animali per kg
  sizeId: integer("size_id"), // Taglia calcolata
  deadCount: integer("dead_count"), // Conteggio animali morti
  mortalityRate: real("mortality_rate"), // Tasso di mortalità
  sampleWeight: real("sample_weight"), // Peso del campione in grammi
  sampleCount: integer("sample_count"), // Numero di animali nel campione
  notes: text("notes"), // Note specifiche per questa cesta
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

// Selection Basket History (Storico delle relazioni tra ceste di origine e destinazione)
export const selectionBasketHistory = pgTable("selection_basket_history", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // Riferimento all'operazione di selezione
  sourceBasketId: integer("source_basket_id").notNull(), // Riferimento alla cesta di origine
  sourceCycleId: integer("source_cycle_id").notNull(), // Riferimento al ciclo di origine
  destinationBasketId: integer("destination_basket_id").notNull(), // Riferimento alla cesta di destinazione
  destinationCycleId: integer("destination_cycle_id").notNull(), // Riferimento al ciclo di destinazione
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

// Selection Lot References (Riferimenti ai lotti per le ceste di destinazione)
export const selectionLotReferences = pgTable("selection_lot_references", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // Riferimento all'operazione di selezione
  destinationBasketId: integer("destination_basket_id").notNull(), // Riferimento alla cesta di destinazione
  destinationCycleId: integer("destination_cycle_id").notNull(), // Riferimento al ciclo di destinazione
  lotId: integer("lot_id").notNull(), // Riferimento al lotto
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

// Operations (Operazioni)
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type", { enum: operationTypes }).notNull(),
  basketId: integer("basket_id").notNull(), // reference to the basket
  cycleId: integer("cycle_id").notNull(), // reference to the cycle
  sizeId: integer("size_id"), // reference to the size
  sgrId: integer("sgr_id"), // reference to the SGR
  lotId: integer("lot_id"), // reference to the lot
  animalCount: integer("animal_count"),
  totalWeight: real("total_weight"), // in grams
  animalsPerKg: integer("animals_per_kg"),
  averageWeight: real("average_weight"), // in milligrams, calculated: 1,000,000 / animalsPerKg
  deadCount: integer("dead_count"), // numero di animali morti
  mortalityRate: real("mortality_rate"), // percentuale di mortalità
  notes: text("notes"),
});

// Cycles (Cicli Produttivi)
export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(), // reference to the basket
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  state: text("state").notNull().default("active"), // active, closed
});

// Sizes (Taglie)
export const sizes = pgTable("sizes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., T0, T1, M1, M2, M3
  name: text("name").notNull(),
  sizeMm: real("size_mm"), // size in millimeters
  minAnimalsPerKg: integer("min_animals_per_kg"), 
  maxAnimalsPerKg: integer("max_animals_per_kg"),
  notes: text("notes"),
  color: text("color"), // colore HEX per visualizzazione grafica
});

// SGR (Indici di Crescita)
export const sgr = pgTable("sgr", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(), // e.g., January, February...
  percentage: real("percentage").notNull(), // e.g., 0.5% (valore mensile)
  calculatedFromReal: boolean("calculated_from_real").default(false), // Indica se è stato calcolato da dati reali
});

// SGR Giornalieri (Dati giornalieri dalla sonda Seneye)
export const sgrGiornalieri = pgTable("sgr_giornalieri", {
  id: serial("id").primaryKey(),
  recordDate: timestamp("record_date").notNull(), // Data e ora di registrazione (fissata alle 12:00)
  temperature: real("temperature"), // Temperatura dell'acqua in °C
  pH: real("ph"), // pH dell'acqua
  ammonia: real("ammonia"), // Livello di ammoniaca in mg/L
  oxygen: real("oxygen"), // Livello di ossigeno in mg/L
  salinity: real("salinity"), // Salinità in ppt
  notes: text("notes"), // Note aggiuntive
});

// Lots (Lotti)
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  arrivalDate: date("arrival_date").notNull(),
  supplier: text("supplier").notNull(),
  supplierLotNumber: text("supplier_lot_number"), // Numero di lotto di provenienza del fornitore
  quality: text("quality"),
  animalCount: integer("animal_count"),
  weight: real("weight"), // in grams
  sizeId: integer("size_id"), // reference to the size
  notes: text("notes"),
  state: text("state").notNull().default("active"), // active, exhausted
});

// Position History (Cronologia delle posizioni delle ceste)
export const basketPositionHistory = pgTable("basket_position_history", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(), // reference to the basket
  flupsyId: integer("flupsy_id").notNull(), // reference to the FLUPSY
  row: text("row").notNull(), // fila (DX o SX)
  position: integer("position").notNull(), // posizione numerica
  startDate: date("start_date").notNull(), // data inizio in questa posizione
  endDate: date("end_date"), // data fine in questa posizione (null se è la posizione attuale)
  operationId: integer("operation_id"), // operazione che ha causato il cambio di posizione
});

// Mortality Rate (Tasso di mortalità previsto per taglia e mese)
export const mortalityRates = pgTable("mortality_rates", {
  id: serial("id").primaryKey(),
  sizeId: integer("size_id").notNull(), // reference to the size
  month: text("month").notNull(), // e.g., gennaio, febbraio...
  percentage: real("percentage").notNull(), // percentuale di mortalità prevista per questa taglia e mese
  notes: text("notes"),
});

// Target Size Annotations (Annotazioni per ceste che raggiungono la taglia target)
export const targetSizeAnnotations = pgTable("target_size_annotations", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(), // reference to the basket
  targetSizeId: integer("target_size_id").notNull(), // reference to the target size (es. TP-3000)
  predictedDate: date("predicted_date").notNull(), // Data prevista di raggiungimento della taglia
  status: text("status").notNull().default("pending"), // pending, reached, missed
  reachedDate: date("reached_date"), // Data effettiva di raggiungimento (se raggiunta)
  notes: text("notes"), // Note opzionali
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data di creazione dell'annotazione
  updatedAt: timestamp("updated_at"), // Data di aggiornamento dell'annotazione
});

// Insert schemas
export const insertFlupsySchema = createInsertSchema(flupsys).omit({
  id: true
});

export const insertBasketSchema = createInsertSchema(baskets).omit({ 
  id: true, 
  currentCycleId: true,
  nfcData: true,
});

export const insertOperationSchema = createInsertSchema(operations).omit({ 
  id: true,
  averageWeight: true 
});

export const insertCycleSchema = createInsertSchema(cycles).omit({ 
  id: true, 
  endDate: true,
  state: true
});

export const insertSizeSchema = createInsertSchema(sizes).omit({ 
  id: true 
});

export const insertSgrSchema = createInsertSchema(sgr).omit({ 
  id: true,
  calculatedFromReal: true
});

export const insertSgrGiornalieriSchema = createInsertSchema(sgrGiornalieri).omit({
  id: true
});

export const insertLotSchema = createInsertSchema(lots).omit({ 
  id: true,
  state: true 
});

export const insertBasketPositionHistorySchema = createInsertSchema(basketPositionHistory).omit({
  id: true,
  endDate: true
});

export const insertMortalityRateSchema = createInsertSchema(mortalityRates).omit({
  id: true
});

export const insertTargetSizeAnnotationSchema = createInsertSchema(targetSizeAnnotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true
});

// Schema per il modulo di vagliatura
export const insertScreeningOperationSchema = createInsertSchema(screeningOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true
});

export const insertScreeningSourceBasketSchema = createInsertSchema(screeningSourceBaskets).omit({
  id: true,
  createdAt: true,
  dismissed: true,
  positionReleased: true
});

export const insertScreeningDestinationBasketSchema = createInsertSchema(screeningDestinationBaskets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  positionAssigned: true,
  cycleId: true
});

export const insertScreeningBasketHistorySchema = createInsertSchema(screeningBasketHistory).omit({
  id: true,
  createdAt: true
});

export const insertScreeningLotReferenceSchema = createInsertSchema(screeningLotReferences).omit({
  id: true,
  createdAt: true
});

// Schema per il modulo di selezione
export const insertSelectionSchema = createInsertSchema(selections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  selectionNumber: true
});

export const insertSelectionSourceBasketSchema = createInsertSchema(selectionSourceBaskets).omit({
  id: true,
  createdAt: true
});

export const insertSelectionDestinationBasketSchema = createInsertSchema(selectionDestinationBaskets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  cycleId: true
});

export const insertSelectionBasketHistorySchema = createInsertSchema(selectionBasketHistory).omit({
  id: true,
  createdAt: true
});

export const insertSelectionLotReferenceSchema = createInsertSchema(selectionLotReferences).omit({
  id: true,
  createdAt: true
});

// Types
export type Flupsy = typeof flupsys.$inferSelect;
export type InsertFlupsy = z.infer<typeof insertFlupsySchema>;

export type Basket = typeof baskets.$inferSelect;
export type InsertBasket = z.infer<typeof insertBasketSchema>;

export type Operation = typeof operations.$inferSelect;
export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type OperationType = typeof operationTypes[number];

export type Cycle = typeof cycles.$inferSelect;
export type InsertCycle = z.infer<typeof insertCycleSchema>;

export type Size = typeof sizes.$inferSelect;
export type InsertSize = z.infer<typeof insertSizeSchema>;

export type Sgr = typeof sgr.$inferSelect;
export type InsertSgr = z.infer<typeof insertSgrSchema>;

export type SgrGiornaliero = typeof sgrGiornalieri.$inferSelect;
export type InsertSgrGiornaliero = z.infer<typeof insertSgrGiornalieriSchema>;

export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;

export type BasketPositionHistory = typeof basketPositionHistory.$inferSelect;
export type InsertBasketPositionHistory = z.infer<typeof insertBasketPositionHistorySchema>;

export type MortalityRate = typeof mortalityRates.$inferSelect;
export type InsertMortalityRate = z.infer<typeof insertMortalityRateSchema>;

export type TargetSizeAnnotation = typeof targetSizeAnnotations.$inferSelect;
export type InsertTargetSizeAnnotation = z.infer<typeof insertTargetSizeAnnotationSchema>;

// Tipi per il modulo di vagliatura
export type ScreeningOperation = typeof screeningOperations.$inferSelect;
export type InsertScreeningOperation = z.infer<typeof insertScreeningOperationSchema>;

export type ScreeningSourceBasket = typeof screeningSourceBaskets.$inferSelect;
export type InsertScreeningSourceBasket = z.infer<typeof insertScreeningSourceBasketSchema>;

export type ScreeningDestinationBasket = typeof screeningDestinationBaskets.$inferSelect;
export type InsertScreeningDestinationBasket = z.infer<typeof insertScreeningDestinationBasketSchema>;

export type ScreeningBasketHistory = typeof screeningBasketHistory.$inferSelect;
export type InsertScreeningBasketHistory = z.infer<typeof insertScreeningBasketHistorySchema>;

export type ScreeningLotReference = typeof screeningLotReferences.$inferSelect;
export type InsertScreeningLotReference = z.infer<typeof insertScreeningLotReferenceSchema>;

// Tipi per il modulo di selezione
export type Selection = typeof selections.$inferSelect;
export type InsertSelection = z.infer<typeof insertSelectionSchema>;

export type SelectionSourceBasket = typeof selectionSourceBaskets.$inferSelect;
export type InsertSelectionSourceBasket = z.infer<typeof insertSelectionSourceBasketSchema>;

export type SelectionDestinationBasket = typeof selectionDestinationBaskets.$inferSelect;
export type InsertSelectionDestinationBasket = z.infer<typeof insertSelectionDestinationBasketSchema>;

export type SelectionBasketHistory = typeof selectionBasketHistory.$inferSelect;
export type InsertSelectionBasketHistory = z.infer<typeof insertSelectionBasketHistorySchema>;

export type SelectionLotReference = typeof selectionLotReferences.$inferSelect;
export type InsertSelectionLotReference = z.infer<typeof insertSelectionLotReferenceSchema>;

// Extended schemas for validation
export const operationSchema = insertOperationSchema.extend({
  date: z.coerce.date()
});

export const cycleSchema = insertCycleSchema.extend({
  startDate: z.coerce.date()
});

export const lotSchema = insertLotSchema.extend({
  arrivalDate: z.coerce.date(),
  supplierLotNumber: z.string().optional()
    .superRefine((val, ctx) => {
      // Assicurati che ctx.data esista e abbia la proprietà supplier
      if (!ctx.data || !('supplier' in ctx.data)) {
        return; // Se non c'è supplier, non possiamo controllare
      }
      
      // Rendi il campo obbligatorio solo se il fornitore è "Zeeland" o "Ecotapes Zeeland"
      const supplier = ctx.data.supplier as string;
      const isZeelandSupplier = supplier === "Zeeland" || supplier === "Ecotapes Zeeland";
      
      if (isZeelandSupplier && (!val || val.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Il numero di lotto del fornitore è obbligatorio per i fornitori Zeeland o Ecotapes Zeeland",
        });
      }
    })
});

export const basketPositionHistorySchema = insertBasketPositionHistorySchema.extend({
  startDate: z.coerce.date()
});

export const sgrGiornalieriSchema = insertSgrGiornalieriSchema.extend({
  recordDate: z.coerce.date()
});

export const mortalityRateSchema = insertMortalityRateSchema.extend({
  // Validation rules if needed
});

export const targetSizeAnnotationSchema = insertTargetSizeAnnotationSchema.extend({
  predictedDate: z.coerce.date(),
  reachedDate: z.coerce.date().optional()
});

// Schemi di validazione per il modulo di vagliatura
export const screeningOperationSchema = insertScreeningOperationSchema.extend({
  date: z.coerce.date()
});

export const screeningSourceBasketSchema = insertScreeningSourceBasketSchema.extend({
  // Regole di validazione se necessarie
});

export const screeningDestinationBasketSchema = insertScreeningDestinationBasketSchema.extend({
  // Regole di validazione se necessarie
});

export const screeningBasketHistorySchema = insertScreeningBasketHistorySchema.extend({
  // Regole di validazione se necessarie
});

export const screeningLotReferenceSchema = insertScreeningLotReferenceSchema.extend({
  // Regole di validazione se necessarie
});

// Notifiche di sistema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'vendita', 'warning', 'system', ecc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  relatedEntityType: text("related_entity_type"), // 'operation', 'basket', 'cycle', ecc.
  relatedEntityId: integer("related_entity_id"), // ID dell'entità correlata
  data: text("data"), // Dati aggiuntivi in formato JSON (stringified)
});

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Impostazioni per le notifiche
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  notificationType: text("notification_type").notNull(), // 'vendita', 'accrescimento', etc.
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;

// Tipi di transazione dell'inventario
export const inventoryTransactionTypes = [
  "arrivo-lotto",         // Registrazione nuovo lotto
  "vendita",              // Vendita animali
  "vagliatura-uscita",    // Animali usciti durante vagliatura
  "vagliatura-ingresso",  // Animali entrati durante vagliatura
  "mortalità-misurata",   // Mortalità misurata durante un'operazione
  "aggiustamento-manuale" // Aggiustamento manuale dell'inventario
] as const;

// Lot Inventory Transactions (Transazioni di inventario per lotto)
export const lotInventoryTransactions = pgTable("lot_inventory_transactions", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull(), // Riferimento al lotto
  date: date("date").notNull(), // Data della transazione
  transactionType: text("transaction_type", { enum: inventoryTransactionTypes }).notNull(), // Tipo di transazione
  animalCount: integer("animal_count").notNull(), // Numero di animali (positivo per entrate, negativo per uscite)
  basketId: integer("basket_id"), // Cestello associato (se applicabile)
  operationId: integer("operation_id"), // Operazione associata (se applicabile)
  selectionId: integer("selection_id"), // Selezione associata (se applicabile)
  screeningId: integer("screening_id"), // Vagliatura associata (se applicabile)
  notes: text("notes"), // Note aggiuntive
  metadata: jsonb("metadata"), // Metadati aggiuntivi in formato JSON
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  createdBy: text("created_by"), // Utente che ha creato la transazione
});

// Lot Mortality Records (Registrazioni della mortalità per lotto)
export const lotMortalityRecords = pgTable("lot_mortality_records", {
  id: serial("id").primaryKey(),
  lotId: integer("lot_id").notNull(), // Riferimento al lotto
  calculationDate: date("calculation_date").notNull(), // Data del calcolo
  initialCount: integer("initial_count").notNull(), // Conteggio iniziale degli animali
  currentCount: integer("current_count").notNull(), // Conteggio attuale degli animali
  soldCount: integer("sold_count").notNull().default(0), // Numero di animali venduti
  mortalityCount: integer("mortality_count").notNull(), // Numero di animali morti
  mortalityPercentage: real("mortality_percentage").notNull(), // Percentuale di mortalità
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  notes: text("notes"), // Note aggiuntive
});

// Schema di inserimento per le transazioni di inventario
export const insertLotInventoryTransactionSchema = createInsertSchema(lotInventoryTransactions)
  .omit({ id: true, createdAt: true });

// Schema di inserimento per le registrazioni della mortalità
export const insertLotMortalityRecordSchema = createInsertSchema(lotMortalityRecords)
  .omit({ id: true, createdAt: true });

// Tipi per le transazioni di inventario
export type InventoryTransactionType = typeof inventoryTransactionTypes[number];
export type LotInventoryTransaction = typeof lotInventoryTransactions.$inferSelect;
export type InsertLotInventoryTransaction = z.infer<typeof insertLotInventoryTransactionSchema>;

// Tipi per le registrazioni della mortalità
export type LotMortalityRecord = typeof lotMortalityRecords.$inferSelect;
export type InsertLotMortalityRecord = z.infer<typeof insertLotMortalityRecordSchema>;

// =========== SISTEMA DI GESTIONE CLIENTI E ORDINI ===========

// Clienti
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Nome del cliente o dell'azienda
  taxId: text("tax_id"), // Codice fiscale o partita IVA
  email: text("email"), // Email di contatto principale
  phone: text("phone"), // Numero di telefono principale
  address: text("address"), // Indirizzo completo
  city: text("city"), // Città
  province: text("province"), // Provincia
  zipCode: text("zip_code"), // CAP
  country: text("country").default("Italia"), // Paese
  contactPerson: text("contact_person"), // Persona di riferimento
  clientType: text("client_type", { enum: ["business", "individual", "government"] }).notNull().default("business"), // Tipo di cliente
  notes: text("notes"), // Note aggiuntive
  active: boolean("active").notNull().default(true), // Se il cliente è attivo
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

export const insertClientSchema = createInsertSchema(clients)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Stati dell'ordine
export const orderStatuses = [
  "draft", // Bozza (in preparazione)
  "confirmed", // Confermato (ordine accettato)
  "processing", // In lavorazione (preparazione in corso)
  "ready", // Pronto (pronto per la consegna)
  "shipped", // Spedito (in transito)
  "delivered", // Consegnato (arrivato al cliente)
  "completed", // Completato (ordine concluso e fatturato)
  "cancelled", // Annullato (ordine cancellato)
] as const;

// Tipi di pagamento
export const paymentTypes = [
  "bank_transfer", // Bonifico bancario
  "cash", // Contanti
  "card", // Carta di credito/debito
  "check", // Assegno
  "deferred", // Pagamento differito
] as const;

// Ordini
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // Numero d'ordine (formato: ORD-YYYYMMDD-XXX)
  clientId: integer("client_id").notNull(), // Riferimento al cliente
  orderDate: date("order_date").notNull(), // Data dell'ordine
  requestedDeliveryDate: date("requested_delivery_date"), // Data di consegna richiesta
  actualDeliveryDate: date("actual_delivery_date"), // Data di consegna effettiva
  status: text("status", { enum: orderStatuses }).notNull().default("draft"), // Stato dell'ordine
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Importo totale
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Importo IVA
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("22"), // Aliquota IVA (%)
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"), // Importo sconto
  discountRate: numeric("discount_rate", { precision: 5, scale: 2 }).default("0"), // Percentuale sconto (%)
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).default("0"), // Costo di spedizione
  paymentType: text("payment_type", { enum: paymentTypes }), // Tipo di pagamento
  paymentStatus: text("payment_status", { enum: ["pending", "partial", "paid"] }).notNull().default("pending"), // Stato del pagamento
  paymentDueDate: date("payment_due_date"), // Data di scadenza del pagamento
  invoiceNumber: text("invoice_number"), // Numero di fattura
  invoiceDate: date("invoice_date"), // Data di fatturazione
  notes: text("notes"), // Note generali sull'ordine
  internalNotes: text("internal_notes"), // Note interne (non visibili al cliente)
  shippingAddress: text("shipping_address"), // Indirizzo di spedizione completo
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

export const insertOrderSchema = createInsertSchema(orders)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderStatus = typeof orderStatuses[number];
export type PaymentType = typeof paymentTypes[number];

// Voci d'ordine (Prodotti ordinati)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Riferimento all'ordine
  description: text("description").notNull(), // Descrizione del prodotto
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(), // Quantità ordinata
  unit: text("unit").notNull().default("kg"), // Unità di misura (kg, g, pz, ecc.)
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(), // Prezzo unitario
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(), // Prezzo totale (quantità * prezzo unitario)
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("22"), // Aliquota IVA (%)
  lotId: integer("lot_id"), // Riferimento al lotto (se applicabile)
  sizeId: integer("size_id"), // Riferimento alla taglia (se applicabile)
  selectionId: integer("selection_id"), // Riferimento all'operazione di selezione (se applicabile)
  notes: text("notes"), // Note specifiche per questo articolo
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

export const insertOrderItemSchema = createInsertSchema(orderItems)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Pagamenti
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Riferimento all'ordine
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // Importo del pagamento
  paymentDate: date("payment_date").notNull(), // Data del pagamento
  paymentType: text("payment_type", { enum: paymentTypes }).notNull(), // Tipo di pagamento
  reference: text("reference"), // Riferimento del pagamento (es. numero bonifico)
  notes: text("notes"), // Note sul pagamento
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

export const insertPaymentSchema = createInsertSchema(payments)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Documenti allegati (per ordini e clienti)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(), // Nome del file
  originalName: text("original_name").notNull(), // Nome originale del file
  mimeType: text("mime_type").notNull(), // Tipo MIME del file
  size: integer("size").notNull(), // Dimensione in bytes
  path: text("path").notNull(), // Percorso di archiviazione
  entityType: text("entity_type", { enum: ["client", "order", "payment"] }).notNull(), // Tipo di entità a cui è allegato
  entityId: integer("entity_id").notNull(), // ID dell'entità a cui è allegato
  documentType: text("document_type", { enum: ["invoice", "ddt", "offer", "contract", "other"] }).notNull(), // Tipo di documento
  uploadDate: timestamp("upload_date").notNull().defaultNow(), // Data e ora di caricamento
  notes: text("notes"), // Note sul documento
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
});

export const insertDocumentSchema = createInsertSchema(documents)
  .omit({ id: true, createdAt: true, updatedAt: true, uploadDate: true });

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// =========== SISTEMA DI RAPPORTI E REPORT ===========

// Tipi di report
export const reportTypes = [
  "sales", // Report di vendite
  "delivery", // Report di consegna
  "production", // Report di produzione
  "inventory", // Report di inventario
  "financial", // Report finanziario
  "custom", // Report personalizzato
] as const;

// Formato dei report
export const reportFormats = [
  "pdf", // PDF
  "excel", // Excel
  "csv", // CSV
  "json", // JSON
  "html", // HTML
] as const;

// Report
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Titolo del report
  description: text("description"), // Descrizione del report
  type: text("type", { enum: reportTypes }).notNull(), // Tipo di report
  format: text("format", { enum: reportFormats }).notNull().default("pdf"), // Formato del report
  parameters: jsonb("parameters"), // Parametri utilizzati per generare il report (in formato JSON)
  filePath: text("file_path"), // Percorso del file generato
  fileSize: integer("file_size"), // Dimensione del file in bytes
  generatedBy: integer("generated_by"), // ID dell'utente che ha generato il report
  startDate: date("start_date"), // Data di inizio del periodo di riferimento
  endDate: date("end_date"), // Data di fine del periodo di riferimento
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).notNull().default("pending"), // Stato del report
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  completedAt: timestamp("completed_at"), // Data e ora di completamento
  error: text("error"), // Eventuale errore durante la generazione
  metadata: jsonb("metadata"), // Metadati aggiuntivi
});

export const insertReportSchema = createInsertSchema(reports)
  .omit({ id: true, createdAt: true, completedAt: true, fileSize: true });

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ReportType = typeof reportTypes[number];
export type ReportFormat = typeof reportFormats[number];

// Delivery Reports (Report di consegna specifici)
export const deliveryReports = pgTable("delivery_reports", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(), // Riferimento al report generale
  orderId: integer("order_id").notNull(), // Riferimento all'ordine
  clientId: integer("client_id").notNull(), // Riferimento al cliente
  deliveryDate: date("delivery_date").notNull(), // Data di consegna
  totalItems: integer("total_items").notNull(), // Numero totale di articoli
  totalWeight: numeric("total_weight", { precision: 10, scale: 3 }), // Peso totale
  transportInfo: text("transport_info"), // Informazioni sul trasporto
  notes: text("notes"), // Note sulla consegna
  signedBy: text("signed_by"), // Nome di chi ha firmato la consegna
  signatureImagePath: text("signature_image_path"), // Percorso dell'immagine della firma
  gpsCoordinates: text("gps_coordinates"), // Coordinate GPS del luogo di consegna
  metadata: jsonb("metadata"), // Metadati aggiuntivi
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

export const insertDeliveryReportSchema = createInsertSchema(deliveryReports)
  .omit({ id: true, createdAt: true });

export type DeliveryReport = typeof deliveryReports.$inferSelect;
export type InsertDeliveryReport = z.infer<typeof insertDeliveryReportSchema>;

// Sales Reports (Report di vendita specifici)
export const salesReports = pgTable("sales_reports", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(), // Riferimento al report generale
  startDate: date("start_date").notNull(), // Data di inizio del periodo
  endDate: date("end_date").notNull(), // Data di fine del periodo
  totalSales: numeric("total_sales", { precision: 12, scale: 2 }).notNull(), // Vendite totali
  totalVat: numeric("total_vat", { precision: 12, scale: 2 }), // IVA totale
  totalOrders: integer("total_orders").notNull(), // Numero totale di ordini
  completedOrders: integer("completed_orders").notNull(), // Numero di ordini completati
  cancelledOrders: integer("cancelled_orders").notNull(), // Numero di ordini annullati
  topSizeId: integer("top_size_id"), // Taglia più venduta
  topLotId: integer("top_lot_id"), // Lotto più venduto
  topClientId: integer("top_client_id"), // Cliente migliore
  totalWeight: numeric("total_weight", { precision: 12, scale: 3 }), // Peso totale venduto
  avgOrderValue: numeric("avg_order_value", { precision: 10, scale: 2 }), // Valore medio degli ordini
  metadata: jsonb("metadata"), // Metadati aggiuntivi
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
});

export const insertSalesReportSchema = createInsertSchema(salesReports)
  .omit({ id: true, createdAt: true });

export type SalesReport = typeof salesReports.$inferSelect;
export type InsertSalesReport = z.infer<typeof insertSalesReportSchema>;

// Report Templates (Modelli di report)
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Nome del modello
  description: text("description"), // Descrizione del modello
  type: text("type", { enum: reportTypes }).notNull(), // Tipo di report
  format: text("format", { enum: reportFormats }).notNull().default("pdf"), // Formato del report
  template: text("template").notNull(), // Template HTML/CSS o altro formato
  parameters: jsonb("parameters"), // Parametri predefiniti
  isDefault: boolean("is_default").default(false), // Se è il modello predefinito per questo tipo
  createdBy: integer("created_by"), // ID dell'utente che ha creato il modello
  createdAt: timestamp("created_at").notNull().defaultNow(), // Data e ora di creazione
  updatedAt: timestamp("updated_at"), // Data e ora di ultimo aggiornamento
  active: boolean("active").notNull().default(true), // Se il modello è attivo
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
