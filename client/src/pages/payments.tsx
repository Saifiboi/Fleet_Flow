import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePayments, useAssignments } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PaymentForm from "@/components/forms/payment-form";
import { PaymentPeriodForm } from "@/components/forms/payment-period-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CreditCard,
  Plus,
  Edit,
  Eye,
  Trash2,
  Search,
  Check,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { PaymentWithDetails, VehiclePaymentForPeriodResult } from "@shared/schema";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCalculationOpen, setIsCalculationOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<VehiclePaymentForPeriodResult | null>(null);
  const { toast } = useToast();

  const { data: payments = [], isLoading } = usePayments();

  const { data: assignments = [] } = useAssignments();

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/payments/${id}`, {
        status: "paid",
        paidDate: new Date().toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Payment marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const filteredPayments = payments?.filter((payment: PaymentWithDetails) => {
    const matchesSearch = 
      payment.assignment.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.assignment.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.assignment.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.assignment.vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.invoiceNumber && payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, dueDate: string, paidDate?: string | null) => {
    if (status === "paid") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    }

    const today = new Date();
    const due = new Date(dueDate);
    const daysOverdue = differenceInDays(today, due);
    
    if (daysOverdue > 0) {
      return <Badge variant="destructive">{daysOverdue} days overdue</Badge>;
    }
    if (daysOverdue === 0) {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Due Today</Badge>;
    }
    if (daysOverdue >= -3) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Due Soon</Badge>;
    }
    
    return <Badge variant="secondary">Pending</Badge>;
  };

  const handleEdit = (payment: PaymentWithDetails) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPayment(null);
  };

  const totalOutstanding = payments?.reduce((sum: number, payment: PaymentWithDetails) => {
    return payment.status === "pending" ? sum + Number(payment.amount) : sum;
  }, 0) || 0;

  const overdueCount = payments?.filter((payment: PaymentWithDetails) => {
    if (payment.status !== "pending") return false;
    const today = new Date();
    const due = new Date(payment.dueDate);
    return differenceInDays(today, due) > 0;
  }).length || 0;

  return (
    <div className="space-y-6" data-testid="payments-page">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="total-outstanding">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
            <div className="flex items-center justify-between">
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Dialog
                open={isCalculationOpen}
                onOpenChange={(open) => {
                  setIsCalculationOpen(open);
                  if (!open) {
                    setCalculationResult(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="calculate-payment-button">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Calculate payment for a period</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    <PaymentPeriodForm
                      onSuccess={(result) => {
                        setCalculationResult(result);
                      }}
                    />
                    {calculationResult && (
                      <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-lg">Calculation summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Assignment</p>
                              <p className="font-medium">
                                {calculationResult.payment.assignment.project.name}
                              </p>
                              <p>
                                {calculationResult.payment.assignment.vehicle.make}{" "}
                                {calculationResult.payment.assignment.vehicle.model} (
                                {calculationResult.payment.assignment.vehicle.licensePlate})
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
                                {calculationResult.calculation.presentDays} of {" "}
                                {calculationResult.calculation.totalDays} days present
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">Monthly rate</p>
                              <p className="font-semibold">
                                ${calculationResult.calculation.monthlyRate.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Daily rate</p>
                              <p className="font-semibold">
                                ${calculationResult.calculation.dailyRate.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Maintenance costs</p>
                              <p className="font-semibold">
                                ${calculationResult.calculation.maintenanceCost.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">Base amount</p>
                              <p className="font-semibold">
                                ${calculationResult.calculation.baseAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Net amount</p>
                              <p className="text-lg font-bold text-primary">
                                ${calculationResult.calculation.netAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Due date</p>
                              <p className="font-semibold">
                                {format(new Date(calculationResult.payment.dueDate), "PPP")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-payment-button">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPayment ? "Edit Payment" : "Add New Payment"}
                    </DialogTitle>
                  </DialogHeader>
                  <PaymentForm 
                    payment={editingPayment} 
                    onSuccess={handleFormClose}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="outline" data-testid="generate-invoices">
                <FileText className="mr-2 w-4 h-4" />
                Generate Invoices
              </Button>
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
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
                filteredPayments?.map((payment: PaymentWithDetails) => (
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
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <p className="text-sm font-semibold text-foreground">${payment.amount}</p>
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
                      {getStatusBadge(payment.status, payment.dueDate, payment.paidDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {payment.status === "pending" && (
                          <ConfirmDialog
                            title="Mark payment as paid"
                            description="Mark this payment as paid?"
                            confirmText="Mark Paid"
                            onConfirm={() => markPaidMutation.mutate(payment.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-800"
                                disabled={markPaidMutation.isPending}
                                data-testid={`mark-paid-${payment.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            }
                          />
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(payment)}
                          data-testid={`edit-payment-${payment.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`view-payment-${payment.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete payment"
                          description="Are you sure you want to delete this payment record?"
                          onConfirm={() => deletePaymentMutation.mutate(payment.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              disabled={deletePaymentMutation.isPending}
                              data-testid={`delete-payment-${payment.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Summary */}
          {filteredPayments && filteredPayments.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {payments?.length || 0} payments
              </p>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-muted-foreground">
                  Total Outstanding: <span className="font-semibold text-destructive">${totalOutstanding.toLocaleString()}</span>
                </p>
                {overdueCount > 0 && (
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
