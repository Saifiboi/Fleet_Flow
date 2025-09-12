import { Link, useLocation } from "wouter";
import { Truck, BarChart3, Car, Users, FolderKanban, Calendar, CreditCard, FileText, ChartBar } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { path: "/", label: "Dashboard", icon: BarChart3 },
  { path: "/vehicles", label: "Vehicles", icon: Car },
  { path: "/owners", label: "Owners", icon: Users },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/assignments", label: "Assignments", icon: Calendar },
  { path: "/payments", label: "Payments", icon: CreditCard },
];

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside 
      className={cn(
        "bg-card border-r border-border flex-shrink-0 sidebar-transition",
        isOpen ? "w-64" : "w-16"
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
                <p className="text-sm text-muted-foreground">Vehicle Management ERP</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Users className="text-primary-foreground w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Fleet Manager</p>
                <p className="text-xs text-muted-foreground">Admin User</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
