import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertOwnerSchema,
  insertVehicleSchema,
  createVehicleSchema,
  updateVehicleSchema,
  insertProjectSchema,
  insertAssignmentSchema,
  insertPaymentSchema,
  createPaymentRequestSchema,
  createPaymentTransactionSchema,
  createVehiclePaymentForPeriodSchema,
  insertMaintenanceRecordSchema,
  insertOwnershipHistorySchema,
  updateOwnerSchema,
  updateOwnershipHistorySchema,
  transferVehicleOwnershipSchema,
  insertVehicleAttendanceSchema,
  deleteVehicleAttendanceSchema,
  loginSchema,
} from "@shared/schema";
import { passport } from "./auth";

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ message: "Authentication required" });
}

function isAdmin(req: Request): boolean {
  return req.user?.role === "admin";
}

function isOwner(req: Request): boolean {
  return req.user?.role === "owner";
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }

  return true;
}

function ownerIdOrForbidden(req: Request, res: Response): string | undefined {
  const ownerId = req.user?.ownerId ?? undefined;

  if (!ownerId) {
    res.status(403).json({ message: "Owner account is not linked to an owner record" });
    return undefined;
  }

  return ownerId;
}

function ensureOwnerAccess(req: Request, res: Response, ownerId: string): boolean {
  if (isAdmin(req)) {
    return true;
  }

  if (isOwner(req) && req.user?.ownerId === ownerId) {
    return true;
  }

  res.status(403).json({ message: "Access denied" });
  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }

    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: Request["user"] | false | undefined,
        info: { message?: string } | undefined,
      ) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const message = typeof info?.message === "string" ? info.message : "Invalid email or password";
        return res.status(401).json({ message });
      }

      req.logIn(user, (loginError: Error | null) => {
        if (loginError) {
          return next(loginError);
        }

        res.json(user);
      });
    }
    )(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }

      res.status(204).send();
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json(req.user);
  });

  app.use("/api", ensureAuthenticated);

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner routes
  app.get("/api/owners", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const owners = await storage.getOwners();
      res.json(owners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/owners/:id", async (req, res) => {
    try {
      const owner = await storage.getOwner(req.params.id);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }

      if (!ensureOwnerAccess(req, res, owner.id)) {
        return;
      }

      res.json(owner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owners", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(validatedData);
      res.status(201).json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/owners/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = updateOwnerSchema.parse(req.body);
      const owner = await storage.updateOwner(req.params.id, validatedData);
      res.json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/owners/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteOwner(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", async (req, res) => {
    try {
      if (isAdmin(req)) {
        const vehicles = await storage.getVehicles();
        return res.json(vehicles);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        const vehicles = await storage.getVehicles({ ownerId });
        return res.json(vehicles);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      if (!ensureOwnerAccess(req, res, vehicle.owner.id)) {
        return;
      }

      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/owner/:ownerId", async (req, res) => {
    if (!ensureOwnerAccess(req, res, req.params.ownerId)) {
      return;
    }

    try {
      const vehicles = await storage.getVehicles({ ownerId: req.params.ownerId });
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = createVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = updateVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, validatedData);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Assignment routes
  app.get("/api/assignments", async (req, res) => {
    try {
      if (isAdmin(req)) {
        const assignments = await storage.getAssignments();
        return res.json(assignments);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        const assignments = await storage.getAssignments({ ownerId });
        return res.json(assignments);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.getAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (!ensureOwnerAccess(req, res, assignment.vehicle.owner.id)) {
        return;
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/project/:projectId", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByProject(req.params.projectId);
      if (isAdmin(req)) {
        return res.json(assignments);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        return res.json(assignments.filter((assignment) => assignment.vehicle.owner.id === ownerId));
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/vehicle/:vehicleId", async (req, res) => {
    try {
      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        const vehicle = await storage.getVehicle(req.params.vehicleId);
        if (!vehicle || vehicle.owner.id !== ownerId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const assignments = await storage.getAssignmentsByVehicle(req.params.vehicleId);
      if (isAdmin(req)) {
        return res.json(assignments);
      }

      if (isOwner(req)) {
        const ownerId = req.user?.ownerId;
        return res.json(assignments.filter((assignment) => assignment.vehicle.owner.id === ownerId));
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateAssignment(req.params.id, validatedData);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteAssignment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.get("/api/payments", async (req, res) => {
    try {
      if (isAdmin(req)) {
        const payments = await storage.getPayments();
        return res.json(payments);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        const payments = await storage.getPayments({ ownerId });
        return res.json(payments);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/outstanding", async (req, res) => {
    try {
      if (isAdmin(req)) {
        const payments = await storage.getOutstandingPayments();
        return res.json(payments);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        const payments = await storage.getOutstandingPayments({ ownerId });
        return res.json(payments);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (!ensureOwnerAccess(req, res, payment.paymentOwner?.id ?? payment.ownerId)) {
        return;
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/assignment/:assignmentId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAssignment(req.params.assignmentId);
      if (isAdmin(req)) {
        return res.json(payments);
      }

      if (isOwner(req)) {
        const ownerId = ownerIdOrForbidden(req, res);
        if (!ownerId) return;

        return res.json(payments.filter((payment) => payment.paymentOwner?.id === ownerId));
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const parsedData = createPaymentRequestSchema.parse(req.body);
      const { attendanceDates, maintenanceRecordIds, ...paymentValues } = parsedData;
      const payment = await storage.createPayment(
        paymentValues,
        attendanceDates,
        maintenanceRecordIds
      );
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/payments/:id/transactions", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = createPaymentTransactionSchema.parse(req.body);
      const transaction = await storage.createPaymentTransaction(req.params.id, validatedData);
      const payment = await storage.getPayment(req.params.id);
      res.status(201).json({ transaction, payment });
    } catch (error: any) {
      const status = error.status ?? (error instanceof Error && error.message.includes("not found") ? 404 : 400);
      res.status(status).json({ message: error.message });
    }
  });

  app.post("/api/payments/calculate", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const payload = createVehiclePaymentForPeriodSchema.parse(req.body);
      const result = await storage.createVehiclePaymentForPeriod(payload);
      res.status(200).json(result);
    } catch (error: any) {
      const status = error.status ?? 400;
      res.status(status).json({ message: error.message });
    }
  });

  app.put("/api/payments/:id", async (_req, res) => {
    res.status(405).json({ message: "Payments cannot be modified after they are created." });
  });

  app.delete("/api/payments/:id", async (_req, res) => {
    res.status(405).json({ message: "Payments cannot be deleted once created." });
  });

  // Maintenance Record routes
  app.get("/api/maintenance", async (req, res) => {
    try {
      if (isAdmin(req)) {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/maintenance/vehicle/:vehicleId", async (req, res) => {
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
      if (isAdmin(req)) {
        return res.json(records);
      }

      if (isOwner(req)) {
        const ownerId = req.user?.ownerId;
        return res.json(records.filter((record) => record.vehicle.owner.id === ownerId));
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/maintenance/:id", async (req, res) => {
    try {
      const record = await storage.getMaintenanceRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Maintenance record not found" });
      }

      if (!ensureOwnerAccess(req, res, record.vehicle.owner.id)) {
        return;
      }
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/maintenance/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertMaintenanceRecordSchema.partial().parse(req.body);
      const record = await storage.updateMaintenanceRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(error.status ?? 400).json({ message: error.message });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteMaintenanceRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.status ?? 500).json({ message: error.message });
    }
  });

  // Ownership History routes
  app.get("/api/ownership-history", async (req, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ownership-history/vehicle/:vehicleId", async (req, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ownership-history", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = insertOwnershipHistorySchema.parse(req.body);
      const record = await storage.createOwnershipHistoryRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/ownership-history/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = updateOwnershipHistorySchema.parse(req.body);
      const record = await storage.updateOwnershipHistoryRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/ownership-history/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      await storage.deleteOwnershipHistoryRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vehicle ownership transfer route
  app.post("/api/vehicles/:vehicleId/transfer-ownership", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validatedData = transferVehicleOwnershipSchema.parse(req.body);

      await storage.transferVehicleOwnership(
        req.params.vehicleId,
        validatedData.newOwnerId,
        validatedData.transferReason,
        validatedData.transferPrice,
        validatedData.notes
      );
      
      res.status(200).json({ message: "Vehicle ownership transferred successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Vehicle Attendance routes
  app.get("/api/vehicle-attendance", async (req, res) => {
    try {
      const { vehicleId, date, projectId } = req.query as Record<string, string | undefined>;

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
          date,
          projectId,
          ownerId,
        });
        return res.json(attendance);
      }

      if (isAdmin(req)) {
        const attendance = await storage.getVehicleAttendance({ vehicleId, date, projectId });
        return res.json(attendance);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicle-attendance/summary", async (req, res) => {
    try {
      const { vehicleId, projectId, startDate, endDate } = req.query as Record<string, string | undefined>;

      if (!vehicleId) {
        return res.status(400).json({ message: "vehicleId is required" });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ message: "startDate must be on or before endDate" });
      }

      let projectFilter: string | null | undefined = projectId;
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
          ownerId,
        });

        return res.json(summary);
      }

      if (isAdmin(req)) {
        const summary = await storage.getVehicleAttendanceSummary({
          vehicleId,
          projectId: projectFilter,
          startDate,
          endDate,
        });

        return res.json(summary);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to load attendance summary" });
    }
  });

  app.post("/api/vehicle-attendance", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const validated = insertVehicleAttendanceSchema.parse(req.body);
      const created = await storage.createVehicleAttendance(validated);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Batch create attendance records
  app.post("/api/vehicle-attendance/batch", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const body = req.body;
      if (!Array.isArray(body)) {
        return res.status(400).json({ message: "Expected an array of attendance records" });
      }

      console.log('[vehicle-attendance/batch] received', { count: body.length });
      const validatedRecords = body.map((b) => insertVehicleAttendanceSchema.parse(b));
      const created = await storage.createVehicleAttendanceBatch(validatedRecords);
      console.log('[vehicle-attendance/batch] created', { createdCount: created.length });
      res.status(201).json(created);
    } catch (error: any) {
      console.error('[vehicle-attendance/batch] error', error);
      res.status(400).json({ message: error?.message || 'Unknown error', stack: error?.stack });
    }
  });

  app.post("/api/vehicle-attendance/delete", async (req, res) => {
    if (!requireAdmin(req, res)) {
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
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to delete attendance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
