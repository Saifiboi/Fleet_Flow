import {
  owners,
  vehicles,
  customers,
  projects,
  assignments,
  projectVehicleCustomerRates,
  payments,
  paymentTransactions,
  customerInvoices,
  customerInvoiceItems,
  customerInvoicePayments,
  maintenanceRecords,
  ownershipHistory,
  vehicleAttendance,
  users,
  employeeProjects,
  type Owner,
  type InsertOwner,
  type UpdateOwner,
  type Customer,
  type InsertCustomer,
  type UpdateCustomer,
  type Vehicle,
  type InsertVehicle,
  type Project,
  type ProjectWithCustomer,
  type InsertProject,
  type Assignment,
  type InsertAssignment,
  type ProjectVehicleCustomerRate,
  type InsertProjectVehicleCustomerRate,
  type ProjectVehicleCustomerRateWithVehicle,
  type Payment,
  type InsertPayment,
  type CustomerInvoice,
  type InsertCustomerInvoice,
  type CustomerInvoiceItem,
  type CustomerInvoiceItemWithVehicle,
  type CreateCustomerInvoiceRequest,
  type CustomerInvoiceWithItems,
  type CustomerInvoiceCalculation,
  type CustomerInvoiceWithDetails,
  type UpdateCustomerInvoiceStatus,
  type CustomerInvoicePayment,
  type InsertCustomerInvoicePayment,
  type CreateCustomerInvoicePayment,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type CreatePaymentTransaction,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type OwnershipHistory,
  type InsertOwnershipHistory,
  type UpdateOwnershipHistory,
  type OwnershipHistoryWithOwner,
  type VehicleWithOwner,
  type VehicleAttendance,
  type InsertVehicleAttendance,
  type DeleteVehicleAttendance,
  type VehicleAttendanceWithVehicle,
  type VehicleAttendanceSummary,
  type AssignmentWithDetails,
  type PaymentWithDetails,
  type MaintenanceRecordWithVehicle,
  type CreateVehiclePaymentForPeriod,
  type VehiclePaymentCalculation,
  type VehiclePaymentForPeriodResult,
  type User,
  type InsertUser,
  type UserWithOwner,
  vehicleTransferPendingPaymentError,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql, isNull, gte, lte, ne, inArray, or, lt } from "drizzle-orm";

// Helper function to retry database operations on connection failures
async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection-related error that should be retried
      const isConnectionError = error.message?.includes('connection') || 
                               error.message?.includes('terminating') ||
                               error.code === '57P01' || // Admin shutdown
                               error.code === '08P01' || // Protocol violation  
                               error.code === '08006' || // Connection failure
                               error.code === '08003';   // Connection does not exist
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`Database operation failed on attempt ${attempt}, retrying...`, error.message);
        // Exponential backoff: wait 1s, then 2s, then 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

type PaymentJoinRow = {
  payments: Payment;
  assignments: Assignment | null;
  vehicles: Vehicle | null;
  owners: Owner | null;
  projects: Project | null;
  customers: Customer | null;
};

type ProjectRateInput = Pick<InsertProjectVehicleCustomerRate, "vehicleId" | "rate">;

