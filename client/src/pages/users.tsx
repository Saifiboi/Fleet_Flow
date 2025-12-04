import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOwners, useUsers } from "@/lib/api";
import {
  changePasswordSchema,
  createUserSchema,
  adminResetPasswordSchema,
  employeeAccessAreas,
  type UserRole,
  type EmployeeAccessArea,
  type UserWithOwner,
} from "@shared/schema";
import { Shield, UserPlus, Mail, UserX, UserCheck, KeyRound, Settings2 } from "lucide-react";

const createUserFormSchema = createUserSchema;
const changePasswordFormSchema = changePasswordSchema;
const resetUserPasswordFormSchema = adminResetPasswordSchema;

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
type ResetUserPasswordFormValues = z.infer<typeof resetUserPasswordFormSchema>;

const employeeAccessOptions: { value: EmployeeAccessArea; label: string; description: string }[] = [
  {
    value: "vehicles",
    label: "Vehicles",
    description: "Manage fleet inventory and vehicle details.",
  },
  {
    value: "projects",
    label: "Projects",
    description: "Create and update project records.",
  },
  {
    value: "assignments",
    label: "Assignments",
    description: "Control vehicle and project assignments.",
  },
  {
    value: "attendance",
    label: "Attendance",
    description: "Track vehicle attendance and status logs.",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Record and edit maintenance activities.",
  },
  {
    value: "payments",
    label: "Payments",
    description: "Create invoices, record transactions, and manage balances.",
  },
];

