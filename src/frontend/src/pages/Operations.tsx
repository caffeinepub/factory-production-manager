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
import { Pencil, Plus, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Operation,
  getOperations,
  saveOperation,
  updateOperation,
} from "../store";

const EMPTY_FORM = { name: "", ratePerPiece: "" };

export default function Operations() {
  const [operations, setOperations] = useState<Operation[]>(() =>
    getOperations(),
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return operations.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    );
  }, [operations, search]);

  function refresh() {
    setOperations(getOperations());
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(op: Operation) {
    setEditTarget(op);
    setForm({ name: op.name, ratePerPiece: String(op.ratePerPiece) });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Operation name is required");
      return;
    }
    const rate = Number.parseFloat(form.ratePerPiece);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error("Rate must be a positive number");
      return;
    }

    if (editTarget) {
      updateOperation({ ...editTarget, name: form.name, ratePerPiece: rate });
      toast.success("Operation updated");
    } else {
      saveOperation({ name: form.name, ratePerPiece: rate });
      toast.success("Operation added");
    }
    setDialogOpen(false);
    refresh();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Operations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {operations.length} operations defined
          </p>
        </div>
        <Button
          data-ocid="operations.add.button"
          onClick={openAdd}
          size="sm"
          className="gap-1.5 touch-target"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-ocid="operations.search.input"
          placeholder="Search operations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Operations list */}
      {filtered.length === 0 ? (
        <div
          data-ocid="operations.empty_state"
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <Settings2 className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No operations found</p>
        </div>
      ) : (
        <div data-ocid="operations.table" className="data-table-wrapper">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2.5 pr-3 font-medium">ID</th>
                <th className="text-left py-2.5 pr-3 font-medium">
                  Operation Name
                </th>
                <th className="text-right py-2.5 pr-3 font-medium">
                  Rate / Piece
                </th>
                <th className="text-right py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((op, idx) => (
                <tr
                  key={op.id}
                  data-ocid={`operations.item.${idx + 1}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                    {op.id}
                  </td>
                  <td className="py-3 pr-3 font-medium">{op.name}</td>
                  <td className="py-3 pr-3 text-right">
                    <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                      ₹{op.ratePerPiece}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      data-ocid={`operations.edit_button.${idx + 1}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(op)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="operations.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Operation" : "Add Operation"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Operation Name *</Label>
              <Input
                data-ocid="operations.input"
                className="mt-1"
                placeholder="e.g. Collar Join"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Rate Per Piece (₹) *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ₹
                </span>
                <Input
                  className="pl-7"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.00"
                  value={form.ratePerPiece}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ratePerPiece: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              data-ocid="operations.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button data-ocid="operations.save_button" onClick={handleSubmit}>
              {editTarget ? "Update" : "Add Operation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
