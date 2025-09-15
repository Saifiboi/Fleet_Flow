import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOwnerSchema, type Owner, type InsertOwner } from "@shared/schema";

interface OwnerFormProps {
  owner?: Owner | null;
  onSuccess?: () => void;
}

export default function OwnerForm({ owner, onSuccess }: OwnerFormProps) {
  const { toast } = useToast();
  const isEditing = !!owner;

  const form = useForm<InsertOwner>({
    resolver: zodResolver(insertOwnerSchema),
    defaultValues: {
      ownerType: (owner?.ownerType as any) || "individual",
      name: owner?.name || "",
      email: owner?.email || "",
      phone: owner?.phone || "",
      address: owner?.address || "",
      companyName: owner?.companyName || "",
      contactPerson: owner?.contactPerson || "",
      companyRegistrationNumber: owner?.companyRegistrationNumber || "",
    },
  });

  const createOwnerMutation = useMutation({
    mutationFn: async (data: InsertOwner) => {
      if (isEditing) {
        return await apiRequest("PUT", `/api/owners/${owner.id}`, data);
      } else {
        return await apiRequest("POST", "/api/owners", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      toast({
        title: "Success",
        description: `Owner ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} owner`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createOwnerMutation.mutate(data as InsertOwner);
  };

  const ownerType = form.watch("ownerType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="owner-form">
        <FormField
          control={form.control}
          name="ownerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-owner-type">
                    <SelectValue placeholder="Select owner type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {ownerType === "corporate" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} data-testid="input-contact-person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyRegistrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Registration Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter registration number" {...field} data-testid="input-registration-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{ownerType === "corporate" ? "Display Name" : "Full Name"}</FormLabel>
                <FormControl>
                  <Input placeholder={ownerType === "corporate" ? "Company display name" : "Enter owner's full name"} {...field} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="owner@example.com" {...field} data-testid="input-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter complete address"
                  className="min-h-[80px]"
                  {...field} 
                  data-testid="input-address" 
                />
              </FormControl>
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
            disabled={createOwnerMutation.isPending}
            data-testid="button-submit"
          >
            {createOwnerMutation.isPending 
              ? (isEditing ? "Updating..." : "Creating...") 
              : (isEditing ? "Update Owner" : "Create Owner")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
