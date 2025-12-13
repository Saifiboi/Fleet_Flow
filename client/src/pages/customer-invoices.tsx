import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, startOfMonth } from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
} from "@/lib/api";
import type {
  CreateCustomerInvoiceRequest,
  CustomerInvoiceWithItems,
  CustomerInvoiceCalculation,
  CustomerInvoiceWithDetails,
} from "@shared/schema";
import { createCustomerInvoiceSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Calculator, ClipboardCheck, Loader2, Receipt } from "lucide-react";

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
  const [calculation, setCalculation] = useState<CustomerInvoiceCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

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
    setInvoice(null);
    setCalculation(null);
  }, [projectId, startDate, endDate]);

  useEffect(() => {
    setCalculation(null);
  }, [adjustment, salesTaxRate]);

  const {
    data: projectRates = [],
    isLoading: ratesLoading,
    isFetching: ratesFetching,
  } = useProjectCustomerRates(projectId);

  const canManageInvoices =
    user?.role === "admin" ||
    (user?.role === "employee" && user.employeeAccess?.includes("payments"));

  const formatCurrency = (value: number | string | undefined | null) =>
    Number(value ?? 0).toFixed(2);

  const handleCalculate = form.handleSubmit(async (values) => {
    setIsCalculating(true);
    try {
      const payload: CreateCustomerInvoiceRequest = {
        ...values,
        customerId: selectedProject?.customerId ?? values.customerId,
      };
      const result = await calculateCustomerInvoice(payload);
      setCalculation(result);
      setInvoice(null);
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
      };
      const created = await createCustomerInvoice(payload);
      setInvoice(created);
      setCalculation(null);
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
    status: "pending" | "paid" | "overdue",
  ) => {
    setUpdatingInvoiceId(invoiceId);
    try {
      const updated = await updateCustomerInvoiceStatus(invoiceId, { status });
      if (invoice?.id === invoiceId) {
        setInvoice(updated);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customer Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Calculate and create invoices for project vehicle attendance.
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Receipt className="h-4 w-4" />
          Billing
        </Badge>
      </div>

      {!canManageInvoices && (
        <Alert variant="destructive">
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            You do not have permission to create customer invoices.
          </AlertDescription>
        </Alert>
      )}

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
                          <Input type="number" step="0.01" {...field} disabled={!canManageInvoices} />
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
                          <Input type="number" step="0.01" {...field} disabled={!canManageInvoices} />
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
                  <Button type="submit" disabled={!canManageInvoices || !projectId || isCalculating}>
                    {isCalculating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Calculator className="mr-2 h-4 w-4" />
                    )}
                    Calculate invoice
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
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
                      Adjust the adjustment or tax rate and click Calculate to refresh totals before
                      creating.
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
                      <TableCell className="text-right">${Number(rate.rate).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert>
                <AlertTitle>No rate data</AlertTitle>
                <AlertDescription>
                  Select a project to view customer rates. Rates are required to calculate invoices.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {calculation && (
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
                  {invoice.customer?.name ?? selectedProject?.customer.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Project</div>
                <div className="font-medium">{invoice.project?.name ?? selectedProject?.name}</div>
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
                <div className="text-lg font-semibold">${formatCurrency(calculation.subtotal)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Adjustment</div>
                <div className="text-lg font-semibold">${formatCurrency(calculation.adjustment)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sales tax</div>
                <div className="text-lg font-semibold">
                  {calculation.salesTaxRate}% (${formatCurrency(calculation.salesTaxAmount)})
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">${formatCurrency(calculation.total)}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Line items by vehicle and month</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Present days</TableHead>
                    <TableHead className="text-right">Daily rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                      <TableCell className="text-right">{item.presentDays}</TableCell>
                      <TableCell className="text-right">${formatCurrency(item.dailyRate)}</TableCell>
                      <TableCell className="text-right">${formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Invoice created
            </CardTitle>
            <CardDescription>
              Review the calculated totals and line items for this invoice.
            </CardDescription>
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
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">${formatCurrency(invoice.subtotal)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Adjustment</div>
                <div className="text-lg font-semibold">${formatCurrency(invoice.adjustment)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sales tax</div>
                <div className="text-lg font-semibold">
                  {Number(invoice.salesTaxRate ?? 0)}% (${formatCurrency(invoice.salesTaxAmount)})
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">${formatCurrency(invoice.total)}</div>
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
                    <TableHead className="text-right">Present days</TableHead>
                    <TableHead className="text-right">Daily rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                      <TableCell className="text-right">{item.presentDays}</TableCell>
                      <TableCell className="text-right">${formatCurrency(item.dailyRate)}</TableCell>
                      <TableCell className="text-right">${formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Created invoices</CardTitle>
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
                    <TableCell className="text-right">${formatCurrency(row.total)}</TableCell>
                    <TableCell>
                      <Select
                        disabled={!canManageInvoices || updatingInvoiceId === row.id}
                        value={row.status}
                        onValueChange={(value) =>
                          handleStatusChange(row.id, value as "pending" | "paid" | "overdue")
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-32 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInvoice(row)}
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
    </div>
  );
}
