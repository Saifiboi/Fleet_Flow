import { useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignments } from "@/lib/api";
import { createVehiclePaymentForPeriod } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  createVehiclePaymentForPeriodSchema,
  type AssignmentWithDetails,
  type CreateVehiclePaymentForPeriod,
  type VehiclePaymentForPeriodResult,
} from "@shared/schema";

interface PaymentPeriodFormProps {
  onCalculated?: (
    result: VehiclePaymentForPeriodResult,
    request: CreateVehiclePaymentForPeriod
  ) => void;
}

export function PaymentPeriodForm({ onCalculated }: PaymentPeriodFormProps) {
  const { toast } = useToast();
  const { data: assignments = [] } = useAssignments();
  const lastSubmittedValuesRef = useRef<CreateVehiclePaymentForPeriod | null>(null);

  const selectableAssignments = useMemo(() => {
    return assignments
      .filter((assignment: AssignmentWithDetails) => assignment.status === "active" || assignment.status === "completed")
      .sort((a, b) => {
        if (a.status === b.status) {
          return a.project.name.localeCompare(b.project.name);
        }
        return a.status === "active" ? -1 : 1;
      });
  }, [assignments]);

  const form = useForm<CreateVehiclePaymentForPeriod>({
    resolver: zodResolver(createVehiclePaymentForPeriodSchema),
    defaultValues: {
      assignmentId: "",
      startDate: "",
      endDate: "",
      dueDate: "",
      status: "pending",
      paidDate: null,
      invoiceNumber: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createVehiclePaymentForPeriod,
    onSuccess: (result: VehiclePaymentForPeriodResult) => {
      toast({
        title: "Calculation ready",
        description: "Review the breakdown below before creating the payment.",
      });
      if (lastSubmittedValuesRef.current) {
        onCalculated?.(result, lastSubmittedValuesRef.current);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to calculate payment",
        description: error?.message ?? "Unable to create payment for the selected period.",
        variant: "destructive",
      });
    },
  });

  const selectedAssignment = selectableAssignments.find(
    (assignment: AssignmentWithDetails) => assignment.id === form.watch("assignmentId")
  );

  const formatDisplayDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  };

  const onSubmit = (values: CreateVehiclePaymentForPeriod) => {
    lastSubmittedValuesRef.current = values;
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="assignmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                value={field.value}
                disabled={mutation.isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an assignment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectableAssignments.map((assignment: AssignmentWithDetails) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{assignment.project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.licensePlate}) · {" "}
                          {assignment.status === "completed" ? "Completed" : "Active"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedAssignment && (
          <div className="rounded-md border p-4 text-sm">
            <p className="font-medium">Assignment details</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Project:</span> {selectedAssignment.project.name}
              </div>
              <div>
                <span className="text-muted-foreground">Vehicle:</span> {selectedAssignment.vehicle.make}{" "}
                {selectedAssignment.vehicle.model}
              </div>
              <div>
                <span className="text-muted-foreground">Owner:</span> {selectedAssignment.vehicle.owner.name}
              </div>
              <div>
                <span className="text-muted-foreground">Monthly rate:</span> ${" "}
                {Number(selectedAssignment.monthlyRate).toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span> {" "}
                <span className="capitalize">{selectedAssignment.status.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assignment dates:</span> {" "}
                {formatDisplayDate(selectedAssignment.startDate)} – {" "}
                {selectedAssignment.endDate ? formatDisplayDate(selectedAssignment.endDate) : "Ongoing"}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={mutation.isPending} />
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
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={mutation.isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={mutation.isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice number (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="INV-2024-001"
                    {...field}
                    value={field.value ?? ""}
                    disabled={mutation.isPending}
                  />
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
                <FormLabel>Paid date (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormDescription>Only set when the payment has already been received.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Calculating..." : "Calculate payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
