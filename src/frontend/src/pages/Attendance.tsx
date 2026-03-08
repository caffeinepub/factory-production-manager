import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AttendanceStatus,
  type Employee,
  getAttendanceByDate,
  getEmployees,
  markAttendance,
} from "../store";
import { formatDate, todayISO } from "../utils/exportExcel";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: "bg-success/15 text-success border-success/30",
  Absent: "bg-destructive/15 text-destructive border-destructive/30",
  HalfDay: "bg-warning/15 text-warning-foreground border-warning/30",
};

export default function Attendance() {
  const [date, setDate] = useState(todayISO());
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [employees] = useState<Employee[]>(() =>
    getEmployees().filter((e) => e.status === "Active"),
  );

  // Load attendance when date changes
  useMemo(() => {
    const records = getAttendanceByDate(date);
    const map: Record<string, AttendanceStatus> = {};
    // Default: all present
    for (const emp of employees) {
      map[emp.id] = "Present";
    }
    for (const rec of records) {
      map[rec.employeeId] = rec.status;
    }
    setAttendanceMap(map);
  }, [date, employees]);

  const setStatus = useCallback((empId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [empId]: status }));
  }, []);

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d > tomorrow) return;
    setDate(d.toISOString().slice(0, 10));
  }

  function saveAll() {
    for (const [empId, status] of Object.entries(attendanceMap)) {
      markAttendance(date, empId, status);
    }
    toast.success(`Attendance saved for ${formatDate(date)}`);
  }

  const summary = useMemo(() => {
    const values = Object.values(attendanceMap);
    return {
      present: values.filter((s) => s === "Present").length,
      absent: values.filter((s) => s === "Absent").length,
      halfDay: values.filter((s) => s === "HalfDay").length,
    };
  }, [attendanceMap]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Attendance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mark daily attendance
          </p>
        </div>
        <Button
          data-ocid="attendance.save.button"
          size="sm"
          onClick={saveAll}
          className="gap-1.5 touch-target"
        >
          <Save className="w-4 h-4" />
          Save All
        </Button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={prevDay}
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input
          data-ocid="attendance.date.input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-center font-medium"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={nextDay}
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2">
        <Badge
          className="bg-success/15 text-success border-success/30 hover:bg-success/20"
          variant="outline"
        >
          ✓ Present: {summary.present}
        </Badge>
        <Badge
          className="bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/20"
          variant="outline"
        >
          ½ Half: {summary.halfDay}
        </Badge>
        <Badge
          className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
          variant="outline"
        >
          ✗ Absent: {summary.absent}
        </Badge>
      </div>

      {/* Attendance table */}
      {employees.length === 0 ? (
        <div
          data-ocid="attendance.empty_state"
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <CalendarCheck className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No active employees</p>
        </div>
      ) : (
        <div data-ocid="attendance.table" className="data-table-wrapper">
          <table className="w-full text-sm min-w-[380px]">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2.5 pr-3 font-medium">ID</th>
                <th className="text-left py-2.5 pr-3 font-medium">
                  Employee Name
                </th>
                <th className="text-right py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const status = attendanceMap[emp.id] ?? "Present";
                return (
                  <tr
                    key={emp.id}
                    data-ocid={`attendance.item.${idx + 1}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">
                      {emp.id}
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{emp.name}</td>
                    <td className="py-2.5 text-right">
                      <Select
                        value={status}
                        onValueChange={(v) =>
                          setStatus(emp.id, v as AttendanceStatus)
                        }
                      >
                        <SelectTrigger
                          className={`h-8 w-32 text-xs font-medium border ${STATUS_COLORS[status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Present">✓ Present</SelectItem>
                          <SelectItem value="HalfDay">½ Half Day</SelectItem>
                          <SelectItem value="Absent">✗ Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button at bottom for long lists */}
      {employees.length > 5 && (
        <Button onClick={saveAll} className="w-full gap-2 touch-target">
          <Save className="w-4 h-4" />
          Save Attendance for {formatDate(date)}
        </Button>
      )}
    </div>
  );
}
