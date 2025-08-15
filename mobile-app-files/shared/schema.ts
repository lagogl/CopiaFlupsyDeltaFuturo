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

// FLUPSY (Floating Upweller System)
export const flupsys = pgTable("flupsys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  maxPositions: integer("max_positions").notNull().default(10),
  productionCenter: text("production_center"),
});

// Baskets (Ceste)
export const baskets = pgTable("baskets", {
  id: serial("id").primaryKey(),
  physicalNumber: integer("physical_number").notNull(),
  flupsyId: integer("flupsy_id").notNull(),
  cycleCode: text("cycle_code"),
  state: text("state").notNull().default("available"),
  currentCycleId: integer("current_cycle_id"),
  nfcData: text("nfc_data"),
  row: text("row").notNull(),
  position: integer("position").notNull(),
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

// Cycles (Cicli produttivi)
export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id").notNull(),
  lotId: integer("lot_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  state: text("state").notNull().default("active"),
});

// Operations (Operazioni)
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type", { enum: operationTypes }).notNull(),
  basketId: integer("basket_id").notNull(),
  cycleId: integer("cycle_id"),
  sizeId: integer("size_id"), // reference to the size
  sgrId: integer("sgr_id"), // reference to the SGR
  lotId: integer("lot_id"),
  animalCount: integer("animal_count"),
  totalWeight: real("total_weight"), // in grams
  animalsPerKg: integer("animals_per_kg"), // CRITICO per calcoli automatici
  averageWeight: real("average_weight"), // in milligrams, calculated: 1,000,000 / animalsPerKg
  deadCount: integer("dead_count"), // numero di animali morti
  mortalityRate: real("mortality_rate"), // percentuale di mortalità
  notes: text("notes"),
  operatorName: text("operator_name"),
  temperature: real("temperature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  metadata: text("metadata"), // metadati aggiuntivi in formato JSON
});

// Lots (Lotti)
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  arrivalDate: date("arrival_date").notNull(),
  supplier: text("supplier").notNull(),
  quantity: integer("quantity").notNull(),
  averageWeight: real("average_weight"),
  totalWeight: real("total_weight"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Size Categories (Taglie)
export const sizes = pgTable("sizes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., TP-180, TP-200, TP-315, etc.
  name: text("name").notNull(),
  sizeMm: real("size_mm"), // size in millimeters
  minAnimalsPerKg: integer("min_animals_per_kg"), // CRITICO per calcolo automatico taglia
  maxAnimalsPerKg: integer("max_animals_per_kg"), // CRITICO per calcolo automatico taglia
  notes: text("notes"),
  color: text("color"), // colore HEX per visualizzazione grafica
  active: boolean("active").notNull().default(true),
});

// Schema per inserimenti operazioni (per app mobile)
export const insertOperationSchema = createInsertSchema(operations)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    // Validazioni specifiche per app mobile operatori
    type: z.enum(["peso", "misura"]), // Solo peso e misura per operatori
    totalWeight: z.number().positive().optional(), // Peso totale in grammi
    animalCount: z.number().int().positive().optional(), // Numero animali
    animalsPerKg: z.number().int().positive().optional(), // CRITICO per calcoli automatici
    averageWeight: z.number().positive().optional(), // Calcolato automaticamente
    sizeId: z.number().int().positive().optional(), // Calcolato automaticamente
    operatorName: z.string().min(1).optional(), // Nome operatore
    notes: z.string().optional(),
  });

export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operations.$inferSelect;
export type Basket = typeof baskets.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Lot = typeof lots.$inferSelect;
export type Flupsy = typeof flupsys.$inferSelect;
export type Size = typeof sizes.$inferSelect;