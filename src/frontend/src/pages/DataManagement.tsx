import type {
  Attendance,
  Employee,
  Operation,
  ProductionEntry,
  SalaryRecord,
} from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActor } from "@/hooks/useActor";
import {
  currentMonth,
  exportToExcel,
  formatDate,
  formatINR,
} from "@/utils/exportExcel";
import {
  AlertTriangle,
  CalendarX,
  ClipboardX,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PackageX,
  RefreshCw,
  Smartphone,
  Trash2,
  Users,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Counts {
  employees: bigint;
  operations: bigint;
  attendances: bigint;
  productions: bigint;
  inventoryItems: bigint;
  stockTransactions: bigint;
}

type DeptFilter = "All" | "Office" | "Production" | "Finishing";

function deptMatchesFilter(workerType: string, filter: DeptFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Office") return workerType === "Back Office";
  if (filter === "Production")
    return (
      workerType === "Production" || workerType === "Production & Finishing"
    );
  if (filter === "Finishing")
    return (
      workerType === "Finishing" || workerType === "Production & Finishing"
    );
  return true;
}

function deptBadgeColor(workerType: string): string {
  if (workerType === "Back Office") return "bg-blue-100 text-blue-800";
  if (workerType === "Production") return "bg-green-100 text-green-800";
  if (workerType === "Finishing") return "bg-orange-100 text-orange-800";
  if (workerType === "Production & Finishing")
    return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3"
      data-ocid="datamanagement.error_state"
    >
      <WifiOff className="w-4 h-4 text-destructive shrink-0" />
      <p className="text-xs text-destructive flex-1">{message}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        disabled={retrying}
        className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        {retrying ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        Retry
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DataManagement() {
  const { actor, isFetching } = useActor();

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl text-foreground">
          Data Management
        </h2>
      </div>

      {isFetching && !actor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting to server...
        </div>
      ) : (
        <Tabs defaultValue="reports" data-ocid="datamanagement.tab">
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex gap-1">
            <TabsTrigger value="reports" data-ocid="datamanagement.reports.tab">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="salaryslips"
              data-ocid="datamanagement.salaryslips.tab"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Salary Slips
            </TabsTrigger>
            <TabsTrigger
              value="datamgmt"
              data-ocid="datamanagement.datamgmt.tab"
            >
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Clear Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-4">
            <ReportsTab actor={actor} />
          </TabsContent>

          <TabsContent value="salaryslips" className="mt-4">
            <SalarySlipsTab actor={actor} />
          </TabsContent>

          <TabsContent value="datamgmt" className="mt-4">
            <DataMgmtTab actor={actor} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Tab 1: Reports ───────────────────────────────────────────────────────────

function ReportsTab({ actor }: { actor: any }) {
  const [month, setMonth] = useState(currentMonth());
  const [deptFilter, setDeptFilter] = useState<DeptFilter>("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [productions, setProductions] = useState<ProductionEntry[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, Attendance[]>
  >({});

  const load = useCallback(async () => {
    if (!actor) {
      setError("Not connected to server. Please wait or refresh the page.");
      return;
    }
    if (!month) return;
    setLoading(true);
    setError(null);
    try {
      let emps: Employee[] = [];
      let ops: Operation[] = [];
      let prods: ProductionEntry[] = [];

      try {
        emps = await (actor.listEmployees() as Promise<Employee[]>);
      } catch {
        throw new Error("Failed to load employees");
      }

      try {
        [ops, prods] = await Promise.all([
          actor.listOperations() as Promise<Operation[]>,
          actor.getProductionByMonth(month) as Promise<ProductionEntry[]>,
        ]);
      } catch {
        throw new Error("Failed to load operations or production data");
      }

      setEmployees(emps);
      setOperations(ops);
      setProductions(prods);

      // Fetch attendance for all employees in parallel
      const attResults = await Promise.all(
        emps.map((e: Employee) =>
          (
            actor.getAttendanceByEmployeeMonth(e.id, month) as Promise<
              Attendance[]
            >
          )
            .then((att) => ({ id: e.id, att }))
            .catch(() => ({ id: e.id, att: [] as Attendance[] })),
        ),
      );
      const map: Record<string, Attendance[]> = {};
      for (const r of attResults) map[r.id] = r.att;
      setAttendanceMap(map);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load report data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [actor, month]);

  useEffect(() => {
    if (actor) load();
  }, [load, actor]);

  const opMap = Object.fromEntries(operations.map((o) => [o.id, o]));

  // Filter employees by department
  const filteredEmployees = employees.filter((e) =>
    deptMatchesFilter(e.workerType, deptFilter),
  );

  // Attendance summary rows
  const attendanceRows = filteredEmployees.map((emp) => {
    const att = attendanceMap[emp.id] ?? [];
    const present = att.filter((a) => a.status === "present").length;
    const absent = att.filter((a) => a.status === "absent").length;
    const halfDay = att.filter((a) => a.status === "half-day").length;
    const total = present + absent + halfDay;
    const pct =
      total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
    return { emp, present, absent, halfDay, total, pct };
  });

  // Production rows filtered by department
  const filteredProductions = productions.filter((p) => {
    const emp = employees.find((e) => e.id === p.employeeId);
    if (!emp) return false;
    return deptMatchesFilter(emp.workerType, deptFilter);
  });

  const totalQty = filteredProductions.reduce(
    (s, p) => s + Number(p.quantity),
    0,
  );
  const totalAmt = filteredProductions.reduce((s, p) => s + p.amount, 0);
  const totalPresent = attendanceRows.reduce((s, r) => s + r.present, 0);

  function exportAttendance() {
    const data = attendanceRows.map((r, i) => ({
      "#": i + 1,
      Name: r.emp.name,
      Department: r.emp.workerType,
      Present: r.present,
      Absent: r.absent,
      "Half Day": r.halfDay,
      Total: r.total,
      "Attendance %": `${r.pct}%`,
    }));
    exportToExcel(
      data,
      [
        { header: "#", key: "#" },
        { header: "Name", key: "Name" },
        { header: "Department", key: "Department" },
        { header: "Present", key: "Present" },
        { header: "Absent", key: "Absent" },
        { header: "Half Day", key: "Half Day" },
        { header: "Total", key: "Total" },
        { header: "Attendance %", key: "Attendance %" },
      ],
      `Attendance_${month}`,
    );
  }

  function exportProduction() {
    const data = filteredProductions.map((p, i) => {
      const emp = employees.find((e) => e.id === p.employeeId);
      const op = opMap[p.operationId];
      return {
        "#": i + 1,
        Date: formatDate(p.date),
        Employee: emp?.name ?? p.employeeId,
        Department: emp?.workerType ?? "",
        Operation: op?.name ?? p.operationId,
        "Rate/Piece (₹)": op?.ratePerPiece ?? "",
        Qty: Number(p.quantity),
        "Amount (₹)": p.amount,
      };
    });
    exportToExcel(
      data,
      [
        { header: "#", key: "#" },
        { header: "Date", key: "Date" },
        { header: "Employee", key: "Employee" },
        { header: "Department", key: "Department" },
        { header: "Operation", key: "Operation" },
        { header: "Rate/Piece (₹)", key: "Rate/Piece (₹)" },
        { header: "Qty", key: "Qty" },
        { header: "Amount (₹)", key: "Amount (₹)" },
      ],
      `Production_${month}`,
    );
  }

  if (!actor) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            data-ocid="reports.input"
            className="h-8 text-sm w-40"
          />
        </div>
        <Button
          size="sm"
          onClick={load}
          disabled={loading}
          data-ocid="reports.primary_button"
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Load
        </Button>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <ErrorBanner message={error} onRetry={load} retrying={loading} />
      )}

      {/* Department filter */}
      <div className="flex flex-wrap gap-2">
        {(["All", "Office", "Production", "Finishing"] as DeptFilter[]).map(
          (d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDeptFilter(d)}
              data-ocid={`reports.${d.toLowerCase()}.toggle`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                deptFilter === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {d}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="space-y-3" data-ocid="reports.loading_state">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Stats Bar */}
          {!error && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Employees
                </p>
                <p className="text-xl font-bold text-foreground">
                  {filteredEmployees.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Total Present Days
                </p>
                <p className="text-xl font-bold text-green-700">
                  {totalPresent}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Production Total
                </p>
                <p className="text-xl font-bold text-primary">
                  {formatINR(totalAmt)}
                </p>
              </div>
            </div>
          )}

          {/* Section A: Attendance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-sm text-foreground">
                Attendance Summary
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={exportAttendance}
                data-ocid="reports.attendance.button"
                className="gap-1.5 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Attendance Excel
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-muted/60">
                  <tr>
                    {[
                      "#",
                      "Name",
                      "Department",
                      "Present",
                      "Absent",
                      "Half Day",
                      "Total",
                      "Att%",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-muted-foreground"
                        data-ocid="reports.attendance.empty_state"
                      >
                        No employees found for this filter
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((r, i) => (
                      <tr
                        key={r.emp.id}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                        data-ocid={`reports.attendance.row.${i + 1}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.emp.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deptBadgeColor(r.emp.workerType)}`}
                          >
                            {r.emp.workerType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-green-700 font-medium">
                          {r.present}
                        </td>
                        <td className="px-3 py-2 text-red-600">{r.absent}</td>
                        <td className="px-3 py-2 text-amber-600">
                          {r.halfDay}
                        </td>
                        <td className="px-3 py-2">{r.total}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`font-semibold ${
                              r.pct >= 80
                                ? "text-green-700"
                                : r.pct >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {r.pct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Production */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-sm text-foreground">
                Production Performance
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={exportProduction}
                data-ocid="reports.production.button"
                className="gap-1.5 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Production Excel
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-muted/60">
                  <tr>
                    {[
                      "#",
                      "Date",
                      "Employee Name",
                      "Department",
                      "Operation",
                      "Rate/Piece (₹)",
                      "Qty",
                      "Amount (₹)",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProductions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-muted-foreground"
                        data-ocid="reports.production.empty_state"
                      >
                        No production data for this period
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredProductions.map((p, i) => {
                        const emp = employees.find(
                          (e) => e.id === p.employeeId,
                        );
                        const op = opMap[p.operationId];
                        return (
                          <tr
                            key={p.id}
                            className="border-t border-border hover:bg-muted/20 transition-colors"
                            data-ocid={`reports.production.row.${i + 1}`}
                          >
                            <td className="px-3 py-2 text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {formatDate(p.date)}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {emp?.name ?? p.employeeId}
                            </td>
                            <td className="px-3 py-2">
                              {emp && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deptBadgeColor(emp.workerType)}`}
                                >
                                  {emp.workerType}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {op?.name ?? p.operationId}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              ₹{op?.ratePerPiece?.toFixed(2) ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {Number(p.quantity)}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold">
                              ₹{p.amount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                        <td
                          colSpan={6}
                          className="px-3 py-2 text-right text-xs"
                        >
                          Total
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {totalQty}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          ₹{totalAmt.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Salary Slips ──────────────────────────────────────────────────────

function SalarySlipsTab({ actor }: { actor: any }) {
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salarySheet, setSalarySheet] = useState<SalaryRecord[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!actor) {
      setError("Not connected to server. Please wait or refresh the page.");
      return;
    }
    if (!month) return;
    setLoading(true);
    setError(null);
    try {
      const [emps, sheet, ops] = await Promise.all([
        actor.listEmployees() as Promise<Employee[]>,
        actor.getMonthlySalarySheet(month) as Promise<SalaryRecord[]>,
        actor.listOperations() as Promise<Operation[]>,
      ]);
      setEmployees(emps);
      setSalarySheet(sheet);
      setOperations(ops);
    } catch {
      const msg = "Failed to load salary data. Please retry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [actor, month]);

  useEffect(() => {
    if (actor) load();
  }, [load, actor]);

  const opMap = Object.fromEntries(operations.map((o) => [o.id, o]));
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  async function generateSlipForEmployee(record: SalaryRecord) {
    if (!actor) return;
    setGeneratingPdf(record.employeeId);
    try {
      const [prods, att] = await Promise.all([
        actor.getProductionByEmployeeMonth(record.employeeId, month) as Promise<
          ProductionEntry[]
        >,
        actor.getAttendanceByEmployeeMonth(record.employeeId, month) as Promise<
          Attendance[]
        >,
      ]);

      const present = att.filter(
        (a: Attendance) => a.status === "present",
      ).length;
      const absent = att.filter(
        (a: Attendance) => a.status === "absent",
      ).length;
      const halfDay = att.filter(
        (a: Attendance) => a.status === "half-day",
      ).length;
      const emp = empMap[record.employeeId];

      printSalarySlip({
        record,
        emp,
        month,
        prods,
        opMap,
        present,
        absent,
        halfDay,
      });
    } catch {
      toast.error("Failed to generate salary slip");
    } finally {
      setGeneratingPdf(null);
    }
  }

  function sendWhatsApp(record: SalaryRecord, emp: Employee | undefined) {
    const mobile = emp?.mobile ?? "";
    const digits = mobile.replace(/\D/g, "");
    if (!digits) {
      toast.error("No phone number for this employee");
      return;
    }

    const [year, mon] = month.split("-");
    const monthName = new Date(Number(year), Number(mon) - 1).toLocaleString(
      "en-IN",
      { month: "long", year: "numeric" },
    );
    const totalSalary = record.salary + record.productionAmount;
    const msg = `*Factory Pay Slip - ${monthName}*\nEmployee: ${record.employeeName}\nAttendance: ${Number(record.attendanceCount)} days\nProduction: ₹${record.productionAmount.toFixed(2)}\nNet Salary: ₹${totalSalary.toFixed(2)}\nThank you!`;

    // Indian numbers: add 91 if not already prefixed
    const waNumber = digits.startsWith("91") ? digits : `91${digits}`;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadAllSlips() {
    if (!actor) return;
    setLoading(true);
    try {
      for (const record of salarySheet) {
        const [prods, att] = await Promise.all([
          actor.getProductionByEmployeeMonth(
            record.employeeId,
            month,
          ) as Promise<ProductionEntry[]>,
          actor.getAttendanceByEmployeeMonth(
            record.employeeId,
            month,
          ) as Promise<Attendance[]>,
        ]);
        const present = att.filter(
          (a: Attendance) => a.status === "present",
        ).length;
        const absent = att.filter(
          (a: Attendance) => a.status === "absent",
        ).length;
        const halfDay = att.filter(
          (a: Attendance) => a.status === "half-day",
        ).length;
        const emp = empMap[record.employeeId];
        printSalarySlip({
          record,
          emp,
          month,
          prods,
          opMap,
          present,
          absent,
          halfDay,
        });
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      toast.error("Failed to generate all slips");
    } finally {
      setLoading(false);
    }
  }

  if (!actor) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Month</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            data-ocid="salary.input"
            className="h-8 text-sm w-40"
          />
        </div>
        <Button
          size="sm"
          onClick={load}
          disabled={loading}
          data-ocid="salary.primary_button"
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Load
        </Button>
        {salarySheet.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={downloadAllSlips}
            disabled={loading}
            data-ocid="salary.download_all.button"
            className="gap-1.5 ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Download All Slips
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <ErrorBanner message={error} onRetry={load} retrying={loading} />
      )}

      {loading ? (
        <div className="space-y-3" data-ocid="salary.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      ) : salarySheet.length === 0 ? (
        <div
          className="py-12 text-center text-muted-foreground"
          data-ocid="salary.empty_state"
        >
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No salary data for {month}</p>
          <p className="text-xs mt-1">Select a month and click Load</p>
        </div>
      ) : (
        <TooltipProvider>
          <div className="space-y-2">
            {salarySheet.map((record, i) => {
              const emp = empMap[record.employeeId];
              const hasMobile = !!emp?.mobile?.replace(/\D/g, "");
              return (
                <div
                  key={record.employeeId}
                  data-ocid={`salary.item.${i + 1}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {record.employeeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {record.employeeName}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {record.employeeId.slice(0, 8)}
                        </span>
                        {emp && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deptBadgeColor(emp.workerType)}`}
                          >
                            {emp.workerType}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {Number(record.attendanceCount)} days
                        </span>
                        {emp?.mobile && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            📱 {emp.mobile}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">
                        Total Salary
                      </p>
                      <p className="font-bold text-sm text-primary">
                        {formatINR(record.salary + record.productionAmount)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateSlipForEmployee(record)}
                      disabled={generatingPdf === record.employeeId}
                      data-ocid={`salary.pdf.button.${i + 1}`}
                      className="gap-1.5 text-xs"
                    >
                      {generatingPdf === record.employeeId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      PDF Slip
                    </Button>
                    {hasMobile ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendWhatsApp(record, emp)}
                        data-ocid={`salary.send_button.${i + 1}`}
                        className="gap-1.5 text-xs border-green-500/50 text-green-700 hover:bg-green-50 hover:text-green-800"
                      >
                        <Smartphone className="w-3 h-3" />
                        Send
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            data-ocid={`salary.send_button.${i + 1}`}
                            className="gap-1.5 text-xs opacity-40"
                          >
                            <Smartphone className="w-3 h-3" />
                            Send
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          No phone number
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

// ─── PDF Print Helper ─────────────────────────────────────────────────────────

function printSalarySlip({
  record,
  emp,
  month,
  prods,
  opMap,
  present,
  absent,
  halfDay,
}: {
  record: SalaryRecord;
  emp: Employee | undefined;
  month: string;
  prods: ProductionEntry[];
  opMap: Record<string, Operation>;
  present: number;
  absent: number;
  halfDay: number;
}) {
  const [year, mon] = month.split("-");
  const monthName = new Date(Number(year), Number(mon) - 1).toLocaleString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    },
  );

  // Group production by operation
  const prodByOp: Record<
    string,
    { name: string; rate: number; qty: number; amount: number }
  > = {};
  for (const p of prods) {
    const op = opMap[p.operationId];
    if (!op) continue;
    if (!prodByOp[op.id])
      prodByOp[op.id] = {
        name: op.name,
        rate: op.ratePerPiece,
        qty: 0,
        amount: 0,
      };
    prodByOp[op.id].qty += Number(p.quantity);
    prodByOp[op.id].amount += p.amount;
  }
  const prodRows = Object.values(prodByOp);

  const totalSalary = record.salary + record.productionAmount;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Salary Slip - ${record.employeeName} - ${monthName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
  .header p { font-size: 12px; color: #555; margin-top: 2px; }
  .slip-title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 2px; color: #333; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 14px; background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd; }
  .info-row { display: flex; gap: 6px; }
  .info-label { font-weight: bold; color: #555; min-width: 110px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #333; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .totals-row td { font-weight: bold; background: #e8f4e8 !important; border-top: 2px solid #333; }
  .att-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .att-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px; text-align: center; }
  .att-box .val { font-size: 20px; font-weight: bold; }
  .att-box .lbl { font-size: 10px; color: #666; }
  .total-salary { background: #1a1a1a; color: #fff; padding: 12px 16px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .total-salary .label { font-size: 13px; }
  .total-salary .amount { font-size: 18px; font-weight: bold; }
  .bank-section { border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f9f9f9; }
  .bank-section h3 { margin-bottom: 6px; font-size: 11px; text-transform: uppercase; color: #666; }
  .bank-row { display: flex; gap: 6px; margin-bottom: 3px; font-size: 11px; }
  .bank-label { font-weight: bold; min-width: 90px; }
  .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 6px; letter-spacing: 0.5px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>Factory Production Manager</h1>
    <p>Salary Slip</p>
  </div>
  <div class="slip-title">${monthName}</div>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Employee Name:</span><span>${record.employeeName}</span></div>
    <div class="info-row"><span class="info-label">Employee ID:</span><span>${record.employeeId}</span></div>
    <div class="info-row"><span class="info-label">Department:</span><span>${emp?.workerType ?? "—"}</span></div>
    <div class="info-row"><span class="info-label">Mobile:</span><span>${emp?.mobile ?? "—"}</span></div>
    <div class="info-row"><span class="info-label">Joining Date:</span><span>${emp?.joiningDate ?? "—"}</span></div>
  </div>

  <p class="section-title">Attendance</p>
  <div class="att-grid">
    <div class="att-box"><div class="val" style="color:#16a34a">${present}</div><div class="lbl">Present</div></div>
    <div class="att-box"><div class="val" style="color:#dc2626">${absent}</div><div class="lbl">Absent</div></div>
    <div class="att-box"><div class="val" style="color:#d97706">${halfDay}</div><div class="lbl">Half Day</div></div>
  </div>

  ${
    prodRows.length > 0
      ? `
  <p class="section-title">Production Details</p>
  <table>
    <thead><tr><th>Operation</th><th>Rate/Piece (₹)</th><th>Qty</th><th>Amount (₹)</th></tr></thead>
    <tbody>
      ${prodRows.map((r) => `<tr><td>${r.name}</td><td>₹${r.rate.toFixed(2)}</td><td>${r.qty}</td><td>₹${r.amount.toFixed(2)}</td></tr>`).join("")}
      <tr class="totals-row"><td colspan="3">Total Production</td><td>₹${record.productionAmount.toFixed(2)}</td></tr>
    </tbody>
  </table>`
      : ""
  }

  ${record.salary > 0 ? `<p class="section-title">Fixed Salary</p><table><tbody><tr><td>Fixed Monthly Salary</td><td>₹${record.salary.toFixed(2)}</td></tr></tbody></table>` : ""}

  <div class="total-salary">
    <span class="label">NET SALARY PAYABLE</span>
    <span class="amount">₹${totalSalary.toFixed(2)}</span>
  </div>

  ${
    record.accountNumber || record.bankName
      ? `
  <div class="bank-section">
    <h3>Bank Details</h3>
    ${record.bankName ? `<div class="bank-row"><span class="bank-label">Bank Name:</span><span>${record.bankName}</span></div>` : ""}
    ${record.accountNumber ? `<div class="bank-row"><span class="bank-label">Account No:</span><span>${record.accountNumber}</span></div>` : ""}
    ${record.ifscCode ? `<div class="bank-row"><span class="bank-label">IFSC Code:</span><span>${record.ifscCode}</span></div>` : ""}
  </div>`
      : ""
  }
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup blocked — please allow popups and try again");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Tab 3: Data Management ───────────────────────────────────────────────────

function DataMgmtTab({ actor }: { actor: any }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState("");
  const [productionMonth, setProductionMonth] = useState("");

  const fetchCounts = useCallback(async () => {
    if (!actor) {
      setError("Not connected to server. Please wait or refresh.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await actor.getDataCounts();
      setCounts(data);
    } catch {
      setError("Failed to load data counts. Please retry.");
      // Keep old counts so UI doesn't completely break
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (actor) fetchCounts();
  }, [fetchCounts, actor]);

  async function handleClear(
    key: string,
    action: () => Promise<void>,
    label: string,
  ) {
    setClearing(key);
    try {
      await action();
      toast.success(`${label} cleared successfully`);
      await fetchCounts();
    } catch {
      toast.error(`Failed to clear ${label}`);
    } finally {
      setClearing(null);
    }
  }

  const fmt = (n: bigint | undefined) =>
    n !== undefined ? Number(n).toLocaleString() : "0";

  if (!actor) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          View record counts and selectively clear data categories.
        </p>
        <Button
          variant="outline"
          size="sm"
          data-ocid="datamanagement.refresh.button"
          onClick={fetchCounts}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner message={error} onRetry={fetchCounts} retrying={loading} />
      )}

      <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">
          <strong>Warning:</strong> Clearing data is permanent and cannot be
          undone. Clearing Employees also removes all related Attendance and
          Production records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DataCard
          icon={<Users className="w-4 h-4" />}
          title="Employees"
          description="All employee profiles and related data"
          count={loading ? null : fmt(counts?.employees)}
          warning="Also clears all Attendance &amp; Production records"
          clearKey="employees"
          clearing={clearing}
          ocidPrefix="datamanagement.employees"
          onClear={() =>
            handleClear(
              "employees",
              () => actor!.clearAllEmployees(),
              "Employees",
            )
          }
        />
        <DataCard
          icon={<ClipboardX className="w-4 h-4" />}
          title="Operations"
          description="All operation types and rates"
          count={loading ? null : fmt(counts?.operations)}
          clearKey="operations"
          clearing={clearing}
          ocidPrefix="datamanagement.operations"
          onClear={() =>
            handleClear(
              "operations",
              () => actor!.clearAllOperations(),
              "Operations",
            )
          }
        />
        <DataCard
          icon={<CalendarX className="w-4 h-4" />}
          title="Attendance (All)"
          description="All attendance records across all months"
          count={loading ? null : fmt(counts?.attendances)}
          clearKey="attendance_all"
          clearing={clearing}
          ocidPrefix="datamanagement.attendance"
          onClear={() =>
            handleClear(
              "attendance_all",
              () => actor!.clearAllAttendance(),
              "Attendance (All)",
            )
          }
        />

        {/* Attendance by Month */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-muted-foreground" />
              Attendance by Month
            </CardTitle>
            <CardDescription className="text-xs">
              Clear attendance for a specific month only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Month (YYYY-MM)</Label>
              <Input
                type="month"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                data-ocid="datamanagement.attendance.input"
                className="h-8 text-sm"
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  data-ocid="datamanagement.attendance.delete_button"
                  disabled={!attendanceMonth || clearing === "attendance_month"}
                  className="w-full gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear {attendanceMonth || "…"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="datamanagement.attendance.dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Clear Attendance for {attendanceMonth}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    All attendance records for{" "}
                    <strong>{attendanceMonth}</strong> will be permanently
                    deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="datamanagement.attendance.cancel_button">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="datamanagement.attendance.confirm_button"
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() =>
                      handleClear(
                        "attendance_month",
                        () => actor!.clearAttendanceByMonth(attendanceMonth),
                        `Attendance (${attendanceMonth})`,
                      )
                    }
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <DataCard
          icon={<ClipboardX className="w-4 h-4" />}
          title="Production (All)"
          description="All production records across all months"
          count={loading ? null : fmt(counts?.productions)}
          clearKey="production_all"
          clearing={clearing}
          ocidPrefix="datamanagement.production"
          onClear={() =>
            handleClear(
              "production_all",
              () => actor!.clearAllProduction(),
              "Production (All)",
            )
          }
        />

        {/* Production by Month */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardX className="w-4 h-4 text-muted-foreground" />
              Production by Month
            </CardTitle>
            <CardDescription className="text-xs">
              Clear production entries for a specific month only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Month (YYYY-MM)</Label>
              <Input
                type="month"
                value={productionMonth}
                onChange={(e) => setProductionMonth(e.target.value)}
                data-ocid="datamanagement.production.input"
                className="h-8 text-sm"
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  data-ocid="datamanagement.production.delete_button"
                  disabled={!productionMonth || clearing === "production_month"}
                  className="w-full gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear {productionMonth || "…"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="datamanagement.production.dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Clear Production for {productionMonth}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    All production records for{" "}
                    <strong>{productionMonth}</strong> will be permanently
                    deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="datamanagement.production.cancel_button">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="datamanagement.production.confirm_button"
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() =>
                      handleClear(
                        "production_month",
                        () => actor!.clearProductionByMonth(productionMonth),
                        `Production (${productionMonth})`,
                      )
                    }
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <DataCard
          icon={<PackageX className="w-4 h-4" />}
          title="Inventory Items"
          description="All inventory items and their stock levels"
          count={loading ? null : fmt(counts?.inventoryItems)}
          warning="Also clears all Inventory Transactions"
          clearKey="inventory_all"
          clearing={clearing}
          ocidPrefix="datamanagement.inventory"
          onClear={() =>
            handleClear(
              "inventory_all",
              () => actor!.clearAllInventory(),
              "Inventory Items",
            )
          }
        />
        <DataCard
          icon={<PackageX className="w-4 h-4" />}
          title="Inventory Transactions"
          description="All stock in/out transaction history"
          count={loading ? null : fmt(counts?.stockTransactions)}
          clearKey="inventory_transactions"
          clearing={clearing}
          ocidPrefix="datamanagement.stock"
          onClear={() =>
            handleClear(
              "inventory_transactions",
              () => actor!.clearInventoryTransactions(),
              "Inventory Transactions",
            )
          }
        />
      </div>
    </div>
  );
}

// ─── DataCard Component ───────────────────────────────────────────────────────

interface DataCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: string | null;
  warning?: string;
  clearKey: string;
  clearing: string | null;
  ocidPrefix: string;
  onClear: () => void;
}

function DataCard({
  icon,
  title,
  description,
  count,
  warning,
  clearKey,
  clearing,
  ocidPrefix,
  onClear,
}: DataCardProps) {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            {title}
          </CardTitle>
          {count === null ? (
            <Skeleton className="h-5 w-10 rounded-full" />
          ) : (
            <Badge variant="secondary" className="text-xs font-mono">
              {count}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
        {warning && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {warning}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              data-ocid={`${ocidPrefix}.delete_button`}
              disabled={clearing === clearKey}
              className="w-full gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing === clearKey ? "Clearing…" : `Clear All ${title}`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-ocid={`${ocidPrefix}.dialog`}>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all {title}?</AlertDialogTitle>
              <AlertDialogDescription>
                All <strong>{title}</strong> records will be permanently
                deleted.
                {warning && ` Note: ${warning}.`} This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid={`${ocidPrefix}.cancel_button`}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid={`${ocidPrefix}.confirm_button`}
                className="bg-destructive hover:bg-destructive/90"
                onClick={onClear}
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
