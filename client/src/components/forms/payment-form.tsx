import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAssignments } from "@/lib/api";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPaymentSchema, type PaymentWithDetails, type InsertPayment, type AssignmentWithDetails } from "@shared/schema";

interface PaymentFormProps {
  payment?: PaymentWithDetails | null;
  onSuccess?: () => void;
}

export default function PaymentForm({ payment, onSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const isEditing = !!payment;

  const { data: assignments = [] } = useAssignments();

  // Filter active assignments
  const activeAssignments = assignments?.filter((assignment: AssignmentWithDetails) => 
    assignment.status === "active"
  );

  const form = useForm<InsertPayment>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      assignmentId: payment?.assignmentId || "",
      amount: payment?.amount || "",
      dueDate: payment?.dueDate || "",
      paidDate: payment?.paidDate || "",
      status: payment?.status || "pending",
      invoiceNumber: payment?.invoiceNumber || "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      if (isEditing) {
        return await apiRequest("PUT", `/api/payments/${payment.id}`, data);
      } else {
        return await apiRequest("POST", "/api/payments", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: `Payment ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} payment`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPayment) => {
    createPaymentMutation.mutate(data);
  };

  // Auto-fill amount when assignment is selected
  const selectedAssignment = assignments?.find((a: AssignmentWithDetails) => 
    a.id === form.watch("assignmentId")
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="payment-form">
        <FormField
          control={form.control}
          name="assignmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  // Auto-fill amount with monthly rate
                  const assignment = activeAssignments?.find((a: AssignmentWithDetails) => a.id === value);
                  if (assignment && !form.getValues("amount")) {
                    form.setValue("amount", assignment.monthlyRate);
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-assignment">
                    <SelectValue placeholder="Select an assignment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeAssignments?.map((assignment: AssignmentWithDetails) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.project.name} - {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.licensePlate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedAssignment && (
          <div className="p-4 bg-muted/50 rounded-md">
            <h4 className="font-medium text-sm mb-2">Assignment Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Project:</span> {selectedAssignment.project.name}
              </div>
              <div>
                <span className="text-muted-foreground">Vehicle:</span> {selectedAssignment.vehicle.make} {selectedAssignment.vehicle.model}
              </div>
              <div>
                <span className="text-muted-foreground">Owner:</span> {selectedAssignment.vehicle.owner.name}
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Rate:</span> ${selectedAssignment.monthlyRate}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2500.00"
                    {...field} 
                    data-testid="input-amount" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="INV-2024-001" {...field} value={field.value ?? ""} data-testid="input-invoice-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-due-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paidDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} data-testid="input-paid-date" />
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
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
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
            disabled={createPaymentMutation.isPending}
            data-testid="button-submit"
          >
            {createPaymentMutation.isPending 
              ? (isEditing ? "Updating..." : "Creating...") 
              : (isEditing ? "Update Payment" : "Create Payment")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