export interface IStorage {
  // Owners
  getOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<UpdateOwner>): Promise<Owner>;
  deleteOwner(id: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Vehicles
  getVehicles(filter?: { ownerId?: string; projectIds?: string[] }): Promise<VehicleWithOwner[]>;
  getVehicle(id: string): Promise<VehicleWithOwner | undefined>;
  getVehiclesByOwner(ownerId: string): Promise<VehicleWithOwner[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;

  // Projects
  getProjects(filter?: { ids?: string[] }): Promise<ProjectWithCustomer[]>;
  getProject(id: string): Promise<ProjectWithCustomer | undefined>;
  createProject(project: InsertProject): Promise<ProjectWithCustomer>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<ProjectWithCustomer>;
  deleteProject(id: string): Promise<void>;

  // Project customer rates
  getProjectCustomerRates(projectId: string): Promise<ProjectVehicleCustomerRateWithVehicle[]>;
  upsertProjectCustomerRates(
    projectId: string,
    rates: ProjectRateInput[],
  ): Promise<ProjectVehicleCustomerRate[]>;

  // Assignments
  getAssignments(filter?: { ownerId?: string; projectIds?: string[] }): Promise<AssignmentWithDetails[]>;
  getAssignment(id: string): Promise<AssignmentWithDetails | undefined>;
  getAssignmentsByProject(projectId: string): Promise<AssignmentWithDetails[]>;
  getAssignmentsByVehicle(vehicleId: string): Promise<AssignmentWithDetails[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;

  // Payments
  getPayments(filter?: { ownerId?: string }): Promise<PaymentWithDetails[]>;
  getPayment(id: string): Promise<PaymentWithDetails | undefined>;
  getPaymentsByAssignment(assignmentId: string): Promise<PaymentWithDetails[]>;
  getOutstandingPayments(filter?: { ownerId?: string }): Promise<PaymentWithDetails[]>;
  createPayment(
    payment: InsertPayment,
    attendanceDates?: string[],
    maintenanceRecordIds?: string[]
  ): Promise<Payment>;
  getPaymentTransactions(paymentId: string): Promise<PaymentTransaction[]>;
  createPaymentTransaction(
    paymentId: string,
    transaction: CreatePaymentTransaction
  ): Promise<PaymentTransaction>;
  createVehiclePaymentForPeriod(
    payload: CreateVehiclePaymentForPeriod
  ): Promise<VehiclePaymentForPeriodResult>;
  createCustomerInvoice(payload: CreateCustomerInvoiceRequest): Promise<CustomerInvoiceWithItems>;
  calculateCustomerInvoice(payload: CreateCustomerInvoiceRequest): Promise<CustomerInvoiceCalculation>;
  getCustomerInvoices(filter?: { projectIds?: string[]; invoiceIds?: string[] }): Promise<
    CustomerInvoiceWithDetails[]
  >;
  getCustomerInvoice(id: string): Promise<CustomerInvoiceWithDetails | null>;
  updateCustomerInvoiceStatus(
    id: string,
    status: UpdateCustomerInvoiceStatus["status"]
  ): Promise<CustomerInvoiceWithDetails | null>;
  recordCustomerInvoicePayment(
    invoiceId: string,
    payment: CreateCustomerInvoicePayment
  ): Promise<CustomerInvoiceWithDetails>;

  // Maintenance Records
  getMaintenanceRecords(filter?: { ownerId?: string }): Promise<MaintenanceRecordWithVehicle[]>;
  getMaintenanceRecord(id: string): Promise<MaintenanceRecordWithVehicle | undefined>;
  getMaintenanceRecordsByVehicle(vehicleId: string): Promise<MaintenanceRecordWithVehicle[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord>;
  deleteMaintenanceRecord(id: string): Promise<void>;

  // Ownership History
  getOwnershipHistory(): Promise<OwnershipHistoryWithOwner[]>;
  getOwnershipHistoryByVehicle(vehicleId: string): Promise<OwnershipHistoryWithOwner[]>;
  createOwnershipHistoryRecord(record: InsertOwnershipHistory): Promise<OwnershipHistory>;
  updateOwnershipHistoryRecord(id: string, record: Partial<UpdateOwnershipHistory>): Promise<OwnershipHistory>;
  deleteOwnershipHistoryRecord(id: string): Promise<void>;
  
  // Vehicle attendance
  getVehicleAttendanceSummary(filter: {
    vehicleId: string;
    projectId?: string | null;
    startDate?: string;
    endDate?: string;
    ownerId?: string;
  }): Promise<VehicleAttendanceSummary[]>;
  getVehicleAttendance(filter?: {
    vehicleId?: string;
    date?: string;
    projectId?: string;
    ownerId?: string;
  }): Promise<VehicleAttendanceWithVehicle[]>;
  createVehicleAttendance(record: InsertVehicleAttendance): Promise<VehicleAttendance>;
  createVehicleAttendanceBatch(records: InsertVehicleAttendance[]): Promise<VehicleAttendance[]>;
  deleteVehicleAttendanceBatch(records: DeleteVehicleAttendance[]): Promise<VehicleAttendance[]>;
  
  // New method for transferring vehicle ownership with proper tracking
  transferVehicleOwnership(
    vehicleId: string,
    newOwnerId: string,
    transferDate: string,
    transferReason?: string,
    transferPrice?: string,
    notes?: string
  ): Promise<void>;

  // Dashboard stats
  getDashboardStats(): Promise<{
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
  }>;

  // Users
  findUserByEmail(email: string): Promise<(User & { employeeProjectIds: string[] }) | undefined>;
  findUserById(id: string): Promise<(User & { employeeProjectIds: string[] }) | undefined>;
  createUser(user: InsertUser, projectIds?: string[]): Promise<User>;
  getUsers(): Promise<UserWithOwner[]>;
  updateUser(
    id: string,
    updates: Partial<Pick<User, "ownerId" | "isActive" | "employeeAccess" | "employeeManageAccess">>,
    projectIds?: string[],
  ): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  private async hydratePayments(rows: PaymentJoinRow[]): Promise<PaymentWithDetails[]> {
    if (rows.length === 0) {
      return [];
    }

    const paymentIds = rows.map((row) => row.payments.id);
    const ownerIds = Array.from(
      new Set(rows.map((row) => row.payments.ownerId).filter((id): id is string => Boolean(id)))
    );

    const transactionsByPayment = new Map<string, PaymentTransaction[]>();
    if (paymentIds.length > 0) {
      const transactionRows = await db
        .select({ transaction: paymentTransactions })
        .from(paymentTransactions)
        .where(inArray(paymentTransactions.paymentId, paymentIds))
        .orderBy(asc(paymentTransactions.transactionDate), asc(paymentTransactions.createdAt));

      for (const { transaction } of transactionRows) {
        const current = transactionsByPayment.get(transaction.paymentId) ?? [];
        current.push(transaction);
        transactionsByPayment.set(transaction.paymentId, current);
      }
    }

    let paymentOwnerMap = new Map<string, Owner>();
    if (ownerIds.length > 0) {
      const ownerRows = await db
        .select({ owner: owners })
        .from(owners)
        .where(inArray(owners.id, ownerIds));

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
            owner: assignmentOwner,
          },
          project: { ...project, customer: projectCustomer },
        },
        paymentOwner: paymentOwnerMap.get(row.payments.ownerId) ?? null,
        transactions,
        totalPaid,
        outstandingAmount,
      };
    });
  }

  private async generateUniqueInvoiceNumber(client = db): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `AHT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await client
        .select({ id: customerInvoices.id })
        .from(customerInvoices)
        .where(eq(customerInvoices.invoiceNumber, candidate))
        .limit(1);

      if (existing.length === 0) {
        return candidate;
      }

      attempts += 1;
    }

    throw new Error("Unable to generate a unique invoice number");
  }

  private async resolveInvoiceNumber(
    preferred: string | undefined,
    client = db
  ): Promise<string> {
    if (preferred) {
      const existing = await client
        .select({ id: customerInvoices.id })
        .from(customerInvoices)
        .where(eq(customerInvoices.invoiceNumber, preferred))
        .limit(1);

      if (existing.length === 0) {
        return preferred;
      }
    }

    return this.generateUniqueInvoiceNumber(client);
  }

  private async ensureInvoicePeriodAvailable(
    projectId: string,
    periodStart: string,
    periodEnd: string,
    client = db
  ): Promise<void> {
    const [existing] = await client
      .select({ id: customerInvoices.id })
      .from(customerInvoices)
      .where(
        and(
          eq(customerInvoices.projectId, projectId),
          eq(customerInvoices.periodStart, periodStart),
          eq(customerInvoices.periodEnd, periodEnd)
        )
      )
      .limit(1);

    if (existing) {
      const error: any = new Error("An invoice already exists for this project and period");
      error.status = 409;
      throw error;
    }
  }

  async getOwners(): Promise<Owner[]> {
    return await withRetry(() => db.select().from(owners).orderBy(desc(owners.createdAt)));
  }

  async getOwner(id: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    const [owner] = await db.insert(owners).values(insertOwner).returning();
    return owner;
  }

  async updateOwner(id: string, updateOwner: Partial<UpdateOwner>): Promise<Owner> {
    const [owner] = await db
      .update(owners)
      .set(updateOwner)
      .where(eq(owners.id, id))
      .returning();
    return owner;
  }

  async deleteOwner(id: string): Promise<void> {
    const [{ value: attendanceCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(vehicleAttendance)
      .innerJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id))
      .where(eq(vehicles.ownerId, id));

    if (attendanceCount > 0) {
      throw new Error("Cannot delete owner because their vehicles have attendance records.");
    }

    await db.delete(owners).where(eq(owners.id, id));
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: string, insertCustomer: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set(insertCustomer)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    const [{ value: projectCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.customerId, id));

    if (projectCount > 0) {
      throw new Error("Cannot delete customer because projects reference it.");
    }

    await db.delete(customers).where(eq(customers.id, id));
  }

  async getVehicles(filter?: { ownerId?: string; projectIds?: string[] }): Promise<VehicleWithOwner[]> {
    let query = db
      .select({ vehicle: vehicles, owner: owners })
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .$dynamic();

    const conditions = [] as any[];

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

    const uniqueRows = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      uniqueRows.set(row.vehicle.id, row);
    }

    return Array.from(uniqueRows.values()).map((row) => ({
      ...row.vehicle,
      owner: row.owner!,
    }));
  }

  async getVehicle(id: string): Promise<VehicleWithOwner | undefined> {
    const [result] = await db
      .select()
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .where(eq(vehicles.id, id));

    if (!result) return undefined;

    return {
      ...result.vehicles,
      owner: result.owners!,
    };
  }

  async getVehiclesByOwner(ownerId: string): Promise<VehicleWithOwner[]> {
    return await this.getVehicles({ ownerId });
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    // Use a transaction to ensure both vehicle and ownership record are created
    return await db.transaction(async (tx) => {
      // 1. Create the vehicle
      const [vehicle] = await tx.insert(vehicles).values(insertVehicle).returning();
      
      // 2. Create initial ownership record
      const today = new Date().toISOString().split('T')[0];
      await tx.insert(ownershipHistory).values({
        vehicleId: vehicle.id,
        ownerId: vehicle.ownerId,
        startDate: today,
        transferReason: 'initial_registration',
        notes: 'Initial vehicle registration',
      });
      
      return vehicle;
    });
  }

  async updateVehicle(id: string, insertVehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set(insertVehicle)
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    const [{ value: attendanceCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(vehicleAttendance)
      .where(eq(vehicleAttendance.vehicleId, id));

    if (attendanceCount > 0) {
      throw new Error("Cannot delete vehicle because attendance records exist for it.");
    }

    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  async getProjects(filter?: { ids?: string[] }): Promise<ProjectWithCustomer[]> {
    let query = db
      .select({ project: projects, customer: customers })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .$dynamic();

    if (filter?.ids && filter.ids.length > 0) {
      query = query.where(inArray(projects.id, filter.ids));
    }

    const results = await withRetry(() => query.orderBy(desc(projects.createdAt)));

    return results.map(({ project, customer }) => ({
      ...project,
      customer: customer!,
    }));
  }

  async getProject(id: string): Promise<ProjectWithCustomer | undefined> {
    const [project] = await db
      .select({ project: projects, customer: customers })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.id, id));

    return project ? { ...project.project, customer: project.customer! } : undefined;
  }

  async createProject(insertProject: InsertProject): Promise<ProjectWithCustomer> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    const customer = await this.getCustomer(project.customerId);
    return { ...project, customer: customer! };
  }

  async updateProject(id: string, insertProject: Partial<InsertProject>): Promise<ProjectWithCustomer> {
    const [project] = await db
      .update(projects)
      .set(insertProject)
      .where(eq(projects.id, id))
      .returning();

    const customer = await this.getCustomer(project.customerId);
    return { ...project, customer: customer! };
  }

  async deleteProject(id: string): Promise<void> {
    const [{ value: attendanceCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(vehicleAttendance)
      .where(eq(vehicleAttendance.projectId, id));

    if (attendanceCount > 0) {
      throw new Error("Cannot delete project because attendance records reference it.");
    }

    await db.delete(projects).where(eq(projects.id, id));
  }

  async getProjectCustomerRates(
    projectId: string,
  ): Promise<(ProjectVehicleCustomerRate & { vehicle: VehicleWithOwner })[]> {
    return await withRetry(async () => {
      const rows = await db
        .select({ rate: projectVehicleCustomerRates, vehicle: vehicles, owner: owners })
        .from(projectVehicleCustomerRates)
        .leftJoin(vehicles, eq(projectVehicleCustomerRates.vehicleId, vehicles.id))
        .leftJoin(owners, eq(vehicles.ownerId, owners.id))
        .where(eq(projectVehicleCustomerRates.projectId, projectId))
        .orderBy(asc(vehicles.make), asc(vehicles.model), asc(vehicles.licensePlate));

      return rows
        .filter((row) => row.vehicle && row.owner)
        .map((row) => ({
          ...row.rate,
          vehicle: { ...row.vehicle!, owner: row.owner! },
        }));
    });
  }

  async upsertProjectCustomerRates(
    projectId: string,
    rates: ProjectRateInput[],
  ): Promise<ProjectVehicleCustomerRate[]> {
    return await withRetry(async () => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const customerId = project.customerId;

      return await db.transaction(async (tx) => {
        const results: ProjectVehicleCustomerRate[] = [];

        for (const rate of rates) {
          const [record] = await tx
            .insert(projectVehicleCustomerRates)
            .values({
              projectId,
              customerId,
              vehicleId: rate.vehicleId,
              rate: rate.rate,
            })
            .onConflictDoUpdate({
              target: [projectVehicleCustomerRates.projectId, projectVehicleCustomerRates.vehicleId],
              set: { rate: rate.rate, customerId },
            })
            .returning();

          results.push(record);
        }

        return results;
      });
    });
  }

  async getAssignments(filter?: { ownerId?: string; projectIds?: string[] }): Promise<AssignmentWithDetails[]> {
    let query = db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .$dynamic();

    const conditions = [] as any[];

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
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: { ...row.projects!, customer: row.customers! },
    }));
  }

  async getAssignment(id: string): Promise<AssignmentWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(assignments.id, id));

    if (!result) return undefined;

    return {
      ...result.assignments,
      vehicle: {
        ...result.vehicles!,
        owner: result.owners!,
      },
      project: { ...result.projects!, customer: result.customers! },
    };
  }

  async getAssignmentsByProject(projectId: string): Promise<AssignmentWithDetails[]> {
    const results = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(assignments.projectId, projectId))
      .orderBy(desc(assignments.createdAt));

    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: { ...row.projects!, customer: row.customers! },
    }));
  }

  async getAssignmentsByVehicle(vehicleId: string): Promise<AssignmentWithDetails[]> {
    const results = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(assignments.vehicleId, vehicleId))
      .orderBy(desc(assignments.createdAt));

    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: { ...row.projects!, customer: row.customers! },
    }));
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const targetStatus = insertAssignment.status ?? "active";
    const normalizeDate = (value: string | Date) =>
      value instanceof Date ? value.toISOString().split("T")[0] : value;

    const [project] = await db
      .select({ startDate: projects.startDate })
      .from(projects)
      .where(eq(projects.id, insertAssignment.projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    if (normalizeDate(insertAssignment.startDate) < normalizeDate(project.startDate)) {
      throw new Error("Assignment start date cannot be before the project start date.");
    }

    if (targetStatus === "active") {
      const [{ value: activeCount }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(assignments)
        .where(and(eq(assignments.vehicleId, insertAssignment.vehicleId), eq(assignments.status, "active")));

      if (activeCount > 0) {
        throw new Error("Vehicle is already assigned to another active project.");
      }
    }

    const [assignment] = await db.insert(assignments).values(insertAssignment).returning();

    // Update vehicle status to assigned
    await db
      .update(vehicles)
      .set({ status: "assigned" })
      .where(eq(vehicles.id, insertAssignment.vehicleId));
    
    return assignment;
  }

  async updateAssignment(id: string, insertAssignment: Partial<InsertAssignment>): Promise<Assignment> {
    // Get the existing assignment to capture original vehicleId before update
    const [existingAssignment] = await db.select().from(assignments).where(eq(assignments.id, id));

    if (!existingAssignment) {
      throw new Error("Assignment not found");
    }

    const updates: Partial<InsertAssignment> = { ...insertAssignment };
    const newVehicleId = updates.vehicleId ?? existingAssignment.vehicleId;
    const newStatus = updates.status ?? existingAssignment.status;
    const targetProjectId = updates.projectId ?? existingAssignment.projectId;
    const targetStartDate = updates.startDate ?? existingAssignment.startDate;
    const normalizeDate = (value: string | Date) =>
      value instanceof Date ? value.toISOString().split("T")[0] : value;

    const [project] = await db
      .select({ startDate: projects.startDate })
      .from(projects)
      .where(eq(projects.id, targetProjectId));

    if (!project) {
      throw new Error("Project not found");
    }

    if (normalizeDate(targetStartDate) < normalizeDate(project.startDate)) {
      throw new Error("Assignment start date cannot be before the project start date.");
    }

    if (updates.projectId !== undefined && updates.projectId !== existingAssignment.projectId) {
      const [{ value: attendanceCount }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(vehicleAttendance)
        .where(
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
      const [{ value: activeCount }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(assignments)
        .where(
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
      const normalizeDate = (value: string | Date | null | undefined): string | null => {
        if (!value) return null;
        if (value instanceof Date) {
          return value.toISOString().split("T")[0];
        }
        return value;
      };

      const today = new Date().toISOString().split("T")[0];
      const effectiveEndDate = normalizeDate(updates.endDate ?? existingAssignment.endDate);

      if (!effectiveEndDate) {
        updates.endDate = today;
      } else if (effectiveEndDate > today) {
        throw new Error("Assignment end date cannot be in the future when marking as completed.");
      } else if (updates.endDate !== undefined) {
        updates.endDate = effectiveEndDate;
      }
    }

    const [assignment] = await db
      .update(assignments)
      .set(updates)
      .where(eq(assignments.id, id))
      .returning();

    // If assignment status is changed to completed, update the ORIGINAL vehicle status to available
    // This handles the edge case where vehicleId might be changed in the same update
    if (newStatus === "completed" && existingAssignment) {
      await db
        .update(vehicles)
        .set({ status: "available" })
        .where(eq(vehicles.id, existingAssignment.vehicleId));
    }
    return assignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    // Get the assignment to find the vehicle
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));

    if (!assignment) {
      return;
    }

    const [{ value: attendanceCount }] = await db
      .select({ value: sql<number>`count(*)` })
      .from(vehicleAttendance)
      .where(
        and(
          eq(vehicleAttendance.vehicleId, assignment.vehicleId),
          eq(vehicleAttendance.projectId, assignment.projectId)
        )
      );

    if (attendanceCount > 0) {
      throw new Error("Cannot delete assignment because attendance exists for this vehicle and project.");
    }

    // Delete the assignment
    await db.delete(assignments).where(eq(assignments.id, id));

    // Update vehicle status back to available
    await db
      .update(vehicles)
      .set({ status: "available" })
      .where(eq(vehicles.id, assignment.vehicleId));
  }

  async getPayments(filter?: { ownerId?: string }): Promise<PaymentWithDetails[]> {
    let query = db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .$dynamic();

    if (filter?.ownerId) {
      query = query.where(eq(payments.ownerId, filter.ownerId));
    }

    query = query.orderBy(desc(payments.createdAt));

    const results = await withRetry(() => query);

    return this.hydratePayments(results as PaymentJoinRow[]);
  }

  async getPayment(id: string): Promise<PaymentWithDetails | undefined> {
    const results = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(payments.id, id));

    if (results.length === 0) return undefined;

    const [payment] = await this.hydratePayments(results as PaymentJoinRow[]);
    return payment;
  }

  async getPaymentsByAssignment(assignmentId: string): Promise<PaymentWithDetails[]> {
    const results = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(payments.assignmentId, assignmentId))
      .orderBy(desc(payments.createdAt));

    return this.hydratePayments(results as PaymentJoinRow[]);
  }

  async getOutstandingPayments(filter?: { ownerId?: string }): Promise<PaymentWithDetails[]> {
    let query = db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .$dynamic();

    let whereClause = and(
      inArray(payments.status, ["pending", "partial"]),
      sql`${payments.dueDate} <= CURRENT_DATE`
    );

    if (filter?.ownerId) {
      whereClause = and(whereClause, eq(payments.ownerId, filter.ownerId));
    }

    query = query.where(whereClause);
    query = query.orderBy(payments.dueDate);

    const results = await withRetry(() => query);

    return this.hydratePayments(results as PaymentJoinRow[]);
  }

  async createPayment(
    insertPayment: InsertPayment,
    attendanceDates?: string[],
    maintenanceRecordIds?: string[]
  ): Promise<Payment> {
    return await db.transaction(async (tx) => {
      if (!insertPayment.periodStart || !insertPayment.periodEnd) {
        throw new Error("Payment period start and end dates are required.");
      }

      const uniqueAttendanceDates = attendanceDates ? Array.from(new Set(attendanceDates)) : [];
      const uniqueMaintenanceIds = maintenanceRecordIds ? Array.from(new Set(maintenanceRecordIds)) : [];

      const [assignmentContext] = await tx
        .select({
          assignment: assignments,
          vehicle: vehicles,
        })
        .from(assignments)
        .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
        .where(eq(assignments.id, insertPayment.assignmentId))
        .limit(1);

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

      const projectCondition = assignmentRecord.projectId
        ? eq(vehicleAttendance.projectId, assignmentRecord.projectId)
        : isNull(vehicleAttendance.projectId);

      const paymentValues: InsertPayment & { ownerId: string } = {
        ...insertPayment,
        amount: roundedAmount.toFixed(2),
        attendanceTotal: attendanceTotalNumber.toFixed(2),
        deductionTotal: deductionTotalNumber.toFixed(2),
        totalDays: uniqueAttendanceDates.length,
        maintenanceCount: uniqueMaintenanceIds.length,
        ownerId: vehicleRecord.ownerId,
      };

      const [payment] = await tx.insert(payments).values(paymentValues).returning();

      if (uniqueAttendanceDates.length > 0) {
        const updatedAttendance = await tx
          .update(vehicleAttendance)
          .set({ isPaid: true })
          .where(
            and(
              eq(vehicleAttendance.vehicleId, assignmentRecord.vehicleId),
              projectCondition,
              eq(vehicleAttendance.isPaid, false),
              inArray(vehicleAttendance.attendanceDate, uniqueAttendanceDates)
            )
          )
          .returning({ attendanceDate: vehicleAttendance.attendanceDate });

        const updatedUniqueDates = new Set(updatedAttendance.map((row) => row.attendanceDate));

        if (updatedUniqueDates.size !== uniqueAttendanceDates.length) {
          throw new Error(
            "Some attendance days have already been marked as paid. Recalculate the payment before creating it."
          );
        }
      }

      await tx
        .update(vehicleAttendance)
        .set({ isPaid: true })
        .where(
          and(
            eq(vehicleAttendance.vehicleId, assignmentRecord.vehicleId),
            projectCondition,
            gte(vehicleAttendance.attendanceDate, paymentValues.periodStart),
            lte(vehicleAttendance.attendanceDate, paymentValues.periodEnd)
          )
        );

      if (uniqueMaintenanceIds.length > 0) {
        const updatedMaintenance = await tx
          .update(maintenanceRecords)
          .set({ isPaid: true })
          .where(
            and(
              eq(maintenanceRecords.vehicleId, assignmentRecord.vehicleId),
              eq(maintenanceRecords.isPaid, false),
              inArray(maintenanceRecords.id, uniqueMaintenanceIds)
            )
          )
          .returning({ id: maintenanceRecords.id });

        if (updatedMaintenance.length !== uniqueMaintenanceIds.length) {
          throw new Error(
            "Some maintenance entries have already been marked as paid. Recalculate the payment before creating it."
          );
        }
      }

      return payment;
    });
  }

  async getPaymentTransactions(paymentId: string): Promise<PaymentTransaction[]> {
    const rows = await db
      .select({ transaction: paymentTransactions })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.paymentId, paymentId))
      .orderBy(asc(paymentTransactions.transactionDate), asc(paymentTransactions.createdAt));

    return rows.map((row) => row.transaction);
  }

  async createPaymentTransaction(
    paymentId: string,
    transaction: CreatePaymentTransaction
  ): Promise<PaymentTransaction> {
    return await db.transaction(async (tx) => {
      const [existingPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      const amountNumber = Number(transaction.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Transaction amount must be greater than zero");
      }

      const transactionValues: InsertPaymentTransaction = {
        ...transaction,
        paymentId,
        amount: amountNumber.toFixed(2),
      };

      const [createdTransaction] = await tx
        .insert(paymentTransactions)
        .values(transactionValues)
        .returning();

      const [{ totalPaid }] = await tx
        .select({ totalPaid: sql<string>`coalesce(sum(${paymentTransactions.amount}), '0')` })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paymentId, paymentId));

      const totalPaidNumber = Number(totalPaid);
      const paymentAmountNumber = Number(existingPayment.amount);

      if (!Number.isNaN(paymentAmountNumber)) {
        let statusUpdate: Partial<Payment> | null = null;

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

  async createVehiclePaymentForPeriod(
    payload: CreateVehiclePaymentForPeriod
  ): Promise<VehiclePaymentForPeriodResult> {
    const assignment = await this.getAssignment(payload.assignmentId);

    if (!assignment) {
      const error: any = new Error("Assignment not found");
      error.status = 404;
      throw error;
    }

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const error: any = new Error("Invalid start or end date provided");
      error.status = 400;
      throw error;
    }

    if (end < start) {
      const error: any = new Error("End date must be on or after the start date");
      error.status = 400;
      throw error;
    }

    const normalizeToUtcDate = (value: Date) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

    const parseDateOnly = (value: string | Date) => {
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
      const error: any = new Error("Assignment monthly rate is invalid");
      error.status = 400;
      throw error;
    }

    const formatDate = (value: Date) => {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateString = formatDate(startDateUtc);
    const endDateString = formatDate(endDateUtc);

    const attendanceRecords = await db
      .select({
        attendanceDate: vehicleAttendance.attendanceDate,
        isPaid: vehicleAttendance.isPaid,
      })
      .from(vehicleAttendance)
      .where(
        and(
          eq(vehicleAttendance.vehicleId, assignment.vehicleId),
          assignment.projectId
            ? eq(vehicleAttendance.projectId, assignment.projectId)
            : isNull(vehicleAttendance.projectId),
          eq(vehicleAttendance.status, "present"),
          gte(vehicleAttendance.attendanceDate, startDateString),
          lte(vehicleAttendance.attendanceDate, endDateString)
        )
      );

    const maintenanceRows = await db
      .select({
        id: maintenanceRecords.id,
        serviceDate: maintenanceRecords.serviceDate,
        type: maintenanceRecords.type,
        description: maintenanceRecords.description,
        performedBy: maintenanceRecords.performedBy,
        cost: maintenanceRecords.cost,
        isPaid: maintenanceRecords.isPaid,
      })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.vehicleId, assignment.vehicleId),
          gte(maintenanceRecords.serviceDate, startDateString),
          lte(maintenanceRecords.serviceDate, endDateString)
        )
      )
      .orderBy(asc(maintenanceRecords.serviceDate));

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
      { unpaid: new Set<string>(), paid: new Set<string>() }
    );

    const attendanceDateStrings = Array.from(attendanceBuckets.unpaid).sort();
    const alreadyPaidDateStrings = Array.from(attendanceBuckets.paid).sort();
    const attendanceDates = attendanceDateStrings
      .map((value) => parseDateOnly(value))
      .sort((a, b) => a.getTime() - b.getTime());

    const maintenanceRecordIds: string[] = [];
    const maintenanceBreakdown: VehiclePaymentCalculation["maintenanceBreakdown"] = [];
    const alreadyPaidMaintenance: VehiclePaymentCalculation["alreadyPaidMaintenance"] = [];

    maintenanceRows.forEach((row) => {
      const serviceDate = parseDateOnly(row.serviceDate);
      const monthLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
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
        isPaid: row.isPaid ?? false,
      };
      if (row.isPaid) {
        alreadyPaidMaintenance.push(breakdownItem);
      } else {
        maintenanceBreakdown.push(breakdownItem);
        maintenanceRecordIds.push(row.id);
      }
    });

    const maintenanceCostNumber = maintenanceBreakdown.reduce((sum, item) => sum + item.cost, 0);

    const months: VehiclePaymentCalculation["monthlyBreakdown"] = [];

    const startOfFirstMonth = new Date(
      Date.UTC(startDateUtc.getUTCFullYear(), startDateUtc.getUTCMonth(), 1)
    );
    const startOfLastMonth = new Date(
      Date.UTC(endDateUtc.getUTCFullYear(), endDateUtc.getUTCMonth(), 1)
    );

    for (
      let cursor = new Date(startOfFirstMonth.getTime());
      cursor.getTime() <= startOfLastMonth.getTime();
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    ) {
      const monthStart = new Date(cursor.getTime());
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      const effectiveStart = startDateUtc > monthStart ? startDateUtc : monthStart;
      const effectiveEnd = endDateUtc < monthEnd ? endDateUtc : monthEnd;

      const totalDaysInMonth = monthEnd.getUTCDate();
      const dailyRate = monthlyRateNumber / totalDaysInMonth;

      const presentDaysForMonth = attendanceDates.filter((date) => {
        return date >= effectiveStart && date <= effectiveEnd;
      }).length;

      const monthAmount = presentDaysForMonth * dailyRate;

      const monthLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
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
        amount: Number(monthAmount.toFixed(2)),
      });
    }

    const totalAttendanceAmount = months.reduce((sum, current) => sum + current.amount, 0);
    const totalPresentDays = months.reduce((sum, current) => sum + current.presentDays, 0);
    const netAmount = totalAttendanceAmount - maintenanceCostNumber;
    const roundedNetAmount = Math.round(netAmount);

    const calculation: VehiclePaymentCalculation = {
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
      alreadyPaidDates: alreadyPaidDateStrings,
    };

    return {
      assignment,
      calculation,
    };
  }

  async createCustomerInvoice(payload: CreateCustomerInvoiceRequest): Promise<CustomerInvoiceWithItems> {
    const calculation = await this.calculateCustomerInvoice(payload);

    return await db.transaction(async (tx) => {
      await this.ensureInvoicePeriodAvailable(
        calculation.projectId,
        calculation.periodStart,
        calculation.periodEnd,
        tx
      );

      const invoiceNumber = await this.resolveInvoiceNumber(calculation.invoiceNumber, tx);

      const invoiceValues: InsertCustomerInvoice = {
        customerId: calculation.customerId,
        projectId: calculation.projectId,
        periodStart: calculation.periodStart,
        periodEnd: calculation.periodEnd,
        dueDate: calculation.dueDate,
        subtotal: calculation.subtotal.toFixed(2),
        adjustment: calculation.adjustment.toFixed(2),
        salesTaxRate: calculation.salesTaxRate.toFixed(2),
        salesTaxAmount: calculation.salesTaxAmount.toFixed(2),
        total: calculation.total.toFixed(2),
        invoiceNumber,
        status: calculation.status ?? "pending",
      };

      const [invoice] = await tx.insert(customerInvoices).values(invoiceValues).returning();

      const invoiceItems = calculation.items.map(({ vehicle, ...item }) => ({
        ...item,
        invoiceId: invoice.id,
        dailyRate: item.dailyRate.toFixed(2),
        amount: item.amount.toFixed(2),
        salesTaxRate: item.salesTaxRate.toFixed(2),
        salesTaxAmount: item.salesTaxAmount.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2),
      }));

      const createdItems = await tx.insert(customerInvoiceItems).values(invoiceItems).returning();

      const itemsWithVehicle: CustomerInvoiceItemWithVehicle[] = createdItems.map((item) => ({
        ...item,
        vehicle: calculation.items.find((source) => source.vehicleId === item.vehicleId)!.vehicle,
      }));

      return {
        ...invoice,
        items: itemsWithVehicle,
      };
    });
  }

  async calculateCustomerInvoice(
    payload: CreateCustomerInvoiceRequest
  ): Promise<CustomerInvoiceCalculation> {
    const [project] = await db
      .select({ project: projects })
      .from(projects)
      .where(and(eq(projects.id, payload.projectId), eq(projects.customerId, payload.customerId)))
      .limit(1);

    if (!project) {
      const error: any = new Error("Project not found for the provided customer");
      error.status = 404;
      throw error;
    }

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const error: any = new Error("Invalid start or end date provided");
      error.status = 400;
      throw error;
    }

    if (end < start) {
      const error: any = new Error("End date must be on or after the start date");
      error.status = 400;
      throw error;
    }

    const normalizeToUtcDate = (value: Date) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

    const parseDateOnly = (value: string | Date) => {
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

    const formatDate = (value: Date) => {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateString = formatDate(startDateUtc);
    const endDateString = formatDate(endDateUtc);

    const rateRows = await db
      .select({
        vehicleId: projectVehicleCustomerRates.vehicleId,
        rate: projectVehicleCustomerRates.rate,
        vehicle: vehicles,
        owner: owners,
      })
      .from(projectVehicleCustomerRates)
      .leftJoin(vehicles, eq(projectVehicleCustomerRates.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .where(eq(projectVehicleCustomerRates.projectId, payload.projectId));

    const rateMap = new Map<string, number>();
    const vehicleMap = new Map<string, VehicleWithOwner>();
    for (const row of rateRows) {
      const rateNumber = Number(row.rate ?? 0);
      if (!Number.isNaN(rateNumber) && row.vehicle) {
        rateMap.set(row.vehicleId, rateNumber);
        vehicleMap.set(row.vehicleId, { ...row.vehicle, owner: row.owner! });
      }
    }

    const attendance = await db
      .select({
        attendanceDate: vehicleAttendance.attendanceDate,
        vehicleId: vehicleAttendance.vehicleId,
      })
      .from(vehicleAttendance)
      .where(
        and(
          eq(vehicleAttendance.projectId, payload.projectId),
          eq(vehicleAttendance.status, "present"),
          gte(vehicleAttendance.attendanceDate, startDateString),
          lte(vehicleAttendance.attendanceDate, endDateString)
        )
      );

    if (attendance.length === 0) {
      const error: any = new Error("No attendance records found for the requested period");
      error.status = 400;
      throw error;
    }

    type Bucket = {
      presentDays: number;
      month: number;
      year: number;
    };

    const buckets = new Map<string, Map<string, Bucket>>();

    attendance.forEach((record) => {
      const date = parseDateOnly(record.attendanceDate);
      const vehicleId = record.vehicleId;
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      const key = `${year}-${month}`;

      if (!rateMap.has(vehicleId)) {
        throw new Error("Missing customer rate for one or more vehicles in this project");
      }

      if (!buckets.has(vehicleId)) {
        buckets.set(vehicleId, new Map());
      }

      const vehicleBucket = buckets.get(vehicleId)!;
      const current = vehicleBucket.get(key) ?? { presentDays: 0, month, year };
      current.presentDays += 1;
      vehicleBucket.set(key, current);
    });

    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
    const items: CustomerInvoiceCalculationItem[] = [];

    for (const [vehicleId, monthMap] of buckets.entries()) {
      const rateNumber = rateMap.get(vehicleId) ?? 0;

      for (const [, bucket] of monthMap.entries()) {
        const daysInMonth = new Date(Date.UTC(bucket.year, bucket.month, 0)).getUTCDate();
        const dailyRate = rateNumber / daysInMonth;
        const amount = dailyRate * bucket.presentDays;

        const referenceDate = new Date(Date.UTC(bucket.year, bucket.month - 1, 1));
        const monthLabel = monthFormatter.format(referenceDate);

        items.push({
          vehicleId,
          vehicle: vehicleMap.get(vehicleId)!,
          month: bucket.month,
          year: bucket.year,
          monthLabel,
          presentDays: bucket.presentDays,
          dailyRate: Number(dailyRate.toFixed(2)),
          amount: Number(amount.toFixed(2)),
        });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const adjustmentNumber = Number(payload.adjustment ?? 0);
    const salesTaxRateNumber = Number(payload.salesTaxRate ?? 0);
    const taxableBase = subtotal + adjustmentNumber;
    const salesTaxAmount = Number((taxableBase * (salesTaxRateNumber / 100)).toFixed(2));
    const total = Number((taxableBase + salesTaxAmount).toFixed(2));

    const itemsWithTax = items.map((item) => {
      const adjustmentShare = subtotal === 0 ? 0 : (Number(item.amount) / subtotal) * adjustmentNumber;
      const taxableAmount = Number(item.amount) + adjustmentShare;
      const itemSalesTaxAmount = Number(
        (taxableAmount * (salesTaxRateNumber / 100)).toFixed(2)
      );
      const totalAmount = Number((taxableAmount + itemSalesTaxAmount).toFixed(2));

      return {
        ...item,
        salesTaxRate: salesTaxRateNumber,
        salesTaxAmount: itemSalesTaxAmount,
        totalAmount,
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
      items: itemsWithTax,
    };
  }

  async getCustomerInvoices(filter?: {
    projectIds?: string[];
    invoiceIds?: string[];
  }): Promise<CustomerInvoiceWithDetails[]> {
    let query = db
      .select({
        invoice: customerInvoices,
        project: projects,
        customer: customers,
      })
      .from(customerInvoices)
      .leftJoin(projects, eq(customerInvoices.projectId, projects.id))
      .leftJoin(customers, eq(customerInvoices.customerId, customers.id))
      .orderBy(desc(customerInvoices.createdAt));

    const conditions = [] as any[];

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

    const itemsMap = new Map<string, CustomerInvoiceItemWithVehicle[]>();
    const paymentsMap = new Map<string, CustomerInvoicePayment[]>();

    if (invoiceIds.length > 0) {
      const itemRows = await db
        .select({
          item: customerInvoiceItems,
          vehicle: vehicles,
          owner: owners,
        })
        .from(customerInvoiceItems)
        .leftJoin(vehicles, eq(customerInvoiceItems.vehicleId, vehicles.id))
        .leftJoin(owners, eq(vehicles.ownerId, owners.id))
        .where(inArray(customerInvoiceItems.invoiceId, invoiceIds))
        .orderBy(customerInvoiceItems.createdAt);

      itemRows.forEach((row) => {
        const collection = itemsMap.get(row.item.invoiceId) ?? [];
        collection.push({
          ...row.item,
          vehicle: {
            ...row.vehicle!,
            owner: row.owner!,
          },
        });
        itemsMap.set(row.item.invoiceId, collection);
      });

      const paymentRows = await db
        .select({ payment: customerInvoicePayments })
        .from(customerInvoicePayments)
        .where(inArray(customerInvoicePayments.invoiceId, invoiceIds))
        .orderBy(
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
      project: row.project!,
      customer: row.customer!,
      payments: paymentsMap.get(row.invoice.id) ?? [],
    }));
  }

  async getCustomerInvoice(id: string): Promise<CustomerInvoiceWithDetails | null> {
    const [invoice] = await this.getCustomerInvoices({ invoiceIds: [id] });
    return invoice ?? null;
  }

  async updateCustomerInvoiceStatus(
    id: string,
    status: UpdateCustomerInvoiceStatus["status"]
  ): Promise<CustomerInvoiceWithDetails | null> {
    const [updated] = await db
      .update(customerInvoices)
      .set({ status })
      .where(eq(customerInvoices.id, id))
      .returning();

    if (!updated) return null;

    return await this.getCustomerInvoice(id);
  }

  async recordCustomerInvoicePayment(
    invoiceId: string,
    payment: CreateCustomerInvoicePayment
  ): Promise<CustomerInvoiceWithDetails> {
    const [updatedInvoiceId] = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(customerInvoices)
        .where(eq(customerInvoices.id, invoiceId))
        .limit(1);

      if (!invoice) {
        const error: any = new Error("Invoice not found");
        error.status = 404;
        throw error;
      }

      const paymentValues: InsertCustomerInvoicePayment = {
        ...payment,
        invoiceId,
      };

      await tx.insert(customerInvoicePayments).values(paymentValues);

      const paymentRows = await tx
        .select({ amount: customerInvoicePayments.amount })
        .from(customerInvoicePayments)
        .where(eq(customerInvoicePayments.invoiceId, invoiceId));

      const totalPaid = paymentRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const invoiceTotal = Number(invoice.total ?? 0);

      if (totalPaid >= invoiceTotal && invoice.status !== "paid") {
        await tx
          .update(customerInvoices)
          .set({ status: "paid" })
          .where(eq(customerInvoices.id, invoiceId));
      }

      return [invoiceId] as const;
    });

    const updatedInvoice = await this.getCustomerInvoice(updatedInvoiceId);

    if (!updatedInvoice) {
      throw new Error("Failed to reload invoice after recording payment");
    }

    return updatedInvoice;
  }

  async getMaintenanceRecords(filter?: { ownerId?: string }): Promise<MaintenanceRecordWithVehicle[]> {
    let query = db
      .select()
      .from(maintenanceRecords)
      .leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .$dynamic();

    if (filter?.ownerId) {
      query = query.where(eq(vehicles.ownerId, filter.ownerId));
    }

    query = query.orderBy(desc(maintenanceRecords.createdAt));

    const rows = await withRetry(() => query);

    return rows.map((row) => ({
      ...row.maintenance_records,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
    }));
  }

  async getMaintenanceRecord(id: string): Promise<MaintenanceRecordWithVehicle | undefined> {
    const [result] = await db
      .select()
      .from(maintenanceRecords)
      .leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .where(eq(maintenanceRecords.id, id));

    if (!result) return undefined;

    return {
      ...result.maintenance_records,
      vehicle: {
        ...result.vehicles!,
        owner: result.owners!,
      },
    };
  }

  async getMaintenanceRecordsByVehicle(vehicleId: string): Promise<MaintenanceRecordWithVehicle[]> {
    return await db
      .select()
      .from(maintenanceRecords)
      .leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(desc(maintenanceRecords.createdAt))
      .then((rows) =>
        rows.map((row) => ({
          ...row.maintenance_records,
          vehicle: {
            ...row.vehicles!,
            owner: row.owners!,
          },
        }))
      );
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [record] = await db.insert(maintenanceRecords).values(insertRecord).returning();
    return record;
  }

  async updateMaintenanceRecord(id: string, insertRecord: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord> {
    const existing = await this.getMaintenanceRecord(id);

    if (!existing) {
      const error: any = new Error("Maintenance record not found");
      error.status = 404;
      throw error;
    }

    let updates: Partial<InsertMaintenanceRecord> = { ...insertRecord };

    if (existing.status === "completed") {
      const { description, ...rest } = updates;
      const attemptedUpdates = Object.entries(rest).filter(([, value]) => value !== undefined);

      if (attemptedUpdates.length > 0) {
        const error: any = new Error("Only the description can be updated for completed maintenance records.");
        error.status = 400;
        throw error;
      }

      if (description === undefined) {
        return existing;
      }

      updates = { description };
    }

    updates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Partial<InsertMaintenanceRecord>;

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const [record] = await db
      .update(maintenanceRecords)
      .set(updates)
      .where(eq(maintenanceRecords.id, id))
      .returning();

    return record;
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const existing = await this.getMaintenanceRecord(id);

    if (!existing) {
      const error: any = new Error("Maintenance record not found");
      error.status = 404;
      throw error;
    }

    if (existing.status === "completed") {
      const error: any = new Error("Completed maintenance records cannot be deleted.");
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
      vehicleStatusResult,
    ] = await withRetry(() => Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(vehicles),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.status, "active")),
      db
        .select({ id: payments.id, amount: payments.amount })
        .from(payments)
        .where(inArray(payments.status, ["pending", "partial"])),
      db
        .select({ total: sql<number>`coalesce(sum(${paymentTransactions.amount}), 0)` })
        .from(paymentTransactions)
        .where(
          sql`date_trunc('month', ${paymentTransactions.transactionDate}) = date_trunc('month', CURRENT_DATE)`
        ),
      db
        .select({
          status: vehicles.status,
          count: sql<number>`count(*)`,
        })
        .from(vehicles)
        .groupBy(vehicles.status),
    ]));

    let outstandingAmount = 0;
    if (pendingPayments.length > 0) {
      const paymentIds = pendingPayments.map((row) => row.id);
      const transactionTotals = await withRetry(() =>
        db
          .select({
            paymentId: paymentTransactions.paymentId,
            totalPaid: sql<string>`coalesce(sum(${paymentTransactions.amount}), '0')`,
          })
          .from(paymentTransactions)
          .where(inArray(paymentTransactions.paymentId, paymentIds))
          .groupBy(paymentTransactions.paymentId)
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
      outOfService: 0,
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
      vehicleStatusCounts,
    };
  }

  async getOwnershipHistory(): Promise<OwnershipHistoryWithOwner[]> {
    const results = await db
      .select({ record: ownershipHistory, owner: owners })
      .from(ownershipHistory)
      .leftJoin(owners, eq(ownershipHistory.ownerId, owners.id))
      .orderBy(desc(ownershipHistory.startDate));

    return results
      .filter((row) => row.owner)
      .map((row) => ({
        ...row.record,
        owner: row.owner!,
      }));
  }

  async getOwnershipHistoryByVehicle(vehicleId: string): Promise<OwnershipHistoryWithOwner[]> {
    const results = await db
      .select({ record: ownershipHistory, owner: owners })
      .from(ownershipHistory)
      .leftJoin(owners, eq(ownershipHistory.ownerId, owners.id))
      .where(eq(ownershipHistory.vehicleId, vehicleId))
      .orderBy(desc(ownershipHistory.startDate));

    return results
      .filter((row) => row.owner)
      .map((row) => ({
        ...row.record,
        owner: row.owner!,
      }));
  }

  async createOwnershipHistoryRecord(record: InsertOwnershipHistory): Promise<OwnershipHistory> {
    const [ownershipRecord] = await db.insert(ownershipHistory).values(record).returning();
    return ownershipRecord;
  }

  async updateOwnershipHistoryRecord(id: string, record: Partial<UpdateOwnershipHistory>): Promise<OwnershipHistory> {
    const [ownershipRecord] = await db
      .update(ownershipHistory)
      .set(record)
      .where(eq(ownershipHistory.id, id))
      .returning();
    return ownershipRecord;
  }

  async deleteOwnershipHistoryRecord(id: string): Promise<void> {
    await db.delete(ownershipHistory).where(eq(ownershipHistory.id, id));
  }

  async transferVehicleOwnership(
    vehicleId: string,
    newOwnerId: string,
    transferDate: string,
    transferReason?: string,
    transferPrice?: string,
    notes?: string
  ): Promise<void> {
    const parseDateStrict = (value: string | Date) => {
      const stringValue = value instanceof Date ? value.toISOString().split("T")[0] : String(value);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);

      if (!match) {
        throw new Error("Transfer date must be in YYYY-MM-DD format");
      }

      const [, year, month, day] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

      if (
        date.getUTCFullYear() !== Number(year) ||
        date.getUTCMonth() !== Number(month) - 1 ||
        date.getUTCDate() !== Number(day)
      ) {
        throw new Error("Transfer date must be a valid date");
      }

      return date;
    };

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

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

      const [unpaidAttendanceRecord] = await tx
        .select({ attendanceDate: vehicleAttendance.attendanceDate })
        .from(vehicleAttendance)
        .where(
          and(
            eq(vehicleAttendance.vehicleId, vehicleId),
            eq(vehicleAttendance.isPaid, false),
            eq(vehicleAttendance.status, "present"),
            lt(vehicleAttendance.attendanceDate, transferDateString)
          )
        )
        .limit(1);

      if (unpaidAttendanceRecord) {
        throw new Error(vehicleTransferPendingPaymentError);
      }

      const [currentOwnership] = await tx
        .select()
        .from(ownershipHistory)
        .where(and(eq(ownershipHistory.vehicleId, vehicleId), isNull(ownershipHistory.endDate)))
        .orderBy(desc(ownershipHistory.startDate))
        .limit(1);

      if (currentOwnership) {
        const currentStartDate = parseDateStrict(currentOwnership.startDate);

        if (transferDateObject <= currentStartDate) {
          throw new Error("Transfer date must be after the current ownership start date");
        }

        const previousOwnerEndDate = new Date(transferDateObject);
        previousOwnerEndDate.setUTCDate(previousOwnerEndDate.getUTCDate() - 1);

        await tx
          .update(ownershipHistory)
          .set({ endDate: formatDate(previousOwnerEndDate) })
          .where(eq(ownershipHistory.id, currentOwnership.id));
      }

      await tx.insert(ownershipHistory).values({
        vehicleId,
        ownerId: newOwnerId,
        startDate: transferDateString,
        transferReason: transferReason || "transfer",
        transferPrice: transferPrice ?? null,
        notes: notes ?? null,
      });

      await tx.update(vehicles).set({ ownerId: newOwnerId }).where(eq(vehicles.id, vehicleId));

      const assignmentRows = await tx
        .select({ id: assignments.id })
        .from(assignments)
        .where(eq(assignments.vehicleId, vehicleId));

      if (assignmentRows.length > 0) {
        const assignmentIds = assignmentRows.map((row) => row.id);

        await tx
          .update(payments)
          .set({ ownerId: newOwnerId })
          .where(
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
  async getVehicleAttendanceSummary(filter: {
    vehicleId: string;
    projectId?: string | null;
    startDate?: string;
    endDate?: string;
    ownerId?: string;
  }): Promise<VehicleAttendanceSummary[]> {
    if (!filter.vehicleId) {
      return [];
    }

    const conditions = [eq(vehicleAttendance.vehicleId, filter.vehicleId)];

    if (filter.ownerId) {
      conditions.push(eq(vehicles.ownerId, filter.ownerId));
    }

    if (filter.projectId !== undefined) {
      conditions.push(
        filter.projectId === null
          ? isNull(vehicleAttendance.projectId)
          : eq(vehicleAttendance.projectId, filter.projectId)
      );
    }

    if (filter.startDate) {
      conditions.push(gte(vehicleAttendance.attendanceDate, filter.startDate));
    }

    if (filter.endDate) {
      conditions.push(lte(vehicleAttendance.attendanceDate, filter.endDate));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const rows = await db
      .select({
        projectId: vehicleAttendance.projectId,
        projectName: projects.name,
        attendanceDate: vehicleAttendance.attendanceDate,
        status: vehicleAttendance.status,
      })
      .from(vehicleAttendance)
      .leftJoin(projects, eq(vehicleAttendance.projectId, projects.id))
      .leftJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id))
      .where(whereClause);

    const summaryMap = new Map<string | null, VehicleAttendanceSummary>();

    for (const row of rows) {
      const key = row.projectId ?? null;
      const existing = summaryMap.get(key);
      const base: VehicleAttendanceSummary =
        existing ?? {
          projectId: row.projectId ?? null,
          projectName: row.projectName ?? null,
          totalDays: 0,
          statusCounts: {},
          firstAttendanceDate: null,
          lastAttendanceDate: null,
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

  async getVehicleAttendance(filter?: {
    vehicleId?: string;
    date?: string;
    projectId?: string;
    ownerId?: string;
  }): Promise<VehicleAttendanceWithVehicle[]> {
    let query = db
      .select()
      .from(vehicleAttendance)
      .leftJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(vehicleAttendance.projectId, projects.id))
      .$dynamic();

    const conditions = [] as any[];

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
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: row.projects || null,
    }));
  }

  async createVehicleAttendance(record: InsertVehicleAttendance): Promise<VehicleAttendance> {
    return await db.transaction(async (tx) => {
      const existingRecords = await tx
        .select()
        .from(vehicleAttendance)
        .where(
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

      if (existingRecords.some((record) => record.isPaid)) {
        throw new Error("Cannot modify attendance that has already been marked as paid.");
      }

      if (existingRecords.length > 0) {
        const target = existingRecords[0];
        const [updated] = await tx
          .update(vehicleAttendance)
          .set({
            status: record.status,
            notes: record.notes ?? null,
            projectId: normalizedProjectId,
          })
          .where(eq(vehicleAttendance.id, target.id))
          .returning();

        return updated;
      }

      const [created] = await tx
        .insert(vehicleAttendance)
        .values({
          vehicleId: record.vehicleId,
          projectId: normalizedProjectId,
          attendanceDate: record.attendanceDate,
          status: record.status,
          notes: record.notes ?? null,
        })
        .returning();

      return created;
    });
  }

  async createVehicleAttendanceBatch(records: InsertVehicleAttendance[]): Promise<VehicleAttendance[]> {
    if (records.length === 0) return [];

    const perVehicleDate = new Map<string, string | null>();
    for (const record of records) {
      const key = `${record.vehicleId}:${record.attendanceDate}`;
      const projectId = record.projectId ?? null;
      const existingProjectId = perVehicleDate.get(key);
      if (existingProjectId !== undefined && existingProjectId !== projectId) {
        throw new Error("Vehicle already has attendance for this date on another project.");
      }
      perVehicleDate.set(key, projectId);
    }

    // Use a transaction and perform an INSERT ... ON CONFLICT DO NOTHING to avoid duplicates
    return await db.transaction(async (tx) => {
      // Perform per-record upsert within a single transaction without relying on ON CONFLICT/index
      const insertedOrUpdatedIds: string[] = [];
      for (const r of records) {
        const normalizedProjectId = r.projectId ?? null;

        const existingRecords = await tx
          .select()
          .from(vehicleAttendance)
          .where(
            and(
              eq(vehicleAttendance.vehicleId, r.vehicleId),
              eq(vehicleAttendance.attendanceDate, r.attendanceDate)
            )
          );

        const conflicting = existingRecords.find(
          (existing) => (existing.projectId ?? null) !== normalizedProjectId
        );

        if (conflicting) {
          throw new Error("Vehicle already has attendance for this date on another project.");
        }

        if (existingRecords.some((record) => record.isPaid)) {
          throw new Error("Cannot modify attendance that has already been marked as paid.");
        }

        const existing = existingRecords[0];

        if (existing) {
          // Update existing record
          const [updated] = await tx
            .update(vehicleAttendance)
            .set({ status: r.status, notes: r.notes ?? null, projectId: normalizedProjectId })
            .where(eq(vehicleAttendance.id, existing.id))
            .returning();
          if (updated) insertedOrUpdatedIds.push(updated.id);
        } else {
          // Insert new record
          const [created] = await tx
            .insert(vehicleAttendance)
            .values({
              vehicleId: r.vehicleId,
              projectId: normalizedProjectId,
              attendanceDate: r.attendanceDate,
              status: r.status,
              notes: r.notes ?? null,
            })
            .returning();
          if (created) insertedOrUpdatedIds.push(created.id);
        }
      }

      // Fetch inserted/updated rows using a simple IN + date range query for reliability
      // Fetch inserted/updated rows by id if available, otherwise fallback to vehicle/date range
      if (insertedOrUpdatedIds.length > 0) {
        const rows = await tx.select().from(vehicleAttendance).where(sql`${vehicleAttendance.id} IN (${sql.join(insertedOrUpdatedIds.map(id => sql`${id}`), sql`,`)})`);
        return rows as VehicleAttendance[];
      }

      const vehicleIds = Array.from(new Set(records.map(r => r.vehicleId)));
      const dates = records.map(r => r.attendanceDate).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      const rows = await tx
        .select()
        .from(vehicleAttendance)
        .where(sql`${vehicleAttendance.vehicleId} IN (${sql.join(vehicleIds.map(v => sql`${v}`), sql`,`)}) AND ${vehicleAttendance.attendanceDate} BETWEEN ${minDate} AND ${maxDate}`);

      return rows as VehicleAttendance[];
    });
  }

  async deleteVehicleAttendanceBatch(records: DeleteVehicleAttendance[]): Promise<VehicleAttendance[]> {
    if (records.length === 0) return [];

    return await db.transaction(async (tx) => {
      const deleted: VehicleAttendance[] = [];
      for (const r of records) {
        const conditions = [
          eq(vehicleAttendance.vehicleId, r.vehicleId),
          eq(vehicleAttendance.attendanceDate, r.attendanceDate),
        ];

        if (r.projectId !== undefined) {
          conditions.push(
            r.projectId === null
              ? isNull(vehicleAttendance.projectId)
              : eq(vehicleAttendance.projectId, r.projectId)
          );
        }

        const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

        const existingRecords = await tx
          .select()
          .from(vehicleAttendance)
          .where(whereClause);

        if (existingRecords.length === 0) {
          continue;
        }

        if (existingRecords.some((record) => record.isPaid)) {
          throw new Error("Cannot delete attendance that has already been marked as paid.");
        }

        const rows = await tx
          .delete(vehicleAttendance)
          .where(whereClause)
          .returning();

        deleted.push(...(rows as VehicleAttendance[]));
      }

      return deleted;
    });
  }

  async findUserByEmail(email: string): Promise<(User & { employeeProjectIds: string[] }) | undefined> {
    const rows = await withRetry(() =>
      db
        .select({
          user: users,
          projectIds: sql<string[]>`coalesce(array_agg(${employeeProjects.projectId}) filter (where ${employeeProjects.projectId} is not null), '{}')`,
        })
        .from(users)
        .leftJoin(employeeProjects, eq(employeeProjects.userId, users.id))
        .where(eq(users.email, email))
        .groupBy(users.id)
        .limit(1)
    );

    const row = rows[0];
    if (!row) return undefined;

    return { ...row.user, employeeProjectIds: row.projectIds };
  }

  async findUserById(id: string): Promise<(User & { employeeProjectIds: string[] }) | undefined> {
    const rows = await withRetry(() =>
      db
        .select({
          user: users,
          projectIds: sql<string[]>`coalesce(array_agg(${employeeProjects.projectId}) filter (where ${employeeProjects.projectId} is not null), '{}')`,
        })
        .from(users)
        .leftJoin(employeeProjects, eq(employeeProjects.userId, users.id))
        .where(eq(users.id, id))
        .groupBy(users.id)
        .limit(1)
    );

    const row = rows[0];
    if (!row) return undefined;

    return { ...row.user, employeeProjectIds: row.projectIds };
  }

  async getUsers(): Promise<UserWithOwner[]> {
    const rows = await withRetry(() =>
      db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          ownerId: users.ownerId,
          createdAt: users.createdAt,
          isActive: users.isActive,
          employeeAccess: users.employeeAccess,
          employeeManageAccess: users.employeeManageAccess,
          owner: owners,
          project: projects,
        })
        .from(users)
        .leftJoin(owners, eq(users.ownerId, owners.id))
        .leftJoin(employeeProjects, eq(employeeProjects.userId, users.id))
        .leftJoin(projects, eq(employeeProjects.projectId, projects.id))
        .orderBy(desc(users.createdAt))
    );

    const userMap = new Map<string, UserWithOwner>();

    for (const { owner, project, ...user } of rows) {
      const existing = userMap.get(user.id) ?? {
        ...user,
        owner: owner ?? null,
        employeeProjects: [] as Project[],
      };

      if (project) {
        existing.employeeProjects.push(project);
      }

      userMap.set(user.id, existing);
    }

    return Array.from(userMap.values());
  }

  async createUser(user: InsertUser, projectIds: string[] = []): Promise<User> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values(user).returning();

      if (projectIds.length > 0) {
        await tx
          .insert(employeeProjects)
          .values(projectIds.map((projectId) => ({ userId: created.id, projectId })));
      }

      return created;
    });
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<User, "ownerId" | "isActive" | "employeeAccess" | "employeeManageAccess">>,
    projectIds?: string[],
  ): Promise<User> {
    return db.transaction(async (tx) => {
      const updateData: Partial<InsertUser> = {};

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

      if (projectIds !== undefined) {
        await tx.delete(employeeProjects).where(eq(employeeProjects.userId, id));
        if (projectIds.length > 0) {
          await tx
            .insert(employeeProjects)
            .values(projectIds.map((projectId) => ({ userId: id, projectId })));
        }
      }

      return updated;
    });
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<User> {
    const [updated] = await withRetry(() =>
      db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning()
    );

    return updated;
  }
}

export const storage = new DatabaseStorage();
