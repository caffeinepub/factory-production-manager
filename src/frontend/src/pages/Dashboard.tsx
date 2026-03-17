import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Clock,
  Download,
  Factory,
  IndianRupee,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  getAdditionalWorks,
  getAttendances,
  getEmployees,
  getEmployeesByDepartment,
  getOperations,
  getProductions,
} from "../store";
import {
  exportToExcel,
  formatDate,
  formatINR,
  getWeekRange,
  todayISO,
} from "../utils/exportExcel";

type ViewMode = "daily" | "weekly" | "monthly" | "full";
type DrillDownDept = "backoffice" | "production" | "finishing" | null;

function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoWeekLabel(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export default function Dashboard() {
  const [mode, setMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthISO());
  const [drillDown, setDrillDown] = useState<DrillDownDept>(null);

  const weekRange = useMemo(() => getWeekRange(selectedDate), [selectedDate]);

  function shiftDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const dateInRange = useCallback(
    (date: string): boolean => {
      if (mode === "daily") return date === selectedDate;
      if (mode === "weekly")
        return date >= weekRange.start && date <= weekRange.end;
      if (mode === "monthly") return date.startsWith(selectedMonth);
      return true;
    },
    [mode, selectedDate, selectedMonth, weekRange],
  );

  const allEmployees = useMemo(() => getEmployees(), []);
  const allAttendances = useMemo(() => getAttendances(), []);
  const allProductions = useMemo(() => getProductions(), []);
  const allAddlWorks = useMemo(() => getAdditionalWorks(), []);
  const allOperations = useMemo(() => getOperations(), []);
  const backOfficeEmps = useMemo(
    () => getEmployeesByDepartment("Back Office"),
    [],
  );
  const finishingEmps = useMemo(
    () => getEmployeesByDepartment("Finishing"),
    [],
  );
  const productionEmps = useMemo(
    () => getEmployeesByDepartment("Production"),
    [],
  );

  // Operation map: id -> { name, ratePerPiece }
  const opMap = useMemo(() => {
    const map = new Map<string, { name: string; ratePerPiece: number }>();
    for (const op of allOperations) {
      map.set(op.id, { name: op.name, ratePerPiece: op.ratePerPiece });
    }
    return map;
  }, [allOperations]);

  const filteredAtt = useMemo(
    () => allAttendances.filter((a) => dateInRange(a.date)),
    [allAttendances, dateInRange],
  );
  const filteredProd = useMemo(
    () => allProductions.filter((p) => dateInRange(p.date)),
    [allProductions, dateInRange],
  );
  const filteredAddl = useMemo(
    () => allAddlWorks.filter((a) => dateInRange(a.date)),
    [allAddlWorks, dateInRange],
  );

  const totalPresent = filteredAtt.filter(
    (a) => a.status === "Present" || a.status === "HalfDay",
  ).length;
  const totalProdAmt = filteredProd.reduce((s, p) => s + p.amount, 0);
  const totalAddlAmt = filteredAddl.reduce((s, a) => s + a.amount, 0);
  const totalEarnings = totalProdAmt + totalAddlAmt;

  const boEmpIds = useMemo(
    () => new Set(backOfficeEmps.map((e) => e.id)),
    [backOfficeEmps],
  );
  const finEmpIds = useMemo(
    () => new Set(finishingEmps.map((e) => e.id)),
    [finishingEmps],
  );
  const prodEmpIds = useMemo(
    () => new Set(productionEmps.map((e) => e.id)),
    [productionEmps],
  );

  const boPresent = filteredAtt.filter(
    (a) =>
      boEmpIds.has(a.employeeId) &&
      (a.status === "Present" || a.status === "HalfDay"),
  ).length;
  const boAbsent = filteredAtt.filter(
    (a) => boEmpIds.has(a.employeeId) && a.status === "Absent",
  ).length;

  const finProdAmt = filteredProd
    .filter((p) => finEmpIds.has(p.employeeId))
    .reduce((s, p) => s + p.amount, 0);
  const finPresent = filteredAtt.filter(
    (a) =>
      finEmpIds.has(a.employeeId) &&
      (a.status === "Present" || a.status === "HalfDay"),
  ).length;

  const prodOnlyAmt = filteredProd
    .filter((p) => prodEmpIds.has(p.employeeId))
    .reduce((s, p) => s + p.amount, 0);

  function periodLabel(): string {
    if (mode === "daily") return formatDate(selectedDate);
    if (mode === "weekly") return isoWeekLabel(weekRange.start, weekRange.end);
    if (mode === "monthly") {
      const [y, m] = selectedMonth.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      });
    }
    return "All Time";
  }

  const MODES: { key: ViewMode; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "full", label: "Full" },
  ];

  const boAttPct =
    boPresent + boAbsent > 0
      ? Math.round((boPresent / (boPresent + boAbsent)) * 100)
      : 0;

  // --- Drill-down data computation ---
  const boEmployeeRows = useMemo(
    () =>
      backOfficeEmps.map((emp) => {
        const empAtt = filteredAtt.filter((a) => a.employeeId === emp.id);
        const present = empAtt.filter(
          (a) => a.status === "Present" || a.status === "HalfDay",
        ).length;
        const absent = empAtt.filter((a) => a.status === "Absent").length;
        const halfDay = empAtt.filter((a) => a.status === "HalfDay").length;
        const total = present + absent;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        const addlWorks = filteredAddl.filter((a) => a.employeeId === emp.id);
        return { emp, present, absent, halfDay, pct, addlWorks };
      }),
    [backOfficeEmps, filteredAtt, filteredAddl],
  );

  const prodEmployeeRows = useMemo(
    () =>
      productionEmps.map((emp) => {
        const empAtt = filteredAtt.filter((a) => a.employeeId === emp.id);
        const present = empAtt.filter(
          (a) => a.status === "Present" || a.status === "HalfDay",
        ).length;
        const empProd = filteredProd.filter((p) => p.employeeId === emp.id);
        const pieces = empProd.reduce((s, p) => s + p.quantity, 0);
        const prodEarnings = empProd.reduce((s, p) => s + p.amount, 0);
        const addlWorks = filteredAddl.filter((a) => a.employeeId === emp.id);
        const addlEarnings = addlWorks.reduce((s, a) => s + a.amount, 0);
        const earnings = prodEarnings + addlEarnings;

        // Group by operationId
        const opGroups = new Map<
          string,
          { quantity: number; amount: number }
        >();
        for (const p of empProd) {
          const existing = opGroups.get(p.operationId) ?? {
            quantity: 0,
            amount: 0,
          };
          opGroups.set(p.operationId, {
            quantity: existing.quantity + p.quantity,
            amount: existing.amount + p.amount,
          });
        }
        const operations = Array.from(opGroups.entries()).map(([opId, agg]) => {
          const opInfo = opMap.get(opId);
          return {
            name: opInfo?.name ?? opId,
            ratePerPiece: opInfo?.ratePerPiece ?? 0,
            quantity: agg.quantity,
            amount: agg.amount,
          };
        });

        return {
          emp,
          present,
          pieces,
          prodEarnings,
          addlEarnings,
          earnings,
          operations,
          addlWorks,
        };
      }),
    [productionEmps, filteredAtt, filteredProd, filteredAddl, opMap],
  );

  const finEmployeeRows = useMemo(
    () =>
      finishingEmps.map((emp) => {
        const empAtt = filteredAtt.filter((a) => a.employeeId === emp.id);
        const present = empAtt.filter(
          (a) => a.status === "Present" || a.status === "HalfDay",
        ).length;
        const empProd = filteredProd.filter((p) => p.employeeId === emp.id);
        const pieces = empProd.reduce((s, p) => s + p.quantity, 0);
        const prodEarnings = empProd.reduce((s, p) => s + p.amount, 0);
        const addlWorks = filteredAddl.filter((a) => a.employeeId === emp.id);
        const addlEarnings = addlWorks.reduce((s, a) => s + a.amount, 0);
        const earnings = prodEarnings + addlEarnings;

        const opGroups = new Map<
          string,
          { quantity: number; amount: number }
        >();
        for (const p of empProd) {
          const existing = opGroups.get(p.operationId) ?? {
            quantity: 0,
            amount: 0,
          };
          opGroups.set(p.operationId, {
            quantity: existing.quantity + p.quantity,
            amount: existing.amount + p.amount,
          });
        }
        const operations = Array.from(opGroups.entries()).map(([opId, agg]) => {
          const opInfo = opMap.get(opId);
          return {
            name: opInfo?.name ?? opId,
            ratePerPiece: opInfo?.ratePerPiece ?? 0,
            quantity: agg.quantity,
            amount: agg.amount,
          };
        });

        return {
          emp,
          present,
          pieces,
          prodEarnings,
          addlEarnings,
          earnings,
          operations,
          addlWorks,
        };
      }),
    [finishingEmps, filteredAtt, filteredProd, filteredAddl, opMap],
  );

  // --- Excel export functions ---
  function exportBackOffice() {
    const data = boEmployeeRows.map((row) => ({
      name: row.emp.name,
      present: row.present,
      absent: row.absent,
      halfDay: row.halfDay,
      attendancePct: `${row.pct}%`,
    }));
    exportToExcel(
      data,
      [
        { header: "Employee Name", key: "name", width: 25 },
        { header: "Present", key: "present", width: 10 },
        { header: "Absent", key: "absent", width: 10 },
        { header: "Half Day", key: "halfDay", width: 10 },
        { header: "Attendance %", key: "attendancePct", width: 14 },
      ],
      `BackOffice_${periodLabel().replace(/[^a-zA-Z0-9]/g, "_")}`,
    );
  }

  function exportProduction() {
    const data: Record<string, string | number>[] = [];
    for (const row of prodEmployeeRows) {
      for (const op of row.operations) {
        data.push({
          employeeName: row.emp.name,
          operation: op.name,
          ratePerPiece: op.ratePerPiece,
          pieces: op.quantity,
          amount: op.amount,
        });
      }
      if (row.addlWorks.length > 0) {
        for (const aw of row.addlWorks) {
          data.push({
            employeeName: row.emp.name,
            operation: `Additional: ${aw.description}`,
            ratePerPiece: "-",
            pieces: "-",
            amount: aw.amount,
          });
        }
      }
    }
    exportToExcel(
      data,
      [
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Operation", key: "operation", width: 25 },
        { header: "Rate/Piece (INR)", key: "ratePerPiece", width: 16 },
        { header: "Pieces", key: "pieces", width: 10 },
        { header: "Amount (INR)", key: "amount", width: 14 },
      ],
      `Production_${periodLabel().replace(/[^a-zA-Z0-9]/g, "_")}`,
    );
  }

  function exportFinishing() {
    const data: Record<string, string | number>[] = [];
    for (const row of finEmployeeRows) {
      for (const op of row.operations) {
        data.push({
          employeeName: row.emp.name,
          operation: op.name,
          ratePerPiece: op.ratePerPiece,
          pieces: op.quantity,
          amount: op.amount,
        });
      }
      if (row.addlWorks.length > 0) {
        for (const aw of row.addlWorks) {
          data.push({
            employeeName: row.emp.name,
            operation: `Additional: ${aw.description}`,
            ratePerPiece: "-",
            pieces: "-",
            amount: aw.amount,
          });
        }
      }
    }
    exportToExcel(
      data,
      [
        { header: "Employee Name", key: "employeeName", width: 25 },
        { header: "Operation", key: "operation", width: 25 },
        { header: "Rate/Piece (INR)", key: "ratePerPiece", width: 16 },
        { header: "Pieces", key: "pieces", width: 10 },
        { header: "Amount (INR)", key: "amount", width: 14 },
      ],
      `Finishing_${periodLabel().replace(/[^a-zA-Z0-9]/g, "_")}`,
    );
  }

  return (
    <div data-ocid="dashboard.section" className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Dashboard
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> Factory
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Factory className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            data-ocid={`dashboard.${m.key}.tab`}
            onClick={() => setMode(m.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === m.key
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Date navigator */}
      {mode !== "full" && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
          <button
            type="button"
            data-ocid="dashboard.date.prev_button"
            onClick={() =>
              mode === "monthly"
                ? shiftMonth(-1)
                : shiftDate(mode === "weekly" ? -7 : -1)
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              {periodLabel()}
            </span>
            {mode === "daily" && (
              <input
                data-ocid="dashboard.date.input"
                type="date"
                value={selectedDate}
                max={todayISO()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs text-primary underline bg-transparent border-none outline-none cursor-pointer"
              />
            )}
            {mode === "monthly" && (
              <input
                data-ocid="dashboard.month.input"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs text-primary underline bg-transparent border-none outline-none cursor-pointer"
              />
            )}
          </div>

          <button
            type="button"
            data-ocid="dashboard.date.next_button"
            onClick={() =>
              mode === "monthly"
                ? shiftMonth(1)
                : shiftDate(mode === "weekly" ? 7 : 1)
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            {
              label: "Total Employees",
              value: String(allEmployees.length),
              sub: `${allEmployees.filter((e) => e.status === "Active").length} active`,
              icon: Users,
              color: "text-primary",
              bg: "bg-primary/10",
              ocid: "dashboard.total_employees.card",
            },
            {
              label: "Attendance",
              value: String(totalPresent),
              sub: "present in period",
              icon: CalendarCheck,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              ocid: "dashboard.attendance.card",
            },
            {
              label: "Production",
              value: formatINR(totalProdAmt),
              sub: "piece-rate earnings",
              icon: TrendingUp,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
              ocid: "dashboard.production.card",
            },
            {
              label: "Total Earnings",
              value: formatINR(totalEarnings),
              sub: "incl. additional work",
              icon: IndianRupee,
              color: "text-purple-600",
              bg: "bg-purple-500/10",
              ocid: "dashboard.earnings.card",
            },
          ] as const
        ).map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              data-ocid={card.ocid}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35, ease: "easeOut" }}
              className="stat-card"
            >
              <div
                className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}
              >
                <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={2} />
              </div>
              <div className="text-base font-display font-bold text-foreground leading-tight">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {card.sub}
              </div>
              <div className="text-xs font-medium text-foreground/70 mt-1">
                {card.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Department breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Department Performance
        </h3>

        {/* Back Office */}
        <motion.div
          data-ocid="dashboard.backoffice.open_modal_button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          onClick={() => setDrillDown("backoffice")}
          className="bg-card border border-border rounded-xl p-3.5 space-y-2 cursor-pointer hover:bg-muted/30 hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                Back Office
              </div>
              <div className="text-xs text-muted-foreground">
                Fixed salary • {backOfficeEmps.length} employees
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Details</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <div className="text-base font-bold text-blue-600">
                {backOfficeEmps.length}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-emerald-600">
                {boPresent}
              </div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-red-500">{boAbsent}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
          </div>
          <div className="mt-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Attendance rate</span>
              <span>{boAttPct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${boAttPct}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Production */}
        <motion.div
          data-ocid="dashboard.production_dept.open_modal_button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.38, duration: 0.35 }}
          onClick={() => setDrillDown("production")}
          className="bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:bg-muted/30 hover:border-amber-300 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Factory className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                Production
              </div>
              <div className="text-xs text-muted-foreground">
                Piece rate • {productionEmps.length} employees
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-bold text-amber-600">
                {formatINR(prodOnlyAmt)}
              </span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>

        {/* Finishing */}
        <motion.div
          data-ocid="dashboard.finishing.open_modal_button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.46, duration: 0.35 }}
          onClick={() => setDrillDown("finishing")}
          className="bg-card border border-border rounded-xl p-3.5 space-y-2 cursor-pointer hover:bg-muted/30 hover:border-violet-300 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                Finishing
              </div>
              <div className="text-xs text-muted-foreground">
                Piece rate • {finishingEmps.length} employees
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Details</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-center">
              <div className="text-base font-bold text-violet-600">
                {finPresent}
              </div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-violet-600">
                {formatINR(finProdAmt)}
              </div>
              <div className="text-xs text-muted-foreground">Earnings</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Period summary */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
          Period Summary
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Period</span>
            <span className="font-medium text-foreground">{periodLabel()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Total attendance records
            </span>
            <span className="font-medium text-foreground">
              {filteredAtt.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Production entries</span>
            <span className="font-medium text-foreground">
              {filteredProd.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Additional work pay</span>
            <span className="font-medium text-foreground">
              {formatINR(totalAddlAmt)}
            </span>
          </div>
          <div className="flex justify-between border-t border-primary/15 pt-1.5 mt-1">
            <span className="font-semibold text-foreground">Total Payout</span>
            <span className="font-bold text-primary">
              {formatINR(totalEarnings)}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Drill-down Dialogs ---- */}

      {/* Back Office Dialog */}
      <Dialog
        open={drillDown === "backoffice"}
        onOpenChange={(open) => !open && setDrillDown(null)}
      >
        <DialogContent
          data-ocid="dashboard.backoffice.dialog"
          className="max-w-lg w-full"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Building2 className="w-4 h-4" />
                Back Office · {periodLabel()}
              </DialogTitle>
              <button
                type="button"
                data-ocid="dashboard.backoffice.export.button"
                onClick={(e) => {
                  e.stopPropagation();
                  exportBackOffice();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 transition-colors mr-6"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-2 space-y-2">
            {boEmployeeRows.length === 0 ? (
              <div
                data-ocid="dashboard.backoffice.empty_state"
                className="text-center text-sm text-muted-foreground py-8"
              >
                No Back Office employees found.
              </div>
            ) : (
              boEmployeeRows.map((row, idx) => (
                <div
                  key={row.emp.id}
                  data-ocid={`dashboard.backoffice.row.${idx + 1}`}
                  className="bg-muted/30 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {row.emp.name}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      {row.pct}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-emerald-600 font-medium">
                      ✓ {row.present} Present
                    </span>
                    <span className="text-red-500 font-medium">
                      ✗ {row.absent} Absent
                    </span>
                    <span className="text-amber-600 font-medium">
                      ½ {row.halfDay} Half
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  {row.addlWorks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Additional Work
                      </div>
                      <div className="space-y-1">
                        {row.addlWorks.map((aw) => (
                          <div
                            key={aw.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {aw.description}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatINR(aw.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                          <span className="text-foreground">
                            Additional Total
                          </span>
                          <span className="text-blue-600">
                            {formatINR(
                              row.addlWorks.reduce((s, a) => s + a.amount, 0),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Production Dialog */}
      <Dialog
        open={drillDown === "production"}
        onOpenChange={(open) => !open && setDrillDown(null)}
      >
        <DialogContent
          data-ocid="dashboard.production_dept.dialog"
          className="max-w-lg w-full"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Factory className="w-4 h-4" />
                Production · {periodLabel()}
              </DialogTitle>
              <button
                type="button"
                data-ocid="dashboard.production_dept.export.button"
                onClick={(e) => {
                  e.stopPropagation();
                  exportProduction();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 transition-colors mr-6"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-2 space-y-3">
            {prodEmployeeRows.length === 0 ? (
              <div
                data-ocid="dashboard.production_dept.empty_state"
                className="text-center text-sm text-muted-foreground py-8"
              >
                No Production employees found.
              </div>
            ) : (
              prodEmployeeRows.map((row, idx) => (
                <div
                  key={row.emp.id}
                  data-ocid={`dashboard.production_dept.row.${idx + 1}`}
                  className="bg-muted/30 rounded-lg p-3 space-y-2"
                >
                  {/* Employee header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {row.emp.name}
                    </span>
                    <span className="text-sm font-bold text-amber-600">
                      {formatINR(row.earnings)}
                    </span>
                  </div>
                  {/* Attendance + pieces summary */}
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600 font-medium">
                      ✓ {row.present} Days Present
                    </span>
                    <span className="text-foreground/70 font-medium">
                      {row.pieces} Total Pieces
                    </span>
                  </div>
                  {/* Operations mini table */}
                  {row.operations.length > 0 && (
                    <div className="mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 text-muted-foreground font-medium">
                              Operation
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Rate/pc
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Pcs
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.operations.map((op) => (
                            <tr
                              key={op.name}
                              className="border-b border-border/50"
                            >
                              <td className="py-1 text-foreground">
                                {op.name}
                              </td>
                              <td className="py-1 text-right text-muted-foreground">
                                ₹{op.ratePerPiece}
                              </td>
                              <td className="py-1 text-right text-foreground">
                                {op.quantity}
                              </td>
                              <td className="py-1 text-right font-medium text-foreground">
                                {formatINR(op.amount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-amber-300/60 bg-amber-50/30">
                            <td
                              className="py-1 font-semibold text-foreground"
                              colSpan={2}
                            >
                              Production Total
                            </td>
                            <td className="py-1 text-right font-semibold text-foreground">
                              {row.pieces}
                            </td>
                            <td className="py-1 text-right font-bold text-amber-600">
                              {formatINR(row.prodEarnings)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Additional work section */}
                  {row.addlWorks.length > 0 && (
                    <div className="pt-1.5 border-t border-border">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Additional Work
                      </div>
                      <div className="space-y-1">
                        {row.addlWorks.map((aw) => (
                          <div
                            key={aw.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {aw.description}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatINR(aw.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                          <span className="text-foreground">
                            Additional Total
                          </span>
                          <span className="text-amber-600">
                            {formatINR(row.addlEarnings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Finishing Dialog */}
      <Dialog
        open={drillDown === "finishing"}
        onOpenChange={(open) => !open && setDrillDown(null)}
      >
        <DialogContent
          data-ocid="dashboard.finishing.dialog"
          className="max-w-lg w-full"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-violet-600">
                <Scissors className="w-4 h-4" />
                Finishing · {periodLabel()}
              </DialogTitle>
              <button
                type="button"
                data-ocid="dashboard.finishing.export.button"
                onClick={(e) => {
                  e.stopPropagation();
                  exportFinishing();
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 transition-colors mr-6"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-2 space-y-3">
            {finEmployeeRows.length === 0 ? (
              <div
                data-ocid="dashboard.finishing.empty_state"
                className="text-center text-sm text-muted-foreground py-8"
              >
                No Finishing employees found.
              </div>
            ) : (
              finEmployeeRows.map((row, idx) => (
                <div
                  key={row.emp.id}
                  data-ocid={`dashboard.finishing.row.${idx + 1}`}
                  className="bg-muted/30 rounded-lg p-3 space-y-2"
                >
                  {/* Employee header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {row.emp.name}
                    </span>
                    <span className="text-sm font-bold text-violet-600">
                      {formatINR(row.earnings)}
                    </span>
                  </div>
                  {/* Attendance + pieces summary */}
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600 font-medium">
                      ✓ {row.present} Days Present
                    </span>
                    <span className="text-foreground/70 font-medium">
                      {row.pieces} Total Pieces
                    </span>
                  </div>
                  {/* Operations mini table */}
                  {row.operations.length > 0 && (
                    <div className="mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 text-muted-foreground font-medium">
                              Operation
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Rate/pc
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Pcs
                            </th>
                            <th className="text-right py-1 text-muted-foreground font-medium">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.operations.map((op) => (
                            <tr
                              key={op.name}
                              className="border-b border-border/50"
                            >
                              <td className="py-1 text-foreground">
                                {op.name}
                              </td>
                              <td className="py-1 text-right text-muted-foreground">
                                ₹{op.ratePerPiece}
                              </td>
                              <td className="py-1 text-right text-foreground">
                                {op.quantity}
                              </td>
                              <td className="py-1 text-right font-medium text-foreground">
                                {formatINR(op.amount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-violet-300/60 bg-violet-50/30">
                            <td
                              className="py-1 font-semibold text-foreground"
                              colSpan={2}
                            >
                              Production Total
                            </td>
                            <td className="py-1 text-right font-semibold text-foreground">
                              {row.pieces}
                            </td>
                            <td className="py-1 text-right font-bold text-violet-600">
                              {formatINR(row.prodEarnings)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Additional work section */}
                  {row.addlWorks.length > 0 && (
                    <div className="pt-1.5 border-t border-border">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Additional Work
                      </div>
                      <div className="space-y-1">
                        {row.addlWorks.map((aw) => (
                          <div
                            key={aw.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-muted-foreground">
                              {aw.description}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatINR(aw.amount)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                          <span className="text-foreground">
                            Additional Total
                          </span>
                          <span className="text-violet-600">
                            {formatINR(row.addlEarnings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
