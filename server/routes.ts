import type { Application, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  insertOwnerSchema,
  insertCustomerSchema,
  insertVehicleSchema,
  createVehicleSchema,
  updateVehicleSchema,
  insertProjectSchema,
  insertProjectVehicleCustomerRateSchema,
  insertAssignmentSchema,
  insertPaymentSchema,
  createPaymentRequestSchema,
  createPaymentTransactionSchema,
  createVehiclePaymentForPeriodSchema,
  insertMaintenanceRecordSchema,
  insertOwnershipHistorySchema,
  updateOwnerSchema,
  updateCustomerSchema,
  updateOwnershipHistorySchema,
  transferVehicleOwnershipSchema,
  insertVehicleAttendanceSchema,
  deleteVehicleAttendanceSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
  type EmployeeAccessArea,
} from "@shared/schema";
import { passport } from "./auth";
import { hashPassword, verifyPassword } from "./password";

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

function isEmployee(req: Request): boolean {
  return req.user?.role === "employee";
}

function hasEmployeeAccess(req: Request, area: EmployeeAccessArea): boolean {
  return isEmployee(req) && req.user?.employeeAccess?.includes(area) === true;
}

function hasEmployeeManageAccess(req: Request, area: EmployeeAccessArea): boolean {
  return isEmployee(req) && req.user?.employeeManageAccess?.includes(area) === true;
}

function hasAnyEmployeeAccess(req: Request, ...areas: EmployeeAccessArea[]): boolean {
  return areas.some((area) => hasEmployeeAccess(req, area) || hasEmployeeManageAccess(req, area));
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }

  return true;
}

