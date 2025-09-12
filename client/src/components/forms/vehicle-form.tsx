import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useOwners } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVehicleSchema, type VehicleWithOwner, type InsertVehicle, type Owner } from "@shared/schema";

interface VehicleFormProps {
  vehicle?: VehicleWithOwner | null;
  onSuccess?: () => void;
}

export default function VehicleForm({ vehicle, onSuccess }: VehicleFormProps) {
  const { toast } = useToast();
  const isEditing = !!vehicle;

  const { data: owners = [] } = useOwners();

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year || new Date().getFullYear(),
      licensePlate: vehicle?.licensePlate || "",
      ownerId: vehicle?.ownerId || "",
      status: vehicle?.status || "available",
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      if (isEditing) {
        return await apiRequest("PUT", `/api/vehicles/${vehicle.id}`, data);
      } else {
        return await apiRequest("POST", "/api/vehicles", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `Vehicle ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} vehicle`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertVehicle) => {
    createVehicleMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="vehicle-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota, Ford, BMW..." {...field} data-testid="input-make" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Camry, F-150, X5..." {...field} data-testid="input-model" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1900" 
                    max={new Date().getFullYear() + 1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-year" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input placeholder="ABC-123" {...field} data-testid="input-license-plate" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-owner">
                      <SelectValue placeholder="Select an owner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {owners?.map((owner: Owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name} - {owner.phone}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
            disabled={createVehicleMutation.isPending}
            data-testid="button-submit"
          >
            {createVehicleMutation.isPending 
              ? (isEditing ? "Updating..." : "Creating...") 
              : (isEditing ? "Update Vehicle" : "Create Vehicle")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
