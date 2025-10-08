import type { Express } from "express";
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
  insertMaintenanceRecordSchema,
  insertOwnershipHistorySchema,
  updateOwnerSchema,
  updateOwnershipHistorySchema,
  transferVehicleOwnershipSchema,
  insertVehicleAttendanceSchema,
  deleteVehicleAttendanceSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner routes
  app.get("/api/owners", async (req, res) => {
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
      res.json(owner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owners", async (req, res) => {
    try {
      const validatedData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(validatedData);
      res.status(201).json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/owners/:id", async (req, res) => {
    try {
      const validatedData = updateOwnerSchema.parse(req.body);
      const owner = await storage.updateOwner(req.params.id, validatedData);
      res.json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/owners/:id", async (req, res) => {
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
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
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
      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/owner/:ownerId", async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByOwner(req.params.ownerId);
      res.json(vehicles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const validatedData = createVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      const validatedData = updateVehicleSchema.parse(req.body);
      const vehicle = await storage.updateVehicle(req.params.id, validatedData);
      res.json(vehicle);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
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
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, validatedData);
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
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
      const assignments = await storage.getAssignments();
      res.json(assignments);
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
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/project/:projectId", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByProject(req.params.projectId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/vehicle/:vehicleId", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByVehicle(req.params.vehicleId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      const validatedData = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    try {
      const validatedData = insertAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateAssignment(req.params.id, validatedData);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
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
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/outstanding", async (req, res) => {
    try {
      const payments = await storage.getOutstandingPayments();
      res.json(payments);
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
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/assignment/:assignmentId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAssignment(req.params.assignmentId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/payments/:id", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      await storage.deletePayment(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Maintenance Record routes
  app.get("/api/maintenance", async (req, res) => {
    try {
      const records = await storage.getMaintenanceRecords();
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/maintenance/vehicle/:vehicleId", async (req, res) => {
    try {
      const records = await storage.getMaintenanceRecordsByVehicle(req.params.vehicleId);
      res.json(records);
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
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance", async (req, res) => {
    try {
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/maintenance/:id", async (req, res) => {
    try {
      const validatedData = insertMaintenanceRecordSchema.partial().parse(req.body);
      const record = await storage.updateMaintenanceRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/maintenance/:id", async (req, res) => {
    try {
      await storage.deleteMaintenanceRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Ownership History routes
  app.get("/api/ownership-history", async (req, res) => {
    try {
      const history = await storage.getOwnershipHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ownership-history/vehicle/:vehicleId", async (req, res) => {
    try {
      const history = await storage.getOwnershipHistoryByVehicle(req.params.vehicleId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ownership-history", async (req, res) => {
    try {
      const validatedData = insertOwnershipHistorySchema.parse(req.body);
      const record = await storage.createOwnershipHistoryRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/ownership-history/:id", async (req, res) => {
    try {
      const validatedData = updateOwnershipHistorySchema.parse(req.body);
      const record = await storage.updateOwnershipHistoryRecord(req.params.id, validatedData);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/ownership-history/:id", async (req, res) => {
    try {
      await storage.deleteOwnershipHistoryRecord(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vehicle ownership transfer route
  app.post("/api/vehicles/:vehicleId/transfer-ownership", async (req, res) => {
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
      const attendance = await storage.getVehicleAttendance({ vehicleId, date, projectId });
      res.json(attendance);
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

      const summary = await storage.getVehicleAttendanceSummary({
        vehicleId,
        projectId: projectFilter,
        startDate,
        endDate,
      });

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to load attendance summary" });
    }
  });

  app.post("/api/vehicle-attendance", async (req, res) => {
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
