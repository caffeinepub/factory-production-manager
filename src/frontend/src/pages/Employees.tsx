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
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Department,
  type Employee,
  type EmployeeStatus,
  type WorkerType,
  deleteEmployee,
  getEmployees,
  saveEmployee,
  updateEmployee,
} from "../store";
import { formatDate } from "../utils/exportExcel";

const DEPT_COLORS: Record<Department, string> = {
  "Back Office": "bg-blue-50 text-blue-700 border-blue-200",
  Production: "bg-amber-50 text-amber-700 border-amber-200",
  Finishing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Production & Finishing": "bg-purple-50 text-purple-700 border-purple-200",
};

const EMPTY_FORM = {
  name: "",
  mobile: "",
  joiningDate: "",
  workerType: "PieceRate" as WorkerType,
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  status: "Active" as EmployeeStatus,
  department: "Production" as Department,
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.mobile.includes(q),
    );
  }, [employees, search]);

  function refresh() {
    setEmployees(getEmployees());
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp);
    setForm({
      name: emp.name,
      mobile: emp.mobile,
      joiningDate: emp.joiningDate,
      workerType: emp.workerType,
      accountNumber: emp.accountNumber,
      ifscCode: emp.ifscCode,
      bankName: emp.bankName,
      status: emp.status,
      department: emp.department ?? "Production",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Employee name is required");
      return;
    }
    if (!form.mobile.trim()) {
      toast.error("Mobile number is required");
      return;
    }
    if (!form.joiningDate) {
      toast.error("Joining date is required");
      return;
    }

    if (editTarget) {
      updateEmployee({ ...editTarget, ...form });
      toast.success("Employee updated successfully");
    } else {
      saveEmployee(form);
      toast.success("Employee added successfully");
    }
    setDialogOpen(false);
    refresh();
  }

  function setField<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEmployee(deleteTarget.id);
    toast.success(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
    refresh();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="text-xl font-display font-bold">Employees</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {employees.filter((e) => e.status === "Active").length} active /{" "}
            {employees.length} total
          </p>
        </div>
        <Button
          data-ocid="employees.add.button"
          onClick={openAdd}
          size="sm"
          className="gap-1.5 touch-target"
        >
          <UserPlus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-ocid="employees.search.input"
          placeholder="Search by name, ID or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          data-ocid="employees.empty_state"
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <Users className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No employees found</p>
        </div>
      ) : (
        <div data-ocid="employees.table" className="data-table-wrapper">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2.5 pr-3 font-medium">ID</th>
                <th className="text-left py-2.5 pr-3 font-medium">Name</th>
                <th className="text-left py-2.5 pr-3 font-medium">Mobile</th>
                <th className="text-left py-2.5 pr-3 font-medium">Dept</th>
                <th className="text-left py-2.5 pr-3 font-medium">Type</th>
                <th className="text-left py-2.5 pr-3 font-medium">Status</th>
                <th className="text-right py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  data-ocid={`employees.item.${idx + 1}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                    {emp.id}
                  </td>
                  <td className="py-3 pr-3 font-medium">{emp.name}</td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {emp.mobile}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${DEPT_COLORS[emp.department ?? "Production"]}`}
                    >
                      {emp.department ?? "Production"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="outline" className="text-xs">
                      {emp.workerType === "PieceRate"
                        ? "Piece Rate"
                        : "Fixed Salary"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      className={
                        emp.status === "Active"
                          ? "bg-success/15 text-success border-success/30 hover:bg-success/20"
                          : "bg-muted text-muted-foreground"
                      }
                      variant="outline"
                    >
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        data-ocid={`employees.edit_button.${idx + 1}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(emp)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        data-ocid={`employees.delete_button.${idx + 1}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(emp)}
                        className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent data-ocid="employees.delete_dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">
              Delete Employee
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>
            ? This will also remove their attendance and production records.
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="employees.delete_cancel_button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="employees.delete_confirm_button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="employees.dialog"
          className="max-w-md max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editTarget ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input
                  data-ocid="employees.input"
                  className="mt-1"
                  placeholder="e.g. Ravi Kumar"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>

              <div>
                <Label>Mobile Number *</Label>
                <Input
                  className="mt-1"
                  placeholder="10-digit number"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                />
              </div>

              <div>
                <Label>Joining Date *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.joiningDate}
                  onChange={(e) => setField("joiningDate", e.target.value)}
                />
              </div>

              <div>
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setField("department", v as Department)}
                >
                  <SelectTrigger className="mt-1" data-ocid="employees.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Back Office">Back Office</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Finishing">Finishing</SelectItem>
                    <SelectItem value="Production & Finishing">
                      Production &amp; Finishing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Worker Type</Label>
                <Select
                  value={form.workerType}
                  onValueChange={(v) => setField("workerType", v as WorkerType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PieceRate">Piece Rate</SelectItem>
                    <SelectItem value="DailyWage">Fixed Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setField("status", v as EmployeeStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Bank Details
                </p>
              </div>

              <div className="col-span-2">
                <Label>Bank Name</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. State Bank of India"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                />
              </div>

              <div>
                <Label>Account Number</Label>
                <Input
                  className="mt-1"
                  placeholder="Account no."
                  value={form.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value)}
                />
              </div>

              <div>
                <Label>IFSC Code</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. SBIN0004567"
                  value={form.ifscCode}
                  onChange={(e) =>
                    setField("ifscCode", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              data-ocid="employees.cancel_button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button data-ocid="employees.save_button" onClick={handleSubmit}>
              {editTarget ? "Update" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