function requireAdminOrEmployee(
  req: Request,
  res: Response,
  area?: EmployeeAccessArea,
  options?: { manage?: boolean },
): boolean {
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

function ownerIdOrForbidden(req: Request, res: Response): string | undefined {
  const ownerId = req.user?.ownerId ?? undefined;

  if (!ownerId) {
    res.status(403).json({ message: "Owner account is not linked to an owner record" });
    return undefined;
  }

  return ownerId;
}

function ensureOwnerAccess(
  req: Request,
  res: Response,
  ownerId: string,
  employeeArea?: EmployeeAccessArea,
): boolean {
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

function employeeProjectIds(req: Request): string[] {
  return req.user?.employeeProjectIds ?? [];
}

function ensureProjectAccess(req: Request, res: Response, projectId: string): boolean {
  if (isAdmin(req)) {
    return true;
  }

  if (isEmployee(req) && employeeProjectIds(req).includes(projectId)) {
    return true;
  }

  res.status(403).json({ message: "Access denied" });
  return false;
}

export async function registerRoutes(app: Application): Promise<void> {
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
    if (!requireAdminOrEmployee(req, res, "owners")) {
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

      if (!ensureOwnerAccess(req, res, owner.id, "owners")) {
        return;
      }

      res.json(owner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owners", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "owners", { manage: true })) {
      return;
    }

    try {
      await storage.deleteOwner(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }

    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }

    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }

    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }

    try {
      const validatedData = updateCustomerSchema.parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      res.json(customer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }

    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User management routes
  app.get("/api/users", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    let validatedData: ReturnType<typeof createUserSchema.parse>;
    try {
      validatedData = createUserSchema.parse(req.body);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }

    try {
      const email = validatedData.email.toLowerCase();

      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email is already in use" });
      }

      if (validatedData.role === "owner" && validatedData.ownerId) {
        const owner = await storage.getOwner(validatedData.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Owner not found" });
        }
      }

      if (validatedData.role === "employee" && validatedData.employeeProjectIds?.length) {
        const projects = await storage.getProjects({ ids: validatedData.employeeProjectIds });
        if (projects.length !== validatedData.employeeProjectIds.length) {
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
          employeeManageAccess:
            validatedData.role === "employee" ? validatedData.employeeManageAccess ?? [] : [],
        },
        validatedData.role === "employee" ? validatedData.employeeProjectIds ?? [] : [],
      );

      const owner = created.ownerId ? await storage.getOwner(created.ownerId) : null;
      const { passwordHash: _ph, ...user } = created;

      res.status(201).json({ ...user, owner });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    let validatedData: ReturnType<typeof updateUserSchema.parse>;
    try {
      validatedData = updateUserSchema.parse(req.body);
    } catch (error: any) {
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
          const owner = await storage.getOwner(validatedData.ownerId);
          if (!owner) {
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
        "employeeManageAccess",
      );
      const hasProjectUpdate = Object.prototype.hasOwnProperty.call(validatedData, "employeeProjectIds");

      if ((hasEmployeeAccessUpdate || hasEmployeeManageUpdate || hasProjectUpdate) && user.role !== "employee") {
        return res.status(400).json({ message: "Only employee accounts can have page access configured" });
      }

      if (hasEmployeeManageUpdate && validatedData.employeeManageAccess) {
        const baseAccess = validatedData.employeeAccess ?? user.employeeAccess;
        if (validatedData.employeeManageAccess.some((area) => !baseAccess.includes(area))) {
          return res
            .status(400)
            .json({ message: "Manage access requires view access for the same area" });
        }
      }

      if (hasProjectUpdate && validatedData.employeeProjectIds) {
        const projects = await storage.getProjects({ ids: validatedData.employeeProjectIds });
        if (projects.length !== validatedData.employeeProjectIds.length) {
          return res.status(400).json({ message: "One or more selected projects were not found" });
        }
      }

      const { employeeProjectIds, ...updateFields } = validatedData;

      const updated = await storage.updateUser(user.id, updateFields, employeeProjectIds);
      const owner = updated.ownerId ? await storage.getOwner(updated.ownerId) : null;
      const { passwordHash: _ph, ...safeUser } = updated;

      res.json({ ...safeUser, owner });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/reset-password", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    let validatedData: ReturnType<typeof adminResetPasswordSchema.parse>;
    try {
      validatedData = adminResetPasswordSchema.parse(req.body);
    } catch (error: any) {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/change-password", async (req, res) => {
    let validatedData: ReturnType<typeof changePasswordSchema.parse>;
    try {
      validatedData = changePasswordSchema.parse(req.body);
    } catch (error: any) {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "vehicles")) {
        if (isEmployee(req)) {
          const projects = employeeProjectIds(req);
          const vehicles = projects.length > 0 ? await storage.getVehicles({ projectIds: projects }) : [];
          return res.json(vehicles);
        }

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

      if (!ensureOwnerAccess(req, res, vehicle.owner.id, "vehicles")) {
        return;
      }

      if (isEmployee(req)) {
        const allowedProjects = employeeProjectIds(req);
        const assignmentsForVehicle = await storage.getAssignmentsByVehicle(vehicle.id);
        const isLinked = assignmentsForVehicle.some((assignment) =>
          allowedProjects.includes(assignment.project.id),
        );

        if (!isLinked) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(vehicle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicles/owner/:ownerId", async (req, res) => {
    if (!ensureOwnerAccess(req, res, req.params.ownerId, "vehicles")) {
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
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "vehicles", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "projects")) {
      return;
    }

    try {
      if (isEmployee(req)) {
        const projects = employeeProjectIds(req);
        const results = projects.length > 0 ? await storage.getProjects({ ids: projects }) : [];
        return res.json(results);
      }

      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "projects", { manage: true })) {
      return;
    }

    if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.id)) {
      return;
    }

    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Project customer rate routes
  app.get("/api/projects/:id/customer-rates", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const rates = await storage.getProjectCustomerRates(req.params.id);
      res.json(rates);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/projects/:id/customer-rates", async (req, res) => {
    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const parsedRates = insertProjectVehicleCustomerRateSchema
        .array()
        .parse((req.body?.rates ?? []).map((rate: any) => ({ ...rate, projectId: req.params.id })));

      const rates = await storage.upsertProjectCustomerRates(req.params.id, parsedRates);
      res.status(201).json(rates);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Assignment routes
  app.get("/api/assignments", async (req, res) => {
    try {
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        const assignments = isEmployee(req)
          ? await storage.getAssignments({ projectIds: employeeProjectIds(req) })
          : await storage.getAssignments();
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assignments/project/:projectId", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByProject(req.params.projectId);
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        if (isEmployee(req) && !ensureProjectAccess(req, res, req.params.projectId)) {
          return;
        }

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
      if (isAdmin(req) || hasAnyEmployeeAccess(req, "assignments", "attendance")) {
        if (
          isEmployee(req) &&
          assignments.every((assignment) => !employeeProjectIds(req).includes(assignment.project.id))
        ) {
          return res.status(403).json({ message: "Access denied" });
        }

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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "assignments", { manage: true })) {
      return;
    }

    try {
      const validatedData = insertAssignmentSchema.partial().parse(req.body);
      if (
        isEmployee(req) &&
        validatedData.projectId &&
        !employeeProjectIds(req).includes(validatedData.projectId)
      ) {
        return res.status(403).json({ message: "You cannot manage assignments for this project" });
      }
      const assignment = await storage.updateAssignment(req.params.id, validatedData);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.get("/api/payments", async (req, res) => {
    try {
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        const payments = await storage.getPayments();
        if (isEmployee(req)) {
          const allowedProjects = new Set(employeeProjectIds(req));
          return res.json(
            payments.filter((payment) => allowedProjects.has(payment.assignment.project.id)),
          );
        }

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
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        const payments = await storage.getOutstandingPayments();
        if (isEmployee(req)) {
          const allowedProjects = new Set(employeeProjectIds(req));
          return res.json(
            payments.filter((payment) => allowedProjects.has(payment.assignment.project.id)),
          );
        }

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

      if (!ensureOwnerAccess(req, res, payment.paymentOwner?.id ?? payment.ownerId, "payments")) {
        return;
      }

      if (
        isEmployee(req) &&
        !employeeProjectIds(req).includes(payment.assignment.project.id)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments/assignment/:assignmentId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAssignment(req.params.assignmentId);
      if (isAdmin(req) || hasEmployeeAccess(req, "payments")) {
        if (
          isEmployee(req) &&
          payments.every((payment) => !employeeProjectIds(req).includes(payment.assignment.project.id))
        ) {
          return res.status(403).json({ message: "Access denied" });
        }
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/payments/:id/transactions", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
      return;
    }

    try {
      if (isEmployee(req)) {
        const payment = await storage.getPayment(req.params.id);
        if (!payment || !employeeProjectIds(req).includes(payment.assignment.project.id)) {
          return res.status(403).json({ message: "You cannot manage payments for this project" });
        }
      }
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
    if (!requireAdminOrEmployee(req, res, "payments", { manage: true })) {
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
      if (isAdmin(req) || hasEmployeeAccess(req, "maintenance")) {
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

      if (!ensureOwnerAccess(req, res, record.vehicle.owner.id, "maintenance")) {
        return;
      }
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/maintenance", async (req, res) => {
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
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
    if (!requireAdminOrEmployee(req, res, "maintenance", { manage: true })) {
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
  app.post("/api/vehicles/:vehicleId/transfer-ownership", async (req: Request, res: Response) => {
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Vehicle Attendance routes
  app.get("/api/vehicle-attendance", async (req: Request, res: Response) => {
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

      if (isAdmin(req) || hasEmployeeAccess(req, "attendance")) {
        const attendance = await storage.getVehicleAttendance({ vehicleId, date, projectId });
        return res.json(attendance);
      }

      res.status(403).json({ message: "Access denied" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vehicle-attendance/summary", async (req: Request, res: Response) => {
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

      if (isAdmin(req) || hasEmployeeAccess(req, "attendance")) {
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

  app.post("/api/vehicle-attendance", async (req: Request, res: Response) => {
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
          return res
            .status(400)
            .json({ message: "projectId is required when recording attendance as an employee" });
        }

        const allowedProjects = new Set(employeeProjectIds(req));
        if (!allowedProjects.has(validated.projectId)) {
          return res.status(403).json({ message: "You cannot manage attendance for this project" });
        }

        const vehicleAssignments = await storage.getAssignmentsByVehicle(validated.vehicleId);
        if (!vehicleAssignments.some((assignment) => assignment.project.id === validated.projectId)) {
          return res
            .status(403)
            .json({ message: "Vehicle is not assigned to one of your projects" });
        }
      }

      if (validated.projectId) {
        const project = await storage.getProject(validated.projectId);
        if (!project) {
          return res.status(400).json({ message: "Project not found" });
        }

        if (attendanceDate < new Date(project.startDate)) {
          return res
            .status(400)
            .json({ message: "Attendance date cannot be before the project's start date" });
        }

        const vehicleAssignments = await storage.getAssignmentsByVehicle(validated.vehicleId);
        const assignmentForProject = vehicleAssignments.find(
          (assignment) => assignment.project.id === validated.projectId,
        );

        if (!assignmentForProject) {
          return res.status(400).json({ message: "Vehicle is not assigned to this project" });
        }

        if (attendanceDate < new Date(assignmentForProject.startDate)) {
          return res
            .status(400)
            .json({ message: "Attendance date cannot be before the vehicle's assignment start date" });
        }
      }

      const created = await storage.createVehicleAttendance(validated);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Batch create attendance records
  app.post("/api/vehicle-attendance/batch", async (req: Request, res: Response) => {
    if (!requireAdminOrEmployee(req, res, "attendance", { manage: true })) {
      return;
    }

    try {
      const body = req.body;
      if (!Array.isArray(body)) {
        return res.status(400).json({ message: "Expected an array of attendance records" });
      }

      console.log('[vehicle-attendance/batch] received', { count: body.length });
      const validatedRecords = body.map((b) => insertVehicleAttendanceSchema.parse(b));
      const projectCache = new Map<string, Awaited<ReturnType<typeof storage.getProject>>>();
      const assignmentCache = new Map<
        string,
        Awaited<ReturnType<typeof storage.getAssignmentsByVehicle>>
      >();

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
              await storage.getAssignmentsByVehicle(record.vehicleId),
            );
          }

          const assignments = assignmentCache.get(record.vehicleId)!;
          if (!assignments.some((assignment) => assignment.project.id === record.projectId)) {
            return res
              .status(403)
              .json({ message: "Vehicle is not assigned to one of your projects" });
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
          return res
            .status(400)
            .json({ message: "Attendance date cannot be before the project's start date" });
        }

        if (!assignmentCache.has(record.vehicleId)) {
          assignmentCache.set(
            record.vehicleId,
            await storage.getAssignmentsByVehicle(record.vehicleId),
          );
        }

        const assignments = assignmentCache.get(record.vehicleId)!;
        const assignmentForProject = assignments.find(
          (assignment) => assignment.project.id === record.projectId,
        );

        if (!assignmentForProject) {
          return res.status(400).json({ message: "Vehicle is not assigned to this project" });
        }

        if (attendanceDate < new Date(assignmentForProject.startDate)) {
          return res.status(400).json({ message: "Attendance date cannot be before the vehicle's assignment start date" });
        }
      }

      const created = await storage.createVehicleAttendanceBatch(validatedRecords);
      console.log('[vehicle-attendance/batch] created', { createdCount: created.length });
      res.status(201).json(created);
    } catch (error: any) {
      console.error('[vehicle-attendance/batch] error', error);
      res.status(400).json({ message: error?.message || 'Unknown error', stack: error?.stack });
    }
  });

  app.post("/api/vehicle-attendance/delete", async (req: Request, res: Response) => {
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
    } catch (error: any) {
      res.status(400).json({ message: error?.message || "Failed to delete attendance" });
    }
  });
  app.get("/chicken", async (req: Request, res: Response) => {
    res.json({ message: "healthy", status: 200 });
  });

}
