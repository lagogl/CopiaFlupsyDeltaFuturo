import { pgTable, text, serial, integer, boolean, timestamp, real, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  arrivalDate: z.coerce.date()
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
