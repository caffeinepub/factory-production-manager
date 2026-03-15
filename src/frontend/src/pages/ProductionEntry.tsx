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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Employee,
  type Operation,
  type ProductionEntry,
  addProductionEntry,
  deleteProductionEntry,
  getEmployeeById,
  getEmployees,
  getOperationById,
  getOperations,
  getProductionByDate,
} from "../store";
import { formatDate, formatINR, todayISO } from "../utils/exportExcel";

interface EntryRow {
  rowId: string;
  operationId: string;
  quantity: string;
}

export default function ProductionEntryPage() {
  const [date, setDate] = useState(todayISO());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([
    { rowId: "row-0", operationId: "", quantity: "" },
  ]);
  const [todayEntries, setTodayEntries] = useState<ProductionEntry[]>(() =>
    getProductionByDate(todayISO()),
  );

  const employees = useMemo(
    () => getEmployees().filter((e) => e.status === "Active"),
    [],
  );
  const operations = useMemo(() => getOperations(), []);

  function refreshEntries() {
    setTodayEntries(getProductionByDate(date));
  }

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
    setTodayEntries(getProductionByDate(newDate));
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d > tomorrow) return;
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
    setTodayEntries(getProductionByDate(newDate));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { rowId: `row-${Date.now()}`, operationId: "", quantity: "" },
    ]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const setRowField = useCallback(
    (idx: number, field: keyof EntryRow, value: string) => {
      setRows((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: value };
        return updated;
      });
    },
    [],
  );

  function getRate(operationId: string): number {
    if (!operationId) return 0;
    return getOperationById(operationId)?.ratePerPiece ?? 0;
  }

  function calcAmount(row: EntryRow): number {
    const qty = Number.parseInt(row.quantity);
    if (Number.isNaN(qty) || !row.operationId) return 0;
    return qty * getRate(row.operationId);
  }

  function handleSubmit() {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    const validRows = rows.filter((r) => {
      const qty = Number.parseInt(r.quantity);
      return r.operationId && !Number.isNaN(qty) && qty > 0;
    });

    if (validRows.length === 0) {
      toast.error("Please add at least one valid production entry");
      return;
    }

    for (const row of validRows) {
      addProductionEntry(
        date,
        selectedEmployeeId,
        row.operationId,
        Number.parseInt(row.quantity),
      );
    }

    toast.success(
      `${validRows.length} production entr${validRows.length === 1 ? "y" : "ies"} saved`,
    );

    // Reset form
    setRows([{ rowId: "row-0", operationId: "", quantity: "" }]);
    setSelectedEmployeeId("");
    refreshEntries();
  }

  function handleDeleteEntry(id: string) {
    deleteProductionEntry(id);
    refreshEntries();
    toast.success("Entry deleted");
  }

  // Group today's entries by employee
  const groupedEntries = useMemo(() => {
    const map: Record<
      string,
      { employee: Employee | undefined; entries: ProductionEntry[] }
    > = {};
    for (const entry of todayEntries) {
      if (!map[entry.employeeId]) {
        map[entry.employeeId] = {
          employee: getEmployeeById(entry.employeeId),
          entries: [],
        };
      }
      map[entry.employeeId].entries.push(entry);
    }
    return Object.values(map);
  }, [todayEntries]);

  const totalToday = useMemo(
    () => todayEntries.reduce((s, e) => s + e.amount, 0),
    [todayEntries],
  );

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Production Entry</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fast production data entry
          </p>
        </div>
        <ClipboardList className="w-5 h-5 text-primary" />
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
          data-ocid="production.date.input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTodayEntries(getProductionByDate(e.target.value));
          }}
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

      {/* Entry Form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">New Entry</h3>

        {/* Employee select */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            STEP 1 — Select Worker
          </Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger
              data-ocid="production.employee.select"
              className="h-11 text-base"
            >
              <SelectValue placeholder="Choose worker..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operation rows */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            STEP 2 — Operations & Quantities
          </Label>
          <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
            {rows.map((row, idx) => {
              const rate = getRate(row.operationId);
              const amount = calcAmount(row);
              return (
                <div key={row.rowId} className="flex gap-2 items-center">
                  <Select
                    value={row.operationId}
                    onValueChange={(v) => setRowField(idx, "operationId", v)}
                  >
                    <SelectTrigger
                      data-ocid="production.operation.select"
                      className="flex-1 h-10 text-sm"
                    >
                      <SelectValue placeholder="Operation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name} — ₹{op.ratePerPiece}/pc
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    data-ocid="production.quantity.input"
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) =>
                      setRowField(idx, "quantity", e.target.value)
                    }
                    className="w-20 h-10 text-center text-sm"
                  />

                  <div className="w-20 text-right">
                    {row.operationId && row.quantity ? (
                      <div>
                        <div className="text-xs font-semibold text-primary">
                          {formatINR(amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ₹{rate} × {row.quantity}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </div>

                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            className="mt-3 gap-1.5 text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </Button>
        </div>

        {/* Total preview */}
        {rows.some((r) => r.operationId && r.quantity) && (
          <div className="flex justify-between items-center bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">
              Total earnings:
            </span>
            <span className="font-bold text-primary">
              {formatINR(rows.reduce((s, r) => s + calcAmount(r), 0))}
            </span>
          </div>
        )}

        <Button
          data-ocid="production.submit.button"
          onClick={handleSubmit}
          className="w-full h-11 gap-2 touch-target"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save Production Entries
        </Button>
      </div>

      {/* Today's summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">
            Entries for {formatDate(date)}
          </h3>
          {todayEntries.length > 0 && (
            <span className="text-xs font-semibold text-primary">
              Total: {formatINR(totalToday)}
            </span>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <div
            data-ocid="production.empty_state"
            className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
          >
            No production entries for this date
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto pr-1 space-y-3">
            {groupedEntries.map((group) => (
              <div
                key={group.employee?.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="bg-primary/5 border-b border-border px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {group.employee?.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {formatINR(group.entries.reduce((s, e) => s + e.amount, 0))}
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {group.entries.map((entry, idx) => {
                    const op = operations.find(
                      (o) => o.id === entry.operationId,
                    );
                    return (
                      <div
                        key={entry.id}
                        data-ocid={`production.item.${idx + 1}`}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-foreground/80 flex-1">
                          {op?.name ?? entry.operationId}
                        </span>
                        <span className="text-muted-foreground text-xs mr-3">
                          {entry.quantity} pcs × ₹{op?.ratePerPiece}
                        </span>
                        <span className="font-semibold text-primary w-20 text-right">
                          {formatINR(entry.amount)}
                        </span>
                        <Button
                          data-ocid={`production.delete_button.${idx + 1}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="h-7 w-7 p-0 ml-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
