import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAssignmentsByProject, useProjectCustomerRates, useProjects } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AssignmentWithDetails } from "@shared/schema";
import { Car, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectRates() {
  const { data: projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { data: assignments = [], isFetching: isLoadingAssignments } = useAssignmentsByProject(
    selectedProjectId,
    { enabled: !!selectedProjectId },
  );

  const { data: rates = [], isFetching: isLoadingRates } = useProjectCustomerRates(selectedProjectId);

  const [rateValues, setRateValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (rates) {
      const mapped: Record<string, string> = {};
      rates.forEach((rate) => {
        mapped[rate.vehicleId] = rate.rate ?? "";
      });
      setRateValues(mapped);
    }
  }, [rates]);

  useEffect(() => {
    if (assignments) {
      setRateValues((prev) => {
        const next = { ...prev } as Record<string, string>;
        assignments.forEach((assignment) => {
          if (next[assignment.vehicle.id] === undefined) {
            next[assignment.vehicle.id] = "";
          }
        });
        return next;
      });
    }
  }, [assignments]);

  const assignmentsByVehicle = useMemo(() => {
    const map = new Map<string, AssignmentWithDetails>();
    assignments?.forEach((assignment) => {
      if (!map.has(assignment.vehicle.id)) {
        map.set(assignment.vehicle.id, assignment);
      }
    });
    return Array.from(map.values());
  }, [assignments]);

  const saveRatesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) {
        throw new Error("Select a project before saving rates");
      }

      const payload = {
        rates: assignmentsByVehicle.map((assignment) => ({
          vehicleId: assignment.vehicle.id,
          rate: rateValues[assignment.vehicle.id] || "0",
          projectId: selectedProjectId,
        })),
      };

      const response = await apiRequest(
        "POST",
        `/api/projects/${selectedProjectId}/customer-rates`,
        payload,
      );

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "customer-rates"] });
      toast({
        title: "Rates saved",
        description: "Customer rates for this project have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save rates",
        description: error?.message || "Unable to update rates for this project.",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingAssignments || isLoadingRates;

  return (
    <div className="space-y-6" data-testid="project-rates-page">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Project Customer Rates</CardTitle>
          <CardDescription>
            Select a project to set the customer pricing for each assigned vehicle. Rates apply to the project's customer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger data-testid="select-project-for-rates">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} — {project.customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Customer</label>
              <div className="rounded-md border bg-muted/50 p-3 text-sm text-foreground">
                {selectedProjectId
                  ? projects.find((project) => project.id === selectedProjectId)?.customer.name || ""
                  : "Select a project to view customer"}
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Rate (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-9 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : assignmentsByVehicle.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        {selectedProjectId ? "No vehicles are assigned to this project yet." : "Select a project to load vehicles."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignmentsByVehicle.map((assignment) => (
                      <TableRow key={assignment.vehicle.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Car className="text-primary w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.licensePlate})
                              </p>
                              <p className="text-xs text-muted-foreground">Project start {assignment.startDate}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{assignment.vehicle.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{assignment.vehicle.owner.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={rateValues[assignment.vehicle.id] ?? ""}
                              onChange={(e) =>
                                setRateValues((prev) => ({ ...prev, [assignment.vehicle.id]: e.target.value }))
                              }
                              className="max-w-[200px]"
                              data-testid={`rate-input-${assignment.vehicle.id}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveRatesMutation.mutate()}
              disabled={!selectedProjectId || assignmentsByVehicle.length === 0 || saveRatesMutation.isPending}
              data-testid="save-project-rates"
            >
              {saveRatesMutation.isPending ? "Saving..." : "Save Rates"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
