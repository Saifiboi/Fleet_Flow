import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useVehicles } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import VehicleForm from "@/components/forms/vehicle-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Car, Plus, Edit, Eye, Trash2, Search } from "lucide-react";
import type { VehicleWithOwner } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithOwner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: vehicles = [], isLoading } = useVehicles();

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

  const handleEdit = (vehicle: VehicleWithOwner) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingVehicle(null);
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
            {isAdmin && (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
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
                    {isAdmin && (
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
                            data-testid={`view-vehicle-${vehicle.id}`}
                          >
                            <Eye className="w-4 h-4" />
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

          {/* Summary */}
          {filteredVehicles && filteredVehicles.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredVehicles.length} of {vehicles?.length || 0} vehicles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