export default function Users() {
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const { data: owners = [], isLoading: isLoadingOwners } = useOwners();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserWithOwner | null>(null);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [userToManageAccess, setUserToManageAccess] = useState<UserWithOwner | null>(null);

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "owner",
      ownerId: undefined,
      employeeAccess: [],
    },
  });

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordForm = useForm<ResetUserPasswordFormValues>({
    resolver: zodResolver(resetUserPasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const accessForm = useForm<{ employeeAccess: EmployeeAccessArea[] }>({
    defaultValues: { employeeAccess: [] },
  });

  const selectedRole = createForm.watch("role");

  const availableOwners = useMemo(
    () => owners.filter((owner) => !users.some((user) => user.role === "owner" && user.ownerId === owner.id)),
    [owners, users],
  );

  useEffect(() => {
    if (selectedRole === "admin") {
      createForm.setValue("ownerId", null);
      createForm.setValue("employeeAccess", []);
      return;
    }

    if (selectedRole === "employee") {
      createForm.setValue("ownerId", null);
      if ((createForm.getValues("employeeAccess") ?? []).length === 0) {
        createForm.setValue("employeeAccess", [...employeeAccessAreas]);
      }
      return;
    }

    const currentOwnerId = createForm.getValues("ownerId");
    if (currentOwnerId && !availableOwners.some((owner) => owner.id === currentOwnerId)) {
      createForm.setValue("ownerId", undefined);
    }

    createForm.setValue("employeeAccess", []);
  }, [availableOwners, createForm, selectedRole]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      createForm.reset({
        email: "",
        password: "",
        role: "owner",
        ownerId: undefined,
        employeeAccess: [],
      });
    }
  };

  const handleResetDialogChange = (open: boolean) => {
    setIsResetDialogOpen(open);
    if (!open) {
      setUserToReset(null);
      resetPasswordForm.reset({
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const handleAccessDialogChange = (open: boolean) => {
    setIsAccessDialogOpen(open);
    if (!open) {
      setUserToManageAccess(null);
      accessForm.reset({ employeeAccess: [] });
    }
  };

  const openResetDialog = (user: UserWithOwner) => {
    setUserToReset(user);
    setIsResetDialogOpen(true);
    resetPasswordForm.reset({
      newPassword: "",
      confirmPassword: "",
    });
  };

  const openAccessDialog = (user: UserWithOwner) => {
    setUserToManageAccess(user);
    setIsAccessDialogOpen(true);
    accessForm.reset({ employeeAccess: user.employeeAccess ?? [] });
  };

  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const payload = {
        ...values,
        ownerId: values.role === "owner" ? values.ownerId : null,
        employeeAccess: values.role === "employee" ? values.employeeAccess ?? [] : [],
      };
      await apiRequest("POST", "/api/users", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User created",
        description: "The account has been created successfully.",
      });
      handleDialogChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/users/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: variables.isActive ? "Account enabled" : "Account disabled",
        description: variables.isActive
          ? "The user can now access the system."
          : "The user has been prevented from accessing the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: ChangePasswordFormValues) => {
      await apiRequest("POST", "/api/users/change-password", values);
    },
    onSuccess: () => {
      changePasswordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update password",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ userId, ...values }: ResetUserPasswordFormValues & { userId: string }) => {
      await apiRequest("POST", `/api/users/${userId}/reset-password`, values);
    },
    onSuccess: () => {
      resetPasswordForm.reset({
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password reset",
        description: "A new password has been set for the account.",
      });
      handleResetDialogChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeAccessMutation = useMutation({
    mutationFn: async ({ id, employeeAccess }: { id: string; employeeAccess: EmployeeAccessArea[] }) => {
      await apiRequest("PATCH", `/api/users/${id}`, { employeeAccess });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Access updated",
        description: "Employee permissions have been saved.",
      });
      handleAccessDialogChange(false);
      accessForm.reset({ employeeAccess: variables.employeeAccess });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update access",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users]);

  const onCreateUserSubmit = (values: CreateUserFormValues) => {
    createUserMutation.mutate(values);
  };

  const onChangePasswordSubmit = (values: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(values);
  };

  const onResetUserPasswordSubmit = (values: ResetUserPasswordFormValues) => {
    if (!userToReset) {
      return;
    }

    resetUserPasswordMutation.mutate({ userId: userToReset.id, ...values });
  };

  const onAccessSubmit = (values: { employeeAccess: EmployeeAccessArea[] }) => {
    if (!userToManageAccess) {
      return;
    }

    updateEmployeeAccessMutation.mutate({
      id: userToManageAccess.id,
      employeeAccess: values.employeeAccess ?? [],
    });
  };

  const renderStatusBadge = (user: UserWithOwner) => {
    if (user.role === "admin") {
      return <Badge variant="secondary">Admin</Badge>;
    }

    return user.isActive ? (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        <UserCheck className="mr-1 h-3 w-3" /> Active
      </Badge>
    ) : (
      <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100">
        <UserX className="mr-1 h-3 w-3" /> Disabled
      </Badge>
    );
  };

  const renderEmployeeAccess = (user: UserWithOwner) => {
    if (user.role !== "employee") {
      return <span className="text-muted-foreground">—</span>;
    }

    if (!user.employeeAccess || user.employeeAccess.length === 0) {
      return <Badge variant="outline">No access</Badge>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {employeeAccessOptions
          .filter((option) => user.employeeAccess?.includes(option.value))
          .map((option) => (
            <Badge key={option.value} variant="secondary" className="capitalize">
              {option.label}
            </Badge>
          ))}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>User Accounts</span>
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button data-testid="add-user-button">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create User Account</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateUserSubmit)} className="space-y-4" data-testid="user-form">
                    <FormField
                      control={createForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="owner@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temporary Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter a secure password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value: UserRole) => field.onChange(value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedRole === "employee" && (
                      <FormField
                        control={createForm.control}
                        name="employeeAccess"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operational Access</FormLabel>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {employeeAccessOptions.map((option) => {
                                const isChecked = field.value?.includes(option.value);

                                return (
                                  <label
                                    key={option.value}
                                    className="flex cursor-pointer items-start space-x-3 rounded-md border p-3"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        const next = checked
                                          ? [...(field.value ?? []), option.value]
                                          : (field.value ?? []).filter((value) => value !== option.value);
                                        field.onChange(next);
                                      }}
                                    />
                                    <div className="space-y-1">
                                      <p className="font-medium leading-none">{option.label}</p>
                                      <p className="text-xs text-muted-foreground">{option.description}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedRole === "owner" && (
                      <FormField
                        control={createForm.control}
                        name="ownerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <Select
                              value={field.value ?? undefined}
                              onValueChange={(value) => field.onChange(value)}
                              disabled={isLoadingOwners || availableOwners.length === 0}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an owner" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableOwners.length === 0 ? (
                                  <SelectItem value="no-owners" disabled>
                                    All owners already have accounts
                                  </SelectItem>
                                ) : (
                                  availableOwners.map((owner) => (
                                    <SelectItem key={owner.id} value={owner.id}>
                                      {owner.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {availableOwners.length === 0 && !isLoadingOwners ? (
                              <p className="text-sm text-muted-foreground">
                                All owners already have user accounts.
                              </p>
                            ) : null}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No users found. Create your first account to get started.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{renderEmployeeAccess(user)}</TableCell>
                    <TableCell>
                      {user.owner ? (
                        <div>
                          <p className="font-medium text-foreground">{user.owner.name}</p>
                          <p className="text-xs text-muted-foreground">{user.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{renderStatusBadge(user)}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role !== "admin" ? (
                        <div className="flex items-center justify-end space-x-2">
                          {user.role === "employee" && (
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => openAccessDialog(user)}
                              disabled={updateEmployeeAccessMutation.isPending}
                              data-testid={`access-${user.id}`}
                            >
                              <Settings2 className="mr-1 h-3 w-3" /> Access
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => openResetDialog(user)}
                            disabled={resetUserPasswordMutation.isPending}
                            data-testid={`reset-password-${user.id}`}
                          >
                            <KeyRound className="mr-1 h-3 w-3" /> Reset
                          </Button>
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              updateStatusMutation.mutate({ id: user.id, isActive: checked })
                            }
                            disabled={updateStatusMutation.isPending}
                            data-testid={`user-status-${user.id}`}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Cannot disable admins</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isResetDialogOpen} onOpenChange={handleResetDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for {userToReset?.owner?.name ?? userToReset?.email ?? "this account"}.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form
              onSubmit={resetPasswordForm.handleSubmit(onResetUserPasswordSubmit)}
              className="space-y-4"
              data-testid="reset-owner-password-form"
            >
              <FormField
                control={resetPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex items-center justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => handleResetDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetUserPasswordMutation.isPending || !userToReset}>
                  {resetUserPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAccessDialogOpen} onOpenChange={handleAccessDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Employee Access</DialogTitle>
            <DialogDescription>
              Choose which operational areas {userToManageAccess?.email ?? "this employee"} can access.
            </DialogDescription>
          </DialogHeader>
          <Form {...accessForm}>
            <form onSubmit={accessForm.handleSubmit(onAccessSubmit)} className="space-y-4">
              <FormField
                control={accessForm.control}
                name="employeeAccess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operational Access</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {employeeAccessOptions.map((option) => {
                        const isChecked = field.value?.includes(option.value);

                        return (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-start space-x-3 rounded-md border p-3"
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...(field.value ?? []), option.value]
                                  : (field.value ?? []).filter((value) => value !== option.value);
                                field.onChange(next);
                              }}
                            />
                            <div className="space-y-1">
                              <p className="font-medium leading-none">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex items-center justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => handleAccessDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateEmployeeAccessMutation.isPending || !userToManageAccess}>
                  {updateEmployeeAccessMutation.isPending ? "Saving..." : "Save Access"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5" />
            <span>Update Password</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...changePasswordForm}>
            <form
              onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)}
              className="grid gap-4 md:grid-cols-3"
              data-testid="change-password-form"
            >
              <FormField
                control={changePasswordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter current password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
