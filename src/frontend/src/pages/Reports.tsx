import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type ProductionEntry,
  getEmployees,
  getMonthlySalarySheet,
  getOperations,
  getProductionByDate,
  getProductionByMonth,
} from "../store";
import {
  currentMonth,
  exportToExcel,
  formatDate,
  formatINR,
  getWeekRange,
  todayISO,
} from "../utils/exportExcel";

type ReportPeriod = "daily" | "weekly" | "monthly";

interface ProductionRow {
  employeeId: string;
  name: string;
  operations: string;
  totalPieces: number;
  totalEarnings: number;
}

function buildProductionRows(
  entries: ProductionEntry[],
  searchQ: string,
): ProductionRow[] {
  const empMap: Record<string, ProductionRow> = {};
  const employees = getEmployees();
  const operations = getOperations();

  for (const entry of entries) {
    const emp = employees.find((e) => e.id === entry.employeeId);
    const op = operations.find((o) => o.id === entry.operationId);
    if (!emp || !op) continue;
    if (!empMap[entry.employeeId]) {
      empMap[entry.employeeId] = {
        employeeId: entry.employeeId,
        name: emp.name,
        operations: "",
        totalPieces: 0,
        totalEarnings: 0,
      };
    }
    empMap[entry.employeeId].totalPieces += entry.quantity;
    empMap[entry.employeeId].totalEarnings += entry.amount;
    const opStr = `${op.name}(${entry.quantity})`;
    const existing = empMap[entry.employeeId].operations;
    empMap[entry.employeeId].operations = existing
      ? `${existing}, ${opStr}`
      : opStr;
  }

  const rows = Object.values(empMap);
  if (!searchQ) return rows;
  const q = searchQ.toLowerCase();
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("production");
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [reportDate, setReportDate] = useState(todayISO());
  const [salaryMonth, setSalaryMonth] = useState(currentMonth());
  const [bankMonth, setBankMonth] = useState(currentMonth());
  const [searchQ, setSearchQ] = useState("");

  const productionEntries = useMemo(() => {
    if (period === "daily") {
      return getProductionByDate(reportDate);
    }
    if (period === "weekly") {
      const { start, end } = getWeekRange(reportDate);
      const allProd = getProductionByMonth(reportDate.slice(0, 7));
      return allProd.filter((p) => p.date >= start && p.date <= end);
    }
    return getProductionByMonth(reportDate.slice(0, 7));
  }, [period, reportDate]);

  const productionRows = useMemo(
    () => buildProductionRows(productionEntries, searchQ),
    [productionEntries, searchQ],
  );

  const salaryRows = useMemo(
    () => getMonthlySalarySheet(salaryMonth),
    [salaryMonth],
  );

  const bankRows = useMemo(() => getMonthlySalarySheet(bankMonth), [bankMonth]);

  function exportProduction() {
    exportToExcel(
      productionRows.map((r) => ({
        name: r.name,
        operations: r.operations,
        totalPieces: r.totalPieces,
        totalEarnings: r.totalEarnings,
      })),
      [
        { header: "Employee Name", key: "name" },
        { header: "Operations", key: "operations" },
        { header: "Total Pieces", key: "totalPieces" },
        { header: "Total Earnings (INR)", key: "totalEarnings" },
      ],
      `Production_Report_${reportDate}`,
    );
  }

  function exportSalary() {
    exportToExcel(
      salaryRows.map((r) => ({
        name: r.name,
        attendance: r.attendanceCount,
        production: r.productionAmount,
        salary: r.salary,
      })),
      [
        { header: "Employee Name", key: "name" },
        { header: "Attendance Days", key: "attendance" },
        { header: "Production Amount (INR)", key: "production" },
        { header: "Salary (INR)", key: "salary" },
      ],
      `Salary_Sheet_${salaryMonth}`,
    );
  }

  function exportBank() {
    exportToExcel(
      bankRows.map((r) => ({
        name: r.name,
        account: r.accountNumber,
        ifsc: r.ifscCode,
        bank: r.bankName,
        salary: r.salary,
      })),
      [
        { header: "Employee Name", key: "name" },
        { header: "Account Number", key: "account" },
        { header: "IFSC Code", key: "ifsc" },
        { header: "Bank Name", key: "bank" },
        { header: "Salary (INR)", key: "salary" },
      ],
      `Bank_Transfer_${bankMonth}`,
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export production & salary data
          </p>
        </div>
        <BarChart3 className="w-5 h-5 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger
            data-ocid="reports.tab"
            value="production"
            className="text-xs"
          >
            Production
          </TabsTrigger>
          <TabsTrigger
            data-ocid="reports.tab"
            value="salary"
            className="text-xs"
          >
            Salary Sheet
          </TabsTrigger>
          <TabsTrigger data-ocid="reports.tab" value="bank" className="text-xs">
            Bank Transfer
          </TabsTrigger>
        </TabsList>

        {/* ── Production Report ── */}
        <TabsContent value="production" className="space-y-3 mt-4">
          {/* Period tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  period === p
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Date filter */}
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="h-9 text-sm"
          />

          {period === "weekly" && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Week: {formatDate(getWeekRange(reportDate).start)} —{" "}
              {formatDate(getWeekRange(reportDate).end)}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search worker..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Export */}
          <Button
            data-ocid="reports.export.button"
            variant="outline"
            size="sm"
            onClick={exportProduction}
            className="gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" />
            Export to CSV/Excel
          </Button>

          {/* Table */}
          <div className="data-table-wrapper">
            {productionRows.length === 0 ? (
              <div
                data-ocid="reports.empty_state"
                className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
              >
                No production data for this period
              </div>
            ) : (
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2.5 pr-3 font-medium">
                      Employee
                    </th>
                    <th className="text-left py-2.5 pr-3 font-medium">
                      Operations
                    </th>
                    <th className="text-right py-2.5 pr-3 font-medium">
                      Pieces
                    </th>
                    <th className="text-right py-2.5 font-medium">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {productionRows.map((row, idx) => (
                    <tr
                      key={row.employeeId}
                      data-ocid={`reports.item.${idx + 1}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 pr-3 font-medium">{row.name}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[180px] truncate">
                        {row.operations}
                      </td>
                      <td className="py-3 pr-3 text-right font-medium">
                        {row.totalPieces.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatINR(row.totalEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td
                      className="py-2.5 pr-3 font-bold text-xs uppercase"
                      colSpan={2}
                    >
                      Total
                    </td>
                    <td className="py-2.5 pr-3 text-right font-bold">
                      {productionRows
                        .reduce((s, r) => s + r.totalPieces, 0)
                        .toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 text-right font-bold text-primary">
                      {formatINR(
                        productionRows.reduce((s, r) => s + r.totalEarnings, 0),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ── Salary Sheet ── */}
        <TabsContent value="salary" className="space-y-3 mt-4">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                data-ocid="salary.month.input"
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              data-ocid="salary.export.button"
              variant="outline"
              size="sm"
              onClick={exportSalary}
              className="gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>

          {salaryRows.length === 0 ? (
            <div
              data-ocid="salary.empty_state"
              className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
            >
              No active employees
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2.5 pr-3 font-medium">
                      Employee
                    </th>
                    <th className="text-right py-2.5 pr-3 font-medium">Days</th>
                    <th className="text-right py-2.5 pr-3 font-medium">
                      Production
                    </th>
                    <th className="text-right py-2.5 font-medium">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryRows.map((row, idx) => (
                    <tr
                      key={row.employeeId}
                      data-ocid={`salary.item.${idx + 1}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {row.employeeId}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Badge
                          variant="outline"
                          className="text-xs font-semibold"
                        >
                          {row.attendanceCount}d
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-right text-muted-foreground">
                        {formatINR(row.productionAmount)}
                      </td>
                      <td className="py-3 text-right font-bold text-primary">
                        {formatINR(row.salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td
                      className="py-2.5 pr-3 font-bold text-xs uppercase"
                      colSpan={2}
                    >
                      Total
                    </td>
                    <td className="py-2.5 pr-3 text-right font-bold">
                      {formatINR(
                        salaryRows.reduce((s, r) => s + r.productionAmount, 0),
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-primary">
                      {formatINR(salaryRows.reduce((s, r) => s + r.salary, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Bank Transfer ── */}
        <TabsContent value="bank" className="space-y-3 mt-4">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                type="month"
                value={bankMonth}
                onChange={(e) => setBankMonth(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              data-ocid="reports.export.button"
              variant="outline"
              size="sm"
              onClick={exportBank}
              className="gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>

          {bankRows.length === 0 ? (
            <div
              data-ocid="bank.empty_state"
              className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
            >
              No data available
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2.5 pr-3 font-medium">Name</th>
                    <th className="text-left py-2.5 pr-3 font-medium">
                      Account No
                    </th>
                    <th className="text-left py-2.5 pr-3 font-medium">IFSC</th>
                    <th className="text-left py-2.5 pr-3 font-medium">Bank</th>
                    <th className="text-right py-2.5 font-medium">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {bankRows.map((row, idx) => (
                    <tr
                      key={row.employeeId}
                      data-ocid={`bank.item.${idx + 1}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 pr-3 font-medium">{row.name}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                        {row.accountNumber || "—"}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                        {row.ifscCode || "—"}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground truncate max-w-[120px]">
                        {row.bankName || "—"}
                      </td>
                      <td className="py-3 text-right font-bold text-primary">
                        {formatINR(row.salary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td
                      className="py-2.5 pr-3 font-bold text-xs uppercase"
                      colSpan={4}
                    >
                      Total Payroll
                    </td>
                    <td className="py-2.5 text-right font-bold text-primary">
                      {formatINR(bankRows.reduce((s, r) => s + r.salary, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
