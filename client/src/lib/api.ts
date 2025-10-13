import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  Owner,
  Vehicle,
  VehicleWithOwner,
  Project,
  Assignment,
  AssignmentWithDetails,
  Payment,
  PaymentWithDetails,
  MaintenanceRecord,
  MaintenanceRecordWithVehicle,
  DashboardStats,
  VehicleAttendanceWithVehicle,
  VehicleAttendanceSummary,
  CreateVehiclePaymentForPeriod,
  VehiclePaymentForPeriodResult,
  UserWithOwner,
} from "@shared/schema";

// Typed query hooks to fix TypeScript issues
export const useOwners = () => useQuery<Owner[]>({
  queryKey: ["/api/owners"],
});

export const useUsers = () => useQuery<UserWithOwner[]>({
  queryKey: ["/api/users"],
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

export const useMaintenanceRecords = () => useQuery<MaintenanceRecordWithVehicle[]>({
  queryKey: ["/api/maintenance"],
});

export const useMaintenanceRecordsByVehicle = (vehicleId: string) => useQuery<MaintenanceRecordWithVehicle[]>({
  queryKey: ["/api/maintenance/vehicle", vehicleId],
});

export const useVehicleAttendance = (params: { vehicleId?: string; projectId?: string | null }) =>
  useQuery<VehicleAttendanceWithVehicle[]>({
    queryKey: ["/api/vehicle-attendance", params?.vehicleId ?? "all", params?.projectId ?? "all"],
    enabled: !!params.vehicleId,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.vehicleId) {
        searchParams.set("vehicleId", params.vehicleId);
      }
      if (params.projectId) {
        searchParams.set("projectId", params.projectId);
      }
      const query = searchParams.toString();
      const res = await apiRequest("GET", query ? `/api/vehicle-attendance?${query}` : "/api/vehicle-attendance");
      return (await res.json()) as VehicleAttendanceWithVehicle[];
    },
  });

export const useVehicleAttendanceSummary = (params: {
  vehicleId?: string;
  projectId?: string | null;
  startDate?: string;
  endDate?: string;
}) =>
  useQuery<VehicleAttendanceSummary[]>({
    queryKey: [
      "/api/vehicle-attendance/summary",
      params?.vehicleId ?? "none",
      params?.projectId === undefined ? "all" : params?.projectId ?? "null",
      params?.startDate ?? "none",
      params?.endDate ?? "none",
    ],
    enabled: !!params.vehicleId,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.vehicleId) {
        searchParams.set("vehicleId", params.vehicleId);
      }
      if (params.projectId !== undefined) {
        searchParams.set("projectId", params.projectId === null ? "null" : params.projectId);
      }
      if (params.startDate) {
        searchParams.set("startDate", params.startDate);
      }
      if (params.endDate) {
        searchParams.set("endDate", params.endDate);
      }
      const query = searchParams.toString();
      const res = await apiRequest(
        "GET",
        query ? `/api/vehicle-attendance/summary?${query}` : "/api/vehicle-attendance/summary"
      );
      return (await res.json()) as VehicleAttendanceSummary[];
    },
  });

export const createVehiclePaymentForPeriod = async (
  payload: CreateVehiclePaymentForPeriod
): Promise<VehiclePaymentForPeriodResult> => {
  const res = await apiRequest("POST", "/api/payments/calculate", payload);
  return (await res.json()) as VehiclePaymentForPeriodResult;
};
