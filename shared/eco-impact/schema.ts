import { pgTable, serial, text, timestamp, integer, boolean, jsonb, pgEnum, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { flupsys, operations } from "../schema";

// Tabella per le categorie di impatto ambientale
export const impactCategories = pgTable("impact_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  unit: text("unit").notNull(),
  importance: integer("importance").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertImpactCategorySchema = createInsertSchema(impactCategories).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ImpactCategory = typeof impactCategories.$inferSelect;
export type InsertImpactCategory = z.infer<typeof insertImpactCategorySchema>;

// Tabella per i fattori di impatto
export const impactFactors = pgTable("impact_factors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  value: real("value").notNull(), // Valore moltiplicatore
  applicableToOperation: boolean("applicable_to_operation").default(true),
  applicableToFlupsy: boolean("applicable_to_flupsy").default(false),
  applicableToCycle: boolean("applicable_to_cycle").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertImpactFactorSchema = createInsertSchema(impactFactors).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ImpactFactor = typeof impactFactors.$inferSelect;
export type InsertImpactFactor = z.infer<typeof insertImpactFactorSchema>;

// Tabella per gli impatti delle operazioni
export const operationImpacts = pgTable("operation_impacts", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operations.id).notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  factorId: integer("factor_id").references(() => impactFactors.id).notNull(),
  value: real("value").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertOperationImpactSchema = createInsertSchema(operationImpacts).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type OperationImpact = typeof operationImpacts.$inferSelect;
export type InsertOperationImpact = z.infer<typeof insertOperationImpactSchema>;

// Tabella per gli impatti ambientali dei FLUPSY
export const flupsyImpacts = pgTable("flupsy_impacts", {
  id: serial("id").primaryKey(),
  flupsyId: integer("flupsy_id").references(() => flupsys.id).notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  factorId: integer("factor_id").references(() => impactFactors.id).notNull(),
  value: real("value").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertFlupsyImpactSchema = createInsertSchema(flupsyImpacts).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type FlupsyImpact = typeof flupsyImpacts.$inferSelect;
export type InsertFlupsyImpact = z.infer<typeof insertFlupsyImpactSchema>;

// Tabella per gli impatti ambientali dei cicli produttivi
export const cycleImpacts = pgTable("cycle_impacts", {
  id: serial("id").primaryKey(),
  cycleId: integer("cycle_id").notNull(),
  categoryId: integer("category_id").references(() => impactCategories.id).notNull(),
  factorId: integer("factor_id").references(() => impactFactors.id).notNull(),
  value: real("value").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertCycleImpactSchema = createInsertSchema(cycleImpacts).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type CycleImpact = typeof cycleImpacts.$inferSelect;
export type InsertCycleImpact = z.infer<typeof insertCycleImpactSchema>;

// Enum per lo stato degli obiettivi di sostenibilità
export const goalStatusEnum = pgEnum('goal_status', ['planned', 'in-progress', 'completed', 'cancelled']);

// Tabella per gli obiettivi di sostenibilità
export const sustainabilityGoals = pgTable("sustainability_goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  flupsyId: integer("flupsy_id").references(() => flupsys.id),
  categoryId: integer("category_id").references(() => impactCategories.id),
  targetValue: real("target_value"),
  currentValue: real("current_value"),
  unit: text("unit"),
  status: goalStatusEnum("status").default('planned').notNull(),
  targetDate: date("target_date").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertSustainabilityGoalSchema = createInsertSchema(sustainabilityGoals).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type SustainabilityGoal = typeof sustainabilityGoals.$inferSelect;
export type InsertSustainabilityGoal = z.infer<typeof insertSustainabilityGoalSchema>;

// Tabella per i report di sostenibilità
export const sustainabilityReports = pgTable("sustainability_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  reportPeriod: text("report_period").notNull(),
  summary: text("summary"),
  highlights: jsonb("highlights"),
  metrics: jsonb("metrics"),
  flupsyIds: integer("flupsy_ids").array(),
  filePath: text("file_path"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const insertSustainabilityReportSchema = createInsertSchema(sustainabilityReports).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type SustainabilityReport = typeof sustainabilityReports.$inferSelect;
export type InsertSustainabilityReport = z.infer<typeof insertSustainabilityReportSchema>;