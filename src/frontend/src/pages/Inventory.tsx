import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type InventoryItem,
  type StockTransaction,
  addStockTransaction,
  deleteInventoryItem,
  getInventoryItems,
  getInventoryStats,
  getStockTransactionsByItem,
  saveInventoryItem,
  updateInventoryItem,
} from "../store";

const UNIT_OPTIONS = [
  "pcs",
  "kg",
  "meters",
  "rolls",
  "liters",
  "pairs",
  "sets",
  "other",
] as const;

const EMPTY_ITEM_FORM = {
  name: "",
  category: "",
  unit: "pcs",
  currentStock: "",
  minStock: "",
  unitCost: "",
  supplier: "",
  notes: "",
};

const EMPTY_STOCK_FORM = {
  quantity: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(() =>
    getInventoryItems(),
  );
  const [stats, setStats] = useState(() => getInventoryStats());
  const [search, setSearch] = useState("");

  // Add/Edit dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  // Stock In/Out dialog
  const [stockDialogMode, setStockDialogMode] = useState<"in" | "out" | null>(
    null,
  );
  const [stockTargetId, setStockTargetId] = useState<string>("");
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);

  // History sheet
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyTxns, setHistoryTxns] = useState<StockTransaction[]>([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    );
  }, [items, search]);

  function refresh() {
    setItems(getInventoryItems());
    setStats(getInventoryStats());
  }

  // ── Item form ──
  function openAdd() {
    setEditTarget(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditTarget(item);
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: String(item.currentStock),
      minStock: String(item.minStock),
      unitCost: String(item.unitCost),
      supplier: item.supplier,
      notes: item.notes,
    });
    setItemDialogOpen(true);
  }

  function setItemField<K extends keyof typeof EMPTY_ITEM_FORM>(
    key: K,
    value: (typeof EMPTY_ITEM_FORM)[K],
  ) {
    setItemForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleItemSubmit() {
    if (!itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!itemForm.category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!itemForm.unit) {
      toast.error("Unit is required");
      return;
    }
    const currentStock = Number(itemForm.currentStock);
    const minStock = Number(itemForm.minStock);
    const unitCost = Number(itemForm.unitCost);
    if (Number.isNaN(currentStock) || currentStock < 0) {
      toast.error("Current stock must be a non-negative number");
      return;
    }
    if (Number.isNaN(minStock) || minStock < 0) {
      toast.error("Min stock must be a non-negative number");
      return;
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      toast.error("Unit cost must be a non-negative number");
      return;
    }

    const data = {
      name: itemForm.name.trim(),
      category: itemForm.category.trim(),
      unit: itemForm.unit,
      currentStock,
      minStock,
      unitCost,
      supplier: itemForm.supplier.trim(),
      notes: itemForm.notes.trim(),
    };

    if (editTarget) {
      updateInventoryItem({ ...editTarget, ...data });
      toast.success("Item updated");
    } else {
      saveInventoryItem(data);
      toast.success("Item added to inventory");
    }
    setItemDialogOpen(false);
    refresh();
  }

  // ── Stock In/Out ──
  function openStockIn(item: InventoryItem) {
    setStockTargetId(item.id);
    setStockForm({
      ...EMPTY_STOCK_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setStockDialogMode("in");
  }

  function openStockOut(item: InventoryItem) {
    setStockTargetId(item.id);
    setStockForm({
      ...EMPTY_STOCK_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setStockDialogMode("out");
  }

  function handleStockSubmit() {
    const qty = Number(stockForm.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    if (!stockForm.date) {
      toast.error("Date is required");
      return;
    }
    if (stockDialogMode === "out") {
      const item = items.find((i) => i.id === stockTargetId);
      if (item && qty > item.currentStock) {
        toast.error(
          `Cannot remove more than current stock (${item.currentStock} ${item.unit})`,
        );
        return;
      }
    }
    addStockTransaction(
      stockTargetId,
      stockForm.date,
      stockDialogMode!,
      qty,
      stockForm.note.trim(),
    );
    toast.success(stockDialogMode === "in" ? "Stock added" : "Stock removed");
    setStockDialogMode(null);
    refresh();
  }

  // ── History ──
  function openHistory(item: InventoryItem) {
    setHistoryItemId(item.id);
    setHistoryTxns(getStockTransactionsByItem(item.id).slice().reverse());
  }

  // ── Delete ──
  function handleDelete() {
    if (!deleteTarget) return;
    deleteInventoryItem(deleteTarget.id);
    toast.success("Item deleted");
    setDeleteTarget(null);
    refresh();
  }

  const historyItem = historyItemId
    ? items.find((i) => i.id === historyItemId)
    : null;
  const stockTarget = stockTargetId
    ? items.find((i) => i.id === stockTargetId)
    : null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Inventory</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.totalItems} items &middot; {stats.lowStockCount} low stock
          </p>
        </div>
        <Button
          data-ocid="inventory.add_item_button"
          onClick={openAdd}
          size="sm"
          className="gap-1.5 touch-target"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground leading-tight">
            Total Items
          </p>
          <p className="text-2xl font-display font-bold mt-1">
            {stats.totalItems}
          </p>
        </div>
        <div className="stat-card border-warning/30">
          <p className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Low Stock
          </p>
          <p
            className={`text-2xl font-display font-bold mt-1 ${stats.lowStockCount > 0 ? "text-warning" : "text-foreground"}`}
          >
            {stats.lowStockCount}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground leading-tight">
            Total Value
          </p>
          <p className="text-lg font-display font-bold mt-1 text-primary leading-tight">
            {formatRupee(stats.totalValue)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-ocid="inventory.search_input"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div
          data-ocid="inventory.empty_state"
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <Package className="w-12 h-12 mb-3 opacity-25" />
          <p className="text-sm font-medium">No inventory items found</p>
          <p className="text-xs opacity-70 mt-1">
            {search
              ? "Try a different search term"
              : "Add your first item to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block data-table-wrapper">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2.5 pr-3 font-medium">ID</th>
                  <th className="text-left py-2.5 pr-3 font-medium">Name</th>
                  <th className="text-left py-2.5 pr-3 font-medium">
                    Category
                  </th>
                  <th className="text-left py-2.5 pr-3 font-medium">Unit</th>
                  <th className="text-right py-2.5 pr-3 font-medium">Stock</th>
                  <th className="text-right py-2.5 pr-3 font-medium">Min</th>
                  <th className="text-right py-2.5 pr-3 font-medium">
                    Unit Cost
                  </th>
                  <th className="text-left py-2.5 pr-3 font-medium">
                    Supplier
                  </th>
                  <th className="text-right py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const isLow = item.currentStock <= item.minStock;
                  return (
                    <tr
                      key={item.id}
                      data-ocid={`inventory.item.${idx + 1}`}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                        {item.id}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openHistory(item)}
                            className="font-medium hover:text-primary transition-colors text-left"
                          >
                            {item.name}
                          </button>
                          {isLow && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-warning/40 text-warning bg-warning/10"
                            >
                              Low
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground text-xs">
                        {item.category}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {item.unit}
                      </td>
                      <td
                        className={`py-3 pr-3 text-right font-semibold ${isLow ? "text-warning" : ""}`}
                      >
                        {item.currentStock}
                      </td>
                      <td className="py-3 pr-3 text-right text-muted-foreground text-xs">
                        {item.minStock}
                      </td>
                      <td className="py-3 pr-3 text-right text-primary font-medium">
                        {formatRupee(item.unitCost)}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[120px] truncate">
                        {item.supplier || "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            data-ocid={`inventory.stock_in_button.${idx + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => openStockIn(item)}
                            className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                            title="Stock In"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            data-ocid={`inventory.stock_out_button.${idx + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => openStockOut(item)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Stock Out"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistory(item)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            data-ocid={`inventory.edit_button.${idx + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            className="h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            data-ocid={`inventory.delete_button.${idx + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((item, idx) => {
              const isLow = item.currentStock <= item.minStock;
              return (
                <div
                  key={item.id}
                  data-ocid={`inventory.item.${idx + 1}`}
                  className={`bg-card rounded-lg border p-4 space-y-3 ${isLow ? "border-warning/40" : "border-border"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {item.name}
                        </span>
                        {isLow && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-warning/40 text-warning bg-warning/10 shrink-0"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{item.id}</span>
                        <span>&middot;</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-lg font-display font-bold leading-none ${isLow ? "text-warning" : ""}`}
                      >
                        {item.currentStock}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {item.unit}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        min: {item.minStock}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Unit Cost</span>
                      <p className="font-semibold text-primary">
                        {formatRupee(item.unitCost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Value</span>
                      <p className="font-semibold">
                        {formatRupee(item.currentStock * item.unitCost)}
                      </p>
                    </div>
                    {item.supplier && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Supplier</span>
                        <p className="truncate">{item.supplier}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <Button
                      data-ocid={`inventory.stock_in_button.${idx + 1}`}
                      variant="outline"
                      size="sm"
                      onClick={() => openStockIn(item)}
                      className="flex-1 gap-1.5 text-success border-success/30 hover:bg-success/10 hover:text-success h-9"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Stock In
                    </Button>
                    <Button
                      data-ocid={`inventory.stock_out_button.${idx + 1}`}
                      variant="outline"
                      size="sm"
                      onClick={() => openStockOut(item)}
                      className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-9"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      Stock Out
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openHistory(item)}
                      className="h-9 w-9 p-0 text-muted-foreground"
                      title="History"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      data-ocid={`inventory.edit_button.${idx + 1}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="h-9 w-9 p-0"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      data-ocid={`inventory.delete_button.${idx + 1}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                      className="h-9 w-9 p-0 text-destructive/60 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Add/Edit Item Dialog ── */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent
          data-ocid="inventory.add_item_dialog"
          className="max-w-md max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Item Name *</Label>
                <Input
                  data-ocid="inventory.name_input"
                  className="mt-1"
                  placeholder="e.g. Cotton Thread"
                  value={itemForm.name}
                  onChange={(e) => setItemField("name", e.target.value)}
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Input
                  data-ocid="inventory.category_input"
                  className="mt-1"
                  placeholder="e.g. Raw Material"
                  value={itemForm.category}
                  onChange={(e) => setItemField("category", e.target.value)}
                />
              </div>

              <div>
                <Label>Unit *</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(v) => setItemField("unit", v)}
                >
                  <SelectTrigger
                    data-ocid="inventory.unit_select"
                    className="mt-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Current Stock *</Label>
                <Input
                  data-ocid="inventory.stock_input"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="0"
                  value={itemForm.currentStock}
                  onChange={(e) => setItemField("currentStock", e.target.value)}
                />
              </div>

              <div>
                <Label>Min Stock (Reorder Level) *</Label>
                <Input
                  data-ocid="inventory.min_stock_input"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="0"
                  value={itemForm.minStock}
                  onChange={(e) => setItemField("minStock", e.target.value)}
                />
              </div>

              <div>
                <Label>Unit Cost (₹) *</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                    ₹
                  </span>
                  <Input
                    data-ocid="inventory.cost_input"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    placeholder="0.00"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemField("unitCost", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Supplier</Label>
                <Input
                  data-ocid="inventory.supplier_input"
                  className="mt-1"
                  placeholder="Supplier name"
                  value={itemForm.supplier}
                  onChange={(e) => setItemField("supplier", e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  data-ocid="inventory.notes_textarea"
                  className="mt-1 resize-none"
                  rows={2}
                  placeholder="Optional notes..."
                  value={itemForm.notes}
                  onChange={(e) => setItemField("notes", e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              data-ocid="inventory.cancel_button"
              variant="outline"
              onClick={() => setItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="inventory.submit_button"
              onClick={handleItemSubmit}
            >
              {editTarget ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stock In Dialog ── */}
      <Dialog
        open={stockDialogMode === "in"}
        onOpenChange={(open) => !open && setStockDialogMode(null)}
      >
        <DialogContent
          data-ocid="inventory.stock_in_dialog"
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-success" />
              Stock In
            </DialogTitle>
          </DialogHeader>
          {stockTarget && (
            <p className="text-sm text-muted-foreground -mt-1">
              <span className="font-medium text-foreground">
                {stockTarget.name}
              </span>
              {" — "}current: {stockTarget.currentStock} {stockTarget.unit}
            </p>
          )}
          <div className="space-y-4 py-2">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                className="mt-1"
                value={stockForm.date}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                className="mt-1"
                placeholder="Enter quantity"
                value={stockForm.quantity}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Purchase from supplier"
                value={stockForm.note}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStockDialogMode(null)}>
              Cancel
            </Button>
            <Button
              data-ocid="inventory.submit_button"
              onClick={handleStockSubmit}
              className="bg-success hover:bg-success/90 text-white"
            >
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stock Out Dialog ── */}
      <Dialog
        open={stockDialogMode === "out"}
        onOpenChange={(open) => !open && setStockDialogMode(null)}
      >
        <DialogContent
          data-ocid="inventory.stock_out_dialog"
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-destructive" />
              Stock Out
            </DialogTitle>
          </DialogHeader>
          {stockTarget && (
            <p className="text-sm text-muted-foreground -mt-1">
              <span className="font-medium text-foreground">
                {stockTarget.name}
              </span>
              {" — "}current: {stockTarget.currentStock} {stockTarget.unit}
            </p>
          )}
          <div className="space-y-4 py-2">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                className="mt-1"
                value={stockForm.date}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                className="mt-1"
                placeholder="Enter quantity"
                value={stockForm.quantity}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Used in production"
                value={stockForm.note}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStockDialogMode(null)}>
              Cancel
            </Button>
            <Button
              data-ocid="inventory.submit_button"
              onClick={handleStockSubmit}
              variant="destructive"
            >
              Remove Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transaction History Sheet ── */}
      <Sheet
        open={historyItemId !== null}
        onOpenChange={(open) => !open && setHistoryItemId(null)}
      >
        <SheetContent
          data-ocid="inventory.history_sheet"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2">
              <History className="w-4 h-4" />
              Transaction History
            </SheetTitle>
          </SheetHeader>
          {historyItem && (
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {historyItem.name} &middot; {historyItem.currentStock}{" "}
              {historyItem.unit} in stock
            </p>
          )}
          {historyTxns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyTxns.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50"
                >
                  <div
                    className={`mt-0.5 rounded-full p-1 ${txn.type === "in" ? "bg-success/15" : "bg-destructive/15"}`}
                  >
                    {txn.type === "in" ? (
                      <ArrowUpCircle className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <ArrowDownCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          txn.type === "in"
                            ? "border-success/40 text-success bg-success/10"
                            : "border-destructive/40 text-destructive bg-destructive/10"
                        }`}
                      >
                        {txn.type === "in" ? "IN" : "OUT"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(txn.date)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`font-semibold text-sm ${txn.type === "in" ? "text-success" : "text-destructive"}`}
                      >
                        {txn.type === "in" ? "+" : "-"}
                        {txn.quantity} {historyItem?.unit}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {txn.id}
                      </span>
                    </div>
                    {txn.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {txn.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">
              Delete Item
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>
            ? This will also remove all transaction history. This action cannot
            be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="inventory.cancel_button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="inventory.confirm_button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
