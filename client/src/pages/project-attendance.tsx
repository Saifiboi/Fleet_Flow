import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useAssignments,
  useProjects,
} from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssignmentWithDetails, VehicleAttendanceWithVehicle } from "@shared/schema";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";

function getDaysForMonth(date = new Date()) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

export default function ProjectAttendance() {
  const { data: projects = [] } = useProjects();
  const { data: assignments = [] } = useAssignments();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectMonth, setProjectMonth] = useState<Date>(startOfMonth(new Date()));
  const [projectOverrides, setProjectOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const today = useMemo(() => startOfToday(), []);
  const projectDays = useMemo(() => getDaysForMonth(projectMonth), [projectMonth]);
  const projectMaxMonth = useMemo(() => startOfMonth(today), [today]);
  const projectNonFutureDays = useMemo(
    () => projectDays.filter((d) => !isAfter(d, today)),
    [projectDays, today],
  );

  const canManageProjectAttendance =
    user?.role === "admin" ||
    (user?.role === "employee" && user.employeeManageAccess?.includes("projectAttendance"));

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const projectAssignments = useMemo(() => {
    if (!selectedProjectId) return [] as AssignmentWithDetails[];
    return assignments.filter((assignment) => assignment.project.id === selectedProjectId);
  }, [assignments, selectedProjectId]);

  const projectVehicles = useMemo(() => {
    const map = new Map<string, AssignmentWithDetails>();
    projectAssignments.forEach((assignment) => {
      map.set(assignment.vehicle.id, assignment);
    });
    return Array.from(map.values());
  }, [projectAssignments]);

  const {
    data: projectAttendanceRecords = [],
    isLoading: projectAttendanceLoading,
    refetch: refetchProjectAttendance,
  } = useQuery<VehicleAttendanceWithVehicle[]>({
    queryKey: ["/api/vehicle-attendance", "project", selectedProjectId ?? "none"],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      if (!selectedProjectId) return [] as VehicleAttendanceWithVehicle[];
      const res = await apiRequest("GET", `/api/vehicle-attendance?projectId=${selectedProjectId}`);
      return (await res.json()) as VehicleAttendanceWithVehicle[];
    },
  });

  const projectAttendanceByVehicleDate = useMemo(() => {
    const map: Record<string, Record<string, VehicleAttendanceWithVehicle>> = {};
    projectAttendanceRecords.forEach((record) => {
      const recordDate = parseISO(record.attendanceDate);
      if (!record.projectId || record.projectId !== selectedProjectId) return;
      if (recordDate.getMonth() !== projectMonth.getMonth() || recordDate.getFullYear() !== projectMonth.getFullYear()) return;
      map[record.vehicleId] = map[record.vehicleId] || {};
      map[record.vehicleId][record.attendanceDate] = record;
    });
    return map;
  }, [projectAttendanceRecords, projectMonth, selectedProjectId]);

  useEffect(() => {
    setProjectOverrides({});
  }, [selectedProjectId, projectMonth, projectAttendanceRecords]);

  const projectAttendanceSaveMutation = useMutation({
    mutationFn: async (payload: {
      create: Array<{ vehicleId: string; projectId: string; attendanceDate: string; status: string }>;
      remove: Array<{ vehicleId: string; projectId: string; attendanceDate: string }>;
    }) => {
      const result = { created: 0, deleted: 0 };

      if (payload.create.length > 0) {
        const res = await apiRequest("POST", "/api/vehicle-attendance/batch", payload.create);
        const created = await res.json();
        result.created = Array.isArray(created) ? created.length : 0;
      }

      if (payload.remove.length > 0) {
        const res = await apiRequest("POST", "/api/vehicle-attendance/delete", payload.remove);
        const deleted = await res.json();
        result.deleted = Array.isArray(deleted) ? deleted.length : 0;
      }

      return result;
    },
    onSuccess: ({ created, deleted }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-attendance"] });
      refetchProjectAttendance();
      setProjectOverrides({});
      toast({ title: "Project attendance updated", description: `${created} created, ${deleted} removed.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save project attendance", variant: "destructive" });
    },
  });

  function handleProjectCheckboxChange(vehicleId: string, dateStr: string, checked: boolean) {
    if (!canManageProjectAttendance) return;
    setProjectOverrides((current) => ({
      ...current,
      [vehicleId]: {
        ...(current[vehicleId] || {}),
        [dateStr]: checked,
      },
    }));
  }

  function handleSaveProjectAttendance() {
    if (!selectedProjectId) {
      return toast({
        title: "Select a project",
        description: "Choose a project to manage attendance.",
        variant: "destructive",
      });
    }

    const createPayloads: Array<{ vehicleId: string; projectId: string; attendanceDate: string; status: string }> = [];
    const deletePayloads: Array<{ vehicleId: string; projectId: string; attendanceDate: string }> = [];

    projectVehicles.forEach((assignment) => {
      const vehicleId = assignment.vehicle.id;
      projectNonFutureDays.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const existing = projectAttendanceByVehicleDate[vehicleId]?.[dateStr];
        const baseChecked = existing?.status === "present";
        const overrideChecked = projectOverrides[vehicleId]?.[dateStr];
        const finalChecked = overrideChecked ?? baseChecked;

        if (existing?.isPaid) return;
        if (finalChecked === baseChecked) return;

        if (finalChecked) {
          createPayloads.push({
            vehicleId,
            projectId: selectedProjectId,
            attendanceDate: dateStr,
            status: "present",
          });
        } else if (existing) {
          deletePayloads.push({ vehicleId, projectId: selectedProjectId, attendanceDate: dateStr });
        }
      });
    });

    if (createPayloads.length === 0 && deletePayloads.length === 0) {
      return toast({
        title: "No changes to save",
        description: "Update attendance checkboxes before saving.",
      });
    }

    projectAttendanceSaveMutation.mutate({ create: createPayloads, remove: deletePayloads });
  }

  const handleProjectPrevMonth = () => {
    setProjectMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleProjectNextMonth = () => {
    setProjectMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      if (isAfter(next, projectMaxMonth)) return current;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Project Attendance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a project to mark presence across all assigned vehicles for the month.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button size="sm" variant="outline" onClick={handleProjectPrevMonth}>
                Prev
              </Button>
              <div className="px-3 py-2 text-sm font-medium text-center min-w-[140px]">
                {format(projectMonth, "MMMM yyyy")}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleProjectNextMonth}
                disabled={!isBefore(projectMonth, projectMaxMonth)}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xs">
              <Select
                value={selectedProjectId ?? "none"}
                onValueChange={(v) => setSelectedProjectId(v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManageProjectAttendance ? (
              <Button
                className="w-full md:w-auto"
                onClick={handleSaveProjectAttendance}
                disabled={projectAttendanceSaveMutation.isPending || !selectedProjectId}
              >
                Save Attendance
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-right w-full md:w-auto">
                Attendance is read-only for your account.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground md:text-base">
            Check a box to mark a vehicle as present for that date. Paid attendance and future dates cannot be changed.
          </div>
          <div className="overflow-x-auto rounded-md border">
            <div className="min-w-[760px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[14rem]">Vehicle</TableHead>
                    {projectDays.map((day) => (
                      <TableHead key={day.toISOString()} className="min-w-[3.5rem] text-center">
                        {format(day, "d")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedProjectId ? (
                    <TableRow>
                      <TableCell colSpan={projectDays.length + 1} className="text-center text-sm text-muted-foreground">
                        Select a project to view its assigned vehicles.
                      </TableCell>
                    </TableRow>
                  ) : projectVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={projectDays.length + 1} className="text-center text-sm text-muted-foreground">
                        No vehicles are assigned to this project.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectVehicles.map((assignment) => (
                      <TableRow key={assignment.vehicle.id}>
                        <TableCell className="whitespace-nowrap font-medium align-top">
                          <div className="flex flex-col">
                            <span>
                              {assignment.vehicle.make} {assignment.vehicle.model}
                            </span>
                            <span className="text-xs text-muted-foreground">Plate: {assignment.vehicle.licensePlate}</span>
                          </div>
                        </TableCell>
                        {projectDays.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const existing = projectAttendanceByVehicleDate[assignment.vehicle.id]?.[dateStr];
                          const baseChecked = existing?.status === "present";
                          const overrideChecked = projectOverrides[assignment.vehicle.id]?.[dateStr];
                          const checked = overrideChecked ?? baseChecked;
                          const isFuture = isAfter(day, today);
                          const disabled =
                            isFuture || existing?.isPaid || projectAttendanceSaveMutation.isPending || !canManageProjectAttendance;

                          const statusLabel = existing?.isPaid
                            ? "Paid"
                            : checked
                              ? "Present"
                              : existing?.status
                                ? existing.status.charAt(0).toUpperCase() + existing.status.slice(1)
                                : null;

                          return (
                            <TableCell key={dateStr} className="text-center align-middle">
                              <div className="flex flex-col items-center gap-1">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    handleProjectCheckboxChange(assignment.vehicle.id, dateStr, value === true)
                                  }
                                  disabled={disabled}
                                  aria-label={`Mark ${assignment.vehicle.licensePlate} present on ${format(day, "MMM dd")}`}
                                />
                                {statusLabel ? (
                                  <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
                                ) : null}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {projectAttendanceLoading && (
              <div className="border-t p-3 text-sm text-muted-foreground">Loading attendance...</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
