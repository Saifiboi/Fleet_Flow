import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/lib/api";
import CustomerForm from "@/components/forms/customer-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserPlus, Users, Edit, Trash2, Search } from "lucide-react";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useCustomers();

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.contactName?.toLowerCase().includes(term) ?? false) ||
      (customer.companyName?.toLowerCase().includes(term) ?? false) ||
      (customer.taxNumber?.toLowerCase().includes(term) ?? false) ||
      (customer.email?.toLowerCase().includes(term) ?? false)
    );
  });

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="customers-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Customers</span>
            </CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-customer-button">
                  <UserPlus className="mr-2 w-4 h-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                </DialogHeader>
                <CustomerForm customer={editingCustomer} onSuccess={handleFormClose} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-customers"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <ScrollArea className="h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Tax Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.contactName || "-"}</TableCell>
                        <TableCell>{customer.companyName || "-"}</TableCell>
                        <TableCell>{customer.taxNumber || "-"}</TableCell>
                        <TableCell>{customer.email || "-"}</TableCell>
                        <TableCell>{customer.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              data-testid={`edit-customer-${customer.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <ConfirmDialog
                              title="Delete customer"
                              description="Deleting this customer will prevent linking existing projects to them."
                              onConfirm={() => deleteCustomerMutation.mutate(customer.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  disabled={deleteCustomerMutation.isPending}
                                  data-testid={`delete-customer-${customer.id}`}
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
            </ScrollArea>
          </div>

          {filteredCustomers.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
