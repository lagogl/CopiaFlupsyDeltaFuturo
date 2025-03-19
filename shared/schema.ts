import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  "selezione-vendita"
] as const;

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
});

// SGR (Indici di Crescita)
export const sgr = pgTable("sgr", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(), // e.g., January, February...
  percentage: real("percentage").notNull(), // e.g., 0.5%
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

export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;

export type BasketPositionHistory = typeof basketPositionHistory.$inferSelect;
export type InsertBasketPositionHistory = z.infer<typeof insertBasketPositionHistorySchema>;

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
