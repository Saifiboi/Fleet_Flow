import {
  owners,
  vehicles,
  projects,
  assignments,
  payments,
  type Owner,
  type InsertOwner,
  type Vehicle,
  type InsertVehicle,
  type Project,
  type InsertProject,
  type Assignment,
  type InsertAssignment,
  type Payment,
  type InsertPayment,
  type VehicleWithOwner,
  type AssignmentWithDetails,
  type PaymentWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Owners
  getOwners(): Promise<Owner[]>;
  getOwner(id: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: string, owner: Partial<InsertOwner>): Promise<Owner>;
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
    return await db.select().from(owners).orderBy(desc(owners.createdAt));
  }

  async getOwner(id: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }

  async createOwner(insertOwner: InsertOwner): Promise<Owner> {
    const [owner] = await db.insert(owners).values(insertOwner).returning();
    return owner;
  }

  async updateOwner(id: string, insertOwner: Partial<InsertOwner>): Promise<Owner> {
    const [owner] = await db
      .update(owners)
      .set(insertOwner)
      .where(eq(owners.id, id))
      .returning();
    return owner;
  }

  async deleteOwner(id: string): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  async getVehicles(): Promise<VehicleWithOwner[]> {
    return await db
      .select()
      .from(vehicles)
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .orderBy(desc(vehicles.createdAt))
      .then((rows) =>
        rows.map((row) => ({
          ...row.vehicles,
          owner: row.owners!,
        }))
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
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
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
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getAssignments(): Promise<AssignmentWithDetails[]> {
    const results = await db
      .select()
      .from(assignments)
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
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
    const [assignment] = await db.insert(assignments).values(insertAssignment).returning();
    
    // Update vehicle status to assigned
    await db
      .update(vehicles)
      .set({ status: "assigned" })
      .where(eq(vehicles.id, insertAssignment.vehicleId));
    
    return assignment;
  }

  async updateAssignment(id: string, insertAssignment: Partial<InsertAssignment>): Promise<Assignment> {
    const [assignment] = await db
      .update(assignments)
      .set(insertAssignment)
      .where(eq(assignments.id, id))
      .returning();
    return assignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    // Get the assignment to find the vehicle
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    
    // Delete the assignment
    await db.delete(assignments).where(eq(assignments.id, id));
    
    // Update vehicle status back to available
    if (assignment) {
      await db
        .update(vehicles)
        .set({ status: "available" })
        .where(eq(vehicles.id, assignment.vehicleId));
    }
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
    const results = await db
      .select()
      .from(payments)
      .leftJoin(assignments, eq(payments.assignmentId, assignments.id))
      .leftJoin(vehicles, eq(assignments.vehicleId, vehicles.id))
      .leftJoin(owners, eq(vehicles.ownerId, owners.id))
      .leftJoin(projects, eq(assignments.projectId, projects.id))
      .where(and(eq(payments.status, "pending"), sql`${payments.dueDate} <= CURRENT_DATE`))
      .orderBy(payments.dueDate);

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

  async getDashboardStats() {
    const [
      totalVehiclesResult,
      activeProjectsResult,
      outstandingAmountResult,
      monthlyRevenueResult,
      vehicleStatusResult,
    ] = await Promise.all([
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
    ]);

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
}

export const storage = new DatabaseStorage();
