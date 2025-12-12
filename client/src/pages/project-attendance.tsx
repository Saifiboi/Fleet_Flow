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
import { cn } from "@/lib/utils";
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
  const [markUncheckedAsOff, setMarkUncheckedAsOff] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const today = useMemo(() => startOfToday(), []);
  const projectDays = useMemo(() => getDaysForMonth(projectMonth), [projectMonth]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const projectStartDate = useMemo(
    () => (selectedProject?.startDate ? parseISO(selectedProject.startDate) : null),
    [selectedProject?.startDate],
  );
  const projectMaxMonth = useMemo(() => startOfMonth(today), [today]);
  const projectMinMonth = useMemo(
    () => (projectStartDate ? startOfMonth(projectStartDate) : null),
    [projectStartDate],
  );
  const projectNonFutureDays = useMemo(
    () =>
      projectDays.filter(
        (d) => !isAfter(d, today) && (!projectStartDate || !isBefore(d, projectStartDate)),
      ),
    [projectDays, projectStartDate, today],
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

  useEffect(() => {
    setMarkUncheckedAsOff(false);
  }, [selectedProjectId, projectMonth]);

  const projectAttendanceSummary = useMemo(() => {
    if (!selectedProjectId) {
      return { totalDays: 0, markedDays: 0, unmarkedDays: 0, statusCounts: {} as Record<string, number> };
    }

    let totalDays = 0;
    let markedDays = 0;
    const statusCounts: Record<string, number> = {};

    projectVehicles.forEach((assignment) => {
      const assignmentStartDate = parseISO(assignment.startDate);
      projectNonFutureDays.forEach((day) => {
        if (isBefore(day, assignmentStartDate)) return;
        if (projectStartDate && isBefore(day, projectStartDate)) return;

        totalDays += 1;
        const dateStr = format(day, "yyyy-MM-dd");
        const record = projectAttendanceByVehicleDate[assignment.vehicle.id]?.[dateStr];
        if (record) {
          markedDays += 1;
          statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
        }
      });
    });

    return { totalDays, markedDays, unmarkedDays: totalDays - markedDays, statusCounts };
  }, [
    projectAttendanceByVehicleDate,
    projectNonFutureDays,
    projectStartDate,
    projectVehicles,
    selectedProjectId,
  ]);

  const summaryStatuses = useMemo(() => {
    const defaultOrder = ["present", "off", "standby", "maintenance"];
    const seen = new Set<string>(defaultOrder);

    Object.keys(projectAttendanceSummary.statusCounts).forEach((status) => seen.add(status));

    return Array.from(seen).sort((a, b) => {
      const aIndex = defaultOrder.indexOf(a);
      const bIndex = defaultOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [projectAttendanceSummary.statusCounts]);

  const vehicleSummaries = useMemo(() => {
    if (!selectedProjectId) return [] as Array<{
      vehicleId: string;
      vehicleLabel: string;
      licensePlate: string;
      totalDays: number;
      markedDays: number;
      unmarkedDays: number;
      statusCounts: Record<string, number>;
    }>;

    return projectVehicles.map((assignment) => {
      let totalDays = 0;
      let markedDays = 0;
      const statusCounts: Record<string, number> = {};
      const assignmentStartDate = parseISO(assignment.startDate);

      projectNonFutureDays.forEach((day) => {
        if (isBefore(day, assignmentStartDate)) return;
        if (projectStartDate && isBefore(day, projectStartDate)) return;

        totalDays += 1;
        const dateStr = format(day, "yyyy-MM-dd");
        const record = projectAttendanceByVehicleDate[assignment.vehicle.id]?.[dateStr];
        if (record) {
          markedDays += 1;
          statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
        }
      });

      return {
        vehicleId: assignment.vehicle.id,
        vehicleLabel: `${assignment.vehicle.make} ${assignment.vehicle.model}`.trim(),
        licensePlate: assignment.vehicle.licensePlate,
        totalDays,
        markedDays,
        unmarkedDays: totalDays - markedDays,
        statusCounts,
      };
    });
  }, [
    projectAttendanceByVehicleDate,
    projectNonFutureDays,
    projectStartDate,
    projectVehicles,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (!projectMinMonth) return;

    setProjectMonth((current) => {
      if (isBefore(current, projectMinMonth)) return projectMinMonth;
      return current;
    });
  }, [projectMinMonth]);

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
      const assignmentStartDate = parseISO(assignment.startDate);
      projectNonFutureDays.forEach((d) => {
        if (isBefore(d, assignmentStartDate)) return;
        const dateStr = format(d, "yyyy-MM-dd");
        const existing = projectAttendanceByVehicleDate[vehicleId]?.[dateStr];
        const baseChecked = existing?.status === "present";
        const overrideChecked = projectOverrides[vehicleId]?.[dateStr];
        const finalChecked = overrideChecked ?? baseChecked;
        const wantsOff = markUncheckedAsOff && !finalChecked;

        if (existing?.isPaid) return;
        if (finalChecked === baseChecked && !wantsOff) return;

        if (finalChecked) {
          if (existing && existing.status !== "present") {
            deletePayloads.push({ vehicleId, projectId: selectedProjectId, attendanceDate: dateStr });
          }

          createPayloads.push({
            vehicleId,
            projectId: selectedProjectId,
            attendanceDate: dateStr,
            status: "present",
          });
        } else if (wantsOff) {
          if (existing && existing.status !== "present" && existing.status !== "off") return;

          if (existing?.status === "present") {
            deletePayloads.push({ vehicleId, projectId: selectedProjectId, attendanceDate: dateStr });
          }

          createPayloads.push({
            vehicleId,
            projectId: selectedProjectId,
            attendanceDate: dateStr,
            status: "off",
          });
        } else if (existing?.status === "present") {
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
    setProjectMonth((current) => {
      const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      if (projectMinMonth && (isBefore(prev, projectMinMonth) || prev.getTime() === projectMinMonth.getTime())) {
        return projectMinMonth;
      }
      return prev;
    });
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
              <Button
                size="sm"
                variant="outline"
                onClick={handleProjectPrevMonth}
                disabled={!selectedProjectId || (projectMinMonth ? !isAfter(projectMonth, projectMinMonth) : false)}
              >
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
              <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    id="mark-off"
                    checked={markUncheckedAsOff}
                    onCheckedChange={(v) => setMarkUncheckedAsOff(v === true)}
                    disabled={projectAttendanceSaveMutation.isPending || !selectedProjectId}
                  />
                  <span className="leading-tight">Mark unchecked days as Off for all vehicles</span>
                </label>
                <Button
                  className="w-full md:w-auto"
                  onClick={handleSaveProjectAttendance}
                  disabled={projectAttendanceSaveMutation.isPending || !selectedProjectId}
                >
                  Save Attendance
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-right w-full md:w-auto">
                Attendance is read-only for your account.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">Monthly Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Totals for {format(projectMonth, "MMMM yyyy")} across this project's assigned vehicles.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Marked {projectAttendanceSummary.markedDays} of {projectAttendanceSummary.totalDays} eligible days
                {projectAttendanceSummary.totalDays > 0
                  ? ` (${Math.round((projectAttendanceSummary.markedDays / projectAttendanceSummary.totalDays) * 100)}%)`
                  : ""}
              </div>
            </div>
            {selectedProjectId && projectVehicles.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {summaryStatuses.map((status) => {
                  const count = projectAttendanceSummary.statusCounts[status] ?? 0;
                  const label = status.charAt(0).toUpperCase() + status.slice(1);
                  return (
                    <div
                      key={status}
                      className="rounded-md border bg-muted/40 px-3 py-2 text-center shadow-sm"
                    >
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-lg font-semibold">{count}</div>
                    </div>
                  );
                })}
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-center shadow-sm">
                  <div className="text-xs text-muted-foreground">Unmarked</div>
                  <div className="text-lg font-semibold">{projectAttendanceSummary.unmarkedDays}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a project with assigned vehicles to view summary.</p>
            )}
            {selectedProjectId && vehicleSummaries.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Vehicle summaries</span>
                  <span className="text-xs text-muted-foreground">Per vehicle for {format(projectMonth, "MMMM yyyy")}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {vehicleSummaries.map((summary) => (
                    <div key={summary.vehicleId} className="rounded-md border bg-muted/40 p-3 shadow-sm space-y-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold leading-tight">{summary.vehicleLabel}</div>
                        <div className="text-xs text-muted-foreground">Plate: {summary.licensePlate}</div>
                        <div className="text-xs text-muted-foreground">
                          Marked {summary.markedDays} of {summary.totalDays} eligible days
                          {summary.totalDays > 0
                            ? ` (${Math.round((summary.markedDays / summary.totalDays) * 100)}%)`
                            : ""}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {summaryStatuses.map((status) => {
                          const count = summary.statusCounts[status] ?? 0;
                          if (count === 0) return null;
                          const label = status.charAt(0).toUpperCase() + status.slice(1);
                          return (
                            <div
                              key={status}
                              className="rounded border bg-background px-2 py-1 text-center text-xs shadow-sm"
                            >
                              <div className="text-[10px] text-muted-foreground">{label}</div>
                              <div className="text-sm font-semibold">{count}</div>
                            </div>
                          );
                        })}
                        <div className="rounded border bg-background px-2 py-1 text-center text-xs shadow-sm">
                          <div className="text-[10px] text-muted-foreground">Unmarked</div>
                          <div className="text-sm font-semibold">{summary.unmarkedDays}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground md:text-base">
            Check a box to mark a vehicle as present for that date. Paid attendance and future dates cannot be changed.
            Use the toggle above to mark every unchecked day as Off across vehicles before saving.
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
                          const isBeforeProjectStart = projectStartDate && isBefore(day, projectStartDate);
                          const isBeforeAssignmentStart = isBefore(day, parseISO(assignment.startDate));
                          const existing = projectAttendanceByVehicleDate[assignment.vehicle.id]?.[dateStr];
                          const baseChecked = existing?.status === "present";
                          const overrideChecked = projectOverrides[assignment.vehicle.id]?.[dateStr];
                          const computedChecked = overrideChecked ?? baseChecked;
                          const recordedNonPresent =
                            !!existing && existing.status !== "present" && overrideChecked !== true;
                          const checkboxChecked = recordedNonPresent ? true : computedChecked;
                          const isFuture = isAfter(day, today);
                          const disabled =
                            isFuture ||
                            existing?.isPaid ||
                            projectAttendanceSaveMutation.isPending ||
                            !canManageProjectAttendance ||
                            isBeforeProjectStart ||
                            isBeforeAssignmentStart;
                          const plannedOff =
                            markUncheckedAsOff &&
                            !computedChecked &&
                            !recordedNonPresent &&
                            !existing?.isPaid &&
                            !isFuture &&
                            !isBeforeProjectStart &&
                            !isBeforeAssignmentStart;
                          const statusLabel = existing?.isPaid
                            ? "Paid"
                            : computedChecked
                              ? "Present"
                              : existing?.status
                                ? existing.status.charAt(0).toUpperCase() + existing.status.slice(1)
                                : plannedOff
                                  ? "Off"
                                  : null;
                          const statusClass = cn(
                            "text-[10px] text-muted-foreground",
                            statusLabel?.toLowerCase() === "off" ? "text-destructive" : null,
                            statusLabel === "Paid" ? "text-emerald-600" : null,
                          );
                          const showAbsentMarker =
                            markUncheckedAsOff &&
                            !computedChecked &&
                            !recordedNonPresent &&
                            !isFuture &&
                            !existing?.isPaid &&
                            !isBeforeProjectStart &&
                            !isBeforeAssignmentStart;
                          const absentMarkerSymbol = "×";
                          const absentMarkerClass = "text-destructive";
                          const absentCheckboxClass =
                            "border-destructive data-[state=unchecked]:bg-destructive/10";
                          const recordedAbsentCheckboxClass =
                            "border-destructive text-destructive data-[state=checked]:border-destructive data-[state=checked]:bg-destructive/10 data-[state=checked]:text-destructive";

                          return (
                            <TableCell key={dateStr} className="text-center align-middle">
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative">
                                  <Checkbox
                                    checked={checkboxChecked}
                                    onCheckedChange={(value) =>
                                      handleProjectCheckboxChange(assignment.vehicle.id, dateStr, value === true)
                                    }
                                    disabled={disabled}
                                    aria-label={`Mark ${assignment.vehicle.licensePlate} present on ${format(day, "MMM dd")}`}
                                    className={cn(
                                      showAbsentMarker ? absentCheckboxClass : null,
                                      recordedNonPresent ? recordedAbsentCheckboxClass : null,
                                    )}
                                  />
                                  {showAbsentMarker ? (
                                    <span
                                      className={cn(
                                        "pointer-events-none absolute inset-0 flex items-center justify-center text-lg leading-none",
                                        absentMarkerClass,
                                      )}
                                    >
                                      {absentMarkerSymbol}
                                    </span>
                                  ) : null}
                                </div>
                                {statusLabel ? <span className={statusClass}>{statusLabel}</span> : null}
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
