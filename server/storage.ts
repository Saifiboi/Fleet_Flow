import {
  owners,
  vehicles,
  projects,
  assignments,
  payments,
  maintenanceRecords,
  ownershipHistory,
  vehicleAttendance,
  type Owner,
  type InsertOwner,
  type UpdateOwner,
  type Vehicle,
  type InsertVehicle,
  type Project,
  type InsertProject,
  type Assignment,
  type InsertAssignment,
  type Payment,
  type InsertPayment,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type OwnershipHistory,
  type InsertOwnershipHistory,
  type UpdateOwnershipHistory,
  type VehicleWithOwner,
  type VehicleAttendance,
  type InsertVehicleAttendance,
  type DeleteVehicleAttendance,
  type VehicleAttendanceWithVehicle,
  type VehicleAttendanceSummary,
  type AssignmentWithDetails,
  type PaymentWithDetails,
  type MaintenanceRecordWithVehicle,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, isNull, gte, lte, ne } from "drizzle-orm";

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

export interface IStorage {
  // Owners
  getOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<UpdateOwner>): Promise<Owner>;
  deleteOwner(id: string): Promise<void>;

  // Vehicles
  getVehicles(): Promise<VehicleWithOwner[]>;
  getVehicle(id: string): Promise<VehicleWithOwner | undefined>;
  getVehiclesByOwner(ownerId: string): Promise<VehicleWithOwner[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Assignments
  getAssignments(): Promise<AssignmentWithDetails[]>;
  getAssignment(id: string): Promise<AssignmentWithDetails | undefined>;
  getAssignmentsByProject(projectId: string): Promise<AssignmentWithDetails[]>;
  getAssignmentsByVehicle(vehicleId: string): Promise<AssignmentWithDetails[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;

  // Payments
  getPayments(): Promise<PaymentWithDetails[]>;
  getPayment(id: string): Promise<PaymentWithDetails | undefined>;
  getPaymentsByAssignment(assignmentId: string): Promise<PaymentWithDetails[]>;
  getOutstandingPayments(): Promise<PaymentWithDetails[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string): Promise<void>;

  // Maintenance Records
  getMaintenanceRecords(): Promise<MaintenanceRecordWithVehicle[]>;
  getMaintenanceRecord(id: string): Promise<MaintenanceRecordWithVehicle | undefined>;
  getMaintenanceRecordsByVehicle(vehicleId: string): Promise<MaintenanceRecordWithVehicle[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord>;
  deleteMaintenanceRecord(id: string): Promise<void>;

  // Ownership History
  getOwnershipHistory(): Promise<OwnershipHistory[]>;
  getOwnershipHistoryByVehicle(vehicleId: string): Promise<OwnershipHistory[]>;
  createOwnershipHistoryRecord(record: InsertOwnershipHistory): Promise<OwnershipHistory>;
  updateOwnershipHistoryRecord(id: string, record: Partial<UpdateOwnershipHistory>): Promise<OwnershipHistory>;
  deleteOwnershipHistoryRecord(id: string): Promise<void>;
  
  // Vehicle attendance
  getVehicleAttendanceSummary(filter: {
    vehicleId: string;
    projectId?: string | null;
    startDate?: string;
    endDate?: string;
  }): Promise<VehicleAttendanceSummary[]>;
  getVehicleAttendance(filter?: { vehicleId?: string; date?: string; projectId?: string }): Promise<VehicleAttendanceWithVehicle[]>;
  createVehicleAttendance(record: InsertVehicleAttendance): Promise<VehicleAttendance>;
  createVehicleAttendanceBatch(records: InsertVehicleAttendance[]): Promise<VehicleAttendance[]>;
  deleteVehicleAttendanceBatch(records: DeleteVehicleAttendance[]): Promise<VehicleAttendance[]>;
  
  // New method for transferring vehicle ownership with proper tracking
  transferVehicleOwnership(vehicleId: string, newOwnerId: string, transferReason?: string, transferPrice?: string, notes?: string): Promise<void>;

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
}

export class DatabaseStorage implements IStorage {
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
    await db.delete(owners).where(eq(owners.id, id));
  }

  async getVehicles(): Promise<VehicleWithOwner[]> {
    return await withRetry(() =>
      db
        .select()
        .from(vehicles)
        .leftJoin(owners, eq(vehicles.ownerId, owners.id))
        .orderBy(desc(vehicles.createdAt))
        .then((rows) =>
          rows.map((row) => ({
            ...row.vehicles,
            owner: row.owners!,
          }))
        )
    );
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
    return await db
      .select()
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .where(eq(vehicles.ownerId, ownerId))
      .orderBy(desc(vehicles.createdAt))
      .then((rows) =>
        rows.map((row) => ({
          ...row.vehicles,
          owner: row.owners!,
        }))
      );
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

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, insertProject: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set(insertProject)
      .where(eq(projects.id, id))
      .returning();
    return project;
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

  async getAssignments(): Promise<AssignmentWithDetails[]> {
    const results = await withRetry(() =>
      db
        .select()
        .from(assignments)
        .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
        .leftJoin(owners, eq(vehicles.ownerId, owners.id))
        .leftJoin(projects, eq(assignments.projectId, projects.id))
        .orderBy(desc(assignments.createdAt))
    );

    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: row.projects!,
    }));
  }

  async getAssignment(id: string): Promise<AssignmentWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(assignments.id, id));

    if (!result) return undefined;

    return {
      ...result.assignments,
      vehicle: {
        ...result.vehicles!,
        owner: result.owners!,
      },
      project: result.projects!,
    };
  }

  async getAssignmentsByProject(projectId: string): Promise<AssignmentWithDetails[]> {
    const results = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(assignments.projectId, projectId))
      .orderBy(desc(assignments.createdAt));

    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: row.projects!,
    }));
  }

  async getAssignmentsByVehicle(vehicleId: string): Promise<AssignmentWithDetails[]> {
    const results = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(assignments.vehicleId, vehicleId))
      .orderBy(desc(assignments.createdAt));

    return results.map((row) => ({
      ...row.assignments,
      vehicle: {
        ...row.vehicles!,
        owner: row.owners!,
      },
      project: row.projects!,
    }));
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const targetStatus = insertAssignment.status ?? "active";

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

  async getPayments(): Promise<PaymentWithDetails[]> {
    const results = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .orderBy(desc(payments.createdAt));

    return results.map((row) => ({
      ...row.payments,
      assignment: {
        ...row.assignments!,
        vehicle: {
          ...row.vehicles!,
          owner: row.owners!,
        },
        project: row.projects!,
      },
    }));
  }

  async getPayment(id: string): Promise<PaymentWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(payments.id, id));

    if (!result) return undefined;

    return {
      ...result.payments,
      assignment: {
        ...result.assignments!,
        vehicle: {
          ...result.vehicles!,
          owner: result.owners!,
        },
        project: result.projects!,
      },
    };
  }

  async getPaymentsByAssignment(assignmentId: string): Promise<PaymentWithDetails[]> {
    const results = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(eq(payments.assignmentId, assignmentId))
      .orderBy(desc(payments.createdAt));

    return results.map((row) => ({
      ...row.payments,
      assignment: {
        ...row.assignments!,
        vehicle: {
          ...row.vehicles!,
          owner: row.owners!,
        },
        project: row.projects!,
      },
    }));
  }

  async getOutstandingPayments(): Promise<PaymentWithDetails[]> {
    const results = await withRetry(() =>
      db
        .select()
        .from(payments)
        .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
        .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
        .leftJoin(owners, eq(vehicles.ownerId, owners.id))
        .leftJoin(projects, eq(assignments.projectId, projects.id))
        .where(and(eq(payments.status, "pending"), sql`${payments.dueDate} <= CURRENT_DATE`))
        .orderBy(payments.dueDate)
    );

    return results.map((row) => ({
      ...row.payments,
      assignment: {
        ...row.assignments!,
        vehicle: {
          ...row.vehicles!,
          owner: row.owners!,
        },
        project: row.projects!,
      },
    }));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePayment(id: string, insertPayment: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set(insertPayment)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async getMaintenanceRecords(): Promise<MaintenanceRecordWithVehicle[]> {
    return await db
      .select()
      .from(maintenanceRecords)
      .leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
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
    const [record] = await db
      .update(maintenanceRecords)
      .set(insertRecord)
      .where(eq(maintenanceRecords.id, id))
      .returning();
    return record;
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id));
  }

  async getDashboardStats() {
    const [
      totalVehiclesResult,
      activeProjectsResult,
      outstandingAmountResult,
      monthlyRevenueResult,
      vehicleStatusResult,
    ] = await withRetry(() => Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(vehicles),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.status, "active")),
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(eq(payments.status, "pending")),
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(and(eq(payments.status, "paid"), sql`extract(month from ${payments.paidDate}) = extract(month from current_date)`)),
      db
        .select({
          status: vehicles.status,
          count: sql<number>`count(*)`,
        })
        .from(vehicles)
        .groupBy(vehicles.status),
    ]));

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
      outstandingAmount: Number(outstandingAmountResult[0]?.total || 0),
      monthlyRevenue: Number(monthlyRevenueResult[0]?.total || 0),
      vehicleStatusCounts,
    };
  }

  async getOwnershipHistory(): Promise<OwnershipHistory[]> {
    return await db.select().from(ownershipHistory).orderBy(desc(ownershipHistory.createdAt));
  }

  async getOwnershipHistoryByVehicle(vehicleId: string): Promise<OwnershipHistory[]> {
    return await db.select().from(ownershipHistory)
      .where(eq(ownershipHistory.vehicleId, vehicleId))
      .orderBy(desc(ownershipHistory.startDate));
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
    transferReason?: string, 
    transferPrice?: string, 
    notes?: string
  ): Promise<void> {
    // Start a transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // 1. Get the current vehicle to find current owner
      const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, vehicleId));
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }
      
      // 2. Close the current ownership record (set endDate)
      const today = new Date().toISOString().split('T')[0];
      await tx
        .update(ownershipHistory)
        .set({ endDate: today })
        .where(
          and(
            eq(ownershipHistory.vehicleId, vehicleId),
            sql`${ownershipHistory.endDate} IS NULL`
          )
        );
      
      // 3. Create new ownership history record
      await tx.insert(ownershipHistory).values({
        vehicleId,
        ownerId: newOwnerId,
        startDate: today,
        transferReason: transferReason || 'transfer',
        transferPrice: transferPrice || null,
        notes,
      });
      
      // 4. Update the vehicle's current owner
      await tx
        .update(vehicles)
        .set({ ownerId: newOwnerId })
        .where(eq(vehicles.id, vehicleId));
    });
  }

  // Vehicle attendance methods
  async getVehicleAttendanceSummary(filter: {
    vehicleId: string;
    projectId?: string | null;
    startDate?: string;
    endDate?: string;
  }): Promise<VehicleAttendanceSummary[]> {
    if (!filter.vehicleId) {
      return [];
    }

    const conditions = [eq(vehicleAttendance.vehicleId, filter.vehicleId)];

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

  async getVehicleAttendance(filter?: { vehicleId?: string; date?: string; projectId?: string }): Promise<VehicleAttendanceWithVehicle[]> {
    const query = db.select().from(vehicleAttendance)
      .leftJoin(vehicles, eq(vehicleAttendance.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(vehicleAttendance.projectId, projects.id))
      .orderBy(desc(vehicleAttendance.createdAt));

    if (filter?.vehicleId) {
      query.where(eq(vehicleAttendance.vehicleId, filter.vehicleId));
    }
    if (filter?.date) {
      query.where(eq(vehicleAttendance.attendanceDate, filter.date));
    }
    if (filter?.projectId) {
      query.where(eq(vehicleAttendance.projectId, filter.projectId));
    }

    const results = await query;

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
        const projectCondition = r.projectId
          ? eq(vehicleAttendance.projectId, r.projectId)
          : isNull(vehicleAttendance.projectId);

        const rows = await tx
          .delete(vehicleAttendance)
          .where(
            and(
              eq(vehicleAttendance.vehicleId, r.vehicleId),
              eq(vehicleAttendance.attendanceDate, r.attendanceDate),
              projectCondition
            )
          )
          .returning();

        deleted.push(...(rows as VehicleAttendance[]));
      }

      return deleted;
    });
  }
}

export const storage = new DatabaseStorage();
