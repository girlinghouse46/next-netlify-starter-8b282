import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const journeys = pgTable("journeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  selectedPath: text("selected_path"), // 'wonder' | 'reflection' | null
  currentScreen: text("current_screen").notNull().default('landing'), // 'landing' | 'journey' | 'branch' | 'climactic'
  completedAt: timestamp("completed_at"),
  constellationData: json("constellation_data"), // Store constellation points and connections
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertJourneySchema = createInsertSchema(journeys).pick({
  sessionId: true,
  selectedPath: true,
  currentScreen: true,
  completedAt: true,
  constellationData: true,
}).extend({
  completedAt: z.string().optional().nullable(),
});

export const updateJourneySchema = insertJourneySchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertJourney = z.infer<typeof insertJourneySchema>;
export type UpdateJourney = z.infer<typeof updateJourneySchema>;
export type Journey = typeof journeys.$inferSelect;
