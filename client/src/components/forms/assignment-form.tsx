import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useVehicles, useProjects } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAssignmentSchema, type AssignmentWithDetails, type InsertAssignment, type VehicleWithOwner, type Project } from "@shared/schema";

interface AssignmentFormProps {
  assignment?: AssignmentWithDetails | null;
  onSuccess?: () => void;
}

export default function AssignmentForm({ assignment, onSuccess }: AssignmentFormProps) {
  const { toast } = useToast();
  const isEditing = !!assignment;

  const { data: vehicles = [] } = useVehicles();

  const { data: projects = [] } = useProjects();

  // Filter available vehicles (not assigned to other projects)
  const availableVehicles = vehicles?.filter((vehicle: VehicleWithOwner) => 
    vehicle.status === "available" || (isEditing && vehicle.id === assignment?.vehicleId)
  );

  const form = useForm<InsertAssignment>({
    resolver: zodResolver(insertAssignmentSchema),
    defaultValues: {
      vehicleId: assignment?.vehicleId || "",
      projectId: assignment?.projectId || "",
      monthlyRate: assignment?.monthlyRate || "",
      startDate: assignment?.startDate || "",
      endDate: assignment?.endDate || "",
      status: assignment?.status || "active",
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: InsertAssignment) => {
      if (isEditing) {
        return await apiRequest("PUT", `/api/assignments/${assignment.id}`, data);
      } else {
        return await apiRequest("POST", "/api/assignments", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `Assignment ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} assignment`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAssignment) => {
    createAssignmentMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="assignment-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-vehicle">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableVehicles?.map((vehicle: VehicleWithOwner) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.licensePlate}) - {vehicle.owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects?.filter((project: Project) => project.status === "active").map((project: Project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="monthlyRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Rate ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2500.00"
                  {...field} 
                  data-testid="input-monthly-rate" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-start-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} data-testid="input-end-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select assignment status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createAssignmentMutation.isPending}
            data-testid="button-submit"
          >
            {createAssignmentMutation.isPending 
              ? (isEditing ? "Updating..." : "Creating...") 
              : (isEditing ? "Update Assignment" : "Create Assignment")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
