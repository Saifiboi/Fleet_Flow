import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAssignments, useVehicleAttendance, useVehicleAttendanceSummary } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Select as UiSelect,
  SelectTrigger as UiSelectTrigger,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectValue as UiSelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
  startOfToday,
  isBefore,
  isAfter,
} from "date-fns";
import type { AssignmentWithDetails, VehicleAttendanceWithVehicle } from "@shared/schema";

function getDaysForMonth(date = new Date()) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

type DaySelectionState = {
  selected: boolean;
  status: string;
  note?: string;
  locked?: boolean;
  lockedProjectName?: string;
  lockedStatus?: string;
  lockedReason?: "cross-project" | "paid";
};

const UNASSIGNED_SUMMARY_KEY = "unassigned";

export default function Attendance() {
  const { data: assignments = [] } = useAssignments();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>("attendance");
  const days = useMemo(() => getDaysForMonth(selectedMonth), [selectedMonth]);
  const [selectedDays, setSelectedDays] = useState<Record<string, DaySelectionState>>({});
  const [bulkStatus, setBulkStatus] = useState<string>("present");
  const [rangeStart, setRangeStart] = useState<string | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<string | undefined>(undefined);
  const [summaryProjectFilter, setSummaryProjectFilter] = useState<string>("all");
  const [summaryStartDate, setSummaryStartDate] = useState<string>("");
  const [summaryEndDate, setSummaryEndDate] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageAttendance = isAdmin;
  const today = useMemo(() => startOfToday(), []);
  const maxMonth = useMemo(() => startOfMonth(today), [today]);

  const selectedAssignment = useMemo(
    () => assignments.find((a: AssignmentWithDetails) => a.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const selectedVehicleId = selectedAssignment?.vehicle.id ?? null;

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useVehicleAttendance({
    vehicleId: selectedVehicleId ?? undefined,
  });

  const projectAttendanceRecords = useMemo(() => {
    if (!selectedAssignment?.projectId) {
      return attendanceRecords.filter((record) => !record.projectId);
    }
    return attendanceRecords.filter((record) => record.projectId === selectedAssignment.projectId);
  }, [attendanceRecords, selectedAssignment?.projectId]);

  const crossProjectAttendanceByDate = useMemo(() => {
    const map: Record<string, VehicleAttendanceWithVehicle> = {};
    attendanceRecords.forEach((record) => {
      const matchesSelectedProject = selectedAssignment?.projectId
        ? record.projectId === selectedAssignment.projectId
        : !record.projectId;
      if (!matchesSelectedProject && record.status === "present") {
        if (!map[record.attendanceDate] || map[record.attendanceDate].createdAt < record.createdAt) {
          map[record.attendanceDate] = record;
        }
      }
    });
    return map;
  }, [attendanceRecords, selectedAssignment?.projectId]);

  const attendanceByDate = useMemo(() => {
    const map: Record<string, VehicleAttendanceWithVehicle> = {};
    projectAttendanceRecords.forEach((record) => {
      const recordDate = parseISO(record.attendanceDate);
      if (isSameMonth(recordDate, selectedMonth)) {
        map[record.attendanceDate] = record;
      }
    });
    return map;
  }, [projectAttendanceRecords, selectedMonth]);

  const summaryProjectOptions = useMemo(() => {
    if (!selectedVehicleId) {
      return [] as Array<{ id: string | null; name: string | null }>;
    }

    const map = new Map<string | null, { id: string | null; name: string | null }>();

    assignments.forEach((assignment: AssignmentWithDetails) => {
      if (assignment.vehicle.id === selectedVehicleId) {
        map.set(assignment.project.id, { id: assignment.project.id, name: assignment.project.name });
      }
    });

    attendanceRecords.forEach((record) => {
      const key = record.projectId ?? null;
      if (!map.has(key)) {
        map.set(key, { id: key, name: record.project?.name ?? "Unassigned" });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const nameA = (a.name ?? "Unassigned").toLowerCase();
      const nameB = (b.name ?? "Unassigned").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [assignments, attendanceRecords, selectedVehicleId]);

  const summaryRangeError = useMemo(() => {
    if (summaryStartDate && summaryEndDate && summaryStartDate > summaryEndDate) {
      return "Start date must be on or before end date.";
    }
    return null;
  }, [summaryStartDate, summaryEndDate]);

  const summaryQueryParams = useMemo<{
    vehicleId?: string;
    projectId?: string | null;
    startDate?: string;
    endDate?: string;
  }>(() => {
    if (!selectedVehicleId || summaryRangeError) {
      return { vehicleId: undefined };
    }

    const params: {
      vehicleId?: string;
      projectId?: string | null;
      startDate?: string;
      endDate?: string;
    } = {
      vehicleId: selectedVehicleId,
    };

    if (summaryProjectFilter === UNASSIGNED_SUMMARY_KEY) {
      params.projectId = null;
    } else if (summaryProjectFilter !== "all") {
      params.projectId = summaryProjectFilter;
    }

    if (summaryStartDate) {
      params.startDate = summaryStartDate;
    }

    if (summaryEndDate) {
      params.endDate = summaryEndDate;
    }

    return params;
  }, [selectedVehicleId, summaryProjectFilter, summaryStartDate, summaryEndDate, summaryRangeError]);

  const { data: summaryData = [], isLoading: summaryLoading } = useVehicleAttendanceSummary(summaryQueryParams);

  const summaryStatuses = useMemo(() => {
    const counts = new Set<string>();
    summaryData.forEach((item) => {
      Object.keys(item.statusCounts).forEach((status) => counts.add(status));
    });
    const defaultOrder = ["present", "standby", "off", "maintenance"];
    const ordered = Array.from(counts).sort((a, b) => {
      const aIndex = defaultOrder.indexOf(a);
      const bIndex = defaultOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b);
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    return ordered.length > 0 ? ordered : defaultOrder;
  }, [summaryData]);

  const summaryTotals = useMemo(() => {
    const totals: { totalDays: number; statusCounts: Record<string, number> } = {
      totalDays: 0,
      statusCounts: {},
    };

    summaryData.forEach((item) => {
      totals.totalDays += item.totalDays;
      Object.entries(item.statusCounts).forEach(([status, count]) => {
        totals.statusCounts[status] = (totals.statusCounts[status] ?? 0) + count;
      });
    });

    return totals;
  }, [summaryData]);

  const summaryHasFilters = useMemo(
    () => summaryProjectFilter !== "all" || !!summaryStartDate || !!summaryEndDate,
    [summaryProjectFilter, summaryStartDate, summaryEndDate]
  );

  const handleResetSummaryFilters = useCallback(() => {
    setSummaryProjectFilter("all");
    setSummaryStartDate("");
    setSummaryEndDate("");
  }, []);

  const formatSummaryRange = useCallback((first: string | null, last: string | null) => {
    if (first && last) {
      if (first === last) {
        return format(parseISO(first), "MMM dd, yyyy");
      }
      return `${format(parseISO(first), "MMM dd, yyyy")} – ${format(parseISO(last), "MMM dd, yyyy")}`;
    }

    if (first) {
      return format(parseISO(first), "MMM dd, yyyy");
    }

    if (last) {
      return format(parseISO(last), "MMM dd, yyyy");
    }

    return "—";
  }, []);

  const defaultDayStates = useMemo(() => {
    const map: Record<string, DaySelectionState> = {};
    days.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const existingRecord = attendanceByDate[dateStr];
      const crossProjectRecord = crossProjectAttendanceByDate[dateStr];
      const isPaid = existingRecord?.isPaid ?? false;
      const isCrossProjectLocked = !!crossProjectRecord;
      const lockedReason = isPaid ? "paid" : isCrossProjectLocked ? "cross-project" : undefined;
      const isLocked = isPaid || isCrossProjectLocked;
      map[dateStr] = {
        selected: !isLocked && !!existingRecord && !isAfter(d, today),
        status: existingRecord ? existingRecord.status : "present",
        note: existingRecord?.notes ?? "",
        locked: isLocked,
        lockedProjectName:
          lockedReason === "cross-project"
            ? crossProjectRecord?.project?.name || crossProjectRecord?.projectId || undefined
            : undefined,
        lockedStatus: lockedReason === "cross-project" ? crossProjectRecord?.status : undefined,
        lockedReason,
      };
    });
    return map;
  }, [attendanceByDate, crossProjectAttendanceByDate, days, today]);

  const dayStates = useMemo(() => {
    const map: Record<string, DaySelectionState> = {};
    days.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const base = defaultDayStates[dateStr] ?? { selected: false, status: "present", note: "" };
      const override = selectedDays[dateStr];
      map[dateStr] = override ? { ...base, ...override } : base;
    });
    return map;
  }, [days, defaultDayStates, selectedDays]);

  const nonFutureDays = useMemo(() => days.filter((d) => !isAfter(d, today)), [days, today]);

  const { selectableCount, selectedCount } = useMemo(() => {
    let selectable = 0;
    let selectedTotal = 0;
    nonFutureDays.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const state = dayStates[dateStr];
      if (state?.locked) {
        return;
      }
      selectable += 1;
      if (state?.selected) {
        selectedTotal += 1;
      }
    });
    return { selectableCount: selectable, selectedCount: selectedTotal };
  }, [dayStates, nonFutureDays]);

  const allSelected = selectableCount > 0 && selectedCount === selectableCount;
  const partiallySelected = selectedCount > 0 && selectedCount < selectableCount;
  const isViewingCurrentMonth = useMemo(() => isSameMonth(selectedMonth, maxMonth), [selectedMonth, maxMonth]);

  const deletableSelectedCount = useMemo(() => {
    let count = 0;
    days.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const state = dayStates[dateStr];
      if (state?.selected && !state.locked && attendanceByDate[dateStr]) {
        count += 1;
      }
    });
    return count;
  }, [attendanceByDate, dayStates, days]);

  useEffect(() => {
    // reset selected days when month or assignment changes
    setSelectedDays({});
  }, [selectedMonth, selectedAssignmentId]);

  useEffect(() => {
    setSummaryProjectFilter("all");
    setSummaryStartDate("");
    setSummaryEndDate("");
  }, [selectedVehicleId]);

  useEffect(() => {
    if (nonFutureDays.length === 0) {
      setRangeStart(undefined);
      setRangeEnd(undefined);
      return;
    }

    const first = format(nonFutureDays[0], "yyyy-MM-dd");
    const last = format(nonFutureDays[nonFutureDays.length - 1], "yyyy-MM-dd");
    setRangeStart(first);
    setRangeEnd(last);
  }, [nonFutureDays, selectedMonth]);

  useEffect(() => {
    if (!selectedAssignment?.startDate) return;

    const assignmentStart = startOfMonth(parseISO(selectedAssignment.startDate));
    setSelectedMonth((current) => {
      let next = startOfMonth(current);
      if (isBefore(next, assignmentStart)) {
        next = assignmentStart;
      }
      if (isAfter(next, maxMonth)) {
        next = maxMonth;
      }
      return next;
    });
  }, [selectedAssignment, maxMonth]);

  useEffect(() => {
    setSelectedMonth((current) => {
      if (isAfter(current, maxMonth)) {
        return maxMonth;
      }
      return startOfMonth(current);
    });
  }, [maxMonth]);

  const parseJsonResponse = useCallback(
    async <T,>(res: Response, fallbackErrorMessage: string, emptyBodyValue: T) => {
      const text = await res.text();
      if (!text) {
        return emptyBodyValue;
      }

      try {
        return JSON.parse(text) as T;
      } catch (err) {
        throw new Error(text || fallbackErrorMessage);
      }
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: async (
      payloads: Array<{
        vehicleId: string;
        projectId?: string | null;
        attendanceDate: string;
        status: string;
        notes?: string;
      }>
    ) => {
      // submit payloads in a single batch request
      const res = await apiRequest("POST", "/api/vehicle-attendance/batch", payloads);
      return parseJsonResponse<any[]>(res, "Server returned non-JSON response", []);
    },
    onSuccess: (created: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-attendance"] });
      const count = Array.isArray(created) ? created.length : 0;
      toast({ title: "Attendance saved", description: `${count} records saved.` });
      setSelectedDays({});
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save attendance", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payloads: Array<{ vehicleId: string; projectId?: string | null; attendanceDate: string }>) => {
      const res = await apiRequest("POST", "/api/vehicle-attendance/delete", payloads);
      return parseJsonResponse<any[]>(res, "Server returned non-JSON response", []);
    },
    onSuccess: (deleted: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-attendance"] });
      const count = Array.isArray(deleted) ? deleted.length : 0;
      toast({ title: "Attendance deleted", description: `${count} records removed.` });
      setSelectedDays({});
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete attendance", variant: "destructive" });
    },
  });

  const handleToggleDay = (dateStr: string) => {
    if (!canManageAttendance) return;
    const defaultState = defaultDayStates[dateStr];
    if (!defaultState) return;

    setSelectedDays((prev) => {
      const current = prev[dateStr];
      const merged = current ? { ...defaultState, ...current } : defaultState;
      if (merged.locked) {
        return prev;
      }
      const nextSelected = !merged.selected;
      return {
        ...prev,
        [dateStr]: {
          ...merged,
          selected: nextSelected,
        },
      };
    });
  };

  const handleStatusChange = (dateStr: string, status: string) => {
    if (!canManageAttendance) return;
    const defaultState = defaultDayStates[dateStr];
    if (!defaultState) return;

    setSelectedDays((prev) => {
      const current = prev[dateStr];
      const merged = current ? { ...defaultState, ...current } : defaultState;
      if (merged.locked) {
        return prev;
      }
      return {
        ...prev,
        [dateStr]: {
          ...merged,
          selected: merged.selected ?? defaultState.selected,
          status,
        },
      };
    });
  };

  const handleNoteChange = (dateStr: string, note: string) => {
    if (!canManageAttendance) return;
    const defaultState = defaultDayStates[dateStr];
    if (!defaultState) return;

    setSelectedDays((prev) => {
      const current = prev[dateStr];
      const merged = current ? { ...defaultState, ...current } : defaultState;
      if (merged.locked) {
        return prev;
      }
      return {
        ...prev,
        [dateStr]: {
          ...merged,
          selected: merged.selected ?? defaultState.selected,
          note,
        },
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!canManageAttendance) return;
    if (nonFutureDays.length === 0) return;

    setSelectedDays((prev) => {
      const next = { ...prev };
      nonFutureDays.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const defaultState = defaultDayStates[dateStr];
        if (!defaultState) return;
        const current = prev[dateStr];
        const merged = current ? { ...defaultState, ...current } : defaultState;
        if (merged.locked) {
          next[dateStr] = merged;
          return;
        }
        next[dateStr] = {
          ...merged,
          selected: checked,
        };
      });
      return next;
    });
  };

  const applyStatusToDates = (dates: Date[], status: string) => {
    if (!canManageAttendance) return;
    if (dates.length === 0) return;

    setSelectedDays((prev) => {
      const next = { ...prev };
      dates.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const defaultState = defaultDayStates[dateStr];
        if (!defaultState) return;
        const current = prev[dateStr];
        const merged = current ? { ...defaultState, ...current } : defaultState;
        if (merged.locked) {
          next[dateStr] = merged;
          return;
        }
        next[dateStr] = {
          ...merged,
          status,
          selected: true,
        };
        if (status === "present") {
          next[dateStr].note = "";
        }
      });
      return next;
    });
  };

  const handleApplyStatusToAll = () => {
    if (!canManageAttendance) return;
    if (!selectedAssignment) {
      return toast({
        title: "Select assignment",
        description: "Choose an assignment before applying attendance.",
        variant: "destructive",
      });
    }

    if (nonFutureDays.length === 0) {
      return toast({
        title: "No days to update",
        description: "There are no past days in this month to update.",
        variant: "destructive",
      });
    }

    applyStatusToDates(nonFutureDays, bulkStatus);
  };

  const handleApplyStatusToRange = () => {
    if (!canManageAttendance) return;
    if (!selectedAssignment) {
      return toast({
        title: "Select assignment",
        description: "Choose an assignment before applying attendance.",
        variant: "destructive",
      });
    }

    if (!rangeStart || !rangeEnd) {
      return toast({
        title: "Select a range",
        description: "Please choose both start and end dates to apply attendance.",
        variant: "destructive",
      });
    }

    const startDate = parseISO(rangeStart);
    const endDate = parseISO(rangeEnd);
    if (isAfter(startDate, endDate)) {
      return toast({
        title: "Invalid range",
        description: "The start date must be before the end date.",
        variant: "destructive",
      });
    }

    const targetDates = nonFutureDays.filter(
      (d) => !isBefore(d, startDate) && !isAfter(d, endDate)
    );

    if (targetDates.length === 0) {
      return toast({
        title: "No days to update",
        description: "The selected range does not contain any past days.",
        variant: "destructive",
      });
    }

    applyStatusToDates(targetDates, bulkStatus);
  };

  const handleRangeStartChange = (value: string) => {
    if (!canManageAttendance) return;
    setRangeStart(value);
    setRangeEnd((prevEnd) => {
      if (!prevEnd) return value;
      const prevEndDate = parseISO(prevEnd);
      const nextStartDate = parseISO(value);
      if (isBefore(prevEndDate, nextStartDate)) {
        return value;
      }
      return prevEnd;
    });
  };

  const handleRangeEndChange = (value: string) => {
    if (!canManageAttendance) return;
    setRangeEnd(value);
    setRangeStart((prevStart) => {
      if (!prevStart) return value;
      const prevStartDate = parseISO(prevStart);
      const nextEndDate = parseISO(value);
      if (isAfter(prevStartDate, nextEndDate)) {
        return value;
      }
      return prevStart;
    });
  };

  const handleSubmit = () => {
    if (!canManageAttendance) return;
    if (!selectedAssignmentId) return toast({ title: "Select vehicle", description: "Please select an assigned vehicle first.", variant: "destructive" });
    if (!selectedAssignment) {
      return toast({ title: "Invalid assignment", description: "Selected assignment not found.", variant: "destructive" });
    }

    const payloads = Object.entries(selectedDays)
      .filter(([, v]) => v.selected && !v.locked)
      .map(([date, v]) => ({ vehicleId: selectedAssignment.vehicle.id, projectId: selectedAssignment.projectId || null, attendanceDate: date, status: v.status || 'present', notes: v.note ? v.note : undefined }));

    if (payloads.length === 0) return toast({ title: "No days selected", description: "Please select at least one day to mark attendance.", variant: "destructive" });

    saveMutation.mutate(payloads);
  };

  const handleDeleteSelected = () => {
    if (!canManageAttendance)
      return toast({
        title: "Access denied",
        description: "You don't have permission to modify attendance records.",
        variant: "destructive",
      });
    if (!selectedAssignmentId)
      return toast({
        title: "Select vehicle",
        description: "Please select an assigned vehicle first.",
        variant: "destructive",
      });
    if (!selectedAssignment) {
      return toast({ title: "Invalid assignment", description: "Selected assignment not found.", variant: "destructive" });
    }
    if (!isViewingCurrentMonth) {
      return toast({
        title: "Current month only",
        description: "Attendance can only be deleted for the current month.",
        variant: "destructive",
      });
    }

    const payloads = days
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((dateStr) => {
        const state = dayStates[dateStr];
        return state?.selected && !state.locked && !!attendanceByDate[dateStr];
      })
      .map((dateStr) => ({
        vehicleId: selectedAssignment.vehicle.id,
        projectId: selectedAssignment.projectId ?? null,
        attendanceDate: dateStr,
      }));

    if (payloads.length === 0) {
      return toast({
        title: "No attendance selected",
        description: "Select marked days from this month to delete.",
        variant: "destructive",
      });
    }

    deleteMutation.mutate(payloads);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance" className="space-y-6">
          <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Vehicle Attendance</CardTitle>
              {isAdmin ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <ConfirmDialog
                    title="Delete attendance?"
                    description="This will permanently remove the selected attendance records. This action cannot be undone."
                    confirmText="Delete"
                    trigger={
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        disabled={
                          deleteMutation.isPending ||
                          !selectedAssignment ||
                          deletableSelectedCount === 0 ||
                          !isViewingCurrentMonth
                        }
                      >
                        Delete Selected
                      </Button>
                    }
                    onConfirm={handleDeleteSelected}
                  />
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleSubmit}
                    disabled={saveMutation.isPending || !selectedAssignment}
                  >
                    Save Attendance
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground sm:text-right">
                  Attendance records are read-only for your account.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-80">
                <Select value={selectedAssignmentId ?? "none"} onValueChange={(v) => setSelectedAssignmentId(v === "none" ? null : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select assigned vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {assignments.map((assignment: AssignmentWithDetails) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.vehicle.make} {assignment.vehicle.model} - {assignment.vehicle.licensePlate} ({assignment.project?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 sm:mt-0 flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!selectedAssignment?.startDate) {
                      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
                      return;
                    }

                    const minMonth = startOfMonth(parseISO(selectedAssignment.startDate));
                    if (isAfter(selectedMonth, minMonth)) {
                      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
                    }
                  }}
                  disabled={(() => {
                    if (!selectedAssignment?.startDate) return false;
                    const minMonth = startOfMonth(parseISO(selectedAssignment.startDate));
                    return !isAfter(selectedMonth, minMonth);
                  })()}
                >
                  Prev
                </Button>
                <div className="px-3 py-2 text-sm font-medium">{format(selectedMonth, "MMMM yyyy")}</div>
                <Button
                  size="sm"
                  onClick={() => {
                    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
                    if (!isAfter(nextMonth, maxMonth)) {
                      setSelectedMonth(nextMonth);
                    }
                  }}
                  disabled={!isBefore(selectedMonth, maxMonth)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedAssignment ? (
            <div className="space-y-4">
              {isAdmin ? (
                <div className="flex flex-col gap-3 rounded-md border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                        onCheckedChange={(value) => handleSelectAll(value === true)}
                        disabled={nonFutureDays.length === 0 || selectableCount === 0}
                        id="select-all-days"
                      />
                      <label htmlFor="select-all-days" className="text-sm font-medium">
                        Select all available days
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Set status</span>
                      <UiSelect value={bulkStatus} onValueChange={setBulkStatus}>
                        <UiSelectTrigger className="w-36">
                          <UiSelectValue />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem value="present">Present</UiSelectItem>
                          <UiSelectItem value="off">Off</UiSelectItem>
                          <UiSelectItem value="standby">Standby</UiSelectItem>
                          <UiSelectItem value="maintenance">Maintenance</UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyStatusToAll}
                        disabled={nonFutureDays.length === 0 || selectableCount === 0}
                      >
                        Apply to all days
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Date range</span>
                      <UiSelect
                        value={rangeStart ?? undefined}
                        onValueChange={handleRangeStartChange}
                        disabled={nonFutureDays.length === 0}
                      >
                        <UiSelectTrigger className="w-32">
                          <UiSelectValue placeholder="Start date" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          {nonFutureDays.map((day) => {
                            const value = format(day, "yyyy-MM-dd");
                            return (
                              <UiSelectItem key={value} value={value}>
                                {format(day, "MMM dd")}
                              </UiSelectItem>
                            );
                          })}
                        </UiSelectContent>
                      </UiSelect>
                      <span className="text-sm text-muted-foreground">to</span>
                      <UiSelect
                        value={rangeEnd ?? undefined}
                        onValueChange={handleRangeEndChange}
                        disabled={nonFutureDays.length === 0}
                      >
                        <UiSelectTrigger className="w-32">
                          <UiSelectValue placeholder="End date" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          {nonFutureDays.map((day) => {
                            const value = format(day, "yyyy-MM-dd");
                            return (
                              <UiSelectItem key={value} value={value}>
                                {format(day, "MMM dd")}
                              </UiSelectItem>
                            );
                          })}
                        </UiSelectContent>
                      </UiSelect>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleApplyStatusToRange}
                        disabled={nonFutureDays.length === 0 || !rangeStart || !rangeEnd}
                      >
                        Apply to range
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      {selectedCount} of {selectableCount} days selected
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  Review the attendance history for your assigned vehicle below. Contact an administrator for any updates.
                </div>
              )}
              <div className="max-h-[55vh] overflow-auto">
                {attendanceLoading && (
                  <div className="p-3 text-sm text-muted-foreground">Loading previous attendance...</div>
                )}
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Previous Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{isAdmin ? "Note" : "Notes"}</TableHead>
                    {isAdmin && <TableHead>Mark</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const existingRecord = attendanceByDate[dateStr];
                    const defaultState = defaultDayStates[dateStr];
                    const state = dayStates[dateStr] ?? defaultState;
                    const isFutureDate = isAfter(d, today);
                    const isCurrentOrPastDate = !isFutureDate;
                    const isLocked = state?.locked;
                    const lockedReason = state?.lockedReason;
                    const statusBadgeClass = (() => {
                      switch (existingRecord?.status) {
                        case "present":
                          return "bg-green-100 text-green-800 border-green-200";
                        case "standby":
                          return "bg-yellow-100 text-yellow-800 border-yellow-200";
                        case "off":
                          return "bg-red-100 text-red-800 border-red-200";
                        default:
                          return "bg-slate-100 text-slate-800 border-slate-200";
                      }
                    })();
                    const formatStatusLabel = (status: string) =>
                      status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
                    return (
                      <TableRow key={dateStr}>
                        <TableCell>{format(d, "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(d, "EEEE")}</TableCell>
                        <TableCell>{selectedAssignment?.project?.name ?? '-'}</TableCell>
                        <TableCell>
                          {existingRecord && isCurrentOrPastDate ? (
                            <div className="space-y-1">
                              <Badge className={statusBadgeClass}>{formatStatusLabel(existingRecord.status)}</Badge>
                              {existingRecord.notes ? (
                                <div className="text-xs text-muted-foreground">{existingRecord.notes}</div>
                              ) : null}
                              {existingRecord.isPaid ? (
                                <div className="text-xs text-muted-foreground">
                                  Included in a payment. Attendance cannot be modified.
                                </div>
                              ) : null}
                            </div>
                          ) : isLocked && lockedReason === "cross-project" && isCurrentOrPastDate ? (
                            <div className="space-y-1">
                              <Badge className="bg-slate-100 text-slate-800 border-slate-200">Reserved for another project</Badge>
                              <div className="text-xs text-muted-foreground">
                                {state.lockedProjectName ? `Attendance already marked for ${state.lockedProjectName}.` : "Attendance already marked for another project."}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isCurrentOrPastDate ? "No record" : "Upcoming"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {existingRecord && isCurrentOrPastDate ? (
                            <div className="space-y-1">
                              <Badge
                                className={
                                  existingRecord.isPaid
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-slate-100 text-slate-800 border-slate-200"
                                }
                              >
                                {existingRecord.isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                              {existingRecord.isPaid ? (
                                <div className="text-xs text-muted-foreground">Paid attendance cannot be edited or deleted.</div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Pending payment.</div>
                              )}
                            </div>
                          ) : isLocked && lockedReason === "cross-project" && isCurrentOrPastDate ? (
                            <div className="space-y-1">
                              <Badge className="bg-slate-100 text-slate-800 border-slate-200">Reserved</Badge>
                              <div className="text-xs text-muted-foreground">
                                {state.lockedProjectName ? `Attendance already marked for ${state.lockedProjectName}.` : "Attendance already marked for another project."}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isCurrentOrPastDate ? "No record" : "Upcoming"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <UiSelect
                              value={state.status}
                              onValueChange={(v) => handleStatusChange(dateStr, v)}
                              disabled={isFutureDate || isLocked}
                            >
                              <UiSelectTrigger className="w-36" disabled={isFutureDate || isLocked}>
                                <UiSelectValue />
                              </UiSelectTrigger>
                              <UiSelectContent>
                                <UiSelectItem value="present">Present</UiSelectItem>
                                <UiSelectItem value="off">Off</UiSelectItem>
                                <UiSelectItem value="standby">Standby</UiSelectItem>
                                <UiSelectItem value="maintenance">Maintenance</UiSelectItem>
                              </UiSelectContent>
                            </UiSelect>
                          ) : (
                            <span className="text-sm">
                              {existingRecord
                                ? formatStatusLabel(existingRecord.status)
                                : isFutureDate
                                  ? "Upcoming"
                                  : "Not marked"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            state.status !== "present" && !isFutureDate && !isLocked && (
                              <Input
                                value={state.note || ""}
                                onChange={(e) => handleNoteChange(dateStr, e.target.value)}
                                placeholder="Note (optional)"
                              />
                            )
                          ) : existingRecord?.notes ? (
                            <span className="text-sm">{existingRecord.notes}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No notes</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={!!state.selected}
                              onCheckedChange={() => {
                                if (!isFutureDate && !isLocked) {
                                  handleToggleDay(dateStr);
                                }
                              }}
                              disabled={isFutureDate || isLocked}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Please select an assigned vehicle to view the calendar</div>
          )}
        </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1">
                <CardTitle>Attendance Summary</CardTitle>
                {selectedAssignment ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedAssignment.vehicle.make} {selectedAssignment.vehicle.model} · {selectedAssignment.vehicle.licensePlate}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select an assignment to view the attendance summary.</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedAssignment ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Project</span>
                        <Select value={summaryProjectFilter} onValueChange={setSummaryProjectFilter} disabled={!selectedVehicleId}>
                          <SelectTrigger className="w-full sm:w-56">
                            <SelectValue placeholder="All projects" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All projects</SelectItem>
                            {summaryProjectOptions.map((option) => (
                              <SelectItem
                                key={option.id ?? UNASSIGNED_SUMMARY_KEY}
                                value={option.id ?? UNASSIGNED_SUMMARY_KEY}
                              >
                                {option.name ?? "Unassigned"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Start date</span>
                        <Input
                          type="date"
                          value={summaryStartDate}
                          onChange={(event) => setSummaryStartDate(event.target.value)}
                          max={format(today, "yyyy-MM-dd")}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">End date</span>
                        <Input
                          type="date"
                          value={summaryEndDate}
                          onChange={(event) => setSummaryEndDate(event.target.value)}
                          min={summaryStartDate || undefined}
                          max={format(today, "yyyy-MM-dd")}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetSummaryFilters}
                        disabled={!summaryHasFilters}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </div>
                  {summaryRangeError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {summaryRangeError}
                    </div>
                  ) : summaryLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading summary...</div>
                  ) : summaryData.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No attendance records found for this selection.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Date coverage</TableHead>
                            <TableHead className="text-right">Marked days</TableHead>
                            {summaryStatuses.map((status) => (
                              <TableHead key={status} className="text-right">
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summaryData.map((item, index) => {
                            const rowKey = item.projectId ?? `${UNASSIGNED_SUMMARY_KEY}-${index}`;
                            return (
                              <TableRow key={rowKey}>
                                <TableCell className="font-medium">{item.projectName ?? "Unassigned"}</TableCell>
                                <TableCell>{formatSummaryRange(item.firstAttendanceDate, item.lastAttendanceDate)}</TableCell>
                                <TableCell className="text-right font-medium">{item.totalDays}</TableCell>
                                {summaryStatuses.map((status) => (
                                  <TableCell key={`${rowKey}-${status}`} className="text-right">
                                    {item.statusCounts[status] ?? 0}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="font-semibold">Total</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell className="text-right font-semibold">{summaryTotals.totalDays}</TableCell>
                            {summaryStatuses.map((status) => (
                              <TableCell key={`total-${status}`} className="text-right font-semibold">
                                {summaryTotals.statusCounts[status] ?? 0}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Select an assignment to see a project summary for the vehicle.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
