var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminResetPasswordSchema: () => adminResetPasswordSchema,
  assignments: () => assignments,
  assignmentsRelations: () => assignmentsRelations,
  changePasswordSchema: () => changePasswordSchema,
  createCustomerInvoicePaymentSchema: () => createCustomerInvoicePaymentSchema,
  createCustomerInvoiceSchema: () => createCustomerInvoiceSchema,
  createPaymentRequestSchema: () => createPaymentRequestSchema,
  createPaymentTransactionSchema: () => createPaymentTransactionSchema,
  createUserSchema: () => createUserSchema,
  createVehiclePaymentForPeriodSchema: () => createVehiclePaymentForPeriodSchema,
  createVehicleSchema: () => createVehicleSchema,
  customerInvoiceItems: () => customerInvoiceItems,
  customerInvoiceItemsRelations: () => customerInvoiceItemsRelations,
  customerInvoicePayments: () => customerInvoicePayments,
  customerInvoices: () => customerInvoices,
  customerInvoicesRelations: () => customerInvoicesRelations,
  customers: () => customers,
  customersRelations: () => customersRelations,
  deleteVehicleAttendanceSchema: () => deleteVehicleAttendanceSchema,
  employeeAccessAreas: () => employeeAccessAreas,
  employeeAccessEnum: () => employeeAccessEnum,
  employeeProjects: () => employeeProjects,
  employeeProjectsRelations: () => employeeProjectsRelations,
  insertAssignmentSchema: () => insertAssignmentSchema,
  insertCustomerInvoicePaymentSchema: () => insertCustomerInvoicePaymentSchema,
  insertCustomerInvoiceSchema: () => insertCustomerInvoiceSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertMaintenanceRecordSchema: () => insertMaintenanceRecordSchema,
  insertOwnerSchema: () => insertOwnerSchema,
  insertOwnershipHistorySchema: () => insertOwnershipHistorySchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPaymentTransactionSchema: () => insertPaymentTransactionSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertProjectVehicleCustomerRateSchema: () => insertProjectVehicleCustomerRateSchema,
  insertUserSchema: () => insertUserSchema,
  insertVehicleAttendanceSchema: () => insertVehicleAttendanceSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  loginSchema: () => loginSchema,
  maintenanceRecords: () => maintenanceRecords,
  maintenanceRecordsRelations: () => maintenanceRecordsRelations,
  owners: () => owners,
  ownersRelations: () => ownersRelations,
  ownershipHistory: () => ownershipHistory,
  ownershipHistoryRelations: () => ownershipHistoryRelations,
  paymentTransactions: () => paymentTransactions,
  paymentTransactionsRelations: () => paymentTransactionsRelations,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  projectVehicleCustomerRateRelations: () => projectVehicleCustomerRateRelations,
  projectVehicleCustomerRates: () => projectVehicleCustomerRates,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  transferVehicleOwnershipSchema: () => transferVehicleOwnershipSchema,
  updateCustomerInvoiceStatusSchema: () => updateCustomerInvoiceStatusSchema,
  updateCustomerSchema: () => updateCustomerSchema,
  updateOwnerSchema: () => updateOwnerSchema,
  updateOwnershipHistorySchema: () => updateOwnershipHistorySchema,
  updateUserSchema: () => updateUserSchema,
  updateVehicleSchema: () => updateVehicleSchema,
  users: () => users,
  usersRelations: () => usersRelations,
  vehicleAttendance: () => vehicleAttendance,
  vehicleAttendanceRelations: () => vehicleAttendanceRelations,
  vehicleTransferPendingPaymentError: () => vehicleTransferPendingPaymentError,
  vehicles: () => vehicles,
  vehiclesRelations: () => vehiclesRelations
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  decimal,
  date,
  timestamp,
  integer,
  boolean,
  primaryKey,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var owners = pgTable("owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: text("owner_type").notNull().default("individual"),
  // individual, corporate
  // Individual fields
  name: text("name").notNull(),
  // Individual name or fallback name
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  // Corporate-specific fields
  companyName: text("company_name"),
  // Required for corporate
  contactPerson: text("contact_person"),
  // Required for corporate
  companyRegistrationNumber: text("company_registration_number"),
  // Required for corporate
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  taxNumber: text("tax_number"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => owners.id, { onDelete: "set null" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  employeeAccess: text("employee_access").array().notNull().$type().default(sql`ARRAY[]::text[]`),
  employeeManageAccess: text("employee_manage_access").array().notNull().$type().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var employeeProjects = pgTable(
  "employee_projects",
  {
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.projectId] })
  })
);
var vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  vin: varchar("vin", { length: 17 }),
  // Vehicle Identification Number (unique constraint can be added later)
  currentOdometer: integer("current_odometer"),
  // Current odometer reading in miles/km
  fuelType: text("fuel_type"),
  // gasoline, diesel, electric, hybrid, etc.
  transmissionType: text("transmission_type"),
  // automatic, manual, cvt
  category: text("category"),
  // sedan, suv, truck, van, etc.
  passengerCapacity: integer("passenger_capacity"),
  // Number of passengers
  status: text("status").notNull().default("available"),
  // available, assigned, maintenance, out_of_service
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  // active, completed, on_hold
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projectVehicleCustomerRates = pgTable(
  "project_vehicle_customer_rates",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    projectVehicleCustomerRateUnique: uniqueIndex(
      "project_vehicle_customer_rates_project_id_vehicle_id_key"
    ).on(table.projectId, table.vehicleId)
  })
);
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  attendanceTotal: decimal("attendance_total", { precision: 10, scale: 2 }).notNull().default("0"),
  deductionTotal: decimal("deduction_total", { precision: 10, scale: 2 }).notNull().default("0"),
  totalDays: integer("total_days").notNull().default(0),
  maintenanceCount: integer("maintenance_count").notNull().default(0),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: text("status").notNull().default("pending"),
  // pending, paid, overdue
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var customerInvoices = pgTable(
  "customer_invoices",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
    adjustment: decimal("adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
    salesTaxRate: decimal("sales_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    salesTaxAmount: decimal("sales_tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    invoiceNumber: text("invoice_number"),
    status: text("status").notNull().default("pending"),
    dueDate: date("due_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    customerInvoicePeriodUnique: uniqueIndex("customer_invoices_project_period_key").on(
      table.projectId,
      table.periodStart,
      table.periodEnd
    ),
    customerInvoiceNumberUnique: uniqueIndex("customer_invoices_invoice_number_key").on(
      table.invoiceNumber
    )
  })
);
var customerInvoiceItems = pgTable("customer_invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => customerInvoices.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  monthLabel: text("month_label"),
  presentDays: integer("present_days").notNull().default(0),
  projectRate: decimal("project_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  vehicleMob: decimal("vehicle_mob", { precision: 10, scale: 2 }).notNull().default("0"),
  vehicleDimob: decimal("vehicle_dimob", { precision: 10, scale: 2 }).notNull().default("0"),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  salesTaxRate: decimal("sales_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  salesTaxAmount: decimal("sales_tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var customerInvoicePayments = pgTable("customer_invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => customerInvoices.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  transactionDate: date("transaction_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  transactionDate: date("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // scheduled, repair, inspection, service, bill_payment, advance, fuel, driver_salary
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  performedBy: text("performed_by").notNull(),
  serviceDate: date("service_date").notNull(),
  nextServiceDate: date("next_service_date"),
  mileage: integer("mileage"),
  status: text("status").notNull().default("completed"),
  // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var vehicleAttendance = pgTable("vehicle_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  attendanceDate: date("attendance_date").notNull(),
  status: text("status").notNull().default("present"),
  // present, off, standby, maintenance
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var ownershipHistory = pgTable("ownership_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  // null means current owner
  transferReason: text("transfer_reason"),
  // sale, lease_transfer, internal_transfer, etc.
  transferPrice: decimal("transfer_price", { precision: 10, scale: 2 }),
  // optional purchase/sale price
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var ownersRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
  ownershipHistory: many(ownershipHistory)
}));
var customersRelations = relations(customers, ({ many }) => ({
  projects: many(projects)
}));
var usersRelations = relations(users, ({ one }) => ({
  owner: one(owners, {
    fields: [users.ownerId],
    references: [owners.id]
  })
}));
var employeeProjectsRelations = relations(employeeProjects, ({ one }) => ({
  user: one(users, {
    fields: [employeeProjects.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [employeeProjects.projectId],
    references: [projects.id]
  })
}));
var vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id]
  }),
  assignments: many(assignments),
  customerRates: many(projectVehicleCustomerRates),
  maintenanceRecords: many(maintenanceRecords),
  ownershipHistory: many(ownershipHistory),
  vehicleAttendance: many(vehicleAttendance)
}));
var projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id]
  }),
  assignments: many(assignments),
  customerRates: many(projectVehicleCustomerRates),
  vehicleAttendance: many(vehicleAttendance)
}));
var customerInvoicesRelations = relations(customerInvoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerInvoices.customerId],
    references: [customers.id]
  }),
  project: one(projects, {
    fields: [customerInvoices.projectId],
    references: [projects.id]
  }),
  items: many(customerInvoiceItems)
}));
var customerInvoiceItemsRelations = relations(customerInvoiceItems, ({ one }) => ({
  invoice: one(customerInvoices, {
    fields: [customerInvoiceItems.invoiceId],
    references: [customerInvoices.id]
  }),
  vehicle: one(vehicles, {
    fields: [customerInvoiceItems.vehicleId],
    references: [vehicles.id]
  })
}));
var assignmentsRelations = relations(assignments, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [assignments.vehicleId],
    references: [vehicles.id]
  }),
  project: one(projects, {
    fields: [assignments.projectId],
    references: [projects.id]
  }),
  payments: many(payments)
}));
var projectVehicleCustomerRateRelations = relations(
  projectVehicleCustomerRates,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [projectVehicleCustomerRates.vehicleId],
      references: [vehicles.id]
    }),
    project: one(projects, {
      fields: [projectVehicleCustomerRates.projectId],
      references: [projects.id]
    }),
    customer: one(customers, {
      fields: [projectVehicleCustomerRates.customerId],
      references: [customers.id]
    })
  })
);
var paymentsRelations = relations(payments, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [payments.assignmentId],
    references: [assignments.id]
  }),
  paymentOwner: one(owners, {
    fields: [payments.ownerId],
    references: [owners.id]
  }),
  transactions: many(paymentTransactions)
}));
var paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id]
  })
}));
var maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [maintenanceRecords.vehicleId],
    references: [vehicles.id]
  })
}));
var vehicleAttendanceRelations = relations(vehicleAttendance, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleAttendance.vehicleId],
    references: [vehicles.id]
  }),
  project: one(projects, {
    fields: [vehicleAttendance.projectId],
    references: [projects.id]
  })
}));
var employeeAccessAreas = [
  "owners",
  "vehicles",
  "projects",
  "assignments",
  "attendance",
  "projectAttendance",
  "maintenance",
  "payments"
];
var employeeAccessEnum = z.enum(employeeAccessAreas);
var insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  role: z.enum(["admin", "owner", "employee"])
}).extend({
  employeeAccess: z.array(employeeAccessEnum).default([]),
  employeeManageAccess: z.array(employeeAccessEnum).default([]),
  employeeProjectIds: z.array(z.string().uuid()).default([])
});
var createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["admin", "owner", "employee"]),
  ownerId: z.string().uuid().optional().nullable(),
  employeeAccess: z.array(employeeAccessEnum).optional().default([]),
  employeeManageAccess: z.array(employeeAccessEnum).optional().default([]),
  employeeProjectIds: z.array(z.string().uuid()).optional().default([])
}).superRefine((data, ctx) => {
  if (data.role === "owner" && !data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownerId"],
      message: "Owner is required when creating an owner account"
    });
  }
  if (data.role === "admin" && data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownerId"],
      message: "Admin accounts cannot be linked to an owner"
    });
  }
  if (data.role === "employee" && data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ownerId"],
      message: "Employee accounts cannot be linked to an owner"
    });
  }
  if (data.role !== "employee" && data.employeeAccess && data.employeeAccess.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["employeeAccess"],
      message: "Only employee accounts can have employee access configured"
    });
  }
  if (data.role !== "employee" && data.employeeManageAccess && data.employeeManageAccess.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["employeeManageAccess"],
      message: "Only employee accounts can have employee access configured"
    });
  }
  if (data.role !== "employee" && data.employeeProjectIds && data.employeeProjectIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["employeeProjectIds"],
      message: "Only employee accounts can have project assignments configured"
    });
  }
  if (data.employeeManageAccess && data.employeeAccess) {
    const missingBaseAccess = data.employeeManageAccess.filter(
      (area) => !data.employeeAccess?.includes(area)
    );
    if (missingBaseAccess.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeManageAccess"],
        message: "Manage access requires view access for the same area"
      });
    }
  }
});
var updateUserSchema = z.object({
  ownerId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  employeeAccess: z.array(employeeAccessEnum).optional(),
  employeeManageAccess: z.array(employeeAccessEnum).optional(),
  employeeProjectIds: z.array(z.string().uuid()).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided"
});
var changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Confirm password is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
  confirmPassword: z.string().min(8, "Confirm password is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required")
});
var ownershipHistoryRelations = relations(ownershipHistory, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [ownershipHistory.vehicleId],
    references: [vehicles.id]
  }),
  owner: one(owners, {
    fields: [ownershipHistory.ownerId],
    references: [owners.id]
  })
}));
var insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true
}).extend({
  ownerType: z.enum(["individual", "corporate"]).default("individual"),
  // Corporate fields are optional for individual owners
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  companyRegistrationNumber: z.string().optional()
}).refine(
  (data) => {
    if (data.ownerType === "corporate") {
      return data.companyName && data.contactPerson && data.companyRegistrationNumber;
    }
    return true;
  },
  {
    message: "Company name, contact person, and registration number are required for corporate owners",
    path: ["companyName"]
  }
);
var insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true
});
var insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true
}).extend({
  vin: z.preprocess((val) => val === "" ? void 0 : val, z.string().length(17, "VIN must be exactly 17 characters").optional()),
  currentOdometer: z.number().min(0, "Odometer reading must be positive").optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "plug_in_hybrid", "natural_gas"]).optional(),
  transmissionType: z.enum(["automatic", "manual", "cvt", "dual_clutch"]).optional(),
  category: z.enum(["sedan", "suv", "truck", "van", "pickup", "coupe", "convertible", "wagon", "hatchback"]).optional(),
  passengerCapacity: z.number().min(1).max(50, "Passenger capacity must be between 1 and 50").optional(),
  year: z.number().min(1900, "Year must be 1900 or later").max((/* @__PURE__ */ new Date()).getFullYear() + 1, "Year cannot be in the future")
});
var createVehicleSchema = insertVehicleSchema.extend({
  status: z.enum(["available"]).default("available").optional()
});
var updateVehicleSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1900, "Year must be 1900 or later").max((/* @__PURE__ */ new Date()).getFullYear() + 1, "Year cannot be in the future").optional(),
  licensePlate: z.string().optional(),
  vin: z.preprocess((val) => val === "" ? void 0 : val, z.string().length(17, "VIN must be exactly 17 characters").optional()).optional(),
  currentOdometer: z.number().min(0, "Odometer reading must be positive").optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "plug_in_hybrid", "natural_gas"]).optional(),
  transmissionType: z.enum(["automatic", "manual", "cvt", "dual_clutch"]).optional(),
  category: z.enum(["sedan", "suv", "truck", "van", "pickup", "coupe", "convertible", "wagon", "hatchback"]).optional(),
  passengerCapacity: z.number().min(1).max(50, "Passenger capacity must be between 1 and 50").optional(),
  status: z.enum(["available", "assigned", "maintenance", "out_of_service"]).optional()
}).strict();
var transferVehicleOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, "New owner ID is required"),
  transferDate: z.string().min(1, "Transfer date is required").refine(
    (val) => !Number.isNaN(Date.parse(val)),
    "Transfer date must be a valid date"
  ),
  transferReason: z.string().optional(),
  transferPrice: z.preprocess(
    (val) => val === "" ? void 0 : val,
    z.string().optional().refine(
      (val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Transfer price must be a valid positive number"
    )
  ),
  notes: z.string().optional()
});
var vehicleTransferPendingPaymentError = "Pending attendance payments exist before the ownership transfer date. Please calculate and create the payment for the previous owner before transferring ownership.";
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true
}).extend({
  customerId: z.string().uuid({ message: "Customer is required" }),
  endDate: z.string().optional().transform((val) => val === "" ? null : val)
  // Make endDate truly optional
});
var insertAssignmentSchema = createInsertSchema(assignments, {
  monthlyRate: z.string({ required_error: "Monthly rate is required" }).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Monthly rate must be a valid non-negative number"
  )
}).omit({
  id: true,
  createdAt: true
}).extend({
  endDate: z.string().optional().transform((val) => val === "" ? null : val)
  // Make endDate truly optional
});
var insertProjectVehicleCustomerRateSchema = createInsertSchema(projectVehicleCustomerRates, {
  rate: z.string({ required_error: "Customer rate is required" }).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    "Customer rate must be a valid non-negative number"
  )
}).omit({ id: true, createdAt: true, customerId: true }).extend({
  projectId: z.string().uuid({ message: "Project is required" }),
  vehicleId: z.string().uuid({ message: "Vehicle is required" })
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
}).extend({
  ownerId: z.string().optional(),
  paidDate: z.string().optional().transform((val) => val === "" ? null : val),
  // Make paidDate truly optional
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  attendanceTotal: z.coerce.number({ invalid_type_error: "Attendance total must be a valid number" }).min(0, "Attendance total cannot be negative").transform((value) => value.toFixed(2)),
  deductionTotal: z.coerce.number({ invalid_type_error: "Deduction total must be a valid number" }).min(0, "Deduction total cannot be negative").transform((value) => value.toFixed(2)),
  totalDays: z.coerce.number({ invalid_type_error: "Total days must be provided" }).int("Total days must be a whole number").min(0, "Total days cannot be negative"),
  maintenanceCount: z.coerce.number({ invalid_type_error: "Maintenance count must be provided" }).int("Maintenance count must be a whole number").min(0, "Maintenance count cannot be negative")
});
var createPaymentRequestSchema = insertPaymentSchema.extend({
  attendanceDates: z.array(z.string()).optional(),
  maintenanceRecordIds: z.array(z.string()).optional()
});
var insertCustomerInvoiceSchema = createInsertSchema(customerInvoices).omit({
  id: true,
  createdAt: true
}).extend({
  invoiceNumber: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueDate: z.string(),
  subtotal: z.coerce.number({ invalid_type_error: "Subtotal must be a valid number" }).transform((value) => value.toFixed(2)),
  adjustment: z.coerce.number({ invalid_type_error: "Adjustment must be a valid number" }).transform((value) => value.toFixed(2)),
  salesTaxRate: z.coerce.number({ invalid_type_error: "Sales tax rate must be a valid number" }).transform((value) => value.toFixed(2)),
  salesTaxAmount: z.coerce.number({ invalid_type_error: "Sales tax amount must be a valid number" }).transform((value) => value.toFixed(2)),
  total: z.coerce.number({ invalid_type_error: "Total must be a valid number" }).transform((value) => value.toFixed(2))
});
var createCustomerInvoiceSchema = z.object({
  customerId: z.string().uuid({ message: "Customer is required" }),
  projectId: z.string().uuid({ message: "Project is required" }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  invoiceNumber: z.string().optional().transform((value) => value === "" ? void 0 : value),
  adjustment: z.coerce.number({ invalid_type_error: "Adjustment must be a valid number" }).default(0),
  salesTaxRate: z.coerce.number({ invalid_type_error: "Sales tax rate must be a valid number" }).default(0),
  status: z.enum(["pending", "partial", "paid", "overdue"]).default("pending").optional(),
  items: z.array(
    z.object({
      vehicleId: z.string().uuid(),
      month: z.number(),
      year: z.number(),
      vehicleMob: z.coerce.number({ invalid_type_error: "MOB must be a number" }).default(0),
      vehicleDimob: z.coerce.number({ invalid_type_error: "DI MOB must be a number" }).default(0)
    })
  ).optional()
}).superRefine((data, ctx) => {
  const parseDate = (value, field) => {
    const date2 = new Date(value);
    if (Number.isNaN(date2.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: "Please provide a valid date"
      });
    }
    return date2;
  };
  const start = parseDate(data.startDate, "startDate");
  const end = parseDate(data.endDate, "endDate");
  const due = parseDate(data.dueDate, "dueDate");
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after the start date"
    });
  }
  if (!Number.isNaN(end.getTime()) && !Number.isNaN(due.getTime()) && due < end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "Due date must be on or after the end date"
    });
  }
});
var updateCustomerInvoiceStatusSchema = z.object({
  status: z.enum(["pending", "partial", "paid", "overdue"])
});
var insertCustomerInvoicePaymentSchema = createInsertSchema(customerInvoicePayments).omit({ id: true, createdAt: true }).extend({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a valid number" }).gt(0, "Amount must be greater than zero").transform((value) => value.toFixed(2)),
  method: z.enum(["cash", "bank_transfer", "cheque", "mobile_wallet", "other"]).default(
    "cash"
  ),
  transactionDate: z.string().min(1, "Transaction date is required"),
  referenceNumber: z.string().optional().transform((value) => value === "" ? void 0 : value),
  notes: z.string().optional().transform((value) => value === "" ? void 0 : value),
  recordedBy: z.string().optional().transform((value) => value === "" ? void 0 : value)
});
var createCustomerInvoicePaymentSchema = insertCustomerInvoicePaymentSchema.omit({
  invoiceId: true
});
var insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true
}).extend({
  paymentId: z.string().min(1, "Payment is required"),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a valid number" }).gt(0, "Amount must be greater than zero").transform((value) => value.toFixed(2)),
  method: z.enum(["cash", "bank_transfer", "cheque", "mobile_wallet", "other"]).default("cash"),
  transactionDate: z.string().min(1, "Transaction date is required").transform((value) => value),
  referenceNumber: z.string().optional().transform((value) => value === "" ? void 0 : value),
  notes: z.string().optional().transform((value) => value === "" ? void 0 : value),
  recordedBy: z.string().optional().transform((value) => value === "" ? void 0 : value)
});
var createPaymentTransactionSchema = insertPaymentTransactionSchema.omit({ paymentId: true });
var insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true
}).extend({
  nextServiceDate: z.string().optional().transform((val) => val === "" ? null : val),
  // Make nextServiceDate truly optional
  mileage: z.number().optional(),
  // Make mileage truly optional
  isPaid: z.boolean().optional().default(false)
});
var insertOwnershipHistorySchema = createInsertSchema(ownershipHistory).omit({
  id: true,
  createdAt: true
}).extend({
  endDate: z.string().optional().transform((val) => val === "" ? null : val),
  // Make endDate truly optional
  transferPrice: z.string().optional().refine(
    (val) => !val || parseFloat(val) >= 0,
    "Transfer price must be positive"
  )
});
var insertVehicleAttendanceSchema = createInsertSchema(vehicleAttendance).omit({
  id: true,
  createdAt: true
}).extend({
  attendanceDate: z.string().transform((val) => val),
  // accept ISO date strings
  status: z.enum(["present", "off", "standby", "maintenance"]).default("present"),
  notes: z.string().optional(),
  projectId: z.string().optional().transform((val) => val === "" ? null : val),
  isPaid: z.boolean().optional().default(false)
});
var deleteVehicleAttendanceSchema = z.object({
  vehicleId: z.string(),
  attendanceDate: z.string(),
  projectId: z.string().nullable().optional()
});
var createVehiclePaymentForPeriodSchema = z.object({
  assignmentId: z.string().min(1, "Assignment is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["pending", "paid", "overdue"]).default("pending").optional(),
  paidDate: z.string().optional().transform((val) => val === "" || val === void 0 ? null : val),
  invoiceNumber: z.string().optional().transform((val) => val === "" ? void 0 : val)
}).superRefine((data, ctx) => {
  const parseDate = (value, field) => {
    const date2 = new Date(value);
    if (Number.isNaN(date2.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: "Please provide a valid date"
      });
    }
    return date2;
  };
  const start = parseDate(data.startDate, "startDate");
  const end = parseDate(data.endDate, "endDate");
  const due = parseDate(data.dueDate, "dueDate");
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after the start date"
    });
  }
  if (!Number.isNaN(end.getTime()) && !Number.isNaN(due.getTime()) && due < end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "Due date must be on or after the end date"
    });
  }
  if (data.paidDate) {
    const paid = parseDate(data.paidDate, "paidDate");
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(paid.getTime()) && paid < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidDate"],
        message: "Paid date cannot be before the start date"
      });
    }
  }
});
var updateOwnerSchema = z.object({
  ownerType: z.enum(["individual", "corporate"]).optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  companyRegistrationNumber: z.string().optional()
}).refine(
  (data) => {
    if (data.ownerType === "corporate") {
      return data.companyName && data.contactPerson && data.companyRegistrationNumber;
    }
    return true;
  },
  {
    message: "Company name, contact person, and registration number are required for corporate owners",
    path: ["companyName"]
  }
);
var updateCustomerSchema = insertCustomerSchema.partial();
var updateOwnershipHistorySchema = insertOwnershipHistorySchema.partial();

