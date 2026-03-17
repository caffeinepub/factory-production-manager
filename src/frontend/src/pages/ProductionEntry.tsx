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
  Briefcase,
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
  type AdditionalWork,
  type Employee,
  type ProductionEntry,
  addAdditionalWork,
  addProductionEntry,
  deleteAdditionalWork,
  deleteProductionEntry,
  getAdditionalWorkByDate,
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

interface AdditionalWorkRow {
  rowId: string;
  description: string;
  amount: string;
}

export default function ProductionEntryPage() {
  const [date, setDate] = useState(todayISO());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([
    { rowId: "row-0", operationId: "", quantity: "" },
  ]);
  const [additionalRows, setAdditionalRows] = useState<AdditionalWorkRow[]>([]);
  const [todayEntries, setTodayEntries] = useState<ProductionEntry[]>(() =>
    getProductionByDate(todayISO()),
  );
  const [todayAdditionalWorks, setTodayAdditionalWorks] = useState<
    AdditionalWork[]
  >(() => getAdditionalWorkByDate(todayISO()));

  const employees = useMemo(
    () => getEmployees().filter((e) => e.status === "Active"),
    [],
  );
  const operations = useMemo(() => getOperations(), []);

  function refreshEntries(forDate?: string) {
    const d = forDate ?? date;
    setTodayEntries(getProductionByDate(d));
    setTodayAdditionalWorks(getAdditionalWorkByDate(d));
  }

  function prevDay() {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
    refreshEntries(newDate);
  }

  function nextDay() {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d > tomorrow) return;
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
    refreshEntries(newDate);
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

  function addAdditionalRow() {
    setAdditionalRows((prev) => [
      ...prev,
      { rowId: `addl-${Date.now()}`, description: "", amount: "" },
    ]);
  }

  function removeAdditionalRow(idx: number) {
    setAdditionalRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const setAdditionalRowField = useCallback(
    (idx: number, field: keyof AdditionalWorkRow, value: string) => {
      setAdditionalRows((prev) => {
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

  const additionalSubtotal = useMemo(() => {
    return additionalRows.reduce((s, r) => {
      const amt = Number.parseFloat(r.amount);
      return s + (Number.isNaN(amt) ? 0 : amt);
    }, 0);
  }, [additionalRows]);

  function handleSubmit() {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    const validRows = rows.filter((r) => {
      const qty = Number.parseInt(r.quantity);
      return r.operationId && !Number.isNaN(qty) && qty > 0;
    });

    const validAdditionalRows = additionalRows.filter((r) => {
      const amt = Number.parseFloat(r.amount);
      return r.description.trim() && !Number.isNaN(amt) && amt > 0;
    });

    if (validRows.length === 0 && validAdditionalRows.length === 0) {
      toast.error(
        "Please add at least one valid production or additional work entry",
      );
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

    for (const row of validAdditionalRows) {
      addAdditionalWork(
        date,
        selectedEmployeeId,
        row.description.trim(),
        Number.parseFloat(row.amount),
      );
    }

    const total = validRows.length + validAdditionalRows.length;
    toast.success(
      `${total} entr${total === 1 ? "y" : "ies"} saved${
        validAdditionalRows.length > 0
          ? ` (incl. ${validAdditionalRows.length} additional work)`
          : ""
      }`,
    );

    setRows([{ rowId: "row-0", operationId: "", quantity: "" }]);
    setAdditionalRows([]);
    setSelectedEmployeeId("");
    refreshEntries();
  }

  function handleDeleteEntry(id: string) {
    deleteProductionEntry(id);
    refreshEntries();
    toast.success("Entry deleted");
  }

  function handleDeleteAdditionalWork(id: string) {
    deleteAdditionalWork(id);
    refreshEntries();
    toast.success("Additional work deleted");
  }

  const groupedEntries = useMemo(() => {
    const map: Record<
      string,
      {
        employee: Employee | undefined;
        entries: ProductionEntry[];
        additionalWorks: AdditionalWork[];
      }
    > = {};
    for (const entry of todayEntries) {
      if (!map[entry.employeeId]) {
        map[entry.employeeId] = {
          employee: getEmployeeById(entry.employeeId),
          entries: [],
          additionalWorks: [],
        };
      }
      map[entry.employeeId].entries.push(entry);
    }
    for (const aw of todayAdditionalWorks) {
      if (!map[aw.employeeId]) {
        map[aw.employeeId] = {
          employee: getEmployeeById(aw.employeeId),
          entries: [],
          additionalWorks: [],
        };
      }
      map[aw.employeeId].additionalWorks.push(aw);
    }
    return Object.values(map);
  }, [todayEntries, todayAdditionalWorks]);

  const totalToday = useMemo(
    () =>
      todayEntries.reduce((s, e) => s + e.amount, 0) +
      todayAdditionalWorks.reduce((s, a) => s + a.amount, 0),
    [todayEntries, todayAdditionalWorks],
  );

  const hasEntries = todayEntries.length > 0 || todayAdditionalWorks.length > 0;

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
            const newDate = e.target.value;
            setDate(newDate);
            refreshEntries(newDate);
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

        {/* STEP 1 */}
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
            <SelectContent className="max-h-60 overflow-y-auto">
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* STEP 2 */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            STEP 2 — Operations & Quantities
          </Label>
          <div
            className="max-h-56 overflow-y-auto pr-1 space-y-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border) transparent",
            }}
          >
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
                    <SelectContent className="max-h-52 overflow-y-auto">
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

        {/* STEP 3 — Additional Work */}
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              STEP 3 — Additional Work
              <span className="font-normal text-amber-600">(Optional)</span>
            </Label>
            <Button
              data-ocid="production.add_additional_work.button"
              variant="outline"
              size="sm"
              onClick={addAdditionalRow}
              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>

          {additionalRows.length === 0 ? (
            <p className="text-xs text-amber-600/70 py-1">
              Click “Add” to record overtime, repairs, cleaning, or other extra
              work with a salary amount.
            </p>
          ) : (
            <>
              <div
                className="space-y-2"
                style={{
                  maxHeight: additionalRows.length > 2 ? "10rem" : "auto",
                  overflowY: additionalRows.length > 2 ? "auto" : "visible",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#d97706 transparent",
                }}
              >
                {additionalRows.map((row, idx) => (
                  <div key={row.rowId} className="flex gap-2 items-center">
                    <Input
                      data-ocid="production.additional_work.input"
                      placeholder="Description (e.g. Overtime, Repair...)"
                      value={row.description}
                      onChange={(e) =>
                        setAdditionalRowField(
                          idx,
                          "description",
                          e.target.value,
                        )
                      }
                      className="flex-1 h-9 text-sm border-amber-200 focus-visible:ring-amber-400 bg-white"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-600 font-medium pointer-events-none">
                        ₹
                      </span>
                      <Input
                        data-ocid="production.additional_amount.input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={row.amount}
                        onChange={(e) =>
                          setAdditionalRowField(idx, "amount", e.target.value)
                        }
                        className="w-24 h-9 pl-6 text-sm border-amber-200 focus-visible:ring-amber-400 bg-white"
                      />
                    </div>
                    <Button
                      data-ocid={`production.delete_additional.button.${idx + 1}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdditionalRow(idx)}
                      className="h-8 w-8 p-0 text-amber-600 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {additionalSubtotal > 0 && (
                <div className="flex justify-between items-center bg-amber-100 border border-amber-200 rounded px-2.5 py-1.5 mt-1">
                  <span className="text-xs text-amber-700">
                    Additional subtotal:
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {formatINR(additionalSubtotal)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Total preview */}
        {(rows.some((r) => r.operationId && r.quantity) ||
          additionalSubtotal > 0) && (
          <div className="flex justify-between items-center bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground">
              Total earnings:
            </span>
            <span className="font-bold text-primary">
              {formatINR(
                rows.reduce((s, r) => s + calcAmount(r), 0) +
                  additionalSubtotal,
              )}
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
          {hasEntries && (
            <span className="text-xs font-semibold text-primary">
              Total: {formatINR(totalToday)}
            </span>
          )}
        </div>

        {!hasEntries ? (
          <div
            data-ocid="production.empty_state"
            className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
          >
            No production entries for this date
          </div>
        ) : (
          <div
            className="max-h-96 overflow-y-auto pr-1 space-y-3"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "var(--border) transparent",
            }}
          >
            {groupedEntries.map((group) => {
              const prodTotal = group.entries.reduce((s, e) => s + e.amount, 0);
              const addlTotal = group.additionalWorks.reduce(
                (s, a) => s + a.amount,
                0,
              );
              return (
                <div
                  key={group.employee?.id ?? "unknown"}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <div className="bg-primary/5 border-b border-border px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {group.employee?.name ?? "Unknown"}
                    </span>
                    <span className="text-xs text-primary font-medium">
                      {formatINR(prodTotal + addlTotal)}
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
                    {group.additionalWorks.map((aw, idx) => (
                      <div
                        key={aw.id}
                        data-ocid={`production.additional.item.${idx + 1}`}
                        className="flex items-center justify-between px-3 py-2 text-sm bg-amber-50/50"
                      >
                        <span className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            Extra
                          </span>
                          <span className="text-foreground/80 text-xs truncate">
                            {aw.description}
                          </span>
                        </span>
                        <span className="font-semibold text-amber-700 w-20 text-right shrink-0">
                          {formatINR(aw.amount)}
                        </span>
                        <Button
                          data-ocid={`production.delete_additional.button.${idx + 1}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdditionalWork(aw.id)}
                          className="h-7 w-7 p-0 ml-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
