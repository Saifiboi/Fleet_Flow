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
  useProjectCustomerRates,
  useProjects,
} from "@/lib/api";
import type {
  CreateCustomerInvoiceRequest,
  CustomerInvoiceWithItems,
} from "@shared/schema";
import { createCustomerInvoiceSchema } from "@shared/schema";
import { Calculator, ClipboardCheck, Loader2, Receipt } from "lucide-react";

const today = new Date();
const defaultStart = startOfMonth(today);

export default function CustomerInvoices() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [invoice, setInvoice] = useState<CustomerInvoiceWithItems | null>(null);

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
  }, [projectId, startDate, endDate]);

  const {
    data: projectRates = [],
    isLoading: ratesLoading,
    isFetching: ratesFetching,
  } = useProjectCustomerRates(projectId);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload: CreateCustomerInvoiceRequest = {
        ...values,
        customerId: selectedProject?.customerId ?? values.customerId,
      };
      const created = await createCustomerInvoice(payload);
      setInvoice(created);
      toast({
        title: "Invoice created",
        description: "Project invoice calculated and saved.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to create invoice",
        description: error?.message ?? "An unexpected error occurred",
        variant: "destructive",
      });
    }
  });

  const canManageInvoices =
    user?.role === "admin" ||
    (user?.role === "employee" && user.employeeAccess?.includes("payments"));

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
              <form className="space-y-4" onSubmit={onSubmit}>
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
                  <Button type="submit" disabled={!canManageInvoices || !projectId}>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate &amp; Create Invoice
                  </Button>
                  {(!selectedProject || projectRates.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Select a project with customer vehicle rates to calculate totals.
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
                <div className="text-lg font-semibold">${invoice.subtotal}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Adjustment</div>
                <div className="text-lg font-semibold">${invoice.adjustment}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sales tax</div>
                <div className="text-lg font-semibold">
                  {invoice.salesTaxRate}% (${invoice.salesTaxAmount})
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">${invoice.total}</div>
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
                      <TableCell className="text-right">${item.dailyRate}</TableCell>
                      <TableCell className="text-right">${item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
