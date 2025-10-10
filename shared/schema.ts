import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: text("owner_type").notNull().default("individual"), // individual, corporate
  // Individual fields
  name: text("name").notNull(), // Individual name or fallback name
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  // Corporate-specific fields
  companyName: text("company_name"), // Required for corporate
  contactPerson: text("contact_person"), // Required for corporate
  companyRegistrationNumber: text("company_registration_number"), // Required for corporate
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  vin: varchar("vin", { length: 17 }), // Vehicle Identification Number (unique constraint can be added later)
  currentOdometer: integer("current_odometer"), // Current odometer reading in miles/km
  fuelType: text("fuel_type"), // gasoline, diesel, electric, hybrid, etc.
  transmissionType: text("transmission_type"), // automatic, manual, cvt
  category: text("category"), // sedan, suv, truck, van, etc.
  passengerCapacity: integer("passenger_capacity"), // Number of passengers
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

export const vehicleAttendance = pgTable("vehicle_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  attendanceDate: date("attendance_date").notNull(),
  status: text("status").notNull().default("present"), // present, off, standby, maintenance
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ownershipHistory = pgTable("ownership_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null means current owner
  transferReason: text("transfer_reason"), // sale, lease_transfer, internal_transfer, etc.
  transferPrice: decimal("transfer_price", { precision: 10, scale: 2 }), // optional purchase/sale price
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const ownersRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
  ownershipHistory: many(ownershipHistory),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id],
  }),
  assignments: many(assignments),
  maintenanceRecords: many(maintenanceRecords),
  ownershipHistory: many(ownershipHistory),
  vehicleAttendance: many(vehicleAttendance),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  assignments: many(assignments),
  vehicleAttendance: many(vehicleAttendance),
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

export const vehicleAttendanceRelations = relations(vehicleAttendance, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleAttendance.vehicleId],
    references: [vehicles.id],
  }),
  project: one(projects, {
    fields: [vehicleAttendance.projectId],
    references: [projects.id],
  }),
}));

export const ownershipHistoryRelations = relations(ownershipHistory, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [ownershipHistory.vehicleId],
    references: [vehicles.id],
  }),
  owner: one(owners, {
    fields: [ownershipHistory.ownerId],
    references: [owners.id],
  }),
}));

// Insert schemas
export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
}).extend({
  ownerType: z.enum(["individual", "corporate"]).default("individual"),
  // Corporate fields are optional for individual owners
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
}).refine(
  (data) => {
    // If owner type is corporate, require corporate fields
    if (data.ownerType === "corporate") {
      return data.companyName && data.contactPerson && data.companyRegistrationNumber;
    }
    return true;
  },
  {
    message: "Company name, contact person, and registration number are required for corporate owners",
    path: ["companyName"],
  }
);

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
}).extend({
  vin: z.preprocess(val => val === "" ? undefined : val, z.string().length(17, "VIN must be exactly 17 characters").optional()),
  currentOdometer: z.number().min(0, "Odometer reading must be positive").optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "plug_in_hybrid", "natural_gas"]).optional(),
  transmissionType: z.enum(["automatic", "manual", "cvt", "dual_clutch"]).optional(),
  category: z.enum(["sedan", "suv", "truck", "van", "pickup", "coupe", "convertible", "wagon", "hatchback"]).optional(),
  passengerCapacity: z.number().min(1).max(50, "Passenger capacity must be between 1 and 50").optional(),
  year: z.number().min(1900, "Year must be 1900 or later").max(new Date().getFullYear() + 1, "Year cannot be in the future"),
});

// Schema specifically for creating new vehicles - defaults to available
export const createVehicleSchema = insertVehicleSchema.extend({
  status: z.enum(["available"]).default("available").optional(),
});

// Schema for updating vehicles - explicitly excludes ownerId to prevent bypassing transfer system
export const updateVehicleSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1900, "Year must be 1900 or later").max(new Date().getFullYear() + 1, "Year cannot be in the future").optional(),
  licensePlate: z.string().optional(),
  vin: z.preprocess(val => val === "" ? undefined : val, z.string().length(17, "VIN must be exactly 17 characters").optional()).optional(),
  currentOdometer: z.number().min(0, "Odometer reading must be positive").optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "plug_in_hybrid", "natural_gas"]).optional(),
  transmissionType: z.enum(["automatic", "manual", "cvt", "dual_clutch"]).optional(),
  category: z.enum(["sedan", "suv", "truck", "van", "pickup", "coupe", "convertible", "wagon", "hatchback"]).optional(),
  passengerCapacity: z.number().min(1).max(50, "Passenger capacity must be between 1 and 50").optional(),
  status: z.enum(["available", "assigned", "maintenance", "out_of_service"]).optional(),
}).strict(); // strict() prevents unknown fields including ownerId

