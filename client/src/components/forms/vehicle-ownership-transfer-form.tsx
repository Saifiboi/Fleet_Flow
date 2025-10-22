import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOwners } from "@/lib/api";
import {
  transferVehicleOwnershipSchema,
  type TransferVehicleOwnership,
  type VehicleWithOwner,
} from "@shared/schema";

interface VehicleOwnershipTransferFormProps {
  vehicle: VehicleWithOwner;
  onSuccess?: () => void;
}

export function VehicleOwnershipTransferForm({ vehicle, onSuccess }: VehicleOwnershipTransferFormProps) {
  const { toast } = useToast();
  const { data: owners = [] } = useOwners();

  const availableOwners = useMemo(
    () => owners.filter((owner) => owner.id !== vehicle.ownerId),
    [owners, vehicle.ownerId]
  );

  const form = useForm<TransferVehicleOwnership>({
    resolver: zodResolver(transferVehicleOwnershipSchema),
    defaultValues: {
      newOwnerId: "",
      transferDate: new Date().toISOString().split("T")[0],
      transferReason: "",
      transferPrice: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      newOwnerId: "",
      transferDate: new Date().toISOString().split("T")[0],
      transferReason: "",
      transferPrice: undefined,
      notes: "",
    });
  }, [vehicle.id, form]);

  const transferMutation = useMutation({
    mutationFn: async (data: TransferVehicleOwnership) => {
      const reason = data.transferReason?.trim();
      const price = data.transferPrice?.toString().trim();
      const notes = data.notes?.trim();

      const payload: TransferVehicleOwnership = {
        newOwnerId: data.newOwnerId,
        transferDate: data.transferDate,
        transferReason: reason ? reason : undefined,
        transferPrice: price ? price : undefined,
        notes: notes ? notes : undefined,
      };

      await apiRequest("POST", `/api/vehicles/${vehicle.id}/transfer-ownership`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ownership-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ownership-history/vehicle", vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments/vehicle", vehicle.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/outstanding"] });
      toast({
        title: "Success",
        description: "Vehicle ownership transferred successfully",
      });
      form.reset({
        newOwnerId: "",
        transferDate: new Date().toISOString().split("T")[0],
        transferReason: "",
        transferPrice: undefined,
        notes: "",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer ownership",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferVehicleOwnership) => {
    if (!availableOwners.some((owner) => owner.id === data.newOwnerId)) {
      form.setError("newOwnerId", { message: "Select a different owner" });
      return;
    }

    transferMutation.mutate(data);
  };

  const isSubmitting = transferMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="vehicle-ownership-transfer-form">
        <FormField
          control={form.control}
          name="newOwnerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Owner</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={availableOwners.length === 0 || isSubmitting}>
                <FormControl>
                  <SelectTrigger data-testid="select-new-owner">
                    <SelectValue placeholder={availableOwners.length === 0 ? "No other owners available" : "Select owner"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
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
          name="transferDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transfer Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="input-transfer-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transferReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transfer Reason</FormLabel>
              <FormControl>
                <Input
                  placeholder="Sale, lease transfer, etc."
                  {...field}
                  disabled={isSubmitting}
                  data-testid="input-transfer-reason"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transferPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transfer Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="Enter amount"
                  disabled={isSubmitting}
                  data-testid="input-transfer-price"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional information about the transfer"
                  {...field}
                  disabled={isSubmitting}
                  data-testid="input-transfer-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={availableOwners.length === 0 || isSubmitting}>
            Transfer Ownership
          </Button>
        </div>
      </form>
    </Form>
  );
}
