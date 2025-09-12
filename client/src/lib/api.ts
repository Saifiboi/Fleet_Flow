import { useQuery } from "@tanstack/react-query";
import type { 
  Owner, 
  Vehicle, 
  VehicleWithOwner, 
  Project, 
  Assignment, 
  AssignmentWithDetails, 
  Payment, 
  PaymentWithDetails, 
  DashboardStats 
} from "@shared/schema";

// Typed query hooks to fix TypeScript issues
export const useOwners = () => useQuery<Owner[]>({
  queryKey: ["/api/owners"],
});

export const useVehicles = () => useQuery<VehicleWithOwner[]>({
  queryKey: ["/api/vehicles"],
});

export const useProjects = () => useQuery<Project[]>({
  queryKey: ["/api/projects"],
});

export const useAssignments = () => useQuery<AssignmentWithDetails[]>({
  queryKey: ["/api/assignments"],
});

export const usePayments = () => useQuery<PaymentWithDetails[]>({
  queryKey: ["/api/payments"],
});

export const useOutstandingPayments = () => useQuery<PaymentWithDetails[]>({
  queryKey: ["/api/payments/outstanding"],
});

export const useDashboardStats = () => useQuery<DashboardStats>({
  queryKey: ["/api/dashboard/stats"],
});

export const useVehiclesByOwner = (ownerId: string) => useQuery<VehicleWithOwner[]>({
  queryKey: ["/api/vehicles/owner", ownerId],
});

export const useAssignmentsByProject = (projectId: string) => useQuery<AssignmentWithDetails[]>({
  queryKey: ["/api/assignments/project", projectId],
});

export const useAssignmentsByVehicle = (vehicleId: string) => useQuery<AssignmentWithDetails[]>({
  queryKey: ["/api/assignments/vehicle", vehicleId],
});

export const usePaymentsByAssignment = (assignmentId: string) => useQuery<PaymentWithDetails[]>({
  queryKey: ["/api/payments/assignment", assignmentId],
});