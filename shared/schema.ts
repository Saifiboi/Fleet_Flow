import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, date, timestamp, integer, boolean, primaryKey } from "drizzle-orm/pg-core";
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

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  taxNumber: text("tax_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => owners.id, { onDelete: "set null" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  employeeAccess: text("employee_access")
    .array()
    .notNull()
    .$type<EmployeeAccessArea[]>()
    .default(sql`ARRAY[]::text[]`),
  employeeManageAccess: text("employee_manage_access")
    .array()
    .notNull()
    .$type<EmployeeAccessArea[]>()
    .default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeProjects = pgTable(
  "employee_projects",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: varchar("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.projectId] }),
  }),
);

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
  customerId: varchar("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
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

export const projectVehicleCustomerRates = pgTable("project_vehicle_customer_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
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
  status: text("status").notNull().default("pending"), // pending, paid, overdue
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  transactionDate: date("transaction_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // scheduled, repair, inspection, service, bill_payment, advance, fuel, driver_salary
  description: text("description").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  performedBy: text("performed_by").notNull(),
  serviceDate: date("service_date").notNull(),
  nextServiceDate: date("next_service_date"),
  mileage: integer("mileage"),
  status: text("status").notNull().default("completed"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicleAttendance = pgTable("vehicle_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "set null" }),
  attendanceDate: date("attendance_date").notNull(),
  status: text("status").notNull().default("present"), // present, off, standby, maintenance
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
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

export const customersRelations = relations(customers, ({ many }) => ({
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one }) => ({
  owner: one(owners, {
    fields: [users.ownerId],
    references: [owners.id],
  }),
}));

export const employeeProjectsRelations = relations(employeeProjects, ({ one }) => ({
  user: one(users, {
    fields: [employeeProjects.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [employeeProjects.projectId],
    references: [projects.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id],
  }),
  assignments: many(assignments),
  customerRates: many(projectVehicleCustomerRates),
  maintenanceRecords: many(maintenanceRecords),
  ownershipHistory: many(ownershipHistory),
  vehicleAttendance: many(vehicleAttendance),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  assignments: many(assignments),
  customerRates: many(projectVehicleCustomerRates),
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

export const projectVehicleCustomerRateRelations = relations(
  projectVehicleCustomerRates,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [projectVehicleCustomerRates.vehicleId],
      references: [vehicles.id],
    }),
    project: one(projects, {
      fields: [projectVehicleCustomerRates.projectId],
      references: [projects.id],
    }),
    customer: one(customers, {
      fields: [projectVehicleCustomerRates.customerId],
      references: [customers.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [payments.assignmentId],
    references: [assignments.id],
  }),
  paymentOwner: one(owners, {
    fields: [payments.ownerId],
    references: [owners.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentTransactions.paymentId],
    references: [payments.id],
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

export const employeeAccessAreas = [
  "owners",
  "vehicles",
  "projects",
  "assignments",
  "attendance",
  "projectAttendance",
  "maintenance",
  "payments",
] as const;

export const employeeAccessEnum = z.enum(employeeAccessAreas);

export type EmployeeAccessArea = (typeof employeeAccessAreas)[number];
export type EmployeeProject = typeof employeeProjects.$inferSelect;

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  role: z.enum(["admin", "owner", "employee"]),
}).extend({
  employeeAccess: z.array(employeeAccessEnum).default([]),
  employeeManageAccess: z.array(employeeAccessEnum).default([]),
  employeeProjectIds: z.array(z.string().uuid()).default([]),
});

export const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    role: z.enum(["admin", "owner", "employee"]),
    ownerId: z.string().uuid().optional().nullable(),
    employeeAccess: z.array(employeeAccessEnum).optional().default([]),
    employeeManageAccess: z.array(employeeAccessEnum).optional().default([]),
    employeeProjectIds: z.array(z.string().uuid()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.role === "owner" && !data.ownerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerId"],
        message: "Owner is required when creating an owner account",
      });
    }
    if (data.role === "admin" && data.ownerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerId"],
        message: "Admin accounts cannot be linked to an owner",
      });
    }
    if (data.role === "employee" && data.ownerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerId"],
        message: "Employee accounts cannot be linked to an owner",
      });
    }

    if (data.role !== "employee" && data.employeeAccess && data.employeeAccess.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeAccess"],
        message: "Only employee accounts can have employee access configured",
      });
    }

    if (data.role !== "employee" && data.employeeManageAccess && data.employeeManageAccess.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeManageAccess"],
        message: "Only employee accounts can have employee access configured",
      });
    }

    if (data.role !== "employee" && data.employeeProjectIds && data.employeeProjectIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["employeeProjectIds"],
        message: "Only employee accounts can have project assignments configured",
      });
    }

    if (data.employeeManageAccess && data.employeeAccess) {
      const missingBaseAccess = data.employeeManageAccess.filter(
        (area) => !data.employeeAccess?.includes(area),
      );
      if (missingBaseAccess.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["employeeManageAccess"],
          message: "Manage access requires view access for the same area",
        });
      }
    }
  });

