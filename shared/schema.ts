import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  status: text("status").notNull().default("available"), // available, assigned, maintenance, out_of_service
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"), // active, completed, on_hold
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: text("status").notNull().default("pending"), // pending, paid, overdue
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // scheduled, repair, inspection, service
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  performedBy: text("performed_by").notNull(),
  serviceDate: date("service_date").notNull(),
  nextServiceDate: date("next_service_date"),
  mileage: integer("mileage"),
  status: text("status").notNull().default("completed"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const ownersRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id],
  }),
  assignments: many(assignments),
  maintenanceRecords: many(maintenanceRecords),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [assignments.vehicleId],
    references: [vehicles.id],
  }),
  project: one(projects, {
    fields: [assignments.projectId],
    references: [projects.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  assignment: one(assignments, {
    fields: [payments.assignmentId],
    references: [assignments.id],
  }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [maintenanceRecords.vehicleId],
    references: [vehicles.id],
  }),
}));

// Insert schemas
export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});

// Schema specifically for creating new vehicles - defaults to available
export const createVehicleSchema = insertVehicleSchema.extend({
  status: z.enum(["available"]).default("available").optional(),
});

// Schema for updating vehicles - allows all statuses
export const updateVehicleSchema = insertVehicleSchema.partial();

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  endDate: z.string().optional().transform(val => val === "" ? null : val), // Make endDate truly optional
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
}).extend({
  endDate: z.string().optional().transform(val => val === "" ? null : val), // Make endDate truly optional
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  paidDate: z.string().optional().transform(val => val === "" ? null : val), // Make paidDate truly optional
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  nextServiceDate: z.string().optional().transform(val => val === "" ? null : val), // Make nextServiceDate truly optional
  mileage: z.number().optional(), // Make mileage truly optional
});

// Types
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;

// Extended types for frontend use
export type VehicleWithOwner = Vehicle & {
  owner: Owner;
};

export type AssignmentWithDetails = Assignment & {
  vehicle: VehicleWithOwner;
  project: Project;
};

export type PaymentWithDetails = Payment & {
  assignment: AssignmentWithDetails;
};

export type MaintenanceRecordWithVehicle = MaintenanceRecord & {
  vehicle: VehicleWithOwner;
};

// Dashboard stats type
export type DashboardStats = {
  totalVehicles: number;
  activeProjects: number;
  outstandingAmount: number;
  monthlyRevenue: number;
  vehicleStatusCounts: {
    available: number;
    assigned: number;
    maintenance: number;
    outOfService: number;
  };
};
