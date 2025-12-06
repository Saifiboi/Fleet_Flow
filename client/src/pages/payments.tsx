import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { usePayments } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PaymentPeriodForm } from "@/components/forms/payment-period-form";
import {
  CreditCard,
  Eye,
  Search,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type {
  PaymentWithDetails,
  VehiclePaymentForPeriodResult,
  CreateVehiclePaymentForPeriod,
  CreatePaymentRequest,
  CreatePaymentTransaction,
} from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCalculationOpen, setIsCalculationOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<VehiclePaymentForPeriodResult | null>(null);
  const [calculationRequest, setCalculationRequest] =
    useState<CreateVehiclePaymentForPeriod | null>(null);
  const [monthOverrides, setMonthOverrides] = useState<Record<string, string>>({});
  const [maintenanceOverride, setMaintenanceOverride] = useState<string>("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManagePayments =
    isAdmin || (user?.role === "employee" && user.employeeAccess?.includes("payments"));

  const transactionForm = useForm<CreatePaymentTransaction>({
    defaultValues: {
      amount: "",
      method: "cash",
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      referenceNumber: "",
      notes: "",
      recordedBy: "",
    },
  });

  const { data: payments = [], isLoading } = usePayments();

  const createPaymentFromCalculation = useMutation({
    mutationFn: async (data: CreatePaymentRequest) => {
      await apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Payment created from calculation",
      });
      setIsCalculationOpen(false);
      setCalculationResult(null);
      setCalculationRequest(null);
      setMonthOverrides({});
      setMaintenanceOverride("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async ({
      paymentId,
      values,
    }: {
      paymentId: string;
      values: CreatePaymentTransaction;
    }) => {
      const res = await apiRequest("POST", `/api/payments/${paymentId}/transactions`, values);
      return (await res.json()) as { transaction: unknown; payment?: PaymentWithDetails };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      if (data?.payment) {
        setSelectedPayment(data.payment);
      }
      toast({
        title: "Transaction recorded",
        description: "Payment balance has been updated.",
      });
      transactionForm.reset({
        amount: "",
        method: "cash",
        transactionDate: format(new Date(), "yyyy-MM-dd"),
        referenceNumber: "",
        notes: "",
        recordedBy: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isViewOpen) {
      transactionForm.reset({
        amount: "",
        method: "cash",
        transactionDate: format(new Date(), "yyyy-MM-dd"),
        referenceNumber: "",
        notes: "",
        recordedBy: "",
      });
    }
  }, [isViewOpen, transactionForm]);

  const filteredPayments = payments?.filter((payment: PaymentWithDetails) => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      payment.assignment.project.name.toLowerCase().includes(lowerSearch) ||
      payment.assignment.vehicle.make.toLowerCase().includes(lowerSearch) ||
      payment.assignment.vehicle.model.toLowerCase().includes(lowerSearch) ||
      payment.assignment.vehicle.licensePlate.toLowerCase().includes(lowerSearch) ||
      (payment.invoiceNumber && payment.invoiceNumber.toLowerCase().includes(lowerSearch)) ||
      (payment.paymentOwner?.name && payment.paymentOwner.name.toLowerCase().includes(lowerSearch));

    const today = new Date();
    const due = new Date(payment.dueDate);
    const isOverdue = payment.outstandingAmount > 0 && differenceInDays(today, due) > 0;
    const normalizedStatus = payment.status.toLowerCase();

    const matchesStatus =
      statusFilter === "all" ||
      normalizedStatus === statusFilter ||
      (statusFilter === "overdue" && isOverdue);

    return matchesSearch && matchesStatus;
  });

  const adjustedTotals = useMemo(() => {
    if (!calculationResult) {
      return {
        monthTotal: 0,
        maintenance: 0,
        netRaw: 0,
        net: 0,
      };
    }

    const monthTotal = calculationResult.calculation.monthlyBreakdown.reduce((sum, month) => {
      const key = `${month.year}-${month.month}`;
      const value = parseFloat(monthOverrides[key] ?? month.amount.toFixed(2));
      if (Number.isNaN(value)) {
        return sum;
      }
      return sum + value;
    }, 0);

    const maintenanceValue = parseFloat(maintenanceOverride || "0");
    const normalizedMaintenance = Number.isNaN(maintenanceValue) ? 0 : maintenanceValue;
    const netRaw = monthTotal - normalizedMaintenance;

    return {
      monthTotal,
      maintenance: normalizedMaintenance,
      netRaw,
      net: Math.round(netRaw),
    };
  }, [calculationResult, monthOverrides, maintenanceOverride]);

  const alreadyPaidAttendancePreview = useMemo(() => {
    if (!calculationResult?.calculation.alreadyPaidDates.length) {
      return "";
    }

    const formattedDates = calculationResult.calculation.alreadyPaidDates
      .slice(0, 3)
      .map((date) => format(new Date(date), "PP"))
      .join(", ");
    const remaining = calculationResult.calculation.alreadyPaidDates.length - 3;

    if (remaining > 0) {
      return `${formattedDates}, +${remaining} more`;
    }

    return formattedDates;
  }, [calculationResult?.calculation.alreadyPaidDates]);

  const alreadyPaidMaintenancePreview = useMemo(() => {
    if (!calculationResult?.calculation.alreadyPaidMaintenance.length) {
      return "";
    }

    const formatted = calculationResult.calculation.alreadyPaidMaintenance
      .slice(0, 3)
      .map((record) => `${format(new Date(record.serviceDate), "PP")}`)
      .join(", ");

    const remaining =
      calculationResult.calculation.alreadyPaidMaintenance.length > 3
        ? calculationResult.calculation.alreadyPaidMaintenance.length - 3
        : 0;

    if (remaining > 0) {
      return `${formatted}, +${remaining} more`;
    }

    return formatted;
  }, [calculationResult?.calculation.alreadyPaidMaintenance]);

  const handleCalculationComplete = (
    result: VehiclePaymentForPeriodResult,
    request: CreateVehiclePaymentForPeriod
  ) => {
    setCalculationResult(result);
    setCalculationRequest(request);
    const initialOverrides = Object.fromEntries(
      result.calculation.monthlyBreakdown.map((month) => {
        const key = `${month.year}-${month.month}`;
        return [key, month.amount.toFixed(2)];
      })
    );
    setMonthOverrides(initialOverrides);
    setMaintenanceOverride(result.calculation.maintenanceCost.toFixed(2));
  };

  const handleMonthOverrideChange = (key: string, value: string) => {
    setMonthOverrides((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCreatePaymentFromCalculation = () => {
    if (!calculationResult || !calculationRequest) {
      return;
    }

    if (!calculationRequest.dueDate) {
      toast({
        title: "Due date required",
        description: "Please provide a due date before creating the payment.",
        variant: "destructive",
      });
      return;
    }

    if (
      !calculationResult.calculation.attendanceDates.length &&
      !calculationResult.calculation.maintenanceRecordIds.length
    ) {
      toast({
        title: "Nothing to create",
        description:
          "All attendance days and maintenance charges for this period are already marked as paid.",
        variant: "destructive",
      });
      return;
    }

    const amount = adjustedTotals.net.toFixed(2);

    const payload: CreatePaymentRequest = {
      assignmentId: calculationRequest.assignmentId,
      amount,
      dueDate: calculationRequest.dueDate,
      status: calculationRequest.status ?? "pending",
      paidDate: calculationRequest.paidDate ?? undefined,
      invoiceNumber: calculationRequest.invoiceNumber ?? undefined,
      periodStart: calculationResult.calculation.periodStart,
      periodEnd: calculationResult.calculation.periodEnd,
      attendanceTotal: adjustedTotals.monthTotal.toFixed(2),
      deductionTotal: adjustedTotals.maintenance.toFixed(2),
      totalDays: calculationResult.calculation.totalPresentDays,
      maintenanceCount: calculationResult.calculation.maintenanceRecordIds.length,
      attendanceDates: calculationResult.calculation.attendanceDates,
      maintenanceRecordIds: calculationResult.calculation.maintenanceRecordIds,
    };

    createPaymentFromCalculation.mutate(payload);
  };

  const getStatusBadge = (
    status: string,
    dueDate: string,
    outstandingAmount: number,
    paidDate?: string | null
  ) => {
    const remaining = Math.max(outstandingAmount ?? 0, 0);

    if (remaining <= 0 || status === "paid") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    }

    const today = new Date();
    const due = new Date(dueDate);
    const daysOverdue = differenceInDays(today, due);

    if (daysOverdue > 0) {
      const label = status === "partial" ? `Partial • ${daysOverdue} days overdue` : `${daysOverdue} days overdue`;
      return <Badge variant="destructive">{label}</Badge>;
    }

    if (daysOverdue === 0) {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          {status === "partial" ? "Partial • Due Today" : "Due Today"}
        </Badge>
      );
    }

    if (daysOverdue >= -3) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {status === "partial" ? "Partial • Due Soon" : "Due Soon"}
        </Badge>
      );
    }

    if (status === "partial") {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Partial</Badge>;
    }

    return <Badge variant="secondary">Pending</Badge>;
  };

  const totalOutstanding =
    payments?.reduce((sum: number, payment: PaymentWithDetails) => {
      const outstanding = Math.max(payment.outstandingAmount ?? 0, 0);
      return sum + outstanding;
    }, 0) || 0;

  const overdueCount =
    payments?.filter((payment: PaymentWithDetails) => {
      const today = new Date();
      const due = new Date(payment.dueDate);
      return payment.outstandingAmount > 0 && differenceInDays(today, due) > 0;
    }).length || 0;

  const handleViewPayment = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setIsViewOpen(true);
  };

  const handleViewClose = (open: boolean) => {
    setIsViewOpen(open);
    if (!open) {
      setSelectedPayment(null);
    }
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const numeric = Number(value ?? 0);
    if (Number.isNaN(numeric)) {
      return "0.00";
    }
    return numeric.toFixed(2);
  };

  const handleTransactionSubmit = transactionForm.handleSubmit((values) => {
    if (!selectedPayment) return;
    createTransaction.mutate({ paymentId: selectedPayment.id, values });
  });

  const selectedOutstanding = selectedPayment?.outstandingAmount ?? 0;
  const canRecordTransaction = selectedOutstanding > 0;

  return (
    <div className="space-y-6" data-testid="payments-page">
      <Dialog open={isViewOpen} onOpenChange={handleViewClose}>
        <DialogContent className="w-[min(95vw,64rem)] max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
          </DialogHeader>
          {selectedPayment ? (
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Payment summary</h4>
                  <Badge
                    variant="outline"
                    className={
                      selectedPayment.outstandingAmount > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-green-200 text-green-700"
                    }
                  >
                    {selectedPayment.outstandingAmount > 0 ? "Outstanding" : "Settled"}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2 md:gap-x-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Period</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.periodStart
                        ? format(new Date(selectedPayment.periodStart), "MMM dd, yyyy")
                        : "-"}
                      {" "}–{" "}
                      {selectedPayment.periodEnd
                        ? format(new Date(selectedPayment.periodEnd), "MMM dd, yyyy")
                        : "-"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Attendance total</dt>
                    <dd className="font-medium text-foreground text-right">
                      ${formatCurrency(selectedPayment.attendanceTotal)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Maintenance deductions</dt>
                    <dd className="font-medium text-foreground text-right">
                      ${formatCurrency(selectedPayment.deductionTotal)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Net amount</dt>
                    <dd className="font-semibold text-foreground text-right">
                      ${formatCurrency(selectedPayment.amount)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Total received</dt>
                    <dd className="font-medium text-foreground text-right">
                      ${formatCurrency(selectedPayment.totalPaid)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Outstanding balance</dt>
                    <dd
                      className={`font-semibold text-right ${
                        selectedPayment.outstandingAmount > 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      ${formatCurrency(selectedPayment.outstandingAmount)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Attendance days</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.totalDays ?? 0}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Maintenance records</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.maintenanceCount ?? 0}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Due date</dt>
                    <dd className="font-medium text-foreground text-right">
                      {format(new Date(selectedPayment.dueDate), "MMM dd, yyyy")}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Paid date</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.paidDate
                        ? format(new Date(selectedPayment.paidDate), "MMM dd, yyyy")
                        : "-"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium text-foreground text-right capitalize">
                      {selectedPayment.status}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Invoice</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.invoiceNumber ?? "-"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Owner at payment</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.paymentOwner?.name ?? "Unknown"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Transactions recorded</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.transactions.length}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Assignment details</h4>
                  <Badge variant="secondary" className="w-fit">{selectedPayment.assignment.project.name}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-y-2 text-sm md:grid-cols-2 md:gap-x-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Project</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.assignment.project.name}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Assignment status</dt>
                    <dd className="font-medium text-foreground text-right capitalize">
                      {selectedPayment.assignment.status}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.assignment.vehicle.make} {selectedPayment.assignment.vehicle.model}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">License plate</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.assignment.vehicle.licensePlate}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Current owner</dt>
                    <dd className="font-medium text-foreground text-right">
                      {selectedPayment.assignment.vehicle.owner.name}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Monthly rate</dt>
                    <dd className="font-medium text-foreground text-right">
                      ${formatCurrency(selectedPayment.assignment.monthlyRate)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="text-muted-foreground">Assignment period</dt>
                    <dd className="font-medium text-foreground text-right">
                      {format(new Date(selectedPayment.assignment.startDate), "MMM dd, yyyy")} –
                      {" "}
                      {selectedPayment.assignment.endDate
                        ? format(new Date(selectedPayment.assignment.endDate), "MMM dd, yyyy")
                        : "Ongoing"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Payment transactions</h4>
                  <Badge
                    variant="outline"
                    className={
                      selectedOutstanding > 0
                        ? "border-destructive text-destructive"
                        : "border-green-200 text-green-700"
                    }
                  >
                    Outstanding: ${formatCurrency(selectedOutstanding)}
                  </Badge>
                </div>

                {selectedPayment.transactions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPayment.transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>{format(new Date(transaction.transactionDate), "MMM dd, yyyy")}</TableCell>
                              <TableCell className="capitalize">{transaction.method.replace(/_/g, " ")}</TableCell>
                              <TableCell className="text-right font-medium text-foreground">
                                ${formatCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {transaction.referenceNumber ?? "-"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {transaction.notes ?? "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="grid gap-3 sm:hidden">
                      {selectedPayment.transactions.map((transaction) => (
                        <Card key={transaction.id} className="border bg-background">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">{transaction.method.replace(/_/g, " ")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(transaction.transactionDate), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                ${formatCurrency(transaction.amount)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Reference: {transaction.referenceNumber ?? "-"}</p>
                              <p>Notes: {transaction.notes ?? "-"}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payment transactions recorded yet.
                  </p>
                )}

                {canManagePayments && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h5 className="text-sm font-semibold text-foreground">Add transaction</h5>
                    {!canRecordTransaction && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        Fully paid
                      </Badge>
                    )}
                  </div>
                  <Form {...transactionForm}>
                    <form onSubmit={handleTransactionSubmit} className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={transactionForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount received</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                disabled={!canRecordTransaction || createTransaction.isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Remaining balance: ${formatCurrency(selectedOutstanding)}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment method</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!canRecordTransaction || createTransaction.isPending}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="mobile_wallet">Mobile wallet</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="transactionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                disabled={!canRecordTransaction || createTransaction.isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="referenceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reference</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Receipt number"
                                disabled={!canRecordTransaction || createTransaction.isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="recordedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recorded by</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Staff name"
                                disabled={!canRecordTransaction || createTransaction.isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Optional details"
                                className="min-h-[80px]"
                                disabled={!canRecordTransaction || createTransaction.isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={!canRecordTransaction || createTransaction.isPending}
                        >
                          {createTransaction.isPending ? "Recording..." : "Record transaction"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Payments are locked once generated. To adjust a period, recalculate a new payment instead of
                editing an existing one.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a payment to view its full details.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="total-outstanding">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-foreground">${totalOutstanding.toLocaleString()}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="text-red-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="overdue-count">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Payments</p>
                <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Calendar className="text-orange-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="total-payments">
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold text-foreground">{payments?.length || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CreditCard className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {canManagePayments && (
                <>
              <Dialog
                open={isCalculationOpen}
                onOpenChange={(open) => {
                  setIsCalculationOpen(open);
                  if (!open) {
                    setCalculationResult(null);
                    setCalculationRequest(null);
                    setMonthOverrides({});
                    setMaintenanceOverride("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="calculate-payment-button">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl w-[min(95vw,64rem)] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Calculate payment for a period</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    <PaymentPeriodForm onCalculated={handleCalculationComplete} />
                    {calculationResult && (
                      <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-lg">Calculation summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-sm">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Assignment</p>
                              <p className="font-medium">
                                {calculationResult.assignment.project.name}
                              </p>
                              <p>
                                {calculationResult.assignment.vehicle.make}{" "}
                                {calculationResult.assignment.vehicle.model} (
                                {calculationResult.assignment.vehicle.licensePlate})
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium">
                                {format(new Date(calculationResult.calculation.periodStart), "PPP")} –
                                {" "}
                                {format(new Date(calculationResult.calculation.periodEnd), "PPP")}
                              </p>
                              <p>
                                {calculationResult.calculation.totalPresentDays} present day(s) across {" "}
                                {calculationResult.calculation.monthlyBreakdown.length} month(s)
                              </p>
                            </div>
                          </div>

                          {calculationResult.calculation.alreadyPaidDates.length > 0 && (
                            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase tracking-wide">Attention</p>
                                <p className="text-xs sm:text-sm">
                                  We excluded {calculationResult.calculation.alreadyPaidDates.length} day(s) already marked as paid
                                  from this calculation.
                                  {alreadyPaidAttendancePreview && (
                                    <> Last paid on: {alreadyPaidAttendancePreview}.</>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {calculationResult.calculation.alreadyPaidMaintenance.length > 0 && (
                            <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase tracking-wide">Maintenance note</p>
                                <p className="text-xs sm:text-sm">
                                  {calculationResult.calculation.alreadyPaidMaintenance.length} maintenance record(s) were
                                  already marked as paid and left out of this total.
                                  {alreadyPaidMaintenancePreview && (
                                    <> Last paid on: {alreadyPaidMaintenancePreview}.</>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <p className="text-muted-foreground mb-2">Month-by-month breakdown</p>
                            <div className="overflow-x-auto rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Attendance (present / total)</TableHead>
                                    <TableHead className="text-right">Daily rate</TableHead>
                                    <TableHead className="text-right">Calculated</TableHead>
                                    <TableHead className="text-right">Adjusted amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {calculationResult.calculation.monthlyBreakdown.map((month) => {
                                    const key = `${month.year}-${month.month}`;
                                    const overrideValue = monthOverrides[key] ?? month.amount.toFixed(2);
                                    return (
                                      <TableRow key={key}>
                                        <TableCell className="whitespace-nowrap">{month.monthLabel}</TableCell>
                                        <TableCell>
                                          {month.presentDays} / {month.totalDaysInMonth}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          $
                                          {month.dailyRate.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          $
                                          {month.amount.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </TableCell>
                                        <TableCell className="w-40 text-right">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={overrideValue}
                                            onChange={(event) =>
                                              handleMonthOverrideChange(key, event.target.value)
                                            }
                                            disabled={createPaymentFromCalculation.isPending}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Adjust any month if attendance data needs correction. Totals update automatically.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <p className="text-muted-foreground">Maintenance breakdown</p>
                            {calculationResult.calculation.maintenanceBreakdown.length > 0 ? (
                              <div className="overflow-x-auto rounded-md border bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead>Performed by</TableHead>
                                      <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {calculationResult.calculation.maintenanceBreakdown.map((record) => (
                                      <TableRow key={record.id}>
                                        <TableCell className="whitespace-nowrap">{format(new Date(record.serviceDate), "PPP")}</TableCell>
                                        <TableCell className="whitespace-nowrap capitalize">{record.type.replace("_", " ")}</TableCell>
                                        <TableCell className="max-w-xs whitespace-normal break-words">{record.description}</TableCell>
                                        <TableCell className="whitespace-nowrap">{record.performedBy}</TableCell>
                                        <TableCell className="text-right">$
                                          {record.cost.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {calculationResult.calculation.alreadyPaidMaintenance.length > 0
                                  ? "All maintenance records in this period were already marked as paid."
                                  : "No maintenance charges were recorded in this period."}
                              </p>
                            )}
                            {calculationResult.calculation.alreadyPaidMaintenance.length > 0 && (
                              <div className="space-y-2 rounded-md border border-dashed border-sky-200 bg-sky-50/60 p-3">
                                <p className="text-xs font-medium text-sky-900 uppercase tracking-wide">
                                  Excluded maintenance (already paid)
                                </p>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="text-xs">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Performed by</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {calculationResult.calculation.alreadyPaidMaintenance.map((record) => (
                                        <TableRow key={`paid-${record.id}`} className="text-xs">
                                          <TableCell className="whitespace-nowrap">{format(new Date(record.serviceDate), "PPP")}</TableCell>
                                          <TableCell className="whitespace-nowrap capitalize">{record.type.replace("_", " ")}</TableCell>
                                          <TableCell className="max-w-xs whitespace-normal break-words">{record.description}</TableCell>
                                          <TableCell className="whitespace-nowrap">{record.performedBy}</TableCell>
                                          <TableCell className="text-right">$
                                            {record.cost.toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">Monthly rate</p>
                              <p className="font-semibold">
                                $
                                {calculationResult.calculation.monthlyRate.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total present days</p>
                              <p className="font-semibold">
                                {calculationResult.calculation.totalPresentDays}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Adjusted attendance total</p>
                              <p className="font-semibold">
                                $
                                {adjustedTotals.monthTotal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-[2fr_1fr] md:items-end">
                            <div>
                              <p className="text-muted-foreground">Maintenance deduction</p>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={maintenanceOverride}
                                  onChange={(event) => setMaintenanceOverride(event.target.value)}
                                  disabled={createPaymentFromCalculation.isPending}
                                />
                                <span className="text-xs text-muted-foreground">
                                  Calculated: $
                                  {calculationResult.calculation.maintenanceCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adjust after reviewing the maintenance breakdown above.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {calculationResult.calculation.maintenanceRecordIds.length} maintenance record(s) will be marked
                                as paid when you create this payment.
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Net payable</p>
                              <p className="text-lg font-bold text-primary">
                                $
                                {adjustedTotals.net.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Due date</p>
                              <p className="font-semibold">
                                {calculationRequest?.dueDate
                                  ? format(new Date(calculationRequest.dueDate), "PPP")
                                  : "Not set"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status & invoice</p>
                              <p className="font-semibold capitalize">
                                {(calculationRequest?.status ?? "pending").replace("_", " ")}
                              </p>
                              {calculationRequest?.invoiceNumber && (
                                <p className="text-xs text-muted-foreground">
                                  Invoice: {calculationRequest.invoiceNumber}
                                </p>
                              )}
                              {calculationRequest?.paidDate && (
                                <p className="text-xs text-muted-foreground">
                                  Paid date: {format(new Date(calculationRequest.paidDate), "PPP")}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="text-xs text-muted-foreground">
                              Confirm the amounts above, then create the payment record.
                            </p>
                            <Button
                              onClick={handleCreatePaymentFromCalculation}
                              disabled={
                                !calculationResult ||
                                !calculationRequest ||
                                !calculationRequest.dueDate ||
                                createPaymentFromCalculation.isPending
                              }
                            >
                              {createPaymentFromCalculation.isPending ? "Creating..." : "Create payment"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" data-testid="generate-invoices">
                <FileText className="mr-2 w-4 h-4" />
                Generate Invoices
              </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-payments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amounts</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
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
                ) : filteredPayments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <CreditCard className="w-12 h-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No payments found</p>
                        {searchTerm || statusFilter !== "all" ? (
                          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Payment records will appear here</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments?.map((payment: PaymentWithDetails) => {
                    const attendanceTotalRaw = Number(payment.attendanceTotal ?? 0);
                    const attendanceTotal = Number.isNaN(attendanceTotalRaw) ? 0 : attendanceTotalRaw;
                    const deductionTotalRaw = Number(payment.deductionTotal ?? 0);
                    const deductionTotal = Number.isNaN(deductionTotalRaw) ? 0 : deductionTotalRaw;
                    const totalDays = payment.totalDays ?? 0;
                    const maintenanceCount = payment.maintenanceCount ?? 0;
                    const periodStart = payment.periodStart
                      ? format(new Date(payment.periodStart), "MMM dd, yyyy")
                      : "-";
                    const periodEnd = payment.periodEnd
                      ? format(new Date(payment.periodEnd), "MMM dd, yyyy")
                      : "-";
                    const netAmountRaw = Number(payment.amount ?? 0);
                    const netAmount = Number.isNaN(netAmountRaw) ? 0 : netAmountRaw;

                    return (
                      <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{payment.assignment.project.name}</p>
                            {payment.invoiceNumber && (
                              <p className="text-xs text-muted-foreground">Invoice #{payment.invoiceNumber}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {payment.assignment.vehicle.make} {payment.assignment.vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground">{payment.assignment.vehicle.licensePlate}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {periodStart} – {periodEnd}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {totalDays} {totalDays === 1 ? "day" : "days"} billed
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-3 h-3 text-muted-foreground" />
                              <p className="text-sm font-semibold text-foreground">
                                ${formatCurrency(netAmount)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Received: ${formatCurrency(payment.totalPaid)} ·
                              <span
                                className={
                                  payment.outstandingAmount > 0
                                    ? "text-destructive font-semibold"
                                    : "text-muted-foreground"
                                }
                              >
                                {" "}Outstanding: ${formatCurrency(payment.outstandingAmount)}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Attendance: ${formatCurrency(attendanceTotal)} · Deductions: ${formatCurrency(
                                deductionTotal
                              )} ·
                              Maintenance items: {maintenanceCount}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {format(new Date(payment.dueDate), "MMM dd, yyyy")}
                          </p>
                        </TableCell>
                        <TableCell>
                          {payment.paidDate ? (
                            <p className="text-sm text-foreground">
                              {format(new Date(payment.paidDate), "MMM dd, yyyy")}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">-</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            payment.status,
                            payment.dueDate,
                            payment.outstandingAmount,
                            payment.paidDate
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
                            data-testid={`view-payment-${payment.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-2">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-28" />
                    </CardContent>
                  </Card>
                ))
              : filteredPayments?.length === 0
                ? (
                    <Card>
                      <CardContent className="p-6 text-center space-y-2">
                        <CreditCard className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">No payments found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Payment records will appear here"}
                        </p>
                      </CardContent>
                    </Card>
                  )
                : filteredPayments?.map((payment: PaymentWithDetails) => {
                    const attendanceTotalRaw = Number(payment.attendanceTotal ?? 0);
                    const attendanceTotal = Number.isNaN(attendanceTotalRaw) ? 0 : attendanceTotalRaw;
                    const deductionTotalRaw = Number(payment.deductionTotal ?? 0);
                    const deductionTotal = Number.isNaN(deductionTotalRaw) ? 0 : deductionTotalRaw;
                    const totalDays = payment.totalDays ?? 0;
                    const maintenanceCount = payment.maintenanceCount ?? 0;
                    const periodStart = payment.periodStart
                      ? format(new Date(payment.periodStart), "MMM dd, yyyy")
                      : "-";
                    const periodEnd = payment.periodEnd
                      ? format(new Date(payment.periodEnd), "MMM dd, yyyy")
                      : "-";
                    const netAmountRaw = Number(payment.amount ?? 0);
                    const netAmount = Number.isNaN(netAmountRaw) ? 0 : netAmountRaw;

                    return (
                      <Card key={payment.id} data-testid={`payment-card-${payment.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{payment.assignment.project.name}</p>
                              {payment.invoiceNumber && (
                                <p className="text-xs text-muted-foreground">Invoice #{payment.invoiceNumber}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {payment.assignment.vehicle.make} {payment.assignment.vehicle.model} · {payment.assignment.vehicle.licensePlate}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {periodStart} – {periodEnd} ({totalDays} {totalDays === 1 ? "day" : "days"} billed)
                              </p>
                              <div className="text-sm font-semibold text-foreground flex items-center space-x-2">
                                <DollarSign className="w-4 h-4" />
                                <span>${formatCurrency(netAmount)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Received: ${formatCurrency(payment.totalPaid)} · Outstanding: ${formatCurrency(payment.outstandingAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Attendance: ${formatCurrency(attendanceTotal)} · Deductions: ${formatCurrency(deductionTotal)} · Maintenance items: {maintenanceCount}
                              </p>
                              <div className="text-xs text-muted-foreground">Due {format(new Date(payment.dueDate), "MMM dd, yyyy")}</div>
                              <div className="text-xs text-muted-foreground">
                                Paid {payment.paidDate ? format(new Date(payment.paidDate), "MMM dd, yyyy") : "-"}
                              </div>
                              <div className="text-sm">{getStatusBadge(payment.status, payment.dueDate, payment.outstandingAmount, payment.paidDate)}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPayment(payment)}
                              data-testid={`view-payment-${payment.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
          </div>

          {/* Summary */}
          {filteredPayments && filteredPayments.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {payments?.length || 0} payments
              </p>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-muted-foreground">
                  Total Outstanding: <span className="font-semibold text-destructive">${totalOutstanding.toLocaleString()}</span>
                </p>
                {canManagePayments && overdueCount > 0 && (
                  <Button variant="outline" size="sm" data-testid="send-reminders">
                    Send Reminders ({overdueCount})
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
