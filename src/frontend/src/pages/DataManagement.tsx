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
import { useActor } from "@/hooks/useActor";
import {
  AlertTriangle,
  CalendarX,
  ClipboardX,
  Database,
  PackageX,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Counts {
  employees: bigint;
  operations: bigint;
  attendances: bigint;
  productions: bigint;
  inventoryItems: bigint;
  stockTransactions: bigint;
}

export default function DataManagement() {
  const { actor } = useActor();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState("");
  const [productionMonth, setProductionMonth] = useState("");

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await actor!.getDataCounts();
      setCounts(data);
    } catch {
      toast.error("Failed to load data counts");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

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
    n !== undefined ? Number(n).toLocaleString() : "—";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View record counts and selectively clear data categories.
          </p>
        </div>
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

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">
          <strong>Warning:</strong> Clearing data is permanent and cannot be
          undone. Clearing Employees also removes all related Attendance and
          Production records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Employees */}
        <DataCard
          icon={<Users className="w-4 h-4" />}
          title="Employees"
          description="All employee profiles and related data"
          count={loading ? null : fmt(counts?.employees)}
          warning="Also clears all Attendance & Production records"
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

        {/* Operations */}
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

        {/* Attendance (All) */}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-muted-foreground" />
                Attendance by Month
              </CardTitle>
            </div>
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
                    deleted. This action cannot be undone.
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

        {/* Production (All) */}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardX className="w-4 h-4 text-muted-foreground" />
                Production by Month
              </CardTitle>
            </div>
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
                    deleted. This action cannot be undone.
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

        {/* Inventory Items */}
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

        {/* Inventory Transactions */}
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