// Schema for vehicle ownership transfer validation
export const transferVehicleOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, "New owner ID is required"),
  transferReason: z.string().optional(),
  transferPrice: z.preprocess(
    (val) => val === "" ? undefined : val,
    z.string().optional().refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Transfer price must be a valid positive number"
    )
  ),
  notes: z.string().optional(),
});

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

export const insertOwnershipHistorySchema = createInsertSchema(ownershipHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  endDate: z.string().optional().transform(val => val === "" ? null : val), // Make endDate truly optional
  transferPrice: z.string().optional().refine(
    (val) => !val || parseFloat(val) >= 0,
    "Transfer price must be positive"
  ),
});

export const insertVehicleAttendanceSchema = createInsertSchema(vehicleAttendance).omit({
  id: true,
  createdAt: true,
}).extend({
  attendanceDate: z.string().transform((val) => val), // accept ISO date strings
  status: z.enum(["present", "off", "standby", "maintenance"]).default("present"),
  notes: z.string().optional(),
  projectId: z.string().optional().transform(val => val === "" ? null : val),
});

export const deleteVehicleAttendanceSchema = z.object({
  vehicleId: z.string(),
  attendanceDate: z.string(),
  projectId: z.string().nullable().optional(),
});

export const createVehiclePaymentForPeriodSchema = z.object({
  assignmentId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dueDate: z.string(),
  status: z.enum(["pending", "paid", "overdue"]).default("pending").optional(),
  paidDate: z
    .string()
    .optional()
    .transform((val) => (val === "" || val === undefined ? null : val)),
  invoiceNumber: z.string().optional().transform((val) => (val === "" ? undefined : val)),
});

// Update schemas
export const updateOwnerSchema = z.object({
  ownerType: z.enum(["individual", "corporate"]).optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
}).refine(
  (data) => {
    // If owner type is corporate, require corporate fields
    if (data.ownerType === "corporate") {
      return data.companyName && data.contactPerson && data.companyRegistrationNumber;
    }
    return true;
  },
  {
    message: "Company name, contact person, and registration number are required for corporate owners",
    path: ["companyName"],
  }
);

export const updateOwnershipHistorySchema = insertOwnershipHistorySchema.partial();

// Types
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type UpdateOwner = z.infer<typeof updateOwnerSchema>;

export type OwnershipHistory = typeof ownershipHistory.$inferSelect;
export type InsertOwnershipHistory = z.infer<typeof insertOwnershipHistorySchema>;
export type UpdateOwnershipHistory = z.infer<typeof updateOwnershipHistorySchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type TransferVehicleOwnership = z.infer<typeof transferVehicleOwnershipSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;

export type VehicleAttendance = typeof vehicleAttendance.$inferSelect;
export type InsertVehicleAttendance = z.infer<typeof insertVehicleAttendanceSchema>;
export type DeleteVehicleAttendance = z.infer<typeof deleteVehicleAttendanceSchema>;
export type CreateVehiclePaymentForPeriod = z.infer<typeof createVehiclePaymentForPeriodSchema>;

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

export type VehiclePaymentCalculation = {
  assignmentId: string;
  vehicleId: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  presentDays: number;
  monthlyRate: number;
  dailyRate: number;
  baseAmount: number;
  maintenanceCost: number;
  netAmount: number;
};

export type VehiclePaymentForPeriodResult = {
  payment: PaymentWithDetails;
  calculation: VehiclePaymentCalculation;
};

export type MaintenanceRecordWithVehicle = MaintenanceRecord & {
  vehicle: VehicleWithOwner;
};

export type VehicleAttendanceWithVehicle = VehicleAttendance & {
  vehicle: VehicleWithOwner;
  project?: Project | null;
};

export type VehicleAttendanceSummary = {
  projectId: string | null;
  projectName: string | null;
  totalDays: number;
  statusCounts: Record<string, number>;
  firstAttendanceDate: string | null;
  lastAttendanceDate: string | null;
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