// server/db.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Maximum number of clients in the pool
  idleTimeoutMillis: 3e4,
  // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2e3,
  // Return an error after 2 seconds if connection could not be established
  allowExitOnIdle: true
  // Allow the pool to close all clients and exit when all clients are idle
});
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});
var db = drizzle({ client: pool, schema: schema_exports });
pool.query("SELECT 1").then(() => {
  console.log("Database connection established successfully");
}).catch((err) => {
  console.error("Failed to establish database connection:", err);
});

// server/storage.ts
import { eq, desc, asc, and, sql as sql2, isNull, gte, lte, ne, inArray, or, lt } from "drizzle-orm";
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isConnectionError = error.message?.includes("connection") || error.message?.includes("terminating") || error.code === "57P01" || // Admin shutdown
      error.code === "08P01" || // Protocol violation  
      error.code === "08006" || // Connection failure
      error.code === "08003";
      if (isConnectionError && attempt < maxRetries) {
        console.log(`Database operation failed on attempt ${attempt}, retrying...`, error.message);
        const delayMs = Math.pow(2, attempt - 1) * 1e3;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
var DatabaseStorage = class {
  async hydratePayments(rows) {
    if (rows.length === 0) {
      return [];
    }
    const paymentIds = rows.map((row) => row.payments.id);
    const ownerIds = Array.from(
      new Set(rows.map((row) => row.payments.ownerId).filter((id) => Boolean(id)))
    );
    const transactionsByPayment = /* @__PURE__ */ new Map();
    if (paymentIds.length > 0) {
      const transactionRows = await db.select({ transaction: paymentTransactions }).from(paymentTransactions).where(inArray(paymentTransactions.paymentId, paymentIds)).orderBy(asc(paymentTransactions.transactionDate), asc(paymentTransactions.createdAt));
      for (const { transaction } of transactionRows) {
        const current = transactionsByPayment.get(transaction.paymentId) ?? [];
        current.push(transaction);
        transactionsByPayment.set(transaction.paymentId, current);
      }
    }
    let paymentOwnerMap = /* @__PURE__ */ new Map();
    if (ownerIds.length > 0) {
      const ownerRows = await db.select({ owner: owners }).from(owners).where(inArray(owners.id, ownerIds));
      paymentOwnerMap = new Map(ownerRows.map(({ owner }) => [owner.id, owner]));
    }
    return rows.map((row) => {
      const assignment = row.assignments;
      const vehicle = row.vehicles;
      const project = row.projects;
      const projectCustomer = row.customers;
      const assignmentOwner = row.owners;
      if (!assignment || !vehicle || !project || !assignmentOwner || !projectCustomer) {
        throw new Error("Payment is missing assignment details");
      }
      const transactions = transactionsByPayment.get(row.payments.id) ?? [];
      const totalPaid = transactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
      const outstandingAmount = Math.max(Number(row.payments.amount ?? 0) - totalPaid, 0);
      return {
        ...row.payments,
        assignment: {
          ...assignment,
          vehicle: {
            ...vehicle,
            owner: assignmentOwner
          },
          project: { ...project, customer: projectCustomer }
        },
        paymentOwner: paymentOwnerMap.get(row.payments.ownerId) ?? null,
        transactions,
        totalPaid,
        outstandingAmount
      };
    });
  }
  async generateUniqueInvoiceNumber(client = db) {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `AHT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await client.select({ id: customerInvoices.id }).from(customerInvoices).where(eq(customerInvoices.invoiceNumber, candidate)).limit(1);
      if (existing.length === 0) {
        return candidate;
      }
      attempts += 1;
    }
    throw new Error("Unable to generate a unique invoice number");
  }
  async resolveInvoiceNumber(preferred, client = db) {
    if (preferred) {
      const existing = await client.select({ id: customerInvoices.id }).from(customerInvoices).where(eq(customerInvoices.invoiceNumber, preferred)).limit(1);
      if (existing.length === 0) {
        return preferred;
      }
    }
    return this.generateUniqueInvoiceNumber(client);
  }
  async ensureInvoicePeriodAvailable(projectId, periodStart, periodEnd, client = db) {
    const [existing] = await client.select({
      id: customerInvoices.id,
      periodStart: customerInvoices.periodStart,
      periodEnd: customerInvoices.periodEnd
    }).from(customerInvoices).where(
      and(
        eq(customerInvoices.projectId, projectId),
        lte(customerInvoices.periodStart, periodEnd),
        gte(customerInvoices.periodEnd, periodStart)
      )
    ).limit(1);
    if (existing) {
      const error = new Error(
        "An invoice already exists for this project during the selected period"
      );
      error.status = 409;
      throw error;
    }
  }
  async getOwners() {
    return await withRetry(() => db.select().from(owners).orderBy(desc(owners.createdAt)));
  }
  async getOwner(id) {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || void 0;
  }
  async createOwner(insertOwner) {
    const [owner] = await db.insert(owners).values(insertOwner).returning();
    return owner;
  }
  async updateOwner(id, updateOwner) {
    const [owner] = await db.update(owners).set(updateOwner).where(eq(owners.id, id)).returning();
    return owner;
  }
  async deleteOwner(id) {
    const [{ value: attendanceCount }] = await db.select({ value: sql2`count(*)` }).from(vehicleAttendance).innerJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id)).where(eq(vehicles.ownerId, id));
    if (attendanceCount > 0) {
      throw new Error("Cannot delete owner because their vehicles have attendance records.");
    }
    await db.delete(owners).where(eq(owners.id, id));
  }
  async getCustomers() {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  async getCustomer(id) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || void 0;
  }
  async createCustomer(insertCustomer) {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }
  async updateCustomer(id, insertCustomer) {
    const [customer] = await db.update(customers).set(insertCustomer).where(eq(customers.id, id)).returning();
    return customer;
  }
  async deleteCustomer(id) {
    const [{ value: projectCount }] = await db.select({ value: sql2`count(*)` }).from(projects).where(eq(projects.customerId, id));
    if (projectCount > 0) {
      throw new Error("Cannot delete customer because projects reference it.");
    }
    await db.delete(customers).where(eq(customers.id, id));
  }
  async getVehicles(filter) {
    let query = db.select({ vehicle: vehicles, owner: owners }).from(vehicles).leftJoin(owners, eq(vehicles.ownerId, owners.id)).$dynamic();
    const conditions = [];
    if (filter?.projectIds && filter.projectIds.length > 0) {
      query = query.innerJoin(assignments, eq(assignments.vehicleId, vehicles.id));
      conditions.push(inArray(assignments.projectId, filter.projectIds));
    }
    if (filter?.ownerId) {
      conditions.push(eq(vehicles.ownerId, filter.ownerId));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(vehicles.createdAt));
    const rows = await withRetry(() => query);
    const uniqueRows = /* @__PURE__ */ new Map();
    for (const row of rows) {
      uniqueRows.set(row.vehicle.id, row);
    }
    return Array.from(uniqueRows.values()).map((row) => ({
      ...row.vehicle,
      owner: row.owner
    }));
  }
  async getVehicle(id) {
    const [result] = await db.select().from(vehicles).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(eq(vehicles.id, id));
    if (!result) return void 0;
    return {
      ...result.vehicles,
      owner: result.owners
    };
  }
  async getVehiclesByOwner(ownerId) {
    return await this.getVehicles({ ownerId });
  }
  async createVehicle(insertVehicle) {
    return await db.transaction(async (tx) => {
      const [vehicle] = await tx.insert(vehicles).values(insertVehicle).returning();
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await tx.insert(ownershipHistory).values({
        vehicleId: vehicle.id,
        ownerId: vehicle.ownerId,
        startDate: today,
        transferReason: "initial_registration",
        notes: "Initial vehicle registration"
      });
      return vehicle;
    });
  }
  async updateVehicle(id, insertVehicle) {
    const [vehicle] = await db.update(vehicles).set(insertVehicle).where(eq(vehicles.id, id)).returning();
    return vehicle;
  }
  async deleteVehicle(id) {
    const [{ value: attendanceCount }] = await db.select({ value: sql2`count(*)` }).from(vehicleAttendance).where(eq(vehicleAttendance.vehicleId, id));
    if (attendanceCount > 0) {
      throw new Error("Cannot delete vehicle because attendance records exist for it.");
    }
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }
  async getProjects(filter) {
    let query = db.select({ project: projects, customer: customers }).from(projects).leftJoin(customers, eq(projects.customerId, customers.id)).$dynamic();
    if (filter?.ids && filter.ids.length > 0) {
      query = query.where(inArray(projects.id, filter.ids));
    }
    const results = await withRetry(() => query.orderBy(desc(projects.createdAt)));
    return results.map(({ project, customer }) => ({
      ...project,
      customer
    }));
  }
  async getProject(id) {
    const [project] = await db.select({ project: projects, customer: customers }).from(projects).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(projects.id, id));
    return project ? { ...project.project, customer: project.customer } : void 0;
  }
  async createProject(insertProject) {
    const [project] = await db.insert(projects).values(insertProject).returning();
    const customer = await this.getCustomer(project.customerId);
    return { ...project, customer };
  }
  async updateProject(id, insertProject) {
    const [project] = await db.update(projects).set(insertProject).where(eq(projects.id, id)).returning();
    const customer = await this.getCustomer(project.customerId);
    return { ...project, customer };
  }
  async deleteProject(id) {
    const [{ value: attendanceCount }] = await db.select({ value: sql2`count(*)` }).from(vehicleAttendance).where(eq(vehicleAttendance.projectId, id));
    if (attendanceCount > 0) {
      throw new Error("Cannot delete project because attendance records reference it.");
    }
    await db.delete(projects).where(eq(projects.id, id));
  }
  async getProjectCustomerRates(projectId) {
    return await withRetry(async () => {
      const rows = await db.select({ rate: projectVehicleCustomerRates, vehicle: vehicles, owner: owners }).from(projectVehicleCustomerRates).leftJoin(vehicles, eq(projectVehicleCustomerRates.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(eq(projectVehicleCustomerRates.projectId, projectId)).orderBy(asc(vehicles.make), asc(vehicles.model), asc(vehicles.licensePlate));
      return rows.filter((row) => row.vehicle && row.owner).map((row) => ({
        ...row.rate,
        vehicle: { ...row.vehicle, owner: row.owner }
      }));
    });
  }
  async upsertProjectCustomerRates(projectId, rates) {
    return await withRetry(async () => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      if (!project) {
        throw new Error("Project not found");
      }
      const customerId = project.customerId;
      return await db.transaction(async (tx) => {
        const results = [];
        for (const rate of rates) {
          const [record] = await tx.insert(projectVehicleCustomerRates).values({
            projectId,
            customerId,
            vehicleId: rate.vehicleId,
            rate: rate.rate
          }).onConflictDoUpdate({
            target: [projectVehicleCustomerRates.projectId, projectVehicleCustomerRates.vehicleId],
            set: { rate: rate.rate, customerId }
          }).returning();
          results.push(record);
        }
        return results;
      });
    });
  }
  async getAssignments(filter) {
    let query = db.select().from(assignments).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).$dynamic();
    const conditions = [];
    if (filter?.ownerId) {
      conditions.push(eq(vehicles.ownerId, filter.ownerId));
    }
    if (filter?.projectIds && filter.projectIds.length > 0) {
      conditions.push(inArray(assignments.projectId, filter.projectIds));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    query = query.orderBy(desc(assignments.createdAt));
    const results = await withRetry(() => query);
    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles,
        owner: row.owners
      },
      project: { ...row.projects, customer: row.customers }
    }));
  }
  async getAssignment(id) {
    const [result] = await db.select().from(assignments).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(assignments.id, id));
    if (!result) return void 0;
    return {
      ...result.assignments,
      vehicle: {
        ...result.vehicles,
        owner: result.owners
      },
      project: { ...result.projects, customer: result.customers }
    };
  }
  async getAssignmentsByProject(projectId) {
    const results = await db.select().from(assignments).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(assignments.projectId, projectId)).orderBy(desc(assignments.createdAt));
    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles,
        owner: row.owners
      },
      project: { ...row.projects, customer: row.customers }
    }));
  }
  async getAssignmentsByVehicle(vehicleId) {
    const results = await db.select().from(assignments).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(assignments.vehicleId, vehicleId)).orderBy(desc(assignments.createdAt));
    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles,
        owner: row.owners
      },
      project: { ...row.projects, customer: row.customers }
    }));
  }
  async createAssignment(insertAssignment) {
    const targetStatus = insertAssignment.status ?? "active";
    const normalizeDate = (value) => value instanceof Date ? value.toISOString().split("T")[0] : value;
    const [project] = await db.select({ startDate: projects.startDate }).from(projects).where(eq(projects.id, insertAssignment.projectId));
    if (!project) {
      throw new Error("Project not found");
    }
    if (normalizeDate(insertAssignment.startDate) < normalizeDate(project.startDate)) {
      throw new Error("Assignment start date cannot be before the project start date.");
    }
    if (targetStatus === "active") {
      const [{ value: activeCount }] = await db.select({ value: sql2`count(*)` }).from(assignments).where(and(eq(assignments.vehicleId, insertAssignment.vehicleId), eq(assignments.status, "active")));
      if (activeCount > 0) {
        throw new Error("Vehicle is already assigned to another active project.");
      }
    }
    const [assignment] = await db.insert(assignments).values(insertAssignment).returning();
    await db.update(vehicles).set({ status: "assigned" }).where(eq(vehicles.id, insertAssignment.vehicleId));
    return assignment;
  }
  async updateAssignment(id, insertAssignment) {
    const [existingAssignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    if (!existingAssignment) {
      throw new Error("Assignment not found");
    }
    const updates = { ...insertAssignment };
    const newVehicleId = updates.vehicleId ?? existingAssignment.vehicleId;
    const newStatus = updates.status ?? existingAssignment.status;
    const targetProjectId = updates.projectId ?? existingAssignment.projectId;
    const targetStartDate = updates.startDate ?? existingAssignment.startDate;
    const normalizeDate = (value) => value instanceof Date ? value.toISOString().split("T")[0] : value;
    const [project] = await db.select({ startDate: projects.startDate }).from(projects).where(eq(projects.id, targetProjectId));
    if (!project) {
      throw new Error("Project not found");
    }
    if (normalizeDate(targetStartDate) < normalizeDate(project.startDate)) {
      throw new Error("Assignment start date cannot be before the project start date.");
    }
    if (updates.projectId !== void 0 && updates.projectId !== existingAssignment.projectId) {
      const [{ value: attendanceCount }] = await db.select({ value: sql2`count(*)` }).from(vehicleAttendance).where(
        and(
          eq(vehicleAttendance.vehicleId, existingAssignment.vehicleId),
          eq(vehicleAttendance.projectId, existingAssignment.projectId)
        )
      );
      if (attendanceCount > 0) {
        throw new Error("Cannot change project because attendance already exists for this assignment.");
      }
    }
    if (newStatus === "active") {
      const [{ value: activeCount }] = await db.select({ value: sql2`count(*)` }).from(assignments).where(
        and(
          eq(assignments.vehicleId, newVehicleId),
          eq(assignments.status, "active"),
          ne(assignments.id, id)
        )
      );
      if (activeCount > 0) {
        throw new Error("Vehicle is already assigned to another active project.");
      }
    }
    if (newStatus === "completed") {
      const normalizeDate2 = (value) => {
        if (!value) return null;
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return value;
      };
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const effectiveEndDate = normalizeDate2(updates.endDate ?? existingAssignment.endDate);
      if (!effectiveEndDate) {
        updates.endDate = today;
      } else if (effectiveEndDate > today) {
        throw new Error("Assignment end date cannot be in the future when marking as completed.");
      } else if (updates.endDate !== void 0) {
        updates.endDate = effectiveEndDate;
      }
    }
    const [assignment] = await db.update(assignments).set(updates).where(eq(assignments.id, id)).returning();
    if (newStatus === "completed" && existingAssignment) {
      await db.update(vehicles).set({ status: "available" }).where(eq(vehicles.id, existingAssignment.vehicleId));
    }
    return assignment;
  }
  async deleteAssignment(id) {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    if (!assignment) {
      return;
    }
    const [{ value: attendanceCount }] = await db.select({ value: sql2`count(*)` }).from(vehicleAttendance).where(
      and(
        eq(vehicleAttendance.vehicleId, assignment.vehicleId),
        eq(vehicleAttendance.projectId, assignment.projectId)
      )
    );
    if (attendanceCount > 0) {
      throw new Error("Cannot delete assignment because attendance exists for this vehicle and project.");
    }
    await db.delete(assignments).where(eq(assignments.id, id));
    await db.update(vehicles).set({ status: "available" }).where(eq(vehicles.id, assignment.vehicleId));
  }
  async getPayments(filter) {
    let query = db.select().from(payments).leftJoin(assignments, eq(payments.assignmentId, assignments.id)).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).$dynamic();
    if (filter?.ownerId) {
      query = query.where(eq(payments.ownerId, filter.ownerId));
    }
    query = query.orderBy(desc(payments.createdAt));
    const results = await withRetry(() => query);
    return this.hydratePayments(results);
  }
  async getPayment(id) {
    const results = await db.select().from(payments).leftJoin(assignments, eq(payments.assignmentId, assignments.id)).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(payments.id, id));
    if (results.length === 0) return void 0;
    const [payment] = await this.hydratePayments(results);
    return payment;
  }
  async getPaymentsByAssignment(assignmentId) {
    const results = await db.select().from(payments).leftJoin(assignments, eq(payments.assignmentId, assignments.id)).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).where(eq(payments.assignmentId, assignmentId)).orderBy(desc(payments.createdAt));
    return this.hydratePayments(results);
  }
  async getOutstandingPayments(filter) {
    let query = db.select().from(payments).leftJoin(assignments, eq(payments.assignmentId, assignments.id)).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(assignments.projectId, projects.id)).leftJoin(customers, eq(projects.customerId, customers.id)).$dynamic();
    let whereClause = and(
      inArray(payments.status, ["pending", "partial"]),
      sql2`${payments.dueDate} <= CURRENT_DATE`
    );
    if (filter?.ownerId) {
      whereClause = and(whereClause, eq(payments.ownerId, filter.ownerId));
    }
    query = query.where(whereClause);
    query = query.orderBy(payments.dueDate);
    const results = await withRetry(() => query);
    return this.hydratePayments(results);
  }
  async createPayment(insertPayment, attendanceDates, maintenanceRecordIds) {
    return await db.transaction(async (tx) => {
      if (!insertPayment.periodStart || !insertPayment.periodEnd) {
        throw new Error("Payment period start and end dates are required.");
      }
      const uniqueAttendanceDates = attendanceDates ? Array.from(new Set(attendanceDates)) : [];
      const uniqueMaintenanceIds = maintenanceRecordIds ? Array.from(new Set(maintenanceRecordIds)) : [];
      const [assignmentContext] = await tx.select({
        assignment: assignments,
        vehicle: vehicles
      }).from(assignments).leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id)).where(eq(assignments.id, insertPayment.assignmentId)).limit(1);
      if (!assignmentContext?.assignment || !assignmentContext.vehicle) {
        throw new Error("Assignment not found for payment creation");
      }
      const assignmentRecord = assignmentContext.assignment;
      const vehicleRecord = assignmentContext.vehicle;
      if (uniqueAttendanceDates.length === 0 && uniqueMaintenanceIds.length === 0) {
        throw new Error("No attendance or maintenance records were provided for this payment.");
      }
      const providedTotalDays = insertPayment.totalDays ?? 0;
      if (providedTotalDays !== uniqueAttendanceDates.length) {
        throw new Error(
          "The total days value does not match the number of attendance records selected for payment."
        );
      }
      const providedMaintenanceCount = insertPayment.maintenanceCount ?? 0;
      if (providedMaintenanceCount !== uniqueMaintenanceIds.length) {
        throw new Error(
          "The maintenance count does not match the number of maintenance records selected for payment."
        );
      }
      const amountNumber = Number(insertPayment.amount);
      if (Number.isNaN(amountNumber)) {
        throw new Error("Payment amount is invalid.");
      }
      const attendanceTotalNumber = Number(insertPayment.attendanceTotal ?? 0);
      if (Number.isNaN(attendanceTotalNumber)) {
        throw new Error("Attendance total is invalid.");
      }
      const deductionTotalNumber = Number(insertPayment.deductionTotal ?? 0);
      if (Number.isNaN(deductionTotalNumber)) {
        throw new Error("Deduction total is invalid.");
      }
      const roundedAmount = Math.round(amountNumber);
      const projectCondition = assignmentRecord.projectId ? eq(vehicleAttendance.projectId, assignmentRecord.projectId) : isNull(vehicleAttendance.projectId);
      const paymentValues = {
        ...insertPayment,
        amount: roundedAmount.toFixed(2),
        attendanceTotal: attendanceTotalNumber.toFixed(2),
        deductionTotal: deductionTotalNumber.toFixed(2),
        totalDays: uniqueAttendanceDates.length,
        maintenanceCount: uniqueMaintenanceIds.length,
        ownerId: vehicleRecord.ownerId
      };
      const [payment] = await tx.insert(payments).values(paymentValues).returning();
      if (uniqueAttendanceDates.length > 0) {
        const updatedAttendance = await tx.update(vehicleAttendance).set({ isPaid: true }).where(
          and(
            eq(vehicleAttendance.vehicleId, assignmentRecord.vehicleId),
            projectCondition,
            eq(vehicleAttendance.isPaid, false),
            inArray(vehicleAttendance.attendanceDate, uniqueAttendanceDates)
          )
        ).returning({ attendanceDate: vehicleAttendance.attendanceDate });
        const updatedUniqueDates = new Set(updatedAttendance.map((row) => row.attendanceDate));
        if (updatedUniqueDates.size !== uniqueAttendanceDates.length) {
          throw new Error(
            "Some attendance days have already been marked as paid. Recalculate the payment before creating it."
          );
        }
      }
      await tx.update(vehicleAttendance).set({ isPaid: true }).where(
        and(
          eq(vehicleAttendance.vehicleId, assignmentRecord.vehicleId),
          projectCondition,
          gte(vehicleAttendance.attendanceDate, paymentValues.periodStart),
          lte(vehicleAttendance.attendanceDate, paymentValues.periodEnd)
        )
      );
      if (uniqueMaintenanceIds.length > 0) {
        const updatedMaintenance = await tx.update(maintenanceRecords).set({ isPaid: true }).where(
          and(
            eq(maintenanceRecords.vehicleId, assignmentRecord.vehicleId),
            eq(maintenanceRecords.isPaid, false),
            inArray(maintenanceRecords.id, uniqueMaintenanceIds)
          )
        ).returning({ id: maintenanceRecords.id });
        if (updatedMaintenance.length !== uniqueMaintenanceIds.length) {
          throw new Error(
            "Some maintenance entries have already been marked as paid. Recalculate the payment before creating it."
          );
        }
      }
      return payment;
    });
  }
  async getPaymentTransactions(paymentId) {
    const rows = await db.select({ transaction: paymentTransactions }).from(paymentTransactions).where(eq(paymentTransactions.paymentId, paymentId)).orderBy(asc(paymentTransactions.transactionDate), asc(paymentTransactions.createdAt));
    return rows.map((row) => row.transaction);
  }
  async createPaymentTransaction(paymentId, transaction) {
    return await db.transaction(async (tx) => {
      const [existingPayment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      if (!existingPayment) {
        throw new Error("Payment not found");
      }
      const amountNumber = Number(transaction.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Transaction amount must be greater than zero");
      }
      const transactionValues = {
        ...transaction,
        paymentId,
        amount: amountNumber.toFixed(2)
      };
      const [createdTransaction] = await tx.insert(paymentTransactions).values(transactionValues).returning();
      const [{ totalPaid }] = await tx.select({ totalPaid: sql2`coalesce(sum(${paymentTransactions.amount}), '0')` }).from(paymentTransactions).where(eq(paymentTransactions.paymentId, paymentId));
      const totalPaidNumber = Number(totalPaid);
      const paymentAmountNumber = Number(existingPayment.amount);
      if (!Number.isNaN(paymentAmountNumber)) {
        let statusUpdate = null;
        if (totalPaidNumber >= paymentAmountNumber) {
          statusUpdate = { status: "paid", paidDate: createdTransaction.transactionDate };
        } else if (totalPaidNumber > 0) {
          statusUpdate = { status: "partial", paidDate: null };
        } else {
          statusUpdate = { status: "pending", paidDate: null };
        }
        if (statusUpdate) {
          await tx.update(payments).set(statusUpdate).where(eq(payments.id, paymentId));
        }
      }
      return createdTransaction;
    });
  }
  async createVehiclePaymentForPeriod(payload) {
    const assignment = await this.getAssignment(payload.assignmentId);
    if (!assignment) {
      const error = new Error("Assignment not found");
      error.status = 404;
      throw error;
    }
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const error = new Error("Invalid start or end date provided");
      error.status = 400;
      throw error;
    }
    if (end < start) {
      const error = new Error("End date must be on or after the start date");
      error.status = 400;
      throw error;
    }
    const normalizeToUtcDate = (value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const parseDateOnly = (value) => {
      if (value instanceof Date) {
        return normalizeToUtcDate(value);
      }
      const [datePart] = value.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      if ([year, month, day].some((component) => Number.isNaN(component))) {
        throw new Error(`Invalid date value encountered: ${value}`);
      }
      return new Date(Date.UTC(year, month - 1, day));
    };
    const startDateUtc = normalizeToUtcDate(start);
    const endDateUtc = normalizeToUtcDate(end);
    const monthlyRateNumber = Number(assignment.monthlyRate);
    if (Number.isNaN(monthlyRateNumber)) {
      const error = new Error("Assignment monthly rate is invalid");
      error.status = 400;
      throw error;
    }
    const formatDate = (value) => {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const startDateString = formatDate(startDateUtc);
    const endDateString = formatDate(endDateUtc);
    const attendanceRecords = await db.select({
      attendanceDate: vehicleAttendance.attendanceDate,
      isPaid: vehicleAttendance.isPaid
    }).from(vehicleAttendance).where(
      and(
        eq(vehicleAttendance.vehicleId, assignment.vehicleId),
        assignment.projectId ? eq(vehicleAttendance.projectId, assignment.projectId) : isNull(vehicleAttendance.projectId),
        eq(vehicleAttendance.status, "present"),
        gte(vehicleAttendance.attendanceDate, startDateString),
        lte(vehicleAttendance.attendanceDate, endDateString)
      )
    );
    const maintenanceRows = await db.select({
      id: maintenanceRecords.id,
      serviceDate: maintenanceRecords.serviceDate,
      type: maintenanceRecords.type,
      description: maintenanceRecords.description,
      performedBy: maintenanceRecords.performedBy,
      cost: maintenanceRecords.cost,
      isPaid: maintenanceRecords.isPaid
    }).from(maintenanceRecords).where(
      and(
        eq(maintenanceRecords.vehicleId, assignment.vehicleId),
        gte(maintenanceRecords.serviceDate, startDateString),
        lte(maintenanceRecords.serviceDate, endDateString)
      )
    ).orderBy(asc(maintenanceRecords.serviceDate));
    const attendanceBuckets = attendanceRecords.reduce(
      (acc, record) => {
        const formattedDate = formatDate(parseDateOnly(record.attendanceDate));
        if (record.isPaid) {
          if (!acc.unpaid.has(formattedDate)) {
            acc.paid.add(formattedDate);
          }
        } else {
          acc.unpaid.add(formattedDate);
          acc.paid.delete(formattedDate);
        }
        return acc;
      },
      { unpaid: /* @__PURE__ */ new Set(), paid: /* @__PURE__ */ new Set() }
    );
    const attendanceDateStrings = Array.from(attendanceBuckets.unpaid).sort();
    const alreadyPaidDateStrings = Array.from(attendanceBuckets.paid).sort();
    const attendanceDates = attendanceDateStrings.map((value) => parseDateOnly(value)).sort((a, b) => a.getTime() - b.getTime());
    const maintenanceRecordIds = [];
    const maintenanceBreakdown = [];
    const alreadyPaidMaintenance = [];
    maintenanceRows.forEach((row) => {
      const serviceDate = parseDateOnly(row.serviceDate);
      const monthLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric"
      }).format(serviceDate);
      const rawCost = Number(row.cost ?? 0);
      const normalizedCost = Number.isNaN(rawCost) ? 0 : Number(rawCost.toFixed(2));
      const breakdownItem = {
        id: row.id,
        year: serviceDate.getUTCFullYear(),
        month: serviceDate.getUTCMonth() + 1,
        monthLabel,
        serviceDate: formatDate(serviceDate),
        type: row.type,
        description: row.description,
        performedBy: row.performedBy,
        cost: normalizedCost,
        isPaid: row.isPaid ?? false
      };
      if (row.isPaid) {
        alreadyPaidMaintenance.push(breakdownItem);
      } else {
        maintenanceBreakdown.push(breakdownItem);
        maintenanceRecordIds.push(row.id);
      }
    });
    const maintenanceCostNumber = maintenanceBreakdown.reduce((sum, item) => sum + item.cost, 0);
    const months = [];
    const startOfFirstMonth = new Date(
      Date.UTC(startDateUtc.getUTCFullYear(), startDateUtc.getUTCMonth(), 1)
    );
    const startOfLastMonth = new Date(
      Date.UTC(endDateUtc.getUTCFullYear(), endDateUtc.getUTCMonth(), 1)
    );
    for (let cursor = new Date(startOfFirstMonth.getTime()); cursor.getTime() <= startOfLastMonth.getTime(); cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
      const monthStart = new Date(cursor.getTime());
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      const effectiveStart = startDateUtc > monthStart ? startDateUtc : monthStart;
      const effectiveEnd = endDateUtc < monthEnd ? endDateUtc : monthEnd;
      const totalDaysInMonth = monthEnd.getUTCDate();
      const dailyRate = monthlyRateNumber / totalDaysInMonth;
      const presentDaysForMonth = attendanceDates.filter((date2) => {
        return date2 >= effectiveStart && date2 <= effectiveEnd;
      }).length;
      const monthAmount = presentDaysForMonth * dailyRate;
      const monthLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric"
      }).format(monthStart);
      months.push({
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth() + 1,
        monthLabel,
        periodStart: formatDate(effectiveStart),
        periodEnd: formatDate(effectiveEnd),
        totalDaysInMonth,
        presentDays: presentDaysForMonth,
        dailyRate: Number(dailyRate.toFixed(2)),
        amount: Number(monthAmount.toFixed(2))
      });
    }
    const totalAttendanceAmount = months.reduce((sum, current) => sum + current.amount, 0);
    const totalPresentDays = months.reduce((sum, current) => sum + current.presentDays, 0);
    const netAmount = totalAttendanceAmount - maintenanceCostNumber;
    const roundedNetAmount = Math.round(netAmount);
    const calculation = {
      assignmentId: assignment.id,
      vehicleId: assignment.vehicleId,
      projectId: assignment.projectId,
      periodStart: payload.startDate,
      periodEnd: payload.endDate,
      monthlyRate: Number(monthlyRateNumber.toFixed(2)),
      maintenanceCost: Number(maintenanceCostNumber.toFixed(2)),
      monthlyBreakdown: months,
      maintenanceBreakdown,
      alreadyPaidMaintenance,
      totalPresentDays,
      totalAmountBeforeMaintenance: Number(totalAttendanceAmount.toFixed(2)),
      netAmount: roundedNetAmount,
      attendanceDates: attendanceDateStrings,
      maintenanceRecordIds,
      alreadyPaidDates: alreadyPaidDateStrings
    };
    return {
      assignment,
      calculation
    };
  }
  async createCustomerInvoice(payload) {
    const calculation = await this.calculateCustomerInvoice(payload);
    const formatCurrency = (value) => Number(Number(value ?? 0).toFixed(2)).toFixed(2);
    return await db.transaction(async (tx) => {
      await this.ensureInvoicePeriodAvailable(
        calculation.projectId,
        calculation.periodStart,
        calculation.periodEnd,
        tx
      );
      const invoiceNumber = await this.resolveInvoiceNumber(calculation.invoiceNumber, tx);
      const invoiceValues = {
        customerId: calculation.customerId,
        projectId: calculation.projectId,
        periodStart: calculation.periodStart,
        periodEnd: calculation.periodEnd,
        dueDate: calculation.dueDate,
        subtotal: formatCurrency(calculation.subtotal),
        adjustment: formatCurrency(calculation.adjustment),
        salesTaxRate: formatCurrency(calculation.salesTaxRate),
        salesTaxAmount: formatCurrency(calculation.salesTaxAmount),
        total: formatCurrency(calculation.total),
        invoiceNumber,
        status: calculation.status ?? "pending"
      };
      const [invoice] = await tx.insert(customerInvoices).values(invoiceValues).returning();
      const invoiceItems = calculation.items.map(({ vehicle, ...item }) => ({
        ...item,
        invoiceId: invoice.id,
        projectRate: formatCurrency(item.projectRate),
        vehicleMob: formatCurrency(item.vehicleMob),
        vehicleDimob: formatCurrency(item.vehicleDimob),
        dailyRate: formatCurrency(item.dailyRate),
        amount: formatCurrency(item.amount),
        salesTaxRate: formatCurrency(item.salesTaxRate),
        salesTaxAmount: formatCurrency(item.salesTaxAmount),
        totalAmount: formatCurrency(item.totalAmount)
      }));
      const createdItems = await tx.insert(customerInvoiceItems).values(invoiceItems).returning();
      const itemsWithVehicle = createdItems.map((item) => ({
        ...item,
        vehicle: calculation.items.find((source) => source.vehicleId === item.vehicleId).vehicle
      }));
      return {
        ...invoice,
        items: itemsWithVehicle
      };
    });
  }
  async calculateCustomerInvoice(payload) {
    const [project] = await db.select({ project: projects }).from(projects).where(and(eq(projects.id, payload.projectId), eq(projects.customerId, payload.customerId))).limit(1);
    if (!project) {
      const error = new Error("Project not found for the provided customer");
      error.status = 404;
      throw error;
    }
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const error = new Error("Invalid start or end date provided");
      error.status = 400;
      throw error;
    }
    if (end < start) {
      const error = new Error("End date must be on or after the start date");
      error.status = 400;
      throw error;
    }
    const normalizeToUtcDate = (value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const parseDateOnly = (value) => {
      if (value instanceof Date) {
        return normalizeToUtcDate(value);
      }
      const [year, month, day] = value.split("-").map((part) => Number(part));
      if ([year, month, day].some((component) => Number.isNaN(component))) {
        throw new Error(`Invalid date value encountered: ${value}`);
      }
      return new Date(Date.UTC(year, month - 1, day));
    };
    const startDateUtc = normalizeToUtcDate(start);
    const endDateUtc = normalizeToUtcDate(end);
    const formatDate = (value) => {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const startDateString = formatDate(startDateUtc);
    const endDateString = formatDate(endDateUtc);
    const rateRows = await db.select({
      vehicleId: projectVehicleCustomerRates.vehicleId,
      rate: projectVehicleCustomerRates.rate,
      vehicle: vehicles,
      owner: owners
    }).from(projectVehicleCustomerRates).leftJoin(vehicles, eq(projectVehicleCustomerRates.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(eq(projectVehicleCustomerRates.projectId, payload.projectId));
    const rateMap = /* @__PURE__ */ new Map();
    const vehicleMap = /* @__PURE__ */ new Map();
    for (const row of rateRows) {
      const rateNumber = Number(row.rate ?? 0);
      if (!Number.isNaN(rateNumber) && row.vehicle) {
        rateMap.set(row.vehicleId, rateNumber);
        vehicleMap.set(row.vehicleId, { ...row.vehicle, owner: row.owner });
      }
    }
    const overrideMap = /* @__PURE__ */ new Map();
    payload.items?.forEach((item) => {
      const key = `${item.vehicleId}-${item.month}-${item.year}`;
      overrideMap.set(key, {
        vehicleMob: Number(item.vehicleMob ?? 0),
        vehicleDimob: Number(item.vehicleDimob ?? 0)
      });
    });
    const attendance = await db.select({
      attendanceDate: vehicleAttendance.attendanceDate,
      vehicleId: vehicleAttendance.vehicleId
    }).from(vehicleAttendance).where(
      and(
        eq(vehicleAttendance.projectId, payload.projectId),
        eq(vehicleAttendance.status, "present"),
        gte(vehicleAttendance.attendanceDate, startDateString),
        lte(vehicleAttendance.attendanceDate, endDateString)
      )
    );
    if (attendance.length === 0) {
      const error = new Error("No attendance records found for the requested period");
      error.status = 400;
      throw error;
    }
    const buckets = /* @__PURE__ */ new Map();
    attendance.forEach((record) => {
      const date2 = parseDateOnly(record.attendanceDate);
      const vehicleId = record.vehicleId;
      const month = date2.getUTCMonth() + 1;
      const year = date2.getUTCFullYear();
      const key = `${year}-${month}`;
      if (!rateMap.has(vehicleId)) {
        throw new Error("Missing customer rate for one or more vehicles in this project");
      }
      if (!buckets.has(vehicleId)) {
        buckets.set(vehicleId, /* @__PURE__ */ new Map());
      }
      const vehicleBucket = buckets.get(vehicleId);
      const current = vehicleBucket.get(key) ?? { presentDays: 0, month, year };
      current.presentDays += 1;
      vehicleBucket.set(key, current);
    });
    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
    const roundCurrency = (value) => Number(Number(value ?? 0).toFixed(2));
    const roundInvoiceTotal = (value) => Math.round(Number(value ?? 0));
    const items = [];
    for (const [vehicleId, monthMap] of buckets.entries()) {
      const rateNumber = Number(rateMap.get(vehicleId) ?? 0);
      for (const [, bucket] of monthMap.entries()) {
        const daysInMonth = new Date(Date.UTC(bucket.year, bucket.month, 0)).getUTCDate();
        const dailyRate = rateNumber / daysInMonth;
        const key = `${vehicleId}-${bucket.month}-${bucket.year}`;
        const override = overrideMap.get(key);
        const vehicleMob = Number(override?.vehicleMob ?? 0);
        const vehicleDimob = Number(override?.vehicleDimob ?? 0);
        const baseAmount = dailyRate * bucket.presentDays;
        const amount = baseAmount + vehicleMob + vehicleDimob;
        const referenceDate = new Date(Date.UTC(bucket.year, bucket.month - 1, 1));
        const monthLabel = monthFormatter.format(referenceDate);
        items.push({
          vehicleId,
          vehicle: vehicleMap.get(vehicleId),
          month: bucket.month,
          year: bucket.year,
          monthLabel,
          presentDays: bucket.presentDays,
          projectRate: rateNumber,
          vehicleMob,
          vehicleDimob,
          dailyRate,
          amount
        });
      }
    }
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const adjustmentNumber = Number(payload.adjustment ?? 0);
    const salesTaxRateNumber = Number(Number(payload.salesTaxRate ?? 0).toFixed(2));
    const taxableBase = subtotal + adjustmentNumber;
    const salesTaxAmount = taxableBase * (salesTaxRateNumber / 100);
    const total = roundInvoiceTotal(taxableBase + salesTaxAmount);
    const itemsWithTax = items.map((item) => {
      const adjustmentShare = subtotal === 0 ? 0 : Number(item.amount) / subtotal * adjustmentNumber;
      const taxableAmount = Number(item.amount) + adjustmentShare;
      const itemSalesTaxAmount = taxableAmount * (salesTaxRateNumber / 100);
      const totalAmount = taxableAmount + itemSalesTaxAmount;
      return {
        ...item,
        salesTaxRate: salesTaxRateNumber,
        salesTaxAmount: itemSalesTaxAmount,
        totalAmount
      };
    });
    const invoiceNumber = await this.resolveInvoiceNumber(payload.invoiceNumber);
    return {
      customerId: payload.customerId,
      projectId: payload.projectId,
      periodStart: startDateString,
      periodEnd: endDateString,
      dueDate: payload.dueDate,
      subtotal,
      adjustment: adjustmentNumber,
      salesTaxRate: salesTaxRateNumber,
      salesTaxAmount,
      total,
      invoiceNumber,
      status: payload.status ?? "pending",
      items: itemsWithTax
    };
  }
  async getCustomerInvoices(filter) {
    let query = db.select({
      invoice: customerInvoices,
      project: projects,
      customer: customers
    }).from(customerInvoices).leftJoin(projects, eq(customerInvoices.projectId, projects.id)).leftJoin(customers, eq(customerInvoices.customerId, customers.id)).orderBy(desc(customerInvoices.createdAt));
    const conditions = [];
    if (filter?.projectIds && filter.projectIds.length > 0) {
      conditions.push(inArray(customerInvoices.projectId, filter.projectIds));
    }
    if (filter?.invoiceIds && filter.invoiceIds.length > 0) {
      conditions.push(inArray(customerInvoices.id, filter.invoiceIds));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const invoiceRows = await withRetry(() => query);
    const invoiceIds = invoiceRows.map((row) => row.invoice.id);
    const itemsMap = /* @__PURE__ */ new Map();
    const paymentsMap = /* @__PURE__ */ new Map();
    if (invoiceIds.length > 0) {
      const itemRows = await db.select({
        item: customerInvoiceItems,
        vehicle: vehicles,
        owner: owners
      }).from(customerInvoiceItems).leftJoin(vehicles, eq(customerInvoiceItems.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(inArray(customerInvoiceItems.invoiceId, invoiceIds)).orderBy(customerInvoiceItems.createdAt);
      itemRows.forEach((row) => {
        const collection = itemsMap.get(row.item.invoiceId) ?? [];
        collection.push({
          ...row.item,
          vehicle: {
            ...row.vehicle,
            owner: row.owner
          }
        });
        itemsMap.set(row.item.invoiceId, collection);
      });
      const paymentRows = await db.select({ payment: customerInvoicePayments }).from(customerInvoicePayments).where(inArray(customerInvoicePayments.invoiceId, invoiceIds)).orderBy(
        asc(customerInvoicePayments.transactionDate),
        asc(customerInvoicePayments.createdAt)
      );
      paymentRows.forEach(({ payment }) => {
        const collection = paymentsMap.get(payment.invoiceId) ?? [];
        collection.push(payment);
        paymentsMap.set(payment.invoiceId, collection);
      });
    }
    return invoiceRows.map((row) => ({
      ...row.invoice,
      items: itemsMap.get(row.invoice.id) ?? [],
      project: row.project,
      customer: row.customer,
      payments: paymentsMap.get(row.invoice.id) ?? []
    }));
  }
  async getCustomerInvoice(id) {
    const [invoice] = await this.getCustomerInvoices({ invoiceIds: [id] });
    return invoice ?? null;
  }
  async updateCustomerInvoiceStatus(id, status) {
    const [updated] = await db.update(customerInvoices).set({ status }).where(eq(customerInvoices.id, id)).returning();
    if (!updated) return null;
    return await this.getCustomerInvoice(id);
  }
  async recordCustomerInvoicePayment(invoiceId, payment) {
    const [updatedInvoiceId] = await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(customerInvoices).where(eq(customerInvoices.id, invoiceId)).limit(1);
      if (!invoice) {
        const error = new Error("Invoice not found");
        error.status = 404;
        throw error;
      }
      const existingPayments = await tx.select({ amount: customerInvoicePayments.amount }).from(customerInvoicePayments).where(eq(customerInvoicePayments.invoiceId, invoiceId));
      const alreadyPaid = existingPayments.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0
      );
      const invoiceTotal = Number(invoice.total ?? 0);
      const outstanding = invoiceTotal - alreadyPaid;
      if (outstanding <= 0 || invoice.status === "paid") {
        const error = new Error("This invoice is already fully paid");
        error.status = 409;
        throw error;
      }
      const paymentAmount = Number(payment.amount ?? 0);
      if (paymentAmount <= 0) {
        const error = new Error("Payment amount must be greater than zero");
        error.status = 400;
        throw error;
      }
      if (paymentAmount > outstanding) {
        const error = new Error("Payment cannot exceed the outstanding balance");
        error.status = 400;
        throw error;
      }
      const paymentValues = {
        ...payment,
        invoiceId
      };
      await tx.insert(customerInvoicePayments).values(paymentValues);
      const totalPaid = alreadyPaid + paymentAmount;
      if (totalPaid >= invoiceTotal && invoice.status !== "paid") {
        await tx.update(customerInvoices).set({ status: "paid" }).where(eq(customerInvoices.id, invoiceId));
      } else if (totalPaid > 0 && invoice.status !== "partial") {
        await tx.update(customerInvoices).set({ status: "partial" }).where(eq(customerInvoices.id, invoiceId));
      }
      return [invoiceId];
    });
    const updatedInvoice = await this.getCustomerInvoice(updatedInvoiceId);
    if (!updatedInvoice) {
      throw new Error("Failed to reload invoice after recording payment");
    }
    return updatedInvoice;
  }
  async getMaintenanceRecords(filter) {
    let query = db.select().from(maintenanceRecords).leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).$dynamic();
    if (filter?.ownerId) {
      query = query.where(eq(vehicles.ownerId, filter.ownerId));
    }
    query = query.orderBy(desc(maintenanceRecords.createdAt));
    const rows = await withRetry(() => query);
    return rows.map((row) => ({
      ...row.maintenance_records,
      vehicle: {
        ...row.vehicles,
        owner: row.owners
      }
    }));
  }
  async getMaintenanceRecord(id) {
    const [result] = await db.select().from(maintenanceRecords).leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(eq(maintenanceRecords.id, id));
    if (!result) return void 0;
    return {
      ...result.maintenance_records,
      vehicle: {
        ...result.vehicles,
        owner: result.owners
      }
    };
  }
  async getMaintenanceRecordsByVehicle(vehicleId) {
    return await db.select().from(maintenanceRecords).leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).where(eq(maintenanceRecords.vehicleId, vehicleId)).orderBy(desc(maintenanceRecords.createdAt)).then(
      (rows) => rows.map((row) => ({
        ...row.maintenance_records,
        vehicle: {
          ...row.vehicles,
          owner: row.owners
        }
      }))
    );
  }
  async createMaintenanceRecord(insertRecord) {
    const [record] = await db.insert(maintenanceRecords).values(insertRecord).returning();
    return record;
  }
  async updateMaintenanceRecord(id, insertRecord) {
    const existing = await this.getMaintenanceRecord(id);
    if (!existing) {
      const error = new Error("Maintenance record not found");
      error.status = 404;
      throw error;
    }
    let updates = { ...insertRecord };
    if (existing.status === "completed") {
      const { description, ...rest } = updates;
      const attemptedUpdates = Object.entries(rest).filter(([, value]) => value !== void 0);
      if (attemptedUpdates.length > 0) {
        const error = new Error("Only the description can be updated for completed maintenance records.");
        error.status = 400;
        throw error;
      }
      if (description === void 0) {
        return existing;
      }
      updates = { description };
    }
    updates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== void 0)
    );
    if (Object.keys(updates).length === 0) {
      return existing;
    }
    const [record] = await db.update(maintenanceRecords).set(updates).where(eq(maintenanceRecords.id, id)).returning();
    return record;
  }
  async deleteMaintenanceRecord(id) {
    const existing = await this.getMaintenanceRecord(id);
    if (!existing) {
      const error = new Error("Maintenance record not found");
      error.status = 404;
      throw error;
    }
    if (existing.status === "completed") {
      const error = new Error("Completed maintenance records cannot be deleted.");
      error.status = 400;
      throw error;
    }
    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id));
  }
  async getDashboardStats() {
    const [
      totalVehiclesResult,
      activeProjectsResult,
      pendingPayments,
      monthlyRevenueResult,
      vehicleStatusResult
    ] = await withRetry(() => Promise.all([
      db.select({ count: sql2`count(*)` }).from(vehicles),
      db.select({ count: sql2`count(*)` }).from(projects).where(eq(projects.status, "active")),
      db.select({ id: payments.id, amount: payments.amount }).from(payments).where(inArray(payments.status, ["pending", "partial"])),
      db.select({ total: sql2`coalesce(sum(${paymentTransactions.amount}), 0)` }).from(paymentTransactions).where(
        sql2`date_trunc('month', ${paymentTransactions.transactionDate}) = date_trunc('month', CURRENT_DATE)`
      ),
      db.select({
        status: vehicles.status,
        count: sql2`count(*)`
      }).from(vehicles).groupBy(vehicles.status)
    ]));
    let outstandingAmount = 0;
    if (pendingPayments.length > 0) {
      const paymentIds = pendingPayments.map((row) => row.id);
      const transactionTotals = await withRetry(
        () => db.select({
          paymentId: paymentTransactions.paymentId,
          totalPaid: sql2`coalesce(sum(${paymentTransactions.amount}), '0')`
        }).from(paymentTransactions).where(inArray(paymentTransactions.paymentId, paymentIds)).groupBy(paymentTransactions.paymentId)
      );
      const paidMap = new Map(transactionTotals.map((row) => [row.paymentId, Number(row.totalPaid)]));
      outstandingAmount = pendingPayments.reduce((sum, payment) => {
        const paymentAmount = Number(payment.amount ?? 0);
        const paidAmount = paidMap.get(payment.id) ?? 0;
        const remaining = Math.max(paymentAmount - paidAmount, 0);
        return sum + remaining;
      }, 0);
    }
    const vehicleStatusCounts = {
      available: 0,
      assigned: 0,
      maintenance: 0,
      outOfService: 0
    };
    vehicleStatusResult.forEach((row) => {
      if (row.status === "available") vehicleStatusCounts.available = row.count;
      else if (row.status === "assigned") vehicleStatusCounts.assigned = row.count;
      else if (row.status === "maintenance") vehicleStatusCounts.maintenance = row.count;
      else if (row.status === "out_of_service") vehicleStatusCounts.outOfService = row.count;
    });
    return {
      totalVehicles: totalVehiclesResult[0]?.count || 0,
      activeProjects: activeProjectsResult[0]?.count || 0,
      outstandingAmount,
      monthlyRevenue: Number(monthlyRevenueResult[0]?.total || 0),
      vehicleStatusCounts
    };
  }
  async getOwnershipHistory() {
    const results = await db.select({ record: ownershipHistory, owner: owners }).from(ownershipHistory).leftJoin(owners, eq(ownershipHistory.ownerId, owners.id)).orderBy(desc(ownershipHistory.startDate));
    return results.filter((row) => row.owner).map((row) => ({
      ...row.record,
      owner: row.owner
    }));
  }
  async getOwnershipHistoryByVehicle(vehicleId) {
    const results = await db.select({ record: ownershipHistory, owner: owners }).from(ownershipHistory).leftJoin(owners, eq(ownershipHistory.ownerId, owners.id)).where(eq(ownershipHistory.vehicleId, vehicleId)).orderBy(desc(ownershipHistory.startDate));
    return results.filter((row) => row.owner).map((row) => ({
      ...row.record,
      owner: row.owner
    }));
  }
  async createOwnershipHistoryRecord(record) {
    const [ownershipRecord] = await db.insert(ownershipHistory).values(record).returning();
    return ownershipRecord;
  }
  async updateOwnershipHistoryRecord(id, record) {
    const [ownershipRecord] = await db.update(ownershipHistory).set(record).where(eq(ownershipHistory.id, id)).returning();
    return ownershipRecord;
  }
  async deleteOwnershipHistoryRecord(id) {
    await db.delete(ownershipHistory).where(eq(ownershipHistory.id, id));
  }
  async transferVehicleOwnership(vehicleId, newOwnerId, transferDate, transferReason, transferPrice, notes) {
    const parseDateStrict = (value) => {
      const stringValue = value instanceof Date ? value.toISOString().split("T")[0] : String(value);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);
      if (!match) {
        throw new Error("Transfer date must be in YYYY-MM-DD format");
      }
      const [, year, month, day] = match;
      const date2 = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (date2.getUTCFullYear() !== Number(year) || date2.getUTCMonth() !== Number(month) - 1 || date2.getUTCDate() !== Number(day)) {
        throw new Error("Transfer date must be a valid date");
      }
      return date2;
    };
    const formatDate = (date2) => date2.toISOString().split("T")[0];
    await db.transaction(async (tx) => {
      const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }
      if (vehicle.ownerId === newOwnerId) {
        throw new Error("Vehicle is already assigned to the specified owner");
      }
      const transferDateObject = parseDateStrict(transferDate);
      const transferDateString = formatDate(transferDateObject);
      const [unpaidAttendanceRecord] = await tx.select({ attendanceDate: vehicleAttendance.attendanceDate }).from(vehicleAttendance).where(
        and(
          eq(vehicleAttendance.vehicleId, vehicleId),
          eq(vehicleAttendance.isPaid, false),
          eq(vehicleAttendance.status, "present"),
          lt(vehicleAttendance.attendanceDate, transferDateString)
        )
      ).limit(1);
      if (unpaidAttendanceRecord) {
        throw new Error(vehicleTransferPendingPaymentError);
      }
      const [currentOwnership] = await tx.select().from(ownershipHistory).where(and(eq(ownershipHistory.vehicleId, vehicleId), isNull(ownershipHistory.endDate))).orderBy(desc(ownershipHistory.startDate)).limit(1);
      if (currentOwnership) {
        const currentStartDate = parseDateStrict(currentOwnership.startDate);
        if (transferDateObject <= currentStartDate) {
          throw new Error("Transfer date must be after the current ownership start date");
        }
        const previousOwnerEndDate = new Date(transferDateObject);
        previousOwnerEndDate.setUTCDate(previousOwnerEndDate.getUTCDate() - 1);
        await tx.update(ownershipHistory).set({ endDate: formatDate(previousOwnerEndDate) }).where(eq(ownershipHistory.id, currentOwnership.id));
      }
      await tx.insert(ownershipHistory).values({
        vehicleId,
        ownerId: newOwnerId,
        startDate: transferDateString,
        transferReason: transferReason || "transfer",
        transferPrice: transferPrice ?? null,
        notes: notes ?? null
      });
      await tx.update(vehicles).set({ ownerId: newOwnerId }).where(eq(vehicles.id, vehicleId));
      const assignmentRows = await tx.select({ id: assignments.id }).from(assignments).where(eq(assignments.vehicleId, vehicleId));
      if (assignmentRows.length > 0) {
        const assignmentIds = assignmentRows.map((row) => row.id);
        await tx.update(payments).set({ ownerId: newOwnerId }).where(
          and(
            inArray(payments.assignmentId, assignmentIds),
            or(
              gte(payments.periodStart, transferDateString),
              and(isNull(payments.periodStart), gte(payments.dueDate, transferDateString))
            )
          )
        );
      }
    });
  }
  // Vehicle attendance methods
  async getVehicleAttendanceSummary(filter) {
    if (!filter.vehicleId) {
      return [];
    }
    const conditions = [eq(vehicleAttendance.vehicleId, filter.vehicleId)];
    if (filter.ownerId) {
      conditions.push(eq(vehicles.ownerId, filter.ownerId));
    }
    if (filter.projectId !== void 0) {
      conditions.push(
        filter.projectId === null ? isNull(vehicleAttendance.projectId) : eq(vehicleAttendance.projectId, filter.projectId)
      );
    }
    if (filter.startDate) {
      conditions.push(gte(vehicleAttendance.attendanceDate, filter.startDate));
    }
    if (filter.endDate) {
      conditions.push(lte(vehicleAttendance.attendanceDate, filter.endDate));
    }
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    const rows = await db.select({
      projectId: vehicleAttendance.projectId,
      projectName: projects.name,
      attendanceDate: vehicleAttendance.attendanceDate,
      status: vehicleAttendance.status
    }).from(vehicleAttendance).leftJoin(projects, eq(vehicleAttendance.projectId, projects.id)).leftJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id)).where(whereClause);
    const summaryMap = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const key = row.projectId ?? null;
      const existing = summaryMap.get(key);
      const base = existing ?? {
        projectId: row.projectId ?? null,
        projectName: row.projectName ?? null,
        totalDays: 0,
        statusCounts: {},
        firstAttendanceDate: null,
        lastAttendanceDate: null
      };
      base.totalDays += 1;
      base.statusCounts[row.status] = (base.statusCounts[row.status] ?? 0) + 1;
      if (!base.firstAttendanceDate || row.attendanceDate < base.firstAttendanceDate) {
        base.firstAttendanceDate = row.attendanceDate;
      }
      if (!base.lastAttendanceDate || row.attendanceDate > base.lastAttendanceDate) {
        base.lastAttendanceDate = row.attendanceDate;
      }
      summaryMap.set(key, base);
    }
    return Array.from(summaryMap.values()).sort((a, b) => {
      const nameA = (a.projectName ?? "Unassigned").toLowerCase();
      const nameB = (b.projectName ?? "Unassigned").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
  async getVehicleAttendance(filter) {
    let query = db.select().from(vehicleAttendance).leftJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id)).leftJoin(owners, eq(vehicles.ownerId, owners.id)).leftJoin(projects, eq(vehicleAttendance.projectId, projects.id)).$dynamic();
    const conditions = [];
    if (filter?.vehicleId) {
      conditions.push(eq(vehicleAttendance.vehicleId, filter.vehicleId));
    }
    if (filter?.date) {
      conditions.push(eq(vehicleAttendance.attendanceDate, filter.date));
    }
    if (filter?.projectId) {
      conditions.push(eq(vehicleAttendance.projectId, filter.projectId));
    }
    if (filter?.ownerId) {
      conditions.push(eq(vehicles.ownerId, filter.ownerId));
    }
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
    }
    query = query.orderBy(desc(vehicleAttendance.createdAt));
    const results = await withRetry(() => query);
    return results.map((row) => ({
      ...row.vehicle_attendance,
      vehicle: {
        ...row.vehicles,
        owner: row.owners
      },
      project: row.projects || null
    }));
  }
  async createVehicleAttendance(record) {
    return await db.transaction(async (tx) => {
      const existingRecords = await tx.select().from(vehicleAttendance).where(
        and(
          eq(vehicleAttendance.vehicleId, record.vehicleId),
          eq(vehicleAttendance.attendanceDate, record.attendanceDate)
        )
      );
      const normalizedProjectId = record.projectId ?? null;
      const conflicting = existingRecords.find(
        (existing) => (existing.projectId ?? null) !== normalizedProjectId
      );
      if (conflicting) {
        throw new Error("Vehicle already has attendance for this date on another project.");
      }
      if (existingRecords.some((record2) => record2.isPaid)) {
        throw new Error("Cannot modify attendance that has already been marked as paid.");
      }
      if (existingRecords.length > 0) {
        const target = existingRecords[0];
        const [updated] = await tx.update(vehicleAttendance).set({
          status: record.status,
          notes: record.notes ?? null,
          projectId: normalizedProjectId
        }).where(eq(vehicleAttendance.id, target.id)).returning();
        return updated;
      }
      const [created] = await tx.insert(vehicleAttendance).values({
        vehicleId: record.vehicleId,
        projectId: normalizedProjectId,
        attendanceDate: record.attendanceDate,
        status: record.status,
        notes: record.notes ?? null
      }).returning();
      return created;
    });
  }
  async createVehicleAttendanceBatch(records) {
    if (records.length === 0) return [];
    const perVehicleDate = /* @__PURE__ */ new Map();
    for (const record of records) {
      const key = `${record.vehicleId}:${record.attendanceDate}`;
      const projectId = record.projectId ?? null;
      const existingProjectId = perVehicleDate.get(key);
      if (existingProjectId !== void 0 && existingProjectId !== projectId) {
        throw new Error("Vehicle already has attendance for this date on another project.");
      }
      perVehicleDate.set(key, projectId);
    }
    return await db.transaction(async (tx) => {
      const insertedOrUpdatedIds = [];
      for (const r of records) {
        const normalizedProjectId = r.projectId ?? null;
        const existingRecords = await tx.select().from(vehicleAttendance).where(
          and(
            eq(vehicleAttendance.vehicleId, r.vehicleId),
            eq(vehicleAttendance.attendanceDate, r.attendanceDate)
          )
        );
        const conflicting = existingRecords.find(
          (existing2) => (existing2.projectId ?? null) !== normalizedProjectId
        );
        if (conflicting) {
          throw new Error("Vehicle already has attendance for this date on another project.");
        }
        if (existingRecords.some((record) => record.isPaid)) {
          throw new Error("Cannot modify attendance that has already been marked as paid.");
        }
        const existing = existingRecords[0];
        if (existing) {
          const [updated] = await tx.update(vehicleAttendance).set({ status: r.status, notes: r.notes ?? null, projectId: normalizedProjectId }).where(eq(vehicleAttendance.id, existing.id)).returning();
          if (updated) insertedOrUpdatedIds.push(updated.id);
        } else {
          const [created] = await tx.insert(vehicleAttendance).values({
            vehicleId: r.vehicleId,
            projectId: normalizedProjectId,
            attendanceDate: r.attendanceDate,
            status: r.status,
            notes: r.notes ?? null
          }).returning();
          if (created) insertedOrUpdatedIds.push(created.id);
        }
      }
      if (insertedOrUpdatedIds.length > 0) {
        const rows2 = await tx.select().from(vehicleAttendance).where(sql2`${vehicleAttendance.id} IN (${sql2.join(insertedOrUpdatedIds.map((id) => sql2`${id}`), sql2`,`)})`);
        return rows2;
      }
      const vehicleIds = Array.from(new Set(records.map((r) => r.vehicleId)));
      const dates = records.map((r) => r.attendanceDate).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const rows = await tx.select().from(vehicleAttendance).where(sql2`${vehicleAttendance.vehicleId} IN (${sql2.join(vehicleIds.map((v) => sql2`${v}`), sql2`,`)}) AND ${vehicleAttendance.attendanceDate} BETWEEN ${minDate} AND ${maxDate}`);
      return rows;
    });
  }
  async deleteVehicleAttendanceBatch(records) {
    if (records.length === 0) return [];
    return await db.transaction(async (tx) => {
      const deleted = [];
      for (const r of records) {
        const conditions = [
          eq(vehicleAttendance.vehicleId, r.vehicleId),
          eq(vehicleAttendance.attendanceDate, r.attendanceDate)
        ];
        if (r.projectId !== void 0) {
          conditions.push(
            r.projectId === null ? isNull(vehicleAttendance.projectId) : eq(vehicleAttendance.projectId, r.projectId)
          );
        }
        const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
        const existingRecords = await tx.select().from(vehicleAttendance).where(whereClause);
        if (existingRecords.length === 0) {
          continue;
        }
        if (existingRecords.some((record) => record.isPaid)) {
          throw new Error("Cannot delete attendance that has already been marked as paid.");
        }
        const rows = await tx.delete(vehicleAttendance).where(whereClause).returning();
        deleted.push(...rows);
      }
      return deleted;
    });
  }
  async findUserByEmail(email) {
    const rows = await withRetry(
      () => db.select({
        user: users,
        projectIds: sql2`coalesce(array_agg(${employeeProjects.projectId}) filter (where ${employeeProjects.projectId} is not null), '{}')`
      }).from(users).leftJoin(employeeProjects, eq(employeeProjects.userId, users.id)).where(eq(users.email, email)).groupBy(users.id).limit(1)
    );
    const row = rows[0];
    if (!row) return void 0;
    return { ...row.user, employeeProjectIds: row.projectIds };
  }
  async findUserById(id) {
    const rows = await withRetry(
      () => db.select({
        user: users,
        projectIds: sql2`coalesce(array_agg(${employeeProjects.projectId}) filter (where ${employeeProjects.projectId} is not null), '{}')`
      }).from(users).leftJoin(employeeProjects, eq(employeeProjects.userId, users.id)).where(eq(users.id, id)).groupBy(users.id).limit(1)
    );
    const row = rows[0];
    if (!row) return void 0;
    return { ...row.user, employeeProjectIds: row.projectIds };
  }
  async getUsers() {
    const rows = await withRetry(
      () => db.select({
        id: users.id,
        email: users.email,
        role: users.role,
        ownerId: users.ownerId,
        createdAt: users.createdAt,
        isActive: users.isActive,
        employeeAccess: users.employeeAccess,
        employeeManageAccess: users.employeeManageAccess,
        owner: owners,
        project: projects
      }).from(users).leftJoin(owners, eq(users.ownerId, owners.id)).leftJoin(employeeProjects, eq(employeeProjects.userId, users.id)).leftJoin(projects, eq(employeeProjects.projectId, projects.id)).orderBy(desc(users.createdAt))
    );
    const userMap = /* @__PURE__ */ new Map();
    for (const { owner, project, ...user } of rows) {
      const existing = userMap.get(user.id) ?? {
        ...user,
        owner: owner ?? null,
        employeeProjects: []
      };
      if (project) {
        existing.employeeProjects.push(project);
      }
      userMap.set(user.id, existing);
    }
    return Array.from(userMap.values());
  }
  async createUser(user, projectIds = []) {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values(user).returning();
      if (projectIds.length > 0) {
        await tx.insert(employeeProjects).values(projectIds.map((projectId) => ({ userId: created.id, projectId })));
      }
      return created;
    });
  }
  async updateUser(id, updates, projectIds) {
    return db.transaction(async (tx) => {
      const updateData = {};
      if (Object.prototype.hasOwnProperty.call(updates, "ownerId")) {
        updateData.ownerId = updates.ownerId ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "isActive")) {
        updateData.isActive = updates.isActive;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "employeeAccess")) {
        updateData.employeeAccess = updates.employeeAccess ?? [];
      }
      if (Object.prototype.hasOwnProperty.call(updates, "employeeManageAccess")) {
        updateData.employeeManageAccess = updates.employeeManageAccess ?? [];
      }
      const [updated] = await tx.update(users).set(updateData).where(eq(users.id, id)).returning();
      if (projectIds !== void 0) {
        await tx.delete(employeeProjects).where(eq(employeeProjects.userId, id));
        if (projectIds.length > 0) {
          await tx.insert(employeeProjects).values(projectIds.map((projectId) => ({ userId: id, projectId })));
        }
      }
      return updated;
    });
  }
  async updateUserPassword(id, passwordHash) {
    const [updated] = await withRetry(
      () => db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning()
    );
    return updated;
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectMemory from "memorystore";

// server/password.ts
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scrypt = promisify(_scrypt);
async function hashPassword(password, salt) {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const derived = await scrypt(password, resolvedSalt, 64);
  return `${resolvedSalt}:${derived.toString("hex")}`;
}
async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) {
    return false;
  }
  const derived = await scrypt(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(derived, keyBuffer);
}

// server/auth.ts
var MemoryStore = connectMemory(session);
function toSessionUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ownerId: user.ownerId ?? null,
    employeeAccess: user.employeeAccess ?? [],
    employeeManageAccess: user.employeeManageAccess ?? [],
    employeeProjectIds: user.employeeProjectIds ?? []
  };
}
async function ensureDefaultAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "!!jhalakhan!!";
  const normalizedEmail = email.toLowerCase();
  const existing = await storage.findUserByEmail(normalizedEmail);
  if (existing) {
    return;
  }
  const passwordHash = await hashPassword(password);
  await storage.createUser({
    email: normalizedEmail,
    passwordHash,
    role: "admin",
    isActive: true,
    employeeAccess: [],
    employeeManageAccess: []
  });
  console.warn(
    `[auth] Created default admin account ${normalizedEmail}. Please change the password via the ADMIN_PASSWORD environment variable.`
  );
}
async function initializeAuth(app2) {
  await ensureDefaultAdminUser();
  const sessionSecret = process.env.SESSION_SECRET || "fleetflow-dev-secret";
  app2.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 1e3 * 60 * 60 * 24 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1e3 * 60 * 60 * 8
      }
    })
  );
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          const user = await storage.findUserByEmail(email.toLowerCase());
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.isActive) {
            return done(null, false, { message: "Account is disabled" });
          }
          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, toSessionUser(user));
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.findUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, toSessionUser(user));
    } catch (error) {
      done(error);
    }
  });
  app2.use(passport.initialize());
  app2.use(passport.session());
}

// server/routes.ts
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}
function isAdmin(req) {
  return req.user?.role === "admin";
}
function isOwner(req) {
  return req.user?.role === "owner";
}
function isEmployee(req) {
  return req.user?.role === "employee";
}
function hasEmployeeAccess(req, area) {
  return isEmployee(req) && req.user?.employeeAccess?.includes(area) === true;
}
function hasEmployeeManageAccess(req, area) {
  return isEmployee(req) && req.user?.employeeManageAccess?.includes(area) === true;
}
function hasAnyEmployeeAccess(req, ...areas) {
  return areas.some((area) => hasEmployeeAccess(req, area) || hasEmployeeManageAccess(req, area));
}
function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
}
function requireAdminOrEmployee(req, res, area, options) {
  if (isAdmin(req)) {
    return true;
  }
  if (area && options?.manage && hasEmployeeManageAccess(req, area)) {
    return true;
  }
  if (area && hasEmployeeAccess(req, area)) {
    return true;
  }
  if (!area && isEmployee(req)) {
    return true;
  }
  const areaMessage = area ? ` for ${area} operations` : "";
  res.status(403).json({ message: `Admin or employee access${areaMessage} required` });
  return false;
}
function ownerIdOrForbidden(req, res) {
  const ownerId = req.user?.ownerId ?? void 0;
  if (!ownerId) {
    res.status(403).json({ message: "Owner account is not linked to an owner record" });
    return void 0;
  }
  return ownerId;
}
function ensureOwnerAccess(req, res, ownerId, employeeArea) {
  if (isAdmin(req)) {
    return true;
  }
  if (employeeArea && hasEmployeeAccess(req, employeeArea)) {
    return true;
  }
  if (isOwner(req) && req.user?.ownerId === ownerId) {
    return true;
  }
  res.status(403).json({ message: "Access denied" });
  return false;
}
function employeeProjectIds(req) {
  return req.user?.employeeProjectIds ?? [];
}
function ensureProjectAccess(req, res, projectId) {
  if (isAdmin(req)) {
    return true;
  }
  if (isEmployee(req) && employeeProjectIds(req).includes(projectId)) {
    return true;
  }
  res.status(403).json({ message: "Access denied" });
  return false;
}
async function registerRoutes(app2) {
  app2.post("/api/auth/login", async (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    passport.authenticate(
      "local",
      (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          const message = typeof info?.message === "string" ? info.message : "Invalid email or password";
          return res.status(401).json({ message });
        }
        req.logIn(user, (loginError) => {
          if (loginError) {
            return next(loginError);
          }
          res.json(user);
        });
      }
    )(req, res, next);
  });
  app2.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(204).send();
    });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
  app2.use("/api", ensureAuthenticated);
  app2.get("/api/dashboard/stats", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/owners", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "owners")) {
      return;
    }
    try {
      const owners2 = await storage.getOwners();
      res.json(owners2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/owners/:id", async (req, res) => {
    try {
      const owner = await storage.getOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      if (!ensureOwnerAccess(req, res, owner.id, "owners")) {
        return;
      }
      res.json(owner);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/owners", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(validatedData);
      res.status(201).json(owner);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/owners/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
      return;
    }
    try {
      const validatedData = updateOwnerSchema.parse(req.body);
      const owner = await storage.updateOwner(req.params.id, validatedData);
      res.json(owner);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/owners/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
      return;
    }
    try {
      await storage.deleteOwner(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/customers", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }
    try {
      const customers2 = await storage.getCustomers();
      res.json(customers2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/customers", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    try {
      const validatedData = updateCustomerSchema.parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/users", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const users2 = await storage.getUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/users", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    let validatedData;
    try {
      validatedData = createUserSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    try {
      const email = validatedData.email.toLowerCase();
      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email is already in use" });
      }
      if (validatedData.role === "owner" && validatedData.ownerId) {
        const owner2 = await storage.getOwner(validatedData.ownerId);
        if (!owner2) {
          return res.status(400).json({ message: "Owner not found" });
        }
      }
      if (validatedData.role === "employee" && validatedData.employeeProjectIds?.length) {
        const projects2 = await storage.getProjects({ ids: validatedData.employeeProjectIds });
        if (projects2.length !== validatedData.employeeProjectIds.length) {
          return res.status(400).json({ message: "One or more selected projects were not found" });
        }
      }
      const passwordHash = await hashPassword(validatedData.password);
      const created = await storage.createUser(
        {
          email,
          passwordHash,
          role: validatedData.role,
          ownerId: validatedData.role === "owner" ? validatedData.ownerId : null,
          isActive: true,
          employeeAccess: validatedData.role === "employee" ? validatedData.employeeAccess ?? [] : [],
          employeeManageAccess: validatedData.role === "employee" ? validatedData.employeeManageAccess ?? [] : []
        },
        validatedData.role === "employee" ? validatedData.employeeProjectIds ?? [] : []
      );
      const owner = created.ownerId ? await storage.getOwner(created.ownerId) : null;
      const { passwordHash: _ph, ...user } = created;
      res.status(201).json({ ...user, owner });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    let validatedData;
    try {
      validatedData = updateUserSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    try {
      const user = await storage.findUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (Object.prototype.hasOwnProperty.call(validatedData, "ownerId")) {
        if (user.role !== "owner") {
          return res.status(400).json({ message: "Only owner accounts can be linked to an owner" });
        }
        if (validatedData.ownerId) {
          const owner2 = await storage.getOwner(validatedData.ownerId);
          if (!owner2) {
            return res.status(400).json({ message: "Owner not found" });
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(validatedData, "isActive") && user.role === "admin") {
        return res.status(400).json({ message: "Admin accounts cannot be enabled or disabled" });
      }
      const hasEmployeeAccessUpdate = Object.prototype.hasOwnProperty.call(validatedData, "employeeAccess");
      const hasEmployeeManageUpdate = Object.prototype.hasOwnProperty.call(
        validatedData,
        "employeeManageAccess"
      );
      const hasProjectUpdate = Object.prototype.hasOwnProperty.call(validatedData, "employeeProjectIds");
      if ((hasEmployeeAccessUpdate || hasEmployeeManageUpdate || hasProjectUpdate) && user.role !== "employee") {
        return res.status(400).json({ message: "Only employee accounts can have page access configured" });
      }
      if (hasEmployeeManageUpdate && validatedData.employeeManageAccess) {
        const baseAccess = validatedData.employeeAccess ?? user.employeeAccess;
        if (validatedData.employeeManageAccess.some((area) => !baseAccess.includes(area))) {
          return res.status(400).json({ message: "Manage access requires view access for the same area" });
        }
      }
      if (hasProjectUpdate && validatedData.employeeProjectIds) {
        const projects2 = await storage.getProjects({ ids: validatedData.employeeProjectIds });
        if (projects2.length !== validatedData.employeeProjectIds.length) {
          return res.status(400).json({ message: "One or more selected projects were not found" });
        }
      }
      const { employeeProjectIds: employeeProjectIds2, ...updateFields } = validatedData;
      const updated = await storage.updateUser(user.id, updateFields, employeeProjectIds2);
      const owner = updated.ownerId ? await storage.getOwner(updated.ownerId) : null;
      const { passwordHash: _ph, ...safeUser } = updated;
      res.json({ ...safeUser, owner });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/users/:id/reset-password", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    let validatedData;
    try {
      validatedData = adminResetPasswordSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    try {
      const user = await storage.findUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role === "admin") {
        return res.status(400).json({ message: "Admin passwords cannot be reset by another admin" });
      }
      const passwordHash = await hashPassword(validatedData.newPassword);
      await storage.updateUserPassword(user.id, passwordHash);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/users/change-password", async (req, res) => {
    let validatedData;
    try {
      validatedData = changePasswordSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const user = await storage.findUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isValid = await verifyPassword(validatedData.currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      if (await verifyPassword(validatedData.newPassword, user.passwordHash)) {
        return res.status(400).json({ message: "New password must be different from the current password" });
      }
      const newHash = await hashPassword(validatedData.newPassword);
      await storage.updateUserPassword(userId, newHash);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/vehicles", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "vehicles")) {
        if (isEmployee(req)) {
          const projects2 = employeeProjectIds(req);
          const vehicles3 = projects2.length > 0 ? await storage.getVehicles({ projectIds: projects2 }) : [];
          return res.json(vehicles3);
        }
        const vehicles2 = await storage.getVehicles();
        return res.json(vehicles2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const vehicles2 = await storage.getVehicles({ ownerId });
        return res.json(vehicles2);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      if (!ensureOwnerAccess(req, res, vehicle.owner.id, "vehicles")) {
        return;
      }
      if (isEmployee(req)) {
        const allowedProjects = employeeProjectIds(req);
        const assignmentsForVehicle = await storage.getAssignmentsByVehicle(vehicle.id);
        const isLinked = assignmentsForVehicle.some(
          (assignment) => allowedProjects.includes(assignment.project.id)
        );
        if (!isLinked) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/vehicles/owner/:ownerId", async (req, res) => {
    if (!ensureOwnerAccess(req, res, req.params.ownerId, "vehicles")) {
      return;
    }
    try {
      const vehicles2 = await storage.getVehicles({ ownerId: req.params.ownerId });
      res.json(vehicles2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/vehicles", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
      return;
    }
    try {
      const validatedData = createVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/vehicles/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
      return;
    }
    try {
      const validatedData = updateVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, validatedData);
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/vehicles/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
      return;
    }
    try {
      await storage.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }
    try {
      if (isEmployee(req)) {
        const projects3 = employeeProjectIds(req);
        const results = projects3.length > 0 ? await storage.getProjects({ ids: projects3 }) : [];
        return res.json(results);
      }
      const projects2 = await storage.getProjects();
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/projects/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }
    if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.id)) {
      return;
    }
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/projects/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.id)) {
      return;
    }
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/projects/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }
    if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.id)) {
      return;
    }
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/projects/:id/customer-rates", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const rates = await storage.getProjectCustomerRates(req.params.id);
      res.json(rates);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/projects/:id/customer-rates", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const parsedRates = insertProjectVehicleCustomerRateSchema.array().parse((req.body?.rates ?? []).map((rate) => ({ ...rate, projectId: req.params.id })));
      const rates = await storage.upsertProjectCustomerRates(req.params.id, parsedRates);
      res.status(201).json(rates);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/assignments", async (req, res) => {
    try {
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        const assignments2 = isEmployee(req) ? await storage.getAssignments({ projectIds: employeeProjectIds(req) }) : await storage.getAssignments();
        return res.json(assignments2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const assignments2 = await storage.getAssignments({ ownerId });
        return res.json(assignments2);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      if (isAdmin(req)) {
        return res.json(assignment);
      }
      if (isEmployee(req)) {
        if (!hasAnyEmployeeAccess(req, "assignments", "attendance")) {
          return res.status(403).json({ message: "Access denied" });
        }
        if (!ensureProjectAccess(req, res, assignment.project.id)) {
          return;
        }
        return res.json(assignment);
      }
      if (!ensureOwnerAccess(req, res, assignment.vehicle.owner.id, "assignments")) {
        return;
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/assignments/project/:projectId", async (req, res) => {
    try {
      const assignments2 = await storage.getAssignmentsByProject(req.params.projectId);
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.projectId)) {
          return;
        }
        return res.json(assignments2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        return res.json(assignments2.filter((assignment) => assignment.vehicle.owner.id === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/assignments/vehicle/:vehicleId", async (req, res) => {
    try {
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const vehicle = await storage.getVehicle(req.params.vehicleId);
        if (!vehicle || vehicle.owner.id !== ownerId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const assignments2 = await storage.getAssignmentsByVehicle(req.params.vehicleId);
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        if (isEmployee(req) && assignments2.every((assignment) => !employeeProjectIds(req).includes(assignment.project.id))) {
          return res.status(403).json({ message: "Access denied" });
        }
        return res.json(assignments2);
      }
      if (isOwner(req)) {
        const ownerId = req.user?.ownerId;
        return res.json(assignments2.filter((assignment) => assignment.vehicle.owner.id === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/assignments", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "assignments", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertAssignmentSchema.parse(req.body);
      if (isEmployee(req) && !employeeProjectIds(req).includes(validatedData.projectId)) {
        return res.status(403).json({ message: "You cannot manage assignments for this project" });
      }
      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/assignments/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "assignments", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertAssignmentSchema.partial().parse(req.body);
      if (isEmployee(req) && validatedData.projectId && !employeeProjectIds(req).includes(validatedData.projectId)) {
        return res.status(403).json({ message: "You cannot manage assignments for this project" });
      }
      const assignment = await storage.updateAssignment(req.params.id, validatedData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/assignments/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "assignments", { manage: true })) {
      return;
    }
    try {
      if (isEmployee(req)) {
        const assignment = await storage.getAssignment(req.params.id);
        if (!assignment) {
          return res.status(404).json({ message: "Assignment not found" });
        }
        if (!employeeProjectIds(req).includes(assignment.project.id)) {
          return res.status(403).json({ message: "You cannot manage assignments for this project" });
        }
      }
      await storage.deleteAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/payments", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        const payments2 = await storage.getPayments();
        if (isEmployee(req)) {
          const allowedProjects = new Set(employeeProjectIds(req));
          return res.json(
            payments2.filter((payment) => allowedProjects.has(payment.assignment.project.id))
          );
        }
        return res.json(payments2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const payments2 = await storage.getPayments({ ownerId });
        return res.json(payments2);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/payments/outstanding", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        const payments2 = await storage.getOutstandingPayments();
        if (isEmployee(req)) {
          const allowedProjects = new Set(employeeProjectIds(req));
          return res.json(
            payments2.filter((payment) => allowedProjects.has(payment.assignment.project.id))
          );
        }
        return res.json(payments2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const payments2 = await storage.getOutstandingPayments({ ownerId });
        return res.json(payments2);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (!ensureOwnerAccess(req, res, payment.paymentOwner?.id ?? payment.ownerId, "payments")) {
        return;
      }
      if (isEmployee(req) && !employeeProjectIds(req).includes(payment.assignment.project.id)) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/payments/assignment/:assignmentId", async (req, res) => {
    try {
      const payments2 = await storage.getPaymentsByAssignment(req.params.assignmentId);
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        if (isEmployee(req) && payments2.every((payment) => !employeeProjectIds(req).includes(payment.assignment.project.id))) {
          return res.status(403).json({ message: "Access denied" });
        }
        return res.json(payments2);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        return res.json(payments2.filter((payment) => payment.paymentOwner?.id === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/payments", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const parsedData = createPaymentRequestSchema.parse(req.body);
      if (isEmployee(req)) {
        const assignment = await storage.getAssignment(parsedData.assignmentId);
        if (!assignment || !employeeProjectIds(req).includes(assignment.project.id)) {
          return res.status(403).json({ message: "You cannot manage payments for this project" });
        }
      }
      const { attendanceDates, maintenanceRecordIds, ...paymentValues } = parsedData;
      const payment = await storage.createPayment(
        paymentValues,
        attendanceDates,
        maintenanceRecordIds
      );
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/payments/:id/transactions", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      if (isEmployee(req)) {
        const payment2 = await storage.getPayment(req.params.id);
        if (!payment2 || !employeeProjectIds(req).includes(payment2.assignment.project.id)) {
          return res.status(403).json({ message: "You cannot manage payments for this project" });
        }
      }
      const validatedData = createPaymentTransactionSchema.parse(req.body);
      const transaction = await storage.createPaymentTransaction(req.params.id, validatedData);
      const payment = await storage.getPayment(req.params.id);
      res.status(201).json({ transaction, payment });
    } catch (error) {
      const status = error.status ?? (error instanceof Error && error.message.includes("not found") ? 404 : 400);
      res.status(status).json({ message: error.message });
    }
  });
  app2.post("/api/payments/calculate", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const payload = createVehiclePaymentForPeriodSchema.parse(req.body);
      const result = await storage.createVehiclePaymentForPeriod(payload);
      res.status(200).json(result);
    } catch (error) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });
  app2.get("/api/customer-invoices", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments")) {
      return;
    }
    try {
      const projectIds = isEmployee(req) ? employeeProjectIds(req) : void 0;
      const invoices = await storage.getCustomerInvoices({ projectIds });
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/customer-invoices/calculate", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const payload = createCustomerInvoiceSchema.parse(req.body);
      const invoice = await storage.calculateCustomerInvoice(payload);
      res.status(200).json(invoice);
    } catch (error) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });
  app2.post("/api/customer-invoices", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const payload = createCustomerInvoiceSchema.parse(req.body);
      const invoice = await storage.createCustomerInvoice(payload);
      res.status(201).json(invoice);
    } catch (error) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });
  app2.patch("/api/customer-invoices/:id/status", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const { status } = updateCustomerInvoiceStatusSchema.parse(req.body);
      const invoice = await storage.getCustomerInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (isEmployee(req) && !employeeProjectIds(req).includes(invoice.projectId)) {
        return res.status(403).json({ message: "You cannot update invoices for this project" });
      }
      const updated = await storage.updateCustomerInvoiceStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });
  app2.post("/api/customer-invoices/:id/payments", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }
    try {
      const payment = createCustomerInvoicePaymentSchema.parse(req.body);
      const invoice = await storage.getCustomerInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (isEmployee(req) && !employeeProjectIds(req).includes(invoice.projectId)) {
        return res.status(403).json({ message: "You cannot update invoices for this project" });
      }
      const updated = await storage.recordCustomerInvoicePayment(req.params.id, payment);
      res.status(201).json(updated);
    } catch (error) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });
  app2.put("/api/payments/:id", async (_req, res) => {
    res.status(405).json({ message: "Payments cannot be modified after they are created." });
  });
  app2.delete("/api/payments/:id", async (_req, res) => {
    res.status(405).json({ message: "Payments cannot be deleted once created." });
  });
  app2.get("/api/maintenance", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "maintenance")) {
        const records = await storage.getMaintenanceRecords();
        return res.json(records);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const records = await storage.getMaintenanceRecords({ ownerId });
        return res.json(records);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/maintenance/vehicle/:vehicleId", async (req, res) => {
    try {
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const vehicle = await storage.getVehicle(req.params.vehicleId);
        if (!vehicle || vehicle.owner.id !== ownerId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const records = await storage.getMaintenanceRecordsByVehicle(req.params.vehicleId);
      if (isAdmin(req) || hasEmployeeAccess(req, "maintenance")) {
        return res.json(records);
      }
      if (isOwner(req)) {
        const ownerId = req.user?.ownerId;
        return res.json(records.filter((record) => record.vehicle.owner.id === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/maintenance/:id", async (req, res) => {
    try {
      const record = await storage.getMaintenanceRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }
      if (!ensureOwnerAccess(req, res, record.vehicle.owner.id, "maintenance")) {
        return;
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/maintenance", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/maintenance/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
      return;
    }
    try {
      const validatedData = insertMaintenanceRecordSchema.partial().parse(req.body);
      const record = await storage.updateMaintenanceRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error) {
      res.status(error.status ?? 400).json({ message: error.message });
    }
  });
  app2.delete("/api/maintenance/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
      return;
    }
    try {
      await storage.deleteMaintenanceRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(error.status ?? 500).json({ message: error.message });
    }
  });
  app2.get("/api/ownership-history", async (req, res) => {
    try {
      const history = await storage.getOwnershipHistory();
      if (isAdmin(req)) {
        return res.json(history);
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        return res.json(history.filter((record) => record.ownerId === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/ownership-history/vehicle/:vehicleId", async (req, res) => {
    try {
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const vehicle = await storage.getVehicle(req.params.vehicleId);
        if (!vehicle || vehicle.owner.id !== ownerId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const history = await storage.getOwnershipHistoryByVehicle(req.params.vehicleId);
      if (isAdmin(req)) {
        return res.json(history);
      }
      if (isOwner(req)) {
        const ownerId = req.user?.ownerId;
        return res.json(history.filter((record) => record.ownerId === ownerId));
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/ownership-history", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const validatedData = insertOwnershipHistorySchema.parse(req.body);
      const record = await storage.createOwnershipHistoryRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/ownership-history/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      const validatedData = updateOwnershipHistorySchema.parse(req.body);
      const record = await storage.updateOwnershipHistoryRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/ownership-history/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }
    try {
      await storage.deleteOwnershipHistoryRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/vehicles/:vehicleId/transfer-ownership", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
      return;
    }
    try {
      const validatedData = transferVehicleOwnershipSchema.parse(req.body);
      await storage.transferVehicleOwnership(
        req.params.vehicleId,
        validatedData.newOwnerId,
        validatedData.transferDate,
        validatedData.transferReason,
        validatedData.transferPrice,
        validatedData.notes
      );
      res.status(200).json({ message: "Vehicle ownership transferred successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/vehicle-attendance", async (req, res) => {
    try {
      const { vehicleId, date: date2, projectId } = req.query;
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        if (vehicleId) {
          const vehicle = await storage.getVehicle(vehicleId);
          if (!vehicle || vehicle.owner.id !== ownerId) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        const attendance = await storage.getVehicleAttendance({
          vehicleId,
          date: date2,
          projectId,
          ownerId
        });
        return res.json(attendance);
      }
      if (isAdmin(req) || hasEmployeeAccess(req, "attendance")) {
        const attendance = await storage.getVehicleAttendance({ vehicleId, date: date2, projectId });
        return res.json(attendance);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/vehicle-attendance/summary", async (req, res) => {
    try {
      const { vehicleId, projectId, startDate, endDate } = req.query;
      if (!vehicleId) {
        return res.status(400).json({ message: "vehicleId is required" });
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ message: "startDate must be on or before endDate" });
      }
      let projectFilter = projectId;
      if (projectFilter === "null") {
        projectFilter = null;
      }
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;
        const vehicle = await storage.getVehicle(vehicleId);
        if (!vehicle || vehicle.owner.id !== ownerId) {
          return res.status(403).json({ message: "Access denied" });
        }
        const summary = await storage.getVehicleAttendanceSummary({
          vehicleId,
          projectId: projectFilter,
          startDate,
          endDate,
          ownerId
        });
        return res.json(summary);
      }
      if (isAdmin(req) || hasEmployeeAccess(req, "attendance")) {
        const summary = await storage.getVehicleAttendanceSummary({
          vehicleId,
          projectId: projectFilter,
          startDate,
          endDate
        });
        return res.json(summary);
      }
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      res.status(500).json({ message: error?.message || "Failed to load attendance summary" });
    }
  });
  app2.post("/api/vehicle-attendance", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "attendance", { manage: true })) {
      return;
    }
    try {
      const validated = insertVehicleAttendanceSchema.parse(req.body);
      const attendanceDate = new Date(validated.attendanceDate);
      if (Number.isNaN(attendanceDate.getTime())) {
        return res.status(400).json({ message: "attendanceDate must be a valid date" });
      }
      if (isEmployee(req)) {
        if (!validated.projectId) {
          return res.status(400).json({ message: "projectId is required when recording attendance as an employee" });
        }
        const allowedProjects = new Set(employeeProjectIds(req));
        if (!allowedProjects.has(validated.projectId)) {
          return res.status(403).json({ message: "You cannot manage attendance for this project" });
        }
        const vehicleAssignments = await storage.getAssignmentsByVehicle(validated.vehicleId);
        if (!vehicleAssignments.some((assignment) => assignment.project.id === validated.projectId)) {
          return res.status(403).json({ message: "Vehicle is not assigned to one of your projects" });
        }
      }
      if (validated.projectId) {
        const project = await storage.getProject(validated.projectId);
        if (!project) {
          return res.status(400).json({ message: "Project not found" });
        }
        if (attendanceDate < new Date(project.startDate)) {
          return res.status(400).json({ message: "Attendance date cannot be before the project's start date" });
        }
        const vehicleAssignments = await storage.getAssignmentsByVehicle(validated.vehicleId);
        const assignmentForProject = vehicleAssignments.find(
          (assignment) => assignment.project.id === validated.projectId
        );
        if (!assignmentForProject) {
          return res.status(400).json({ message: "Vehicle is not assigned to this project" });
        }
        if (attendanceDate < new Date(assignmentForProject.startDate)) {
          return res.status(400).json({ message: "Attendance date cannot be before the vehicle's assignment start date" });
        }
      }
      const created = await storage.createVehicleAttendance(validated);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/vehicle-attendance/batch", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "attendance", { manage: true })) {
      return;
    }
    try {
      const body = req.body;
      if (!Array.isArray(body)) {
        return res.status(400).json({ message: "Expected an array of attendance records" });
      }
      console.log("[vehicle-attendance/batch] received", { count: body.length });
      const validatedRecords = body.map((b) => insertVehicleAttendanceSchema.parse(b));
      const projectCache = /* @__PURE__ */ new Map();
      const assignmentCache = /* @__PURE__ */ new Map();
      if (isEmployee(req)) {
        const allowedProjects = new Set(employeeProjectIds(req));
        for (const record of validatedRecords) {
          if (!record.projectId) {
            return res.status(400).json({ message: "projectId is required for employee attendance" });
          }
          if (!allowedProjects.has(record.projectId)) {
            return res.status(403).json({ message: "You cannot manage attendance for this project" });
          }
          if (!assignmentCache.has(record.vehicleId)) {
            assignmentCache.set(
              record.vehicleId,
              await storage.getAssignmentsByVehicle(record.vehicleId)
            );
          }
          const assignments2 = assignmentCache.get(record.vehicleId);
          if (!assignments2.some((assignment) => assignment.project.id === record.projectId)) {
            return res.status(403).json({ message: "Vehicle is not assigned to one of your projects" });
          }
        }
      }
      for (const record of validatedRecords) {
        if (!record.projectId) continue;
        const attendanceDate = new Date(record.attendanceDate);
        if (Number.isNaN(attendanceDate.getTime())) {
          return res.status(400).json({ message: "attendanceDate must be a valid date" });
        }
        if (!projectCache.has(record.projectId)) {
          projectCache.set(record.projectId, await storage.getProject(record.projectId));
        }
        const project = projectCache.get(record.projectId);
        if (!project) {
          return res.status(400).json({ message: "Project not found" });
        }
        if (attendanceDate < new Date(project.startDate)) {
          return res.status(400).json({ message: "Attendance date cannot be before the project's start date" });
        }
        if (!assignmentCache.has(record.vehicleId)) {
          assignmentCache.set(
            record.vehicleId,
            await storage.getAssignmentsByVehicle(record.vehicleId)
          );
        }
        const assignments2 = assignmentCache.get(record.vehicleId);
        const assignmentForProject = assignments2.find(
          (assignment) => assignment.project.id === record.projectId
        );
        if (!assignmentForProject) {
          return res.status(400).json({ message: "Vehicle is not assigned to this project" });
        }
        if (attendanceDate < new Date(assignmentForProject.startDate)) {
          return res.status(400).json({ message: "Attendance date cannot be before the vehicle's assignment start date" });
        }
      }
      const created = await storage.createVehicleAttendanceBatch(validatedRecords);
      console.log("[vehicle-attendance/batch] created", { createdCount: created.length });
      res.status(201).json(created);
    } catch (error) {
      console.error("[vehicle-attendance/batch] error", error);
      res.status(400).json({ message: error?.message || "Unknown error", stack: error?.stack });
    }
  });
  app2.post("/api/vehicle-attendance/delete", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "attendance", { manage: true })) {
      return;
    }
    try {
      const body = req.body;
      if (!Array.isArray(body)) {
        return res.status(400).json({ message: "Expected an array of attendance identifiers" });
      }
      const validated = body.map((item) => deleteVehicleAttendanceSchema.parse(item));
      const deleted = await storage.deleteVehicleAttendanceBatch(validated);
      res.status(200).json(deleted);
    } catch (error) {
      res.status(400).json({ message: error?.message || "Failed to delete attendance" });
    }
  });
  app2.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });
  app2.get("/chicken", async (req, res) => {
    res.json({ message: "healthy", status: 200 });
  });
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import "dotenv/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
var index_default = app;
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
var environment = process.env.NODE_ENV ?? "development";
var runningInVercel = Boolean(process.env.VERCEL);
app.set("env", environment);
var bootstrapPromise = (async () => {
  try {
    await initializeAuth(app);
    await registerRoutes(app);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Failed to initialize server: ${message}`, "express");
    throw error;
  }
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (!runningInVercel) {
    const server = createServer(app);
    log(
      `App environment: ${app.get("env")}, setting up ${app.get("env") === "development" ? "Vite" : "static file serving"}...`
    );
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      serveStatic(app);
      log("Using static file serving");
    }
    const port = parseInt(process.env.PORT || "3000", 10);
    await new Promise((resolve) => {
      server.listen(port, () => {
        log(`serving on http://localhost:${port}`);
        resolve();
      });
    });
  } else {
    log(
      "Running inside Vercel environment; HTTP server bootstrap handled by platform",
      "vercel"
    );
  }
})();
app.use(async (_req, _res, next) => {
  try {
    await bootstrapPromise;
    next();
  } catch (error) {
    next(error);
  }
});
export {
  index_default as default
};
