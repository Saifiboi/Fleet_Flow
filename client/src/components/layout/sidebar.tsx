import { Link, useLocation } from "wouter";
import {
  Truck,
  BarChart3,
  Car,
  Users,
  Shield,
  FolderKanban,
  Calendar,
  CreditCard,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { EmployeeAccessArea, UserRole } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type NavigationItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
  employeeAccess?: EmployeeAccessArea;
};

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: BarChart3, roles: ["admin"] },
  { path: "/users", label: "Users", icon: Shield, roles: ["admin"] },
  { path: "/owners", label: "Owners", icon: Users, roles: ["admin", "owner", "employee"], employeeAccess: "owners" },
  { path: "/vehicles", label: "Vehicles", icon: Car, roles: ["admin", "owner", "employee"], employeeAccess: "vehicles" },
  { path: "/customers", label: "Customers", icon: Users, roles: ["admin", "employee"], employeeAccess: "projects" },
  { path: "/projects", label: "Projects", icon: FolderKanban, roles: ["admin", "employee"], employeeAccess: "projects" },
  { path: "/assignments", label: "Assignments", icon: Calendar, roles: ["admin", "owner", "employee"], employeeAccess: "assignments" },
  {
    path: "/project-attendance",
    label: "Project Attendance",
    icon: Calendar,
    roles: ["admin", "employee"],
    employeeAccess: "projectAttendance",
  },
  { path: "/attendance", label: "Vehicle Attendance", icon: Calendar, roles: ["admin", "owner", "employee"], employeeAccess: "attendance" },
  { path: "/payments", label: "Payments", icon: CreditCard, roles: ["admin", "owner", "employee"], employeeAccess: "payments" },
  { path: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["admin", "owner", "employee"], employeeAccess: "maintenance" },
] as const;

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  const items = navigationItems.filter((item) => {
    if (!item.roles) {
      return true;
    }

    const role: UserRole = user?.role ?? "admin";

    if (!item.roles.includes(role)) {
      return false;
    }

    if (role === "employee" && item.employeeAccess) {
      return user?.employeeAccess?.includes(item.employeeAccess);
    }

    return true;
  });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full transform bg-card border-r border-border sidebar-transition transition-all duration-200 ease-in-out lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 lg:w-16",
      )}
      data-testid="sidebar"
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-full flex-col">
        {/* Logo */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <Truck className="text-primary-foreground w-6 h-6" />
              </div>
              {isOpen && (
                <div>
                  <h1 className="text-xl font-bold text-foreground">FleetPro</h1>
                  <p className="text-sm text-muted-foreground">
                    Vehicle Management ERP
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
              aria-label="Close navigation"
            >
              ×
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  onClick={handleNavClick}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {isOpen && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="truncate text-sm font-medium text-foreground" title={user?.email}>
                  {user?.email ?? "User"}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{user?.role ?? ""}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
