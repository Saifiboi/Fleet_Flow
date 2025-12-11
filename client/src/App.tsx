import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import Owners from "@/pages/owners";
import Projects from "@/pages/projects";
import Assignments from "@/pages/assignments";
import Payments from "@/pages/payments";
import Maintenance from "@/pages/maintenance";
import Attendance from "@/pages/attendance";
import ProjectAttendance from "@/pages/project-attendance";
import Users from "@/pages/users";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Forbidden from "@/pages/forbidden";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import type { EmployeeAccessArea, UserRole } from "@shared/schema";

interface ProtectedRoute {
  path: string;
  component: React.ComponentType;
  roles?: UserRole[];
  employeeAccess?: EmployeeAccessArea;
}

const protectedRoutes: ProtectedRoute[] = [
  { path: "/", component: Dashboard, roles: ["admin"] },
  { path: "/users", component: Users, roles: ["admin"] },
  { path: "/owners", component: Owners, roles: ["admin", "owner", "employee"], employeeAccess: "owners" },
  { path: "/vehicles", component: Vehicles, roles: ["admin", "owner", "employee"], employeeAccess: "vehicles" },
  { path: "/projects", component: Projects, roles: ["admin", "employee"], employeeAccess: "projects" },
  { path: "/assignments", component: Assignments, roles: ["admin", "owner", "employee"], employeeAccess: "assignments" },
  {
    path: "/project-attendance",
    component: ProjectAttendance,
    roles: ["admin", "employee"],
    employeeAccess: "projectAttendance",
  },
  { path: "/attendance", component: Attendance, roles: ["admin", "owner", "employee"], employeeAccess: "attendance" },
  { path: "/payments", component: Payments, roles: ["admin", "owner", "employee"], employeeAccess: "payments" },
  { path: "/maintenance", component: Maintenance, roles: ["admin", "owner", "employee"], employeeAccess: "maintenance" },
];

function RequireRole({ route, children }: { route: ProtectedRoute; children: React.ReactNode }) {
  const { user } = useAuth();

  if (route.roles && !route.roles.includes(user?.role ?? "admin")) {
    return <Forbidden />;
  }

  if (
    user?.role === "employee" &&
    route.employeeAccess &&
    !user.employeeAccess?.includes(route.employeeAccess)
  ) {
    return <Forbidden />;
  }

  return <>{children}</>;
}

function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [isLoading, user, location, setLocation]);

  useEffect(() => {
    if (!isLoading && user) {
      const employeeHome =
        user.role === "employee"
          ? protectedRoutes.find(
              (route) =>
                route.roles?.includes("employee") &&
                (!route.employeeAccess || user.employeeAccess?.includes(route.employeeAccess)),
            )?.path ?? "/forbidden"
          : "/vehicles";

      if (user.role === "owner" && location === "/") {
        setLocation("/vehicles", { replace: true });
      }

      if (user.role === "employee" && location === "/") {
        setLocation(employeeHome, { replace: true });
      }

      if (location === "/login") {
        const destination =
          user.role === "admin" ? "/" : user.role === "owner" ? "/vehicles" : employeeHome;
        setLocation(destination, { replace: true });
      }
    }
  }, [isLoading, user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Switch>
        {protectedRoutes.map(({ path, component: Component, roles, employeeAccess }) => (
          <Route
            key={path}
            path={path}
            component={() => (
              <RequireRole route={{ path, component: Component, roles, employeeAccess }}>
                <Component />
              </RequireRole>
            )}
          />
        ))}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Switch>
            <Route path="/login" component={Login} />
            <Route component={ProtectedApp} />
          </Switch>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
