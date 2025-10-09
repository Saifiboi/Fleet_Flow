import { Button } from "@/components/ui/button";
import { Bell, Plus, Menu } from "lucide-react";
import { useLocation } from "wouter";

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
  const [location] = useLocation();
  const pageInfo = pageLabels[location] || {
    title: "Page",
    description: "Fleet management system",
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
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            data-testid="notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
