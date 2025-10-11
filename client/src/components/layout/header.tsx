import { Button } from "@/components/ui/button";
import { Bell, Menu, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onMenuClick: () => void;
}

const pageLabels: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Overview of your fleet management system",
  },
  "/vehicles": {
    title: "Vehicles",
    description: "Manage your fleet vehicles and their status",
  },
  "/owners": {
    title: "Owners",
    description: "Manage vehicle owners and their contact information",
  },
  "/projects": {
    title: "Projects",
    description: "Manage active projects and assignments",
  },
  "/assignments": {
    title: "Assignments",
    description: "Vehicle assignments to projects",
  },
  "/payments": {
    title: "Payments",
    description: "Track payments and outstanding invoices",
  },
  "/attendance": {
    title: "Attendance",
    description: "Track and record attendance of vehicles",
  },
  "/maintenance": {
    title: "Maintenance",
    description: "Track records of vehicle maintenance and repairs",
  },
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const pageInfo = pageLabels[location] || {
    title: "Page",
    description: "Fleet management system",
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Failed to log out",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <header
      className="bg-card border-b border-border px-6 py-4"
      data-testid="header"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
            data-testid="menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {pageInfo.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pageInfo.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden text-sm text-muted-foreground sm:block" title={user?.email}>
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            data-testid="notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
