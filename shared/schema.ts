import { pgTable, text, serial, integer, boolean, timestamp, real, date, numeric, jsonb, decimal } from "drizzle-orm/pg-core";
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
  row: text("row").notNull(), // fila in cui si trova la cesta (DX o SX)
  position: integer("position").notNull(), // posizione numerica nella fila (1, 2, 3, ecc.)
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
  "selezione-origine",
  "dismissione",
  "chiusura-ciclo-vagliatura"
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

// ========== BASKET LOT COMPOSITION ==========
// Tabella per tracciare la composizione dei lotti nei cestelli
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
  metadata: text("metadata"), // metadati aggiuntivi in formato JSON (per API esterne)
});

// Cycles (Cicli Produttivi)
export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(), // reference to the basket
  lotId: integer("lot_id"), // reference to the lot
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
  active: boolean("active").notNull().default(true),
  externalId: text("external_id"),
  description: text("description"),
  origin: text("origin"),
  // Tracciabilità mortalità da vagliature
  totalMortality: integer("total_mortality").default(0), // Mortalità cumulativa totale del lotto
  lastMortalityDate: date("last_mortality_date"), // Data ultima registrazione mortalità
  mortalityNotes: text("mortality_notes"), // Note sulla mortalità
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  averageWeight: true,
  metadata: true
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

export const insertBasketLotCompositionSchema = createInsertSchema(basketLotComposition).omit({
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

export type BasketLotComposition = typeof basketLotComposition.$inferSelect;
export type InsertBasketLotComposition = z.infer<typeof insertBasketLotCompositionSchema>;

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

// Tabelle per sincronizzazione dati esterni per report vendite

// Stato delle sincronizzazioni
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull().unique(), // Nome della tabella sincronizzata
  lastSyncAt: timestamp("last_sync_at"), // Ultima sincronizzazione completata
  lastSyncSuccess: boolean("last_sync_success").default(true), // Se l'ultima sincronizzazione è andata a buon fine
  syncInProgress: boolean("sync_in_progress").default(false), // Se una sincronizzazione è in corso
  recordCount: integer("record_count").default(0), // Numero di record sincronizzati
  errorMessage: text("error_message"), // Messaggio di errore dell'ultima sincronizzazione
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Clienti sincronizzati dal database esterno
export const externalCustomersSync = pgTable("external_customers_sync", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").notNull().unique(), // ID nel database esterno
  customerCode: text("customer_code").notNull(), // Codice cliente
  customerName: text("customer_name").notNull(), // Nome/ragione sociale
  customerType: text("customer_type"), // Tipo cliente (privato, azienda, ecc.)
  vatNumber: text("vat_number"), // Partita IVA
  taxCode: text("tax_code"), // Codice fiscale
  address: text("address"), // Indirizzo
  city: text("city"), // Città
  province: text("province"), // Provincia
  postalCode: text("postal_code"), // CAP
  country: text("country").default("IT"), // Paese
  phone: text("phone"), // Telefono
  email: text("email"), // Email
  isActive: boolean("is_active").default(true), // Se il cliente è attivo
  notes: text("notes"), // Note
  syncedAt: timestamp("synced_at").notNull().defaultNow(), // Quando è stato sincronizzato
  lastModifiedExternal: timestamp("last_modified_external") // Ultima modifica nel DB esterno
});

// Vendite sincronizzate dal database esterno
export const externalSalesSync = pgTable("external_sales_sync", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").notNull().unique(), // ID nel database esterno
  saleNumber: text("sale_number").notNull(), // Numero vendita/fattura
  saleDate: date("sale_date").notNull(), // Data vendita
  customerId: integer("customer_id"), // Riferimento a external_customers_sync
  customerName: text("customer_name"), // Nome cliente (denormalizzato per performance)
  productCode: text("product_code"), // Codice prodotto
  productName: text("product_name").notNull(), // Nome prodotto
  productCategory: text("product_category"), // Categoria prodotto
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(), // Quantità venduta
  unitOfMeasure: text("unit_of_measure").default("kg"), // Unità di misura
  unitPrice: decimal("unit_price", { precision: 10, scale: 4 }), // Prezzo unitario
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(), // Importo totale
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"), // Sconto percentuale
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"), // Importo sconto
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(), // Importo netto
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).default("22"), // Aliquota IVA
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0"), // Importo IVA
  totalWithVat: decimal("total_with_vat", { precision: 12, scale: 2 }).notNull(), // Totale con IVA
  paymentMethod: text("payment_method"), // Metodo pagamento
  deliveryDate: date("delivery_date"), // Data consegna
  origin: text("origin"), // Origine del prodotto (es. "lotto_123", "flupsy_A")
  lotReference: text("lot_reference"), // Riferimento al lotto se disponibile
  salesPerson: text("sales_person"), // Venditore
  notes: text("notes"), // Note
  status: text("status").default("completed"), // Stato vendita
  syncedAt: timestamp("synced_at").notNull().defaultNow(), // Quando è stato sincronizzato
  lastModifiedExternal: timestamp("last_modified_external") // Ultima modifica nel DB esterno
});