export const updateUserSchema = z
  .object({
    ownerId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    employeeAccess: z.array(employeeAccessEnum).optional(),
    employeeManageAccess: z.array(employeeAccessEnum).optional(),
    employeeProjectIds: z.array(z.string().uuid()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const adminResetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = User["role"];
export type SessionUser = Pick<
  User,
  "id" | "email" | "role" | "ownerId" | "employeeAccess" | "employeeManageAccess"
> & { employeeProjectIds: string[] };
export type PublicUser = Omit<User, "passwordHash">;
export type UserWithOwner = PublicUser & { owner: Owner | null; employeeProjects: Project[] };

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

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

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
  transferDate: z
    .string()
    .min(1, "Transfer date is required")
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      "Transfer date must be a valid date"
    ),
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

export const vehicleTransferPendingPaymentError =
  "Pending attendance payments exist before the ownership transfer date. Please calculate and create the payment for the previous owner before transferring ownership.";

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  customerId: z.string().uuid({ message: "Customer is required" }),
  endDate: z.string().optional().transform(val => val === "" ? null : val), // Make endDate truly optional
});

export const insertAssignmentSchema = createInsertSchema(assignments, {
  monthlyRate: z
    .string({ required_error: "Monthly rate is required" })
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Monthly rate must be a valid non-negative number"
    ),
})
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    endDate: z.string().optional().transform(val => val === "" ? null : val), // Make endDate truly optional
  });

export const insertProjectVehicleCustomerRateSchema = createInsertSchema(projectVehicleCustomerRates, {
  rate: z
    .string({ required_error: "Customer rate is required" })
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Customer rate must be a valid non-negative number"
    ),
})
  .omit({ id: true, createdAt: true, customerId: true })
  .extend({
    projectId: z.string().uuid({ message: "Project is required" }),
    vehicleId: z.string().uuid({ message: "Vehicle is required" }),
  });

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  ownerId: z.string().optional(),
  paidDate: z.string().optional().transform(val => val === "" ? null : val), // Make paidDate truly optional
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  attendanceTotal: z
    .coerce
    .number({ invalid_type_error: "Attendance total must be a valid number" })
    .min(0, "Attendance total cannot be negative")
    .transform((value) => value.toFixed(2)),
  deductionTotal: z
    .coerce
    .number({ invalid_type_error: "Deduction total must be a valid number" })
    .min(0, "Deduction total cannot be negative")
    .transform((value) => value.toFixed(2)),
  totalDays: z
    .coerce
    .number({ invalid_type_error: "Total days must be provided" })
    .int("Total days must be a whole number")
    .min(0, "Total days cannot be negative"),
  maintenanceCount: z
    .coerce
    .number({ invalid_type_error: "Maintenance count must be provided" })
    .int("Maintenance count must be a whole number")
    .min(0, "Maintenance count cannot be negative"),
});

