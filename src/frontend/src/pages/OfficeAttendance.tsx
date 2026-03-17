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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AttendanceStatus,
  type Employee,
  getAttendanceByDate,
  getAttendanceByEmployeeMonth,
  getEmployees,
  markAttendance,
} from "../store";
import { formatDate, todayISO } from "../utils/exportExcel";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: "bg-success/15 text-success border-success/30",
  Absent: "bg-destructive/15 text-destructive border-destructive/30",
  HalfDay: "bg-warning/15 text-warning-foreground border-warning/30",
};

function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function OfficeAttendance() {
  const [date, setDate] = useState(todayISO());
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO());

  const officeEmployees = useMemo(
    () =>
      getEmployees().filter(
        (e) => e.department === "Back Office" && e.status === "Active",
      ),
    [],
  );

  // Load attendance when date changes
  useMemo(() => {
    const records = getAttendanceByDate(date);
    const map: Record<string, AttendanceStatus> = {};
    for (const emp of officeEmployees) {
      map[emp.id] = "Present";
    }
    for (const rec of records) {
      if (map[rec.employeeId] !== undefined) {
        map[rec.employeeId] = rec.status;
      }
    }
    setAttendanceMap(map);
  }, [date, officeEmployees]);

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
    toast.success(`Office attendance saved for ${formatDate(date)}`);
  }

  const summary = useMemo(() => {
    const values = Object.values(attendanceMap);
    return {
      present: values.filter((s) => s === "Present").length,
      absent: values.filter((s) => s === "Absent").length,
      halfDay: values.filter((s) => s === "HalfDay").length,
    };
  }, [attendanceMap]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    return officeEmployees.map((emp) => {
      const records = getAttendanceByEmployeeMonth(emp.id, selectedMonth);
      return {
        emp,
        present: records.filter((r) => r.status === "Present").length,
        halfDay: records.filter((r) => r.status === "HalfDay").length,
        absent: records.filter((r) => r.status === "Absent").length,
      };
    });
  }, [officeEmployees, selectedMonth]);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-display font-bold">
              Office Attendance
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-10">
            Back Office &amp; fixed salary staff
          </p>
        </div>
        <Button
          data-ocid="office_attendance.save.button"
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
          data-ocid="office_attendance.date.input"
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
      <div className="flex gap-2 flex-wrap">
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
      {officeEmployees.length === 0 ? (
        <div
          data-ocid="office_attendance.empty_state"
          className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg"
        >
          <Building2 className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm font-medium">No Back Office employees</p>
          <p className="text-xs mt-1">
            Add employees with department set to "Back Office"
          </p>
        </div>
      ) : (
        <div data-ocid="office_attendance.table" className="data-table-wrapper">
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
              {officeEmployees.map((emp: Employee, idx: number) => {
                const status = attendanceMap[emp.id] ?? "Present";
                return (
                  <tr
                    key={emp.id}
                    data-ocid={`office_attendance.item.${idx + 1}`}
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

      {officeEmployees.length > 5 && (
        <Button onClick={saveAll} className="w-full gap-2 touch-target">
          <Save className="w-4 h-4" />
          Save Attendance for {formatDate(date)}
        </Button>
      )}

      {/* Monthly Summary */}
      <div className="border-t border-border pt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-base">
            Monthly Summary
          </h3>
          <Input
            data-ocid="office_attendance.month.input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 text-sm"
          />
        </div>

        {officeEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Back Office employees found.
          </p>
        ) : (
          <div data-ocid="office_attendance.monthly_table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Half Day</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySummary.map(({ emp, present, halfDay, absent }) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-semibold">
                        {present}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-warning-foreground font-semibold">
                        {halfDay}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-destructive font-semibold">
                        {absent}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