// Consegne/Vendite reali dal database esterno (reports_consegna)
export const externalDeliveriesSync = pgTable("external_deliveries_sync", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").notNull().unique(), // ID nel database esterno
  dataCreazione: text("data_creazione").notNull(), // Data creazione (come testo per compatibilità)
  clienteId: integer("cliente_id"), // ID cliente nel database esterno
  ordineId: integer("ordine_id"), // ID ordine nel database esterno
  dataConsegna: text("data_consegna").notNull(), // Data consegna (come testo per compatibilità)
  stato: text("stato"), // Stato consegna
  numeroTotaleCeste: integer("numero_totale_ceste").notNull(), // Numero totale ceste
  pesoTotaleKg: decimal("peso_totale_kg", { precision: 12, scale: 3 }).notNull(), // Peso totale in kg
  totaleAnimali: integer("totale_animali").notNull(), // Totale animali
  tagliaMedia: text("taglia_media"), // Taglia media
  qrcodeUrl: text("qrcode_url"), // URL QR code
  note: text("note"), // Note
  numeroProgressivo: integer("numero_progressivo"), // Numero progressivo
  syncedAt: timestamp("synced_at").notNull().defaultNow(), // Quando è stato sincronizzato
  lastSyncAt: text("last_sync_at") // Ultima sincronizzazione (come testo per compatibilità)
});

// Dettagli consegne dal database esterno (reports_consegna_dettagli)
export const externalDeliveryDetailsSync = pgTable("external_delivery_details_sync", {
  id: serial("id").primaryKey(),
  externalId: integer("external_id").notNull().unique(), // ID nel database esterno
  reportId: integer("report_id").notNull(), // ID report nel database esterno
  misurazioneId: integer("misurazione_id"), // ID misurazione
  vascaId: integer("vasca_id").notNull(), // ID vasca
  codiceSezione: text("codice_sezione").notNull(), // Codice sezione
  numeroCeste: integer("numero_ceste").notNull(), // Numero ceste
  pesoCesteKg: decimal("peso_ceste_kg", { precision: 12, scale: 3 }).notNull(), // Peso ceste in kg
  taglia: text("taglia"), // Taglia
  animaliPerKg: decimal("animali_per_kg", { precision: 10, scale: 3 }), // Animali per kg
  percentualeGuscio: decimal("percentuale_guscio", { precision: 5, scale: 2 }), // Percentuale guscio
  percentualeMortalita: decimal("percentuale_mortalita", { precision: 5, scale: 2 }), // Percentuale mortalità
  numeroAnimali: integer("numero_animali").notNull(), // Numero animali
  note: text("note"), // Note
  syncedAt: timestamp("synced_at").notNull().defaultNow(), // Quando è stato sincronizzato
  lastSyncAt: text("last_sync_at") // Ultima sincronizzazione (come testo per compatibilità)
});

// Schema di inserimento per sync status
export const insertSyncStatusSchema = createInsertSchema(syncStatus)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema di inserimento per clienti esterni
export const insertExternalCustomerSyncSchema = createInsertSchema(externalCustomersSync)
  .omit({ id: true, syncedAt: true });

// Schema di inserimento per vendite esterne
export const insertExternalSaleSyncSchema = createInsertSchema(externalSalesSync)
  .omit({ id: true, syncedAt: true });

// Schema di inserimento per consegne esterne
export const insertExternalDeliverySyncSchema = createInsertSchema(externalDeliveriesSync)
  .omit({ id: true, syncedAt: true });

// Schema di inserimento per dettagli consegne esterne
export const insertExternalDeliveryDetailSyncSchema = createInsertSchema(externalDeliveryDetailsSync)
  .omit({ id: true, syncedAt: true });

