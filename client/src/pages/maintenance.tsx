import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useMaintenanceRecords, useVehicles } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Plus, Calendar, DollarSign, Search, Edit, Trash2, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MaintenanceForm from "@/components/forms/maintenance-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { MaintenanceRecordWithVehicle } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecordWithVehicle | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecordWithVehicle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: maintenanceRecords = [], isLoading } = useMaintenanceRecords();
  const { data: vehicles = [] } = useVehicles();
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleFilter);

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Maintenance record deleted successfully",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete maintenance record",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRecord = (record: MaintenanceRecordWithVehicle) => {
    if (record.status === "completed") {
      toast({
        title: "Action not allowed",
        description: "Completed maintenance records cannot be deleted.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    deleteRecordMutation.mutate(record.id);
  };

  const recordsByVehicleAndDate = maintenanceRecords.filter((record: MaintenanceRecordWithVehicle) => {
    const matchesVehicle = !vehicleFilter || record.vehicleId === vehicleFilter;
    const recordDate = new Date(record.serviceDate);
    const matchesStartDate = !startDate || recordDate >= new Date(startDate);
    const matchesEndDate = !endDate || recordDate <= new Date(endDate);

    return matchesVehicle && matchesStartDate && matchesEndDate;
  });

  const filteredRecords = recordsByVehicleAndDate.filter((record: MaintenanceRecordWithVehicle) => {
    const matchesSearch =
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.performedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || record.type === typeFilter;
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const summaryRecords: MaintenanceRecordWithVehicle[] = vehicleFilter ? recordsByVehicleAndDate : [];
  const summaryTotalCost = summaryRecords.reduce((sum, record) => sum + Number(record.cost), 0);
  const summaryAverageCost = summaryRecords.length ? summaryTotalCost / summaryRecords.length : 0;
  const summaryHighestCostRecord = summaryRecords.reduce<MaintenanceRecordWithVehicle | null>((highest, record) => {
    if (!highest || Number(record.cost) > Number(highest.cost)) {
      return record;
    }
    return highest;
  }, null);
  const summaryLastServiceDate = summaryRecords.reduce<Date | null>((latest, record) => {
    const serviceDate = new Date(record.serviceDate);
    if (!latest || serviceDate > latest) {
      return serviceDate;
    }
    return latest;
  }, null);
  const summaryNextServiceDate = summaryRecords
    .map((record) => (record.nextServiceDate ? new Date(record.nextServiceDate) : null))
    .filter((date): date is Date => !!date)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
  const summaryDateRangeLabel = startDate || endDate
    ? `${startDate ? new Date(startDate).toLocaleDateString() : "Start"} - ${
        endDate ? new Date(endDate).toLocaleDateString() : "End"
      }`
    : "All time";

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "default",
      repair: "destructive",
      inspection: "secondary",
      service: "outline",
      driver_salary: "secondary",
    };
    const labels: Record<string, string> = {
      scheduled: "Scheduled",
      repair: "Repair",
      inspection: "Inspection",
      service: "Service",
      driver_salary: "Driver Salary",
    };
    return <Badge variant={variants[type] || "outline"}>{labels[type] || type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "outline",
      in_progress: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      scheduled: "Scheduled",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const handleEdit = (record: MaintenanceRecordWithVehicle) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleView = (record: MaintenanceRecordWithVehicle) => {
    setViewingRecord(record);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const totalMaintenanceCost = filteredRecords?.reduce((sum, record) => sum + Number(record.cost), 0) || 0;
  const overdueRecords = filteredRecords?.filter(record => 
    record.nextServiceDate && new Date(record.nextServiceDate) < new Date() && record.status !== "completed"
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="maintenance-page">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="maintenance-cost-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Maintenance Cost</p>
                <p className="text-2xl font-bold">{totalMaintenanceCost.toLocaleString()}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="maintenance-records-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{filteredRecords?.length || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Wrench className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="overdue-maintenance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Maintenance</p>
                <p className="text-2xl font-bold text-red-600">{overdueRecords.length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <Calendar className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="w-5 h-5" />
              <span>Maintenance Records</span>
            </CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-maintenance-button">
                  <Plus className="mr-2 w-4 h-4" />
                  Add Maintenance Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRecord ? "Edit Maintenance Record" : "Add New Maintenance Record"}
                  </DialogTitle>
                </DialogHeader>
                <MaintenanceForm 
                  record={editingRecord} 
                  onSuccess={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by vehicle, description, or service provider..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-maintenance"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm min-w-[180px]"
                data-testid="filter-vehicle"
              >
                <option value="">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.licensePlate}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                data-testid="filter-type"
              >
                <option value="all">All Types</option>
                <option value="scheduled">Scheduled</option>
                <option value="repair">Repair</option>
                <option value="inspection">Inspection</option>
                <option value="service">Service</option>
                <option value="driver_salary">Driver Salary</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                data-testid="filter-status"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
                data-testid="filter-start-date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
                data-testid="filter-end-date"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setVehicleFilter("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                }}
                data-testid="reset-maintenance-filters"
              >
                Reset
              </Button>
            </div>
          </div>

          {vehicleFilter && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Maintenance Summary for {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : "Selected Vehicle"}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {selectedVehicle?.licensePlate && (
                    <span className="font-medium text-foreground">{selectedVehicle.licensePlate}</span>
                  )}
                  <span>{summaryDateRangeLabel}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summaryRecords.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total Services</p>
                      <p className="text-2xl font-semibold">{summaryRecords.length}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-semibold">${summaryTotalCost.toLocaleString()}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Average Cost</p>
                      <p className="text-2xl font-semibold">${summaryAverageCost.toFixed(2)}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Highest Cost Entry</p>
                      <p className="text-lg font-semibold">
                        {summaryHighestCostRecord
                          ? `$${Number(summaryHighestCostRecord.cost).toLocaleString()}`
                          : "N/A"}
                      </p>
                      {summaryHighestCostRecord && (
                        <p className="text-sm text-muted-foreground truncate" title={summaryHighestCostRecord.description}>
                          {summaryHighestCostRecord.description}
                        </p>
                      )}
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Last Service Date</p>
                      <p className="text-lg font-semibold">
                        {summaryLastServiceDate ? summaryLastServiceDate.toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Upcoming Next Service</p>
                      <p className="text-lg font-semibold">
                        {summaryNextServiceDate ? summaryNextServiceDate.toLocaleDateString() : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No maintenance records found for the selected vehicle and date range.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <ScrollArea className="h-[60vh]">
                <Table className="min-w-full" data-testid="maintenance-records-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords && filteredRecords.length > 0 ? (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`maintenance-row-${record.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.vehicle.make} {record.vehicle.model}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.vehicle.licensePlate}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(record.type)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={record.description}>
                              {record.description}
                            </div>
                          </TableCell>
                          <TableCell>${Number(record.cost).toLocaleString()}</TableCell>
                          <TableCell>{new Date(record.serviceDate).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(record)}
                                data-testid={`view-maintenance-${record.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(record)}
                                data-testid={`edit-maintenance-${record.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <ConfirmDialog
                                title="Delete maintenance record"
                                description="Are you sure you want to delete this maintenance record?"
                                onConfirm={() => handleDeleteRecord(record)}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={deleteRecordMutation.isPending || record.status === "completed"}
                                    data-testid={`delete-maintenance-${record.id}`}
                                    title={
                                      record.status === "completed"
                                        ? "Completed maintenance records cannot be deleted."
                                        : undefined
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                }
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <Wrench className="w-8 h-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No maintenance records found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>

          {/* Summary */}
          {filteredRecords && filteredRecords.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {maintenanceRecords?.length || 0} maintenance records
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewing Record Dialog */}
      {viewingRecord && (
        <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Maintenance Record Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vehicle</label>
                  <p className="text-sm">{viewingRecord.vehicle.make} {viewingRecord.vehicle.model} - {viewingRecord.vehicle.licensePlate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm">{getTypeBadge(viewingRecord.type)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm">{viewingRecord.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cost</label>
                  <p className="text-sm">${Number(viewingRecord.cost).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Performed By</label>
                  <p className="text-sm">{viewingRecord.performedBy}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Service Date</label>
                  <p className="text-sm">{new Date(viewingRecord.serviceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Next Service Date</label>
                  <p className="text-sm">
                    {viewingRecord.nextServiceDate ? new Date(viewingRecord.nextServiceDate).toLocaleDateString() : "Not set"}
                  </p>
                </div>
              </div>
              {viewingRecord.mileage && (
                <div>
                  <label className="text-sm font-medium">Mileage</label>
                  <p className="text-sm">{viewingRecord.mileage.toLocaleString()} miles</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Status</label>
                <p className="text-sm">{getStatusBadge(viewingRecord.status)}</p>
              </div>
              {viewingRecord.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm">{viewingRecord.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}