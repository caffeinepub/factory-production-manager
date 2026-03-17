import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Scissors, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Employee,
  type Operation,
  type ProductionEntry,
  addProductionEntry,
  deleteProductionEntry,
  getEmployeeById,
  getEmployeesByDepartment,
  getOperationById,
  getOperations,
  getProductionByDate,
  getProductionByEmployeeMonth,
} from "../store";
import { todayISO } from "../utils/exportExcel";

function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinishingDepartment() {
  const [date, setDate] = useState(todayISO());
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedOperation, setSelectedOperation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [todayEntries, setTodayEntries] = useState<ProductionEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO());

  const finishingEmployees: Employee[] = useMemo(
    () =>
      getEmployeesByDepartment("Finishing").filter(
        (e) => e.status === "Active",
      ),
    [],
  );

  const operations: Operation[] = useMemo(() => getOperations(), []);

  const refreshEntries = useCallback(
    (d: string) => {
      const allEntries = getProductionByDate(d);
      const finishingIds = new Set(finishingEmployees.map((e) => e.id));
      setTodayEntries(allEntries.filter((e) => finishingIds.has(e.employeeId)));
    },
    [finishingEmployees],
  );

  useEffect(() => {
    refreshEntries(date);
  }, [date, refreshEntries]);

  function handleAdd() {
    if (!selectedWorker) {
      toast.error("Please select a worker");
      return;
    }
    if (!selectedOperation) {
      toast.error("Please select an operation");
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    addProductionEntry(date, selectedWorker, selectedOperation, qty);
    toast.success("Entry added");
    setQuantity("");
    refreshEntries(date);
  }

  function handleDelete(id: string) {
    deleteProductionEntry(id);
    toast.success("Entry deleted");
    refreshEntries(date);
  }

  // Monthly summary
  const monthlySummary = useMemo(() => {
    return finishingEmployees.map((emp) => {
      const entries = getProductionByEmployeeMonth(emp.id, selectedMonth);
      const totalPieces = entries.reduce((s, e) => s + e.quantity, 0);
      const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

      const opMap: Record<
        string,
        { name: string; pieces: number; amount: number }
      > = {};
      for (const entry of entries) {
        const op = getOperationById(entry.operationId);
        const opName = op?.name ?? entry.operationId;
        if (!opMap[entry.operationId]) {
          opMap[entry.operationId] = { name: opName, pieces: 0, amount: 0 };
        }
        opMap[entry.operationId].pieces += entry.quantity;
        opMap[entry.operationId].amount += entry.amount;
      }

      return {
        emp,
        totalPieces,
        totalAmount,
        opBreakdown: Object.values(opMap),
      };
    });
  }, [finishingEmployees, selectedMonth]);

  const grandTotal = useMemo(
    () => ({
      pieces: monthlySummary.reduce((s, r) => s + r.totalPieces, 0),
      amount: monthlySummary.reduce((s, r) => s + r.totalAmount, 0),
    }),
    [monthlySummary],
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-xl font-display font-bold">Finishing Dept</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-10">
            Piece rate production tracking
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          {finishingEmployees.length} workers
        </Badge>
      </div>

      <Tabs defaultValue="entry">
        <TabsList className="w-full">
          <TabsTrigger
            value="entry"
            className="flex-1"
            data-ocid="finishing.tab"
          >
            Production Entry
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex-1"
            data-ocid="finishing.tab"
          >
            Monthly Summary
          </TabsTrigger>
        </TabsList>

        {/* ─── Production Entry Tab ─── */}
        <TabsContent value="entry" className="space-y-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              data-ocid="finishing.date.input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Worker</Label>
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger
                data-ocid="finishing.worker.select"
                className="mt-1"
              >
                <SelectValue placeholder="Select finishing worker..." />
              </SelectTrigger>
              <SelectContent>
                {finishingEmployees.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No finishing employees found
                  </SelectItem>
                ) : (
                  finishingEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Operation</Label>
            <Select
              value={selectedOperation}
              onValueChange={setSelectedOperation}
            >
              <SelectTrigger
                data-ocid="finishing.operation.select"
                className="mt-1"
              >
                <SelectValue placeholder="Select operation..." />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.name} — ₹{op.ratePerPiece}/pc
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Quantity</Label>
            <div className="flex gap-2 mt-1">
              <Input
                data-ocid="finishing.quantity.input"
                type="number"
                min="1"
                placeholder="No. of pieces"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button
                data-ocid="finishing.add.button"
                onClick={handleAdd}
                className="gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">
              Entries for {date}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({todayEntries.length} records)
              </span>
            </h3>

            {todayEntries.length === 0 ? (
              <div
                data-ocid="finishing.entries.empty_state"
                className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg"
              >
                <Scissors className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No entries for this date</p>
              </div>
            ) : (
              <div
                data-ocid="finishing.entries.table"
                className="data-table-wrapper"
              >
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">
                        Worker
                      </th>
                      <th className="text-left py-2 pr-3 font-medium">
                        Operation
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">Qty</th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Amount
                      </th>
                      <th className="text-right py-2 font-medium">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayEntries.map((entry: ProductionEntry, idx: number) => {
                      const emp = getEmployeeById(entry.employeeId);
                      const op = getOperationById(entry.operationId);
                      return (
                        <tr
                          key={entry.id}
                          data-ocid={`finishing.entries.item.${idx + 1}`}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-2.5 pr-3 font-medium">
                            {emp?.name ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-muted-foreground text-xs">
                            {op?.name ?? "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            {entry.quantity}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-semibold">
                            ₹{entry.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              data-ocid={`finishing.entries.delete_button.${idx + 1}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entry.id)}
                              className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td
                        colSpan={3}
                        className="py-2.5 pr-3 text-right text-xs font-semibold text-muted-foreground"
                      >
                        Total
                      </td>
                      <td className="py-2.5 pr-3 text-right font-bold">
                        ₹
                        {todayEntries
                          .reduce((s, e) => s + e.amount, 0)
                          .toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Monthly Summary Tab ─── */}
        <TabsContent value="summary" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-base">
              Monthly Summary
            </h3>
            <Input
              data-ocid="finishing.month.input"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 text-sm"
            />
          </div>

          {finishingEmployees.length === 0 ? (
            <div
              data-ocid="finishing.summary.empty_state"
              className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg"
            >
              <Scissors className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No finishing employees found</p>
            </div>
          ) : (
            <>
              <div data-ocid="finishing.summary.table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Total Pieces</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummary.map(({ emp, totalPieces, totalAmount }) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {totalPieces}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-border bg-muted/30">
                      <TableCell className="font-bold">Grand Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {grandTotal.pieces}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{grandTotal.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Operation Breakdown
                </h4>
                {monthlySummary.map(({ emp, opBreakdown }) => (
                  <div
                    key={emp.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <p className="font-semibold text-sm">{emp.name}</p>
                    {opBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No entries this month
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="text-left py-1 font-medium">
                              Operation
                            </th>
                            <th className="text-right py-1 font-medium">
                              Pieces
                            </th>
                            <th className="text-right py-1 font-medium">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {opBreakdown.map((ob) => (
                            <tr
                              key={ob.name}
                              className="border-b border-border/40"
                            >
                              <td className="py-1.5">{ob.name}</td>
                              <td className="py-1.5 text-right">{ob.pieces}</td>
                              <td className="py-1.5 text-right font-medium">
                                ₹{ob.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