export const createPaymentRequestSchema = insertPaymentSchema.extend({
  attendanceDates: z.array(z.string()).optional(),
  maintenanceRecordIds: z.array(z.string()).optional(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentId: z.string().min(1, "Payment is required"),
  amount: z
    .coerce
    .number({ invalid_type_error: "Amount must be a valid number" })
    .gt(0, "Amount must be greater than zero")
    .transform((value) => value.toFixed(2)),
  method: z.enum(["cash", "bank_transfer", "cheque", "mobile_wallet", "other"]).default("cash"),
  transactionDate: z
    .string()
    .min(1, "Transaction date is required")
    .transform((value) => value),
  referenceNumber: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  notes: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  recordedBy: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const createPaymentTransactionSchema = insertPaymentTransactionSchema.omit({ paymentId: true });

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  nextServiceDate: z.string().optional().transform(val => val === "" ? null : val), // Make nextServiceDate truly optional
  mileage: z.number().optional(), // Make mileage truly optional
  isPaid: z.boolean().optional().default(false),
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
  isPaid: z.boolean().optional().default(false),
});

export const deleteVehicleAttendanceSchema = z.object({
  vehicleId: z.string(),
  attendanceDate: z.string(),
  projectId: z.string().nullable().optional(),
});

export const createVehiclePaymentForPeriodSchema = z
  .object({
    assignmentId: z.string().min(1, "Assignment is required"),
    startDate: z
      .string()
      .min(1, "Start date is required"),
    endDate: z
      .string()
      .min(1, "End date is required"),
    dueDate: z
      .string()
      .min(1, "Due date is required"),
    status: z.enum(["pending", "paid", "overdue"]).default("pending").optional(),
    paidDate: z
      .string()
      .optional()
      .transform((val) => (val === "" || val === undefined ? null : val)),
    invoiceNumber: z
      .string()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .superRefine((data, ctx) => {
    const parseDate = (value: string, field: keyof typeof data) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Please provide a valid date",
        });
      }
      return date;
    };

    const start = parseDate(data.startDate, "startDate");
    const end = parseDate(data.endDate, "endDate");
    const due = parseDate(data.dueDate, "dueDate");

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }

    if (!Number.isNaN(end.getTime()) && !Number.isNaN(due.getTime()) && due < end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "Due date must be on or after the end date",
      });
    }

    if (data.paidDate) {
      const paid = parseDate(data.paidDate, "paidDate");
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(paid.getTime()) &&
        paid < start
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paidDate"],
          message: "Paid date cannot be before the start date",
        });
      }
    }
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

export const updateCustomerSchema = insertCustomerSchema.partial();

export const updateOwnershipHistorySchema = insertOwnershipHistorySchema.partial();

// Types
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type UpdateOwner = z.infer<typeof updateOwnerSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;

export type OwnershipHistory = typeof ownershipHistory.$inferSelect;
export type InsertOwnershipHistory = z.infer<typeof insertOwnershipHistorySchema>;
export type UpdateOwnershipHistory = z.infer<typeof updateOwnershipHistorySchema>;
export type OwnershipHistoryWithOwner = OwnershipHistory & {
  owner: Owner;
};

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type TransferVehicleOwnership = z.infer<typeof transferVehicleOwnershipSchema>;

export type Project = typeof projects.$inferSelect;
export type ProjectWithCustomer = Project & { customer: Customer };
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type ProjectVehicleCustomerRate = typeof projectVehicleCustomerRates.$inferSelect;
export type InsertProjectVehicleCustomerRate = z.infer<
  typeof insertProjectVehicleCustomerRateSchema
>;
export type ProjectVehicleCustomerRateWithVehicle = ProjectVehicleCustomerRate & {
  vehicle: VehicleWithOwner;
};

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentRequestSchema>;

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
  project: ProjectWithCustomer;
};

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type CreatePaymentTransaction = z.infer<typeof createPaymentTransactionSchema>;

export type PaymentWithDetails = Payment & {
  assignment: AssignmentWithDetails;
  paymentOwner: Owner | null;
  transactions: PaymentTransaction[];
  totalPaid: number;
  outstandingAmount: number;
};

export type VehiclePaymentMonthlyBreakdown = {
  year: number;
  month: number;
  monthLabel: string;
  periodStart: string;
  periodEnd: string;
  totalDaysInMonth: number;
  presentDays: number;
  dailyRate: number;
  amount: number;
};

export type VehiclePaymentMaintenanceBreakdown = {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  serviceDate: string;
  type: string;
  description: string;
  performedBy: string;
  cost: number;
  isPaid: boolean;
};

export type VehiclePaymentCalculation = {
  assignmentId: string;
  vehicleId: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  monthlyRate: number;
  maintenanceCost: number;
  monthlyBreakdown: VehiclePaymentMonthlyBreakdown[];
  maintenanceBreakdown: VehiclePaymentMaintenanceBreakdown[];
  alreadyPaidMaintenance: VehiclePaymentMaintenanceBreakdown[];
  totalPresentDays: number;
  totalAmountBeforeMaintenance: number;
  netAmount: number;
  attendanceDates: string[];
  maintenanceRecordIds: string[];
  alreadyPaidDates: string[];
};

export type VehiclePaymentForPeriodResult = {
  assignment: AssignmentWithDetails;
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
