import { pgTable, serial, text, integer, date, json, timestamp, boolean, real, uuid, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { baskets, cycles, flupsys, lots, operations } from "../schema";

// Definizione delle categorie di impatto ambientale
export const impactCategories = pgTable("impact_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  unit: text("unit").notNull(), // es: kgCO2e, L, kWh
  importance: integer("importance").default(1), // Peso relativo della categoria
  icon: text("icon"), // Nome dell'icona Lucide
  color: text("color").default("#4CAF50"), // Colore per i grafici
});

// Schema per l'inserimento di nuove categorie
export const insertImpactCategorySchema = createInsertSchema(impactCategories).omit({ 
  id: true 
});

// Tipo per categoria di impatto
export type ImpactCategory = typeof impactCategories.$inferSelect;
export type InsertImpactCategory = z.infer<typeof insertImpactCategorySchema>;

// Definizione dei fattori di impatto standard
export const impactFactors = pgTable("impact_factors", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  value: real("value").notNull(), // Valore numerico del fattore
  unit: text("unit").notNull(), // Unità del valore (es: kg, L, kWh)
  perUnit: text("per_unit").notNull(), // Unità per cui si applica (es: per kg di prodotto)
  source: text("source"), // Fonte del fattore (es: pubblicazione scientifica)
  date: date("date").notNull(), // Data di aggiornamento
  applicableToOperation: boolean("applicable_to_operation").default(true),
  applicableToCycle: boolean("applicable_to_cycle").default(true),
  applicableToFlupsy: boolean("applicable_to_flupsy").default(true),
});

// Schema per l'inserimento di nuovi fattori
export const insertImpactFactorSchema = createInsertSchema(impactFactors).omit({ 
  id: true 
});

// Tipo per fattore di impatto
export type ImpactFactor = typeof impactFactors.$inferSelect;
export type InsertImpactFactor = z.infer<typeof insertImpactFactorSchema>;

// Tabella per i punteggi di impatto ambientale per operazione
export const operationImpacts = pgTable("operation_impacts", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  factorId: integer("factor_id").references(() => impactFactors.id).notNull(),
  value: real("value").notNull(), // Valore calcolato dell'impatto
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: json("metadata"), // Dati aggiuntivi sul calcolo
});

// Schema per l'inserimento di nuovi impatti operazione
export const insertOperationImpactSchema = createInsertSchema(operationImpacts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Tipo per impatto ambientale operazione
export type OperationImpact = typeof operationImpacts.$inferSelect;
export type InsertOperationImpact = z.infer<typeof insertOperationImpactSchema>;

// Tabella per i punteggi di impatto ambientale per FLUPSY
export const flupsyImpacts = pgTable("flupsy_impacts", {
  id: serial("id").primaryKey(),
  flupsyId: integer("flupsy_id").references(() => flupsys.id).notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  value: real("value").notNull(), // Valore calcolato dell'impatto
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: json("metadata"), // Dati aggiuntivi sul calcolo
});

// Schema per l'inserimento di nuovi impatti FLUPSY
export const insertFlupsyImpactSchema = createInsertSchema(flupsyImpacts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Tipo per impatto ambientale FLUPSY
export type FlupsyImpact = typeof flupsyImpacts.$inferSelect;
export type InsertFlupsyImpact = z.infer<typeof insertFlupsyImpactSchema>;

// Tabella per i punteggi di impatto ambientale per ciclo produttivo
export const cycleImpacts = pgTable("cycle_impacts", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").references(() => cycles.id).notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  value: real("value").notNull(), // Valore calcolato dell'impatto
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: json("metadata"), // Dati aggiuntivi sul calcolo
});

// Schema per l'inserimento di nuovi impatti ciclo
export const insertCycleImpactSchema = createInsertSchema(cycleImpacts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Tipo per impatto ambientale ciclo
export type CycleImpact = typeof cycleImpacts.$inferSelect;
export type InsertCycleImpact = z.infer<typeof insertCycleImpactSchema>;

// Tabella per obiettivi di sostenibilità e miglioramenti
export const sustainabilityGoals = pgTable("sustainability_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  targetValue: real("target_value").notNull(), // Valore obiettivo
  currentValue: real("current_value").notNull(), // Valore attuale
  startDate: date("start_date").notNull(),
  targetDate: date("target_date").notNull(),
  completed: boolean("completed").default(false),
  progress: real("progress").default(0), // Percentuale completamento
  flupsyId: integer("flupsy_id").references(() => flupsys.id), // Opzionale, se specifico per FLUPSY
  cycleId: integer("cycle_id").references(() => cycles.id), // Opzionale, se specifico per ciclo
});

// Schema per l'inserimento di nuovi obiettivi
export const insertSustainabilityGoalSchema = createInsertSchema(sustainabilityGoals).omit({ 
  id: true 
});

// Tipo per obiettivo di sostenibilità
export type SustainabilityGoal = typeof sustainabilityGoals.$inferSelect;
export type InsertSustainabilityGoal = z.infer<typeof insertSustainabilityGoalSchema>;

// Tabella per report di sostenibilità
export const sustainabilityReports = pgTable("sustainability_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reportUuid: uuid("report_uuid").defaultRandom().notNull().unique(),
  reportData: json("report_data").notNull(), // Dati calcolati per il report
  published: boolean("published").default(false),
});

// Schema per l'inserimento di nuovi report
export const insertSustainabilityReportSchema = createInsertSchema(sustainabilityReports).omit({ 
  id: true, 
  createdAt: true, 
  reportUuid: true 
});

// Tipo per report di sostenibilità
export type SustainabilityReport = typeof sustainabilityReports.$inferSelect;
export type InsertSustainabilityReport = z.infer<typeof insertSustainabilityReportSchema>;