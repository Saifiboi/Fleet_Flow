import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAssignments, useVehicleAttendance } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select as UiSelect, SelectTrigger as UiSelectTrigger, SelectContent as UiSelectContent, SelectItem as UiSelectItem, SelectValue as UiSelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, startOfToday, isBefore } from "date-fns";
import type { AssignmentWithDetails, VehicleAttendanceWithVehicle } from "@shared/schema";

function getDaysForMonth(date = new Date()) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

export default function Attendance() {
  const { data: assignments = [] } = useAssignments();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const days = useMemo(() => getDaysForMonth(selectedMonth), [selectedMonth]);
  const [selectedDays, setSelectedDays] = useState<Record<string, { selected: boolean; status: string; note?: string }>>({});
  const { toast } = useToast();
  const today = useMemo(() => startOfToday(), []);

  const selectedAssignment = useMemo(
    () => assignments.find((a: AssignmentWithDetails) => a.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useVehicleAttendance({
    vehicleId: selectedAssignment?.vehicle.id,
  });

  const attendanceByDate = useMemo(() => {
    const map: Record<string, VehicleAttendanceWithVehicle> = {};
    attendanceRecords.forEach((record) => {
      const recordDate = parseISO(record.attendanceDate);
      if (isSameMonth(recordDate, selectedMonth)) {
        map[record.attendanceDate] = record;
      }
    });
    return map;
  }, [attendanceRecords, selectedMonth]);

  useEffect(() => {
    // reset selected days when month or assignment changes
    setSelectedDays({});
  }, [selectedMonth, selectedAssignmentId]);

  const mutation = useMutation({
    mutationFn: async (payloads: Array<{ vehicleId: string; projectId?: string | null; attendanceDate: string; status: string }>) => {
      // submit payloads in a single batch request
      const res = await apiRequest("POST", "/api/vehicle-attendance/batch", payloads);
      // Some servers may return non-JSON (HTML) on error; try JSON first, fall back to text
      try {
        const json = await res.json();
        return json as any[];
      } catch (err) {
        const text = await res.text();
        // throw a clearer error message that the UI can show
        throw new Error(text || 'Server returned non-JSON response');
      }
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

  const handleToggleDay = (dateStr: string, defaultStatus: string, defaultNote?: string) => {
    setSelectedDays((s) => ({
      ...s,
      [dateStr]: {
        selected: !s[dateStr]?.selected,
        status: s[dateStr]?.status || defaultStatus,
        note: s[dateStr]?.note ?? defaultNote,
      },
    }));
  };

  const handleStatusChange = (dateStr: string, status: string) => {
    setSelectedDays((s) => ({ ...s, [dateStr]: { selected: s[dateStr]?.selected || false, status, note: s[dateStr]?.note } }));
  };

  const handleNoteChange = (dateStr: string, note: string) => {
    setSelectedDays((s) => ({ ...s, [dateStr]: { selected: s[dateStr]?.selected || false, status: s[dateStr]?.status || 'present', note } }));
  };

  const handleSubmit = () => {
    if (!selectedAssignmentId) return toast({ title: "Select vehicle", description: "Please select an assigned vehicle first.", variant: "destructive" });
    if (!selectedAssignment) {
      return toast({ title: "Invalid assignment", description: "Selected assignment not found.", variant: "destructive" });
    }

    const payloads = Object.entries(selectedDays)
      .filter(([, v]) => v.selected)
      .map(([date, v]) => ({ vehicleId: selectedAssignment.vehicle.id, projectId: selectedAssignment.projectId || null, attendanceDate: date, status: v.status || 'present', notes: v.note ? v.note : undefined }));

    if (payloads.length === 0) return toast({ title: "No days selected", description: "Please select at least one day to mark attendance.", variant: "destructive" });

    mutation.mutate(payloads);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vehicle Attendance</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 w-full">
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
                <Button size="sm" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>Prev</Button>
                <div className="px-3 py-2 text-sm font-medium">{format(selectedMonth, "MMMM yyyy")}</div>
                <Button size="sm" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>Next</Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedAssignment ? (
            <div className="max-h-[55vh] overflow-auto">
              {attendanceLoading && (
                <div className="p-3 text-sm text-muted-foreground">Loading previous attendance...</div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Previous Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Mark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const existingRecord = attendanceByDate[dateStr];
                    const defaultState = {
                      selected: false,
                      status: existingRecord ? existingRecord.status : 'present',
                      note: existingRecord?.notes ?? '',
                    };
                    const state = selectedDays[dateStr] || defaultState;
                    const isPastDate = isBefore(d, today);
                    return (
                      <TableRow key={dateStr}>
                        <TableCell>{format(d, "MMM dd, yyyy")}</TableCell>
                        <TableCell>{format(d, "EEEE")}</TableCell>
                        <TableCell>
                          {existingRecord && isPastDate ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium capitalize">{existingRecord.status}</div>
                              {existingRecord.notes ? (
                                <div className="text-xs text-muted-foreground">{existingRecord.notes}</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isPastDate ? 'No record' : 'Upcoming'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <UiSelect value={state.status} onValueChange={(v) => handleStatusChange(dateStr, v)}>
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
                        </TableCell>
                        <TableCell>
                          {state.status !== 'present' && (
                            <Input value={state.note || ''} onChange={(e) => handleNoteChange(dateStr, e.target.value)} placeholder="Note (optional)" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Checkbox checked={!!state.selected} onCheckedChange={() => handleToggleDay(dateStr, state.status, state.note)} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Please select an assigned vehicle to view the calendar</div>
          )}

          {/* Desktop / tablet save button */}
          <div className="mt-4 hidden sm:flex justify-end">
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              Save Attendance
            </Button>
          </div>

          {/* Fixed mobile save button */}
          <div className="sm:hidden fixed bottom-4 left-0 right-0 px-4">
            <div className="max-w-3xl mx-auto">
              <Button className="w-full" onClick={handleSubmit} disabled={mutation.isPending}>
                Save Attendance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
