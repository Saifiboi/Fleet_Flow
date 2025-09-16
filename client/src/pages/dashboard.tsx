import { useDashboardStats, useAssignments, useOutstandingPayments } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, FolderKanban, AlertTriangle, DollarSign, Check, Wrench, X, Eye, Edit, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();

  const { data: outstandingPayments = [], isLoading: paymentsLoading } = useOutstandingPayments();

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    
    if (status === "paid") return <Badge variant="outline">Paid</Badge>;
    if (daysOverdue > 0) return <Badge variant="destructive">{daysOverdue} days overdue</Badge>;
    if (daysOverdue === 0) return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Due Today</Badge>;
    if (daysOverdue >= -3) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Due Soon</Badge>;
    
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="stat-total-vehicles">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Vehicles</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalVehicles || 0}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Car className="text-primary w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-600">+2</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-projects">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-foreground">{stats?.activeProjects || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FolderKanban className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-600">+1</span> new this week
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-outstanding-payments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding Payments</p>
                <p className="text-2xl font-bold text-foreground">
                  ${stats?.outstandingAmount?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <AlertTriangle className="text-orange-600 w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-red-600">5</span> overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-monthly-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${stats?.monthlyRevenue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-600">+15%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Status Overview */}
        <div className="lg:col-span-2">
          <Card data-testid="vehicle-status-overview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vehicle Status Overview</CardTitle>
                <Select defaultValue="30days">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="1year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Quick status indicators */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check className="text-green-600 w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{stats?.vehicleStatusCounts?.available || 0}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Car className="text-blue-600 w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{stats?.vehicleStatusCounts?.assigned || 0}</p>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Wrench className="text-yellow-600 w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{stats?.vehicleStatusCounts?.maintenance || 0}</p>
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <X className="text-red-600 w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{stats?.vehicleStatusCounts?.outOfService || 0}</p>
                  <p className="text-xs text-muted-foreground">Out of Service</p>
                </div>
              </div>

              {/* Chart placeholder */}
              <div className="h-64 bg-muted/30 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <Car className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Vehicle Utilization Chart</p>
                  <p className="text-xs text-muted-foreground mt-1">Chart implementation available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card data-testid="recent-assignments">
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignmentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  assignments?.slice(0, 3).map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Car className="text-primary w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {assignment.vehicle.make} {assignment.vehicle.model} - {assignment.vehicle.licensePlate}
                        </p>
                        <p className="text-xs text-muted-foreground">{assignment.project.name}</p>
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary" data-testid="view-all-assignments" o>
                View All Assignments
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="payment-alerts">
            <CardHeader>
              <CardTitle>Payment Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  outstandingPayments?.slice(0, 3).map((payment: any) => (
                    <div key={payment.id} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertTriangle className="text-red-500 w-4 h-4 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{payment.assignment.project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${payment.amount} - Due {format(new Date(payment.dueDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary" data-testid="manage-payments">
                Manage Payments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Vehicle Assignments Table */}
      <Card data-testid="assignments-table">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Vehicle Assignments</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input 
                  placeholder="Search assignments..." 
                  className="w-64"
                  data-testid="search-assignments"
                />
              </div>
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Assignment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                assignments?.slice(0, 5).map((assignment: any) => (
                  <TableRow key={assignment.id} data-testid={`assignment-row-${assignment.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Car className="text-primary w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {assignment.vehicle.make} {assignment.vehicle.model} {assignment.vehicle.year}
                          </p>
                          <p className="text-xs text-muted-foreground">License: {assignment.vehicle.licensePlate}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{assignment.vehicle.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.vehicle.owner.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{assignment.project.name}</p>
                      <p className="text-xs text-muted-foreground">{assignment.project.location}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">${assignment.monthlyRate}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{format(new Date(assignment.startDate), "MMM dd, yyyy")}</p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assignment.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`edit-assignment-${assignment.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`view-assignment-${assignment.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" data-testid={`delete-assignment-${assignment.id}`}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Outstanding Payments Table */}
      <Card data-testid="payments-table">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Payments</CardTitle>
            <div className="flex items-center space-x-3">
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="due_today">Due Today</SelectItem>
                </SelectContent>
              </Select>
              <Button data-testid="generate-invoices">
                <FileText className="mr-2 w-4 h-4" />
                Generate Invoices
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                outstandingPayments?.slice(0, 5).map((payment: any) => (
                  <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{payment.assignment.project.name}</p>
                      <p className="text-xs text-muted-foreground">Invoice #{payment.invoiceNumber || 'Pending'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">
                        {payment.assignment.vehicle.make} {payment.assignment.vehicle.model} {payment.assignment.vehicle.year}
                      </p>
                      <p className="text-xs text-muted-foreground">{payment.assignment.vehicle.licensePlate}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">${payment.amount}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{format(new Date(payment.dueDate), "MMM dd, yyyy")}</p>
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment.status, payment.dueDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" data-testid={`pay-${payment.id}`}>
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`view-payment-${payment.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800" data-testid={`mark-paid-${payment.id}`}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
