import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, startOfMonth } from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createCustomerInvoice,
  calculateCustomerInvoice,
  updateCustomerInvoiceStatus,
  useProjectCustomerRates,
  useProjects,
  useCustomerInvoices,
  recordCustomerInvoicePayment,
} from "@/lib/api";
import { exportCustomerInvoiceExcel, exportCustomerInvoicePdf } from "@/lib/invoice-pdf";
import type {
  CreateCustomerInvoiceRequest,
  CustomerInvoiceWithItems,
  CustomerInvoiceCalculation,
  CustomerInvoiceCalculationItem,
  CustomerInvoiceWithDetails,
  CreateCustomerInvoicePayment,
} from "@shared/schema";
import { createCustomerInvoiceSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import {
  Calculator,
  ClipboardCheck,
  FileText,
  FileSpreadsheet,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";

const today = new Date();
const defaultStart = startOfMonth(today);

export default function CustomerInvoices() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: invoices = [], isLoading: invoicesLoading } = useCustomerInvoices();
  const [invoice, setInvoice] = useState<
    CustomerInvoiceWithItems | CustomerInvoiceWithDetails | null
  >(null);
  const [baseCalculation, setBaseCalculation] = useState<CustomerInvoiceCalculation | null>(null);
  const [calculation, setCalculation] = useState<CustomerInvoiceCalculation | null>(null);
  const [itemAdjustments, setItemAdjustments] = useState<
    Record<string, { vehicleMob: number; vehicleDimob: number }>
  >({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>(["created-list"]);

  const form = useForm<CreateCustomerInvoiceRequest>({
    resolver: zodResolver(createCustomerInvoiceSchema),
    defaultValues: {
      customerId: "",
      projectId: "",
      startDate: format(defaultStart, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
      dueDate: format(addDays(today, 7), "yyyy-MM-dd"),
      invoiceNumber: "",
      adjustment: 0,
      salesTaxRate: 0,
      status: "pending",
    },
  });

  const paymentForm = useForm<CreateCustomerInvoicePayment>({
    defaultValues: {
      amount: 0,
      method: "cash",
      transactionDate: format(today, "yyyy-MM-dd"),
      referenceNumber: "",
      notes: "",
      recordedBy: user?.name ?? "",
    },
  });

  const projectId = form.watch("projectId");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const adjustment = form.watch("adjustment");
  const salesTaxRate = form.watch("salesTaxRate");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  );

  useEffect(() => {
    if (selectedProject) {
      form.setValue("customerId", selectedProject.customerId);
    }
  }, [selectedProject, form]);

  useEffect(() => {
    if (!showCreateForm) return;

    setInvoice(null);
    setBaseCalculation(null);
    setItemAdjustments({});
    setCalculation(null);
  }, [projectId, startDate, endDate, showCreateForm]);

  useEffect(() => {
    paymentForm.reset({
      amount: 0,
      method: "cash",
      transactionDate: format(today, "yyyy-MM-dd"),
      referenceNumber: "",
      notes: "",
      recordedBy: user?.name ?? "",
    });
  }, [invoice?.id, user?.name, paymentForm]);

  const {
    data: projectRates = [],
    isLoading: ratesLoading,
    isFetching: ratesFetching,
  } = useProjectCustomerRates(projectId);

  const canManageInvoices =
    user?.role === "admin" ||
    (user?.role === "employee" && user.employeeAccess?.includes("payments"));

  const roundCurrency = (value: number | string | undefined | null) =>
    Number(Number(value ?? 0).toFixed(2));

  const formatCurrency = (value: number | string | undefined | null) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundCurrency(value));

  type InvoiceWithRoundedItems = {
    subtotal: number | string;
    adjustment: number | string;
    salesTaxRate: number | string;
    salesTaxAmount: number | string;
    total: number | string;
    items: Array<Record<string, unknown>>;
  };

  const roundInvoiceAmounts = <T extends InvoiceWithRoundedItems>(invoice: T): T => ({
    ...invoice,
    total: roundCurrency(invoice.total),
    items: invoice.items,
  });

  const getItemKey = (item: { vehicleId: string; month: number; year: number }) =>
    `${item.vehicleId}-${item.month}-${item.year}`;

  const buildItemPayload = (items: CustomerInvoiceCalculationItem[]) =>
    items.map((item) => {
      const override = itemAdjustments[getItemKey(item)];
      return {
        vehicleId: item.vehicleId,
        month: item.month,
        year: item.year,
        vehicleMob: Number(override?.vehicleMob ?? item.vehicleMob ?? 0),
        vehicleDimob: Number(override?.vehicleDimob ?? item.vehicleDimob ?? 0),
      };
    });

  const recalculateWithAdjustments = useCallback(
    (
      source: CustomerInvoiceCalculation,
      overrides: Record<string, { vehicleMob: number; vehicleDimob: number }> = itemAdjustments,
    ): CustomerInvoiceCalculation => {
      const adjustmentNumber = Number(adjustment ?? 0);
      const salesTaxRateNumber = Number(Number(salesTaxRate ?? 0).toFixed(2));

      const itemsWithAdjustments = source.items.map((item) => {
        const override = overrides[getItemKey(item)];
        const vehicleMob = Number(override?.vehicleMob ?? item.vehicleMob ?? 0);
        const vehicleDimob = Number(override?.vehicleDimob ?? item.vehicleDimob ?? 0);
        const baseAmount = item.dailyRate * item.presentDays;
        const amount = baseAmount + vehicleMob + vehicleDimob;

        return {
          ...item,
          vehicleMob,
          vehicleDimob,
          amount,
          salesTaxRate: salesTaxRateNumber,
        };
      });

      const subtotal = itemsWithAdjustments.reduce((sum, item) => sum + Number(item.amount), 0);
      const taxableBase = subtotal + adjustmentNumber;
      const salesTaxAmount = taxableBase * (salesTaxRateNumber / 100);
      const total = roundCurrency(taxableBase + salesTaxAmount);

      const items = itemsWithAdjustments.map((item) => {
        const adjustmentShare = subtotal === 0 ? 0 : (Number(item.amount) / subtotal) * adjustmentNumber;
        const taxableAmount = Number(item.amount) + adjustmentShare;
        const itemSalesTaxAmount = taxableAmount * (salesTaxRateNumber / 100);
        const totalAmount = taxableAmount + itemSalesTaxAmount;

        return {
          ...item,
          salesTaxAmount: itemSalesTaxAmount,
          totalAmount,
        };
      });

      return {
        ...source,
        subtotal,
        adjustment: adjustmentNumber,
        salesTaxRate: salesTaxRateNumber,
        salesTaxAmount,
        total,
        items,
      };
    },
    [adjustment, itemAdjustments, roundCurrency, salesTaxRate],
  );

  useEffect(() => {
    if (!baseCalculation) return;

    setCalculation(recalculateWithAdjustments(baseCalculation));
  }, [adjustment, baseCalculation, recalculateWithAdjustments]);

  const handleItemAdjustmentChange = (
    item: CustomerInvoiceCalculationItem,
    field: "vehicleMob" | "vehicleDimob",
    value: number,
  ) => {
    const key = getItemKey(item);
    setItemAdjustments((prev) => {
      const next = { ...prev };
      const current =
        next[key] ?? {
          vehicleMob: Number(item.vehicleMob),
          vehicleDimob: Number(item.vehicleDimob),
        };

      next[key] = { ...current, [field]: Number(value) };

      if (baseCalculation) {
        setCalculation(recalculateWithAdjustments(baseCalculation, next));
      }

      return next;
    });
  };

  const invoicePayments = invoice?.payments ?? [];

  const totalPaid = useMemo(
    () =>
      roundCurrency(
        invoicePayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      ),
    [invoicePayments]
  );

  const outstandingAmount = useMemo(
    () => Math.max(roundCurrency(Number(invoice?.total ?? 0) - totalPaid), 0),
    [invoice, totalPaid]
  );

  const paymentBlocked = !invoice || outstandingAmount <= 0;

  const invoiceStats = useMemo(() => {
    const totals = invoices.reduce(
      (acc, inv) => {
        const paid = (inv.payments ?? []).reduce(
          (sum, payment) => sum + Number(payment.amount ?? 0),
          0,
        );

        const outstanding = Math.max(Number(inv.total ?? 0) - paid, 0);

        return {
          ...acc,
          count: acc.count + 1,
          billed: acc.billed + Number(inv.total ?? 0),
          outstanding: acc.outstanding + outstanding,
          pending: acc.pending + (inv.status === "pending" ? 1 : 0),
          partial: acc.partial + (inv.status === "partial" ? 1 : 0),
          paid: acc.paid + (inv.status === "paid" ? 1 : 0),
          overdue: acc.overdue + (inv.status === "overdue" ? 1 : 0),
        };
      },
      { count: 0, billed: 0, outstanding: 0, pending: 0, partial: 0, paid: 0, overdue: 0 },
    );

    return {
      ...totals,
      billed: roundCurrency(totals.billed),
      outstanding: roundCurrency(totals.outstanding),
    };
  }, [invoices]);

  const openSections = (...sections: string[]) => {
    setAccordionValue((prev) => {
      const next = new Set(prev);
      sections.forEach((section) => next.add(section));
      return Array.from(next);
    });
  };

  const resetAccordion = () => setAccordionValue(["created-list"]);

  const handleBackToCreated = () => {
    setShowCreateForm(false);
    setCalculation(null);
    setBaseCalculation(null);
    setItemAdjustments({});
    setInvoice(null);
    resetAccordion();
  };

  const handleExportInvoice = useCallback(() => {
    if (!invoice) {
      toast({
        variant: "destructive",
        title: "No invoice selected",
        description: "Select or create an invoice before exporting it.",
      });
      return;
    }

    const success = exportCustomerInvoicePdf(invoice, formatCurrency);

    if (!success) {
      toast({
        variant: "destructive",
        title: "Unable to open PDF",
        description: "Allow pop-ups to download or print the invoice.",
      });
    }
  }, [formatCurrency, invoice, toast]);

  const handleExportInvoiceExcel = useCallback(() => {
    if (!invoice) {
      toast({
        variant: "destructive",
        title: "No invoice selected",
        description: "Select or create an invoice before exporting it.",
      });
      return;
    }

    const success = exportCustomerInvoiceExcel(invoice, formatCurrency);

    if (!success) {
      toast({
        variant: "destructive",
        title: "Unable to export", 
        description: "Try again to download the Excel copy of this invoice.",
      });
    }
  }, [formatCurrency, invoice, toast]);

  const handleCalculate = form.handleSubmit(async (values) => {
    openSections("details");
    setIsCalculating(true);
    try {
      const payload: CreateCustomerInvoiceRequest = {
        ...values,
        customerId: selectedProject?.customerId ?? values.customerId,
        items: calculation ? buildItemPayload(calculation.items) : undefined,
      };
      const result = roundInvoiceAmounts(await calculateCustomerInvoice(payload));
      if (result.invoiceNumber) {
        form.setValue("invoiceNumber", result.invoiceNumber);
      }
      const overrides = Object.fromEntries(
        result.items.map((item) => [
          getItemKey(item),
          {
            vehicleMob: Number(item.vehicleMob),
            vehicleDimob: Number(item.vehicleDimob),
          },
        ]),
      );
      setItemAdjustments(overrides);
      setBaseCalculation(result);
      setCalculation(roundInvoiceAmounts(recalculateWithAdjustments(result, overrides)));
      setInvoice(null);
      openSections("preview");
      toast({
        title: "Invoice calculated",
        description: "Review the totals before creating the invoice.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to calculate invoice",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  });

  const handleCreate = form.handleSubmit(async (values) => {
    if (!calculation) {
      toast({
        title: "Calculate required",
        description: "Please calculate the invoice before creating it.",
        variant: "destructive",
      });
      return;
    }

      setIsCreating(true);
    try {
      const payload: CreateCustomerInvoiceRequest = {
        ...values,
        customerId: selectedProject?.customerId ?? values.customerId,
        items: buildItemPayload(calculation.items),
      };
      const created = await createCustomerInvoice(payload);
      setInvoice(null);
      setCalculation(null);
      setBaseCalculation(null);
      setItemAdjustments({});
      setShowCreateForm(false);
      resetAccordion();
      toast({
        title: "Invoice created",
        description: "Project invoice calculated and saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-invoices"] });
    } catch (error: any) {
      toast({
        title: "Failed to create invoice",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  });

  const handleStatusChange = async (
    invoiceId: string,
    status: "pending" | "partial" | "paid" | "overdue",
  ) => {
    setUpdatingInvoiceId(invoiceId);
    try {
      const updated = await updateCustomerInvoiceStatus(invoiceId, { status });
      if (invoice?.id === invoiceId) {
        setInvoice(roundInvoiceAmounts(updated));
      }
      toast({
        title: "Invoice updated",
        description: "Invoice status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-invoices"] });
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleRecordPayment = paymentForm.handleSubmit(async (values) => {
    if (!invoice) {
      toast({
        title: "No invoice selected",
        description: "Select or create an invoice before recording a payment.",
        variant: "destructive",
      });
      return;
    }

    if (outstandingAmount <= 0) {
      toast({
        title: "Invoice already paid",
        description: "This invoice has no outstanding balance to record.",
        variant: "destructive",
      });
      return;
    }

    const paymentAmount = Number(values.amount ?? 0);

    if (paymentAmount > outstandingAmount) {
      toast({
        title: "Payment too large",
        description: "Payment cannot exceed the outstanding balance.",
        variant: "destructive",
      });
      return;
    }

    setIsRecordingPayment(true);
    try {
      const updated = await recordCustomerInvoicePayment(invoice.id, values);
      setInvoice(roundInvoiceAmounts(updated));
      toast({
        title: "Payment recorded",
        description: "Invoice payment has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-invoices"] });
    } catch (error: any) {
      toast({
        title: "Failed to record payment",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRecordingPayment(false);
    }
  });

  const handleStartCreate = () => {
    setInvoice(null);
    setCalculation(null);
    setShowCreateForm(true);
    form.reset({
      customerId: "",
      projectId: "",
      startDate: format(defaultStart, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
      dueDate: format(addDays(today, 7), "yyyy-MM-dd"),
      invoiceNumber: "",
      adjustment: 0,
      salesTaxRate: 0,
      status: "pending",
    });
    setAccordionValue(["details"]);
  };

  const handleViewInvoice = (row: CustomerInvoiceWithDetails) => {
    setInvoice(roundInvoiceAmounts(row));
    setCalculation(null);
    setShowCreateForm(false);
    form.setValue("projectId", row.projectId);
    form.setValue("customerId", row.customerId);
    form.setValue("startDate", row.periodStart);
    form.setValue("endDate", row.periodEnd);
    form.setValue("dueDate", row.dueDate);
    form.setValue("invoiceNumber", row.invoiceNumber ?? "");
    form.setValue("adjustment", Number(row.adjustment ?? 0));
    form.setValue("salesTaxRate", Number(row.salesTaxRate ?? 0));
    form.setValue("status", row.status);
    setAccordionValue(["created-list", "invoice-details", "invoice-payments"]);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardDescription>Total invoices</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {invoicesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : invoiceStats.count}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0 text-sm text-muted-foreground">
            Pending {invoiceStats.pending} • Partial {invoiceStats.partial}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardDescription>Paid vs overdue</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              {invoicesLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `${invoiceStats.paid} paid / ${invoiceStats.overdue} overdue`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0 text-sm text-muted-foreground">
            Track cleared invoices against those requiring follow-up.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardDescription>Total billed</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              {invoicesLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(invoiceStats.billed)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0 text-sm text-muted-foreground">
            Includes all generated invoices in the system.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardDescription>Outstanding balance</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              {invoicesLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(invoiceStats.outstanding)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0 text-sm text-muted-foreground">
            Balance remaining after recorded payments.
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customer Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Calculate and create invoices for project vehicle attendance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" onClick={handleStartCreate} disabled={!canManageInvoices}>
            Create invoice
          </Button>
          <Badge variant="secondary" className="gap-2">
            <Receipt className="h-4 w-4" />
            Billing
          </Badge>
        </div>
      </div>

      {!canManageInvoices && (
        <Alert variant="destructive">
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to create customer invoices.
          </AlertDescription>
        </Alert>
      )}

      <Accordion
        type="multiple"
        value={accordionValue}
        onValueChange={(value) => setAccordionValue(value as string[])}
        className="space-y-4"
      >
        <AccordionItem value="created-list">
          <AccordionTrigger className="text-lg font-semibold">
            Invoices History
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Invoices History</CardTitle>
                <CardDescription>
                  View previously generated invoices and update their payment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...
                  </div>
                ) : invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium">{row.invoiceNumber ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">Due {row.dueDate}</div>
                          </TableCell>
                          <TableCell>{row.customer.name}</TableCell>
                          <TableCell>{row.project.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>{row.periodStart}</span>
                              <span>{row.periodEnd}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                          <TableCell>
                            <Select
                              disabled={!canManageInvoices || updatingInvoiceId === row.id}
                              value={row.status}
                              onValueChange={(value) =>
                                handleStatusChange(
                                  row.id,
                                  value as "pending" | "partial" | "paid" | "overdue",
                                )
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-32 capitalize">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewInvoice(row)}
                              disabled={updatingInvoiceId === row.id}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No invoices have been created yet.</p>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {(showCreateForm || calculation) && (
          <AccordionItem value="details">
            <AccordionTrigger className="text-lg font-semibold">
              Invoice details & rates
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex items-center justify-end pb-4">
                <Button variant="ghost" onClick={handleBackToCreated}>
                  Back to created invoices
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice details</CardTitle>
                    <CardDescription>
                      Choose a project, date range, and tax details to calculate the invoice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form className="space-y-4" onSubmit={handleCalculate}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project</FormLabel>
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const project = projects.find((p) => p.id === value);
                                    if (project) {
                                      form.setValue("customerId", project.customerId);
                                    }
                                  }}
                                  value={field.value}
                                  disabled={projectsLoading || !canManageInvoices}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {projects.map((project) => (
                                      <SelectItem key={project.id} value={project.id}>
                                        {project.name} — {project.customer.name}
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
                            name="invoiceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Invoice number (optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="INV-001" {...field} disabled={!canManageInvoices} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} disabled={!canManageInvoices} />
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
                                  <Input type="date" {...field} disabled={!canManageInvoices} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} disabled={!canManageInvoices} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="adjustment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adjustment</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    disabled={!canManageInvoices}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="salesTaxRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sales tax rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    disabled={!canManageInvoices}
                                  />
                                </FormControl>
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
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? "pending"}
                                  disabled={!canManageInvoices}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <input type="hidden" {...form.register("customerId")} />

                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="submit"
                            disabled={!canManageInvoices || !projectId || isCalculating}
                          >
                            {isCalculating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Calculator className="mr-2 h-4 w-4" />
                            )}
                            Calculate invoice
                          </Button>
                          <Button
                            type="button"
                            variant={calculation ? "default" : "secondary"}
                            className={calculation ? "bg-orange-500 hover:bg-orange-600" : undefined}
                            disabled={!canManageInvoices || !calculation || isCreating}
                            onClick={handleCreate}
                          >
                            {isCreating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Receipt className="mr-2 h-4 w-4" />
                            )}
                            Create invoice
                          </Button>
                          {(!selectedProject || projectRates.length === 0) && (
                            <p className="text-sm text-muted-foreground">
                              Select a project with customer vehicle rates to calculate totals.
                            </p>
                          )}
                          {!calculation && (
                            <p className="text-xs text-muted-foreground">
                              Adjust the adjustment or tax rate and click Calculate to refresh totals
                              before creating.
                            </p>
                          )}
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Project rates</CardTitle>
                    <CardDescription>
                      Daily rates are derived from the monthly customer rate for each vehicle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ratesLoading || ratesFetching ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading project rates...
                      </div>
                    ) : projectRates.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead className="text-right">Monthly rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projectRates.map((rate) => (
                            <TableRow key={rate.id}>
                              <TableCell>
                                <div className="font-medium">{rate.vehicle.licensePlate}</div>
                                <div className="text-sm text-muted-foreground">
                                  {rate.vehicle.make} {rate.vehicle.model}
                                </div>
                              </TableCell>
                              <TableCell>{rate.vehicle.owner.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(rate.rate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Alert>
                        <AlertTitle>No rate data</AlertTitle>
                        <AlertDescription>
                          Select a project to view customer rates. Rates are required to calculate
                          invoices.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {calculation && (
          <AccordionItem value="preview">
            <AccordionTrigger className="text-lg font-semibold">
              Invoice preview
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" /> Invoice preview
                  </CardTitle>
                  <CardDescription>
                    Totals based on attendance and the current adjustment and tax values. Create the
                    invoice to save it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-medium">
                        {invoice?.customer?.name ?? selectedProject?.customer.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Project</div>
                      <div className="font-medium">{invoice?.project?.name ?? selectedProject?.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Period</div>
                      <div className="font-medium">
                        {calculation.periodStart} — {calculation.periodEnd}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Due date</div>
                      <div className="font-medium">{calculation.dueDate}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Subtotal</div>
                      <div className="text-lg font-semibold">{formatCurrency(calculation.subtotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Adjustment</div>
                      <div className="text-lg font-semibold">{formatCurrency(calculation.adjustment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sales tax</div>
                      <div className="text-lg font-semibold">
                        {calculation.salesTaxRate}% ({formatCurrency(calculation.salesTaxAmount)})
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-semibold">{formatCurrency(calculation.total)}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Line items by vehicle and month
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Project rate</TableHead>
                          <TableHead className="text-right">Present days</TableHead>
                          <TableHead className="text-right">MOB</TableHead>
                          <TableHead className="text-right">DI MOB</TableHead>
                          <TableHead className="text-right">Daily rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Sales tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculation.items.map((item) => (
                          <TableRow key={`${item.vehicleId}-${item.month}-${item.year}`}>
                            <TableCell>
                              <div className="font-medium">{item.vehicle.licensePlate}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.vehicle.make} {item.vehicle.model}
                              </div>
                            </TableCell>
                            <TableCell>{item.monthLabel ?? `${item.month}/${item.year}`}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.projectRate)}</TableCell>
                            <TableCell className="text-right">{item.presentDays}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min={0}
                                value={
                                  itemAdjustments[getItemKey(item)]?.vehicleMob ??
                                  roundCurrency(item.vehicleMob)
                                }
                                onChange={(event) =>
                                  handleItemAdjustmentChange(
                                    item,
                                    "vehicleMob",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min={0}
                                value={
                                  itemAdjustments[getItemKey(item)]?.vehicleDimob ??
                                  roundCurrency(item.vehicleDimob)
                                }
                                onChange={(event) =>
                                  handleItemAdjustmentChange(
                                    item,
                                    "vehicleDimob",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.dailyRate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.salesTaxAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

      {invoice && (
        <>
          <AccordionItem value="invoice-details">
            <AccordionTrigger className="text-lg font-semibold">Invoice details</AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" /> Invoice created
                    </CardTitle>
                    <CardDescription>
                      Review the calculated totals and line items for this invoice.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportInvoice}>
                      <FileText className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleExportInvoiceExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-medium">{selectedProject?.customer.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Project</div>
                      <div className="font-medium">{selectedProject?.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Period</div>
                      <div className="font-medium">
                        {invoice.periodStart} — {invoice.periodEnd}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge className="mt-1 capitalize">{invoice.status}</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Invoice number</div>
                      <div className="font-medium">{invoice.invoiceNumber ?? "Pending number"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Due date</div>
                      <div className="font-medium">{invoice.dueDate}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total paid</div>
                      <div className="text-lg font-semibold">{formatCurrency(totalPaid)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Outstanding</div>
                      <div className="text-lg font-semibold">{formatCurrency(outstandingAmount)}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Subtotal</div>
                      <div className="text-lg font-semibold">{formatCurrency(invoice.subtotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Adjustment</div>
                      <div className="text-lg font-semibold">{formatCurrency(invoice.adjustment)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sales tax</div>
                      <div className="text-lg font-semibold">
                        {Number(invoice.salesTaxRate ?? 0)}% ({formatCurrency(invoice.salesTaxAmount)})
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-semibold">{formatCurrency(invoice.total)}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Line items by vehicle and month
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Project rate</TableHead>
                          <TableHead className="text-right">Present days</TableHead>
                          <TableHead className="text-right">MOB</TableHead>
                          <TableHead className="text-right">DI MOB</TableHead>
                          <TableHead className="text-right">Daily rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Sales tax</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.vehicle.licensePlate}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.vehicle.make} {item.vehicle.model}
                              </div>
                            </TableCell>
                            <TableCell>{item.monthLabel ?? `${item.month}/${item.year}`}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.projectRate)}</TableCell>
                            <TableCell className="text-right">{item.presentDays}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.vehicleMob)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.vehicleDimob)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.dailyRate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.salesTaxAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="invoice-payments">
            <AccordionTrigger className="text-lg font-semibold">Invoice payments</AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" /> Payments & balance
                  </CardTitle>
                  <CardDescription>
                    Review balances and record payments for this invoice.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Invoice total</div>
                      <div className="text-lg font-semibold">{formatCurrency(invoice.total)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total paid</div>
                      <div className="text-lg font-semibold">{formatCurrency(totalPaid)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Outstanding</div>
                      <div className="text-lg font-semibold">{formatCurrency(outstandingAmount)}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Payments</div>
                      <div className="text-xs text-muted-foreground">
                        Record payments to track outstanding balances.
                      </div>
                    </div>

                    {invoicePayments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Recorded by</TableHead>
                            <TableHead>Transaction date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoicePayments.map((payment) => (
                            <TableRow key={payment.id}>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell className="capitalize">{payment.method.replace("_", " ")}</TableCell>
                              <TableCell>{payment.referenceNumber ?? "—"}</TableCell>
                              <TableCell className="max-w-xs truncate">{payment.notes ?? "—"}</TableCell>
                              <TableCell>{payment.recordedBy ?? "—"}</TableCell>
                              <TableCell>{payment.transactionDate}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                    )}

                    {canManageInvoices && (
                      <Form {...paymentForm}>
                        <form
                          className="grid gap-4 md:grid-cols-5 md:items-end"
                          onSubmit={handleRecordPayment}
                        >
                          <FormField
                            control={paymentForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Payment amount</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    max={paymentBlocked ? undefined : outstandingAmount}
                                    disabled={paymentBlocked || isRecordingPayment}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={paymentForm.control}
                            name="method"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Method</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={paymentBlocked || isRecordingPayment}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
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
                            control={paymentForm.control}
                            name="transactionDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transaction date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    disabled={paymentBlocked || isRecordingPayment}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={paymentForm.control}
                            name="referenceNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reference</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Receipt or ref"
                                    disabled={paymentBlocked || isRecordingPayment}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={paymentForm.control}
                            name="recordedBy"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recorded by</FormLabel>
                                <FormControl>
                                  <Input disabled={paymentBlocked || isRecordingPayment} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={paymentForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem className="md:col-span-5">
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Optional notes"
                                    disabled={paymentBlocked || isRecordingPayment}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="md:col-span-5">
                            <Button
                              type="submit"
                              disabled={isRecordingPayment || paymentBlocked}
                              variant={paymentBlocked ? "secondary" : "default"}
                            >
                              {isRecordingPayment ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                              )}
                              Record payment
                            </Button>
                            {paymentBlocked && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Payments can only be recorded for invoices with an outstanding balance.
                              </p>
                            )}
                          </div>
                        </form>
                      </Form>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </>
      )}

    </Accordion>
  </div>
  );
}
