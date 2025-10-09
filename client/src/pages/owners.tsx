import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useOwners } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OwnerForm from "@/components/forms/owner-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Users, Plus, Edit, Eye, Trash2, Search, Mail, Phone } from "lucide-react";
import type { Owner } from "@shared/schema";

export default function Owners() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: owners = [], isLoading } = useOwners();

  const deleteOwnerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/owners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      toast({
        title: "Success",
        description: "Owner deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete owner",
        variant: "destructive",
      });
    },
  });

  const filteredOwners = owners?.filter((owner: Owner) =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingOwner(null);
  };

  return (
    <div className="space-y-6" data-testid="owners-page">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Vehicle Owners</span>
            </CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-owner-button">
                  <Plus className="mr-2 w-4 h-4" />
                  Add Owner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingOwner ? "Edit Owner" : "Add New Owner"}
                  </DialogTitle>
                </DialogHeader>
                <OwnerForm 
                  owner={editingOwner} 
                  onSuccess={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-owners"
              />
            </div>
          </div>

          {/* Owners Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Joined</TableHead>
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
              ) : filteredOwners?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No owners found</p>
                      {searchTerm ? (
                        <p className="text-sm text-muted-foreground">Try adjusting your search</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Get started by adding your first owner</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOwners?.map((owner: Owner) => (
                  <TableRow key={owner.id} data-testid={`owner-row-${owner.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="text-primary w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{owner.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(owner.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-foreground">{owner.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <p className="text-sm text-foreground">{owner.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{owner.address}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">
                        {new Date(owner.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(owner)}
                          data-testid={`edit-owner-${owner.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`view-owner-${owner.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete owner"
                          description="Are you sure you want to delete this owner? This will also delete all their vehicles."
                          onConfirm={() => deleteOwnerMutation.mutate(owner.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              disabled={deleteOwnerMutation.isPending}
                              data-testid={`delete-owner-${owner.id}`}
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
          {filteredOwners && filteredOwners.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredOwners.length} of {owners?.length || 0} owners
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
