import { Link, useLocation } from "wouter";
import {
  Truck,
  BarChart3,
  Car,
  Users,
  FolderKanban,
  Calendar,
  CreditCard,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type NavigationItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
};

const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: BarChart3, roles: ["admin"] },
  { path: "/owners", label: "Owners", icon: Users, roles: ["admin"] },
  { path: "/vehicles", label: "Vehicles", icon: Car, roles: ["admin", "owner"] },
  { path: "/projects", label: "Projects", icon: FolderKanban, roles: ["admin"] },
  { path: "/assignments", label: "Assignments", icon: Calendar, roles: ["admin", "owner"] },
  { path: "/attendance", label: "Attendance", icon: Calendar, roles: ["admin", "owner"] },
  { path: "/payments", label: "Payments", icon: CreditCard, roles: ["admin", "owner"] },
  { path: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["admin", "owner"] },
] as const;

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const items = navigationItems.filter((item) => {
    if (!item.roles) {
      return true;
    }

    const role: UserRole = user?.role ?? "admin";

    return item.roles.includes(role);
  });

  return (
    <aside
      className={cn(
        "bg-card border-r border-border flex-shrink-0 sidebar-transition",
        isOpen ? "w-64" : "w-16",
      )}
      data-testid="sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  {isOpen && <span>{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {isOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center uppercase text-sm font-semibold text-primary-foreground">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground truncate" title={user?.email}>
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
