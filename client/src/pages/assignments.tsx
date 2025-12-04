import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAssignments, useProjects } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AssignmentForm from "@/components/forms/assignment-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Calendar, Plus, Edit, Eye, Trash2, Search, Car, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { AssignmentWithDetails } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Assignments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithDetails | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const canManageAssignments =
    user?.role === "admin" || (user?.role === "employee" && user.employeeAccess?.includes("assignments"));

  const { data: assignments = [], isLoading } = useAssignments();

  const { data: projects = [] } = useProjects();

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      });
    },
  });

  const filteredAssignments = assignments?.filter((assignment: AssignmentWithDetails) => {
    const matchesSearch = 
      assignment.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.vehicle.owner.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    const matchesProject = projectFilter === "all" || assignment.projectId === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const handleEdit = (assignment: AssignmentWithDetails) => {
    setEditingAssignment(assignment);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAssignment(null);
  };

  return (
    <div className="space-y-6" data-testid="assignments-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Vehicle Assignments</span>
            </CardTitle>
            {canManageAssignments && (
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-assignment-button">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAssignment ? "Edit Assignment" : "Add New Assignment"}
                    </DialogTitle>
                  </DialogHeader>
                  <AssignmentForm
                    assignment={editingAssignment}
                    onSuccess={handleFormClose}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-assignments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="filter-project">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <ScrollArea className="h-[60vh]">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Monthly Rate (PKR)</TableHead>
                    <TableHead>Assignment Period</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageAssignments && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredAssignments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Calendar className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">No assignments found</p>
                          {searchTerm || statusFilter !== "all" || projectFilter !== "all" ? (
                            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Get started by assigning vehicles to projects</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments?.map((assignment: AssignmentWithDetails) => (
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
                              <p className="text-xs text-muted-foreground">
                                License: {assignment.vehicle.licensePlate}
                              </p>
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
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{assignment.project.name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.project.location}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <p className="text-sm font-semibold text-foreground">{assignment.monthlyRate}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">
                              {format(new Date(assignment.startDate), "MMM dd, yyyy")}
                            </p>
                            {assignment.endDate ? (
                              <p className="text-xs text-muted-foreground">
                                to {format(new Date(assignment.endDate), "MMM dd, yyyy")}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Ongoing</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(assignment.status)}
                        </TableCell>
                        {canManageAssignments && (
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(assignment)}
                                data-testid={`edit-assignment-${assignment.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`view-assignment-${assignment.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <ConfirmDialog
                                title="Delete assignment"
                                description="Are you sure you want to delete this assignment? This will make the vehicle availabl
e again."
                                onConfirm={() => deleteAssignmentMutation.mutate(assignment.id)}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    disabled={deleteAssignmentMutation.isPending}
                                    data-testid={`delete-assignment-${assignment.id}`}
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
          {filteredAssignments && filteredAssignments.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAssignments.length} of {assignments?.length || 0} assignments
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
