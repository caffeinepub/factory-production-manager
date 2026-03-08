// Excel export utility using xlsx (SheetJS)
// We use a dynamic CDN load approach since xlsx may not be in package.json
// Instead we use a pure JS CSV approach as fallback, or import xlsx if available

type CellValue = string | number | null | undefined;

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, CellValue>[],
  columns: ExcelColumn[],
  filename: string,
): void {
  // Build CSV as a reliable fallback
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === "number") return String(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  const csv = [headers, ...rows].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format Indian currency
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date from YYYY-MM-DD to DD-MM-YYYY
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

// Get today's date as YYYY-MM-DD
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Get current month as YYYY-MM
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Get week date range (Mon-Sun) containing a date
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}
