import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useVehicles, useAssignmentsByVehicle, useOwnershipHistoryByVehicle } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VehicleForm from "@/components/forms/vehicle-form";
import { VehicleOwnershipTransferForm } from "@/components/forms/vehicle-ownership-transfer-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Car, Plus, Edit, Eye, Trash2, Search, ArrowLeftRight } from "lucide-react";
import type { VehicleWithOwner } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithOwner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transferVehicle, setTransferVehicle] = useState<VehicleWithOwner | null>(null);
  const [viewVehicle, setViewVehicle] = useState<VehicleWithOwner | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const canManageVehicles =
    user?.role === "admin" || (user?.role === "employee" && user.employeeAccess?.includes("vehicles"));

  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: ownershipHistory = [], isLoading: isOwnershipHistoryLoading } = useOwnershipHistoryByVehicle(
    viewVehicle?.id,
    { enabled: !!viewVehicle }
  );
  const { data: assignmentHistory = [], isLoading: isAssignmentHistoryLoading } = useAssignmentsByVehicle(
    viewVehicle?.id,
    { enabled: !!viewVehicle }
  );

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vehicle",
        variant: "destructive",
      });
    },
  });

  const filteredVehicles = vehicles?.filter((vehicle: VehicleWithOwner) => {
    const matchesSearch = 
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.owner.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      assigned: "secondary",
      maintenance: "outline",
      out_of_service: "destructive",
    };
    const labels: Record<string, string> = {
      available: "Available",
      assigned: "Assigned",
      maintenance: "Maintenance",
      out_of_service: "Out of Service",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getAssignmentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const formatDisplayDate = (value?: string | Date | null) => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === "string" ? value : "—";
    }

    return date.toLocaleDateString();
  };

  const formatPeriod = (start?: string | Date | null, end?: string | Date | null) => {
    const startLabel = formatDisplayDate(start);
    const endLabel = end ? formatDisplayDate(end) : "Present";
    return `${startLabel} – ${endLabel}`;
  };

  const formatCurrency = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }

    const numericValue = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numericValue)) {
      return String(value);
    }

    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numericValue);
  };

  const renderDetail = (label: string, value: ReactNode) => (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value ?? "—"}</div>
    </div>
  );

  const handleEdit = (vehicle: VehicleWithOwner) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingVehicle(null);
  };

  const closeTransferDialog = () => {
    setTransferVehicle(null);
  };

  const closeViewDialog = () => {
    setViewVehicle(null);
  };

  return (
    <div className="space-y-6" data-testid="vehicles-page">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5" />
              <span>Vehicles</span>
            </CardTitle>
            {canManageVehicles && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-vehicle-button">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                    </DialogTitle>
                  </DialogHeader>
                  <VehicleForm
                    vehicle={editingVehicle}
                    onSuccess={handleFormClose}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-vehicles"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicles Table */}
          <div className="rounded-md border">
            <ScrollArea className="h-[60vh]">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageVehicles && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredVehicles?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Car className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">No vehicles found</p>
                          {searchTerm || statusFilter !== "all" ? (
                            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Get started by adding your first vehicle</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles?.map((vehicle: VehicleWithOwner) => (
                      <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Car className="text-primary w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Added {new Date(vehicle.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{vehicle.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.owner.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-mono text-foreground">{vehicle.licensePlate}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{vehicle.year}</p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(vehicle.status)}
                        </TableCell>
                        {canManageVehicles && (
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(vehicle)}
                                data-testid={`edit-vehicle-${vehicle.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewVehicle(vehicle)}
                                data-testid={`view-vehicle-${vehicle.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTransferVehicle(vehicle)}
                                data-testid={`transfer-vehicle-${vehicle.id}`}
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </Button>
                              <ConfirmDialog
                                title="Delete vehicle"
                                description="Are you sure you want to delete this vehicle?"
                                onConfirm={() => deleteVehicleMutation.mutate(vehicle.id)}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    disabled={deleteVehicleMutation.isPending}
                                    data-testid={`delete-vehicle-${vehicle.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Summary */}
          {filteredVehicles && filteredVehicles.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredVehicles.length} of {vehicles?.length || 0} vehicles
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!viewVehicle}
        onOpenChange={(open) => {
          if (!open) {
            closeViewDialog();
          }
        }}
      >
        {viewVehicle && (
          <DialogContent className="max-w-4xl" data-testid="vehicle-details-dialog">
            <DialogHeader>
              <DialogTitle>
                {viewVehicle.make} {viewVehicle.model}
              </DialogTitle>
              <DialogDescription>
                License Plate {viewVehicle.licensePlate}
                {viewVehicle.vin ? ` • VIN ${viewVehicle.vin}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Vehicle Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {renderDetail("Status", getStatusBadge(viewVehicle.status))}
                  {renderDetail("Make", viewVehicle.make)}
                  {renderDetail("Model", viewVehicle.model)}
                  {renderDetail("Year", viewVehicle.year)}
                  {renderDetail("License Plate", viewVehicle.licensePlate)}
                  {renderDetail("VIN", viewVehicle.vin ?? "—")}
                  {renderDetail(
                    "Current Odometer",
                    viewVehicle.currentOdometer !== null && viewVehicle.currentOdometer !== undefined
                      ? viewVehicle.currentOdometer.toLocaleString()
                      : "—"
                  )}
                  {renderDetail("Fuel Type", viewVehicle.fuelType ?? "—")}
                  {renderDetail("Transmission", viewVehicle.transmissionType ?? "—")}
                  {renderDetail("Category", viewVehicle.category ?? "—")}
                  {renderDetail("Passenger Capacity", viewVehicle.passengerCapacity ?? "—")}
                  {renderDetail("Created", formatDisplayDate(viewVehicle.createdAt))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Current Owner
                </h3>
                <div className="rounded-lg border p-4 shadow-sm">
                  <p className="text-base font-semibold text-foreground">{viewVehicle.owner.name}</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>{viewVehicle.owner.phone}</p>
                    <p>{viewVehicle.owner.email}</p>
                    <p>{viewVehicle.owner.address}</p>
                    {viewVehicle.owner.companyName && (
                      <p>Company: {viewVehicle.owner.companyName}</p>
                    )}
                    {viewVehicle.owner.contactPerson && (
                      <p>Contact: {viewVehicle.owner.contactPerson}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Ownership History
                </h3>
                {isOwnershipHistoryLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : ownershipHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ownership history recorded for this vehicle.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner</TableHead>
                        <TableHead>Ownership Period</TableHead>
                        <TableHead>Transfer Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ownershipHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{record.owner.name}</div>
                            <div className="text-xs text-muted-foreground">{record.owner.phone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{formatPeriod(record.startDate, record.endDate)}</div>
                            {record.transferReason && (
                              <p className="mt-1 text-xs text-muted-foreground">Reason: {record.transferReason}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm text-foreground">
                              <p>Price: {formatCurrency(record.transferPrice)}</p>
                              {record.notes && (
                                <p className="text-xs text-muted-foreground">Notes: {record.notes}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>

              <section className="space-y-3 pb-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Assignment History
                </h3>
                {isAssignmentHistoryLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : assignmentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments recorded for this vehicle yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Assignment Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Monthly Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentHistory.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{assignment.project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assignment.project.location ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{formatPeriod(assignment.startDate, assignment.endDate)}</div>
                          </TableCell>
                          <TableCell>{getAssignmentStatusBadge(assignment.status)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(assignment.monthlyRate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!transferVehicle}
        onOpenChange={(open) => {
          if (!open) {
            closeTransferDialog();
          }
        }}
      >
        {transferVehicle && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Transfer Ownership</DialogTitle>
            </DialogHeader>
            <VehicleOwnershipTransferForm vehicle={transferVehicle} onSuccess={closeTransferDialog} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