// Tipi per sync status
export type SyncStatus = typeof syncStatus.$inferSelect;
export type InsertSyncStatus = z.infer<typeof insertSyncStatusSchema>;

// Tipi per clienti esterni
export type ExternalCustomerSync = typeof externalCustomersSync.$inferSelect;
export type InsertExternalCustomerSync = z.infer<typeof insertExternalCustomerSyncSchema>;

// Tipi per vendite esterne
export type ExternalSaleSync = typeof externalSalesSync.$inferSelect;
export type InsertExternalSaleSync = z.infer<typeof insertExternalSaleSyncSchema>;

// Tipi per consegne esterne
export type ExternalDeliverySync = typeof externalDeliveriesSync.$inferSelect;
export type InsertExternalDeliverySync = z.infer<typeof insertExternalDeliverySyncSchema>;

// Tipi per dettagli consegne esterne
export type ExternalDeliveryDetailSync = typeof externalDeliveryDetailsSync.$inferSelect;
export type InsertExternalDeliveryDetailSync = z.infer<typeof insertExternalDeliveryDetailSyncSchema>;

// ===== MODULO VENDITE AVANZATE =====

// Vendite avanzate (master)
export const advancedSales = pgTable("advanced_sales", {
  id: serial("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(), // Numero vendita progressivo
  customerId: integer("customer_id"), // Riferimento cliente (opzionale)
  customerName: text("customer_name"), // Nome cliente per vendite senza anagrafica
  customerDetails: jsonb("customer_details"), // Dati aziendali cliente
  saleDate: date("sale_date").notNull(), // Data vendita
  status: text("status").notNull().default("draft"), // draft, confirmed, completed
  totalWeight: real("total_weight"), // Peso totale vendita
  totalAnimals: integer("total_animals"), // Animali totali vendita
  totalBags: integer("total_bags"), // Numero sacchi totali
  notes: text("notes"), // Note vendita
  pdfPath: text("pdf_path"), // Percorso file PDF generato
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Sacchi per vendita
export const saleBags = pgTable("sale_bags", {
  id: serial("id").primaryKey(),
  advancedSaleId: integer("advanced_sale_id").notNull(), // Riferimento vendita
  bagNumber: integer("bag_number").notNull(), // Numero sacco progressivo
  sizeCode: text("size_code").notNull(), // Codice taglia (es. "TP-3000")
  totalWeight: real("total_weight").notNull(), // Peso totale sacco
  originalWeight: real("original_weight").notNull(), // Peso originale prima perdite
  weightLoss: real("weight_loss").default(0), // Perdita peso (max 1.5kg)
  animalCount: integer("animal_count").notNull(), // Numero animali nel sacco
  animalsPerKg: real("animals_per_kg").notNull(), // Animali per kg
  originalAnimalsPerKg: real("original_animals_per_kg").notNull(), // Originale prima ricalcolo
  wastePercentage: real("waste_percentage").default(0), // Percentuale scarto
  notes: text("notes"), // Note sacco
});

// Dettaglio allocazione animali per sacco
export const bagAllocations = pgTable("bag_allocations", {
  id: serial("id").primaryKey(),
  saleBagId: integer("sale_bag_id").notNull(), // Riferimento sacco
  sourceOperationId: integer("source_operation_id").notNull(), // Operazione vendita originale
  sourceBasketId: integer("source_basket_id").notNull(), // Cestello origine
  allocatedAnimals: integer("allocated_animals").notNull(), // Animali allocati da questa fonte
  allocatedWeight: real("allocated_weight").notNull(), // Peso allocato da questa fonte
  sourceAnimalsPerKg: real("source_animals_per_kg"), // AnimalsPerKg originale
  sourceSizeCode: text("source_size_code"), // Taglia originale
});

// Riferimenti operazioni vendita
export const saleOperationsRef = pgTable("sale_operations_ref", {
  id: serial("id").primaryKey(),
  advancedSaleId: integer("advanced_sale_id").notNull(), // Riferimento vendita avanzata
  operationId: integer("operation_id").notNull(), // Riferimento operazione vendita originale
  basketId: integer("basket_id").notNull(), // Cestello venduto
  originalAnimals: integer("original_animals"), // Animali originali
  originalWeight: real("original_weight"), // Peso originale
  originalAnimalsPerKg: real("original_animals_per_kg"), // AnimalsPerKg originale
  includedInSale: boolean("included_in_sale").default(true), // Se incluso nella vendita
});

// Schemi Zod per validazione
export const insertAdvancedSaleSchema = createInsertSchema(advancedSales)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertSaleBagSchema = createInsertSchema(saleBags)
  .omit({ id: true });

export const insertBagAllocationSchema = createInsertSchema(bagAllocations)
  .omit({ id: true });

export const insertSaleOperationsRefSchema = createInsertSchema(saleOperationsRef)
  .omit({ id: true });

// Tipi TypeScript
export type AdvancedSale = typeof advancedSales.$inferSelect;
export type InsertAdvancedSale = z.infer<typeof insertAdvancedSaleSchema>;

export type SaleBag = typeof saleBags.$inferSelect;
export type InsertSaleBag = z.infer<typeof insertSaleBagSchema>;

export type BagAllocation = typeof bagAllocations.$inferSelect;
export type InsertBagAllocation = z.infer<typeof insertBagAllocationSchema>;

export type SaleOperationsRef = typeof saleOperationsRef.$inferSelect;
export type InsertSaleOperationsRef = z.infer<typeof insertSaleOperationsRefSchema>;

// ===== INTEGRAZIONE FATTURE IN CLOUD =====

// Tabella configurazione per memorizzare le credenziali
export const configurazione = pgTable("configurazione", {
  id: serial("id").primaryKey(),
  chiave: text("chiave").notNull().unique(),
  valore: text("valore"),
  descrizione: text("descrizione"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Clienti estesi per integrazione Fatture in Cloud
export const clienti = pgTable("clienti", {
  id: serial("id").primaryKey(),
  denominazione: text("denominazione").notNull(),
  indirizzo: text("indirizzo").notNull().default("N/A"),
  comune: text("comune").notNull().default("N/A"),
  cap: text("cap").notNull().default("N/A"),
  provincia: text("provincia").notNull().default("N/A"),
  paese: text("paese").notNull().default("Italia"),
  email: text("email").notNull().default("N/A"),
  telefono: text("telefono").notNull().default("N/A"),
  piva: text("piva").notNull().default("N/A"),
  codiceFiscale: text("codice_fiscale").notNull().default("N/A"),
  fattureInCloudId: integer("fatture_in_cloud_id"), // Collegamento con Fatture in Cloud
  attivo: boolean("attivo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Tabella principale DDT
export const ddt = pgTable("ddt", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull(),
  data: date("data").notNull(),
  clienteId: integer("cliente_id").notNull(),
  totaleColli: integer("totale_colli").notNull().default(0),
  pesoTotale: decimal("peso_totale", { precision: 10, scale: 2 }).notNull().default("0"),
  note: text("note"),
  ddtStato: text("ddt_stato", { enum: ["nessuno", "locale", "inviato"] }).notNull().default("nessuno"),
  fattureInCloudId: integer("fatture_in_cloud_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Righe dettaglio DDT
export const ddtRighe = pgTable("ddt_righe", {
  id: serial("id").primaryKey(),
  ddtId: integer("ddt_id").notNull(),
  descrizione: text("descrizione").notNull(),
  quantita: decimal("quantita", { precision: 10, scale: 2 }).notNull(),
  unitaMisura: text("unita_misura").notNull().default("NR"),
  prezzoUnitario: decimal("prezzo_unitario", { precision: 10, scale: 2 }).notNull().default("0"),
  reportDettaglioId: integer("report_dettaglio_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Schema di inserimento per la configurazione
export const insertConfigurazioneSchema = createInsertSchema(configurazione)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema di inserimento per i clienti
export const insertClientiSchema = createInsertSchema(clienti)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema di inserimento per DDT
export const insertDdtSchema = createInsertSchema(ddt)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema di inserimento per righe DDT
export const insertDdtRigheSchema = createInsertSchema(ddtRighe)
  .omit({ id: true, createdAt: true });

// Tipi per Fatture in Cloud
export type Configurazione = typeof configurazione.$inferSelect;
export type InsertConfigurazione = z.infer<typeof insertConfigurazioneSchema>;

export type Cliente = typeof clienti.$inferSelect;
export type InsertCliente = z.infer<typeof insertClientiSchema>;

export type Ddt = typeof ddt.$inferSelect;
export type InsertDdt = z.infer<typeof insertDdtSchema>;

export type DdtRiga = typeof ddtRighe.$inferSelect;
export type InsertDdtRiga = z.infer<typeof insertDdtRigheSchema>;
