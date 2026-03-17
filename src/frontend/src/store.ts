// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type WorkerType = "PieceRate" | "DailyWage";
export type EmployeeStatus = "Active" | "Inactive";
export type AttendanceStatus = "Present" | "Absent" | "HalfDay";
export type Department =
  | "Back Office"
  | "Production"
  | "Finishing"
  | "Production & Finishing";

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  joiningDate: string;
  workerType: WorkerType;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  status: EmployeeStatus;
  department: Department;
}

export interface Operation {
  id: string;
  name: string;
  ratePerPiece: number;
}

export interface Attendance {
  id: string;
  date: string;
  employeeId: string;
  status: AttendanceStatus;
}

export interface ProductionEntry {
  id: string;
  date: string;
  employeeId: string;
  operationId: string;
  quantity: number;
  amount: number;
}

export interface AdditionalWork {
  id: string;
  date: string;
  employeeId: string;
  description: string;
  amount: number;
}

export interface SalaryRow {
  employeeId: string;
  name: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  attendanceCount: number;
  productionAmount: number;
  additionalWorkAmount: number;
  salary: number;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendancePresent: number;
  todayProductionTotal: number;
  currentMonthProductionTotal: number;
}

export type StockTransactionType = "in" | "out";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
  notes: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  date: string;
  type: StockTransactionType;
  quantity: number;
  note: string;
}

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────

const KEYS = {
  employees: "fpm_employees",
  operations: "fpm_operations",
  attendances: "fpm_attendances",
  productions: "fpm_productions",
  empCounter: "fpm_emp_counter",
  opCounter: "fpm_op_counter",
  attCounter: "fpm_att_counter",
  prodCounter: "fpm_prod_counter",
  inventory: "fpm_inventory",
  stockTxns: "fpm_stock_txns",
  invCounter: "fpm_inv_counter",
  txnCounter: "fpm_txn_counter",
  additionalWork: "fpm_additional_work",
  addlWorkCounter: "fpm_addl_work_counter",
} as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(counterKey: string, prefix: string): string {
  const current = getJSON<number>(counterKey, 0) + 1;
  setJSON(counterKey, current);
  return `${prefix}${String(current).padStart(3, "0")}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// Employees
// ─────────────────────────────────────────────

export function getEmployees(): Employee[] {
  return getJSON<Employee[]>(KEYS.employees, []);
}

export function getEmployeeById(id: string): Employee | undefined {
  return getEmployees().find((e) => e.id === id);
}

export function getEmployeesByDepartment(dept: Department): Employee[] {
  const employees = getEmployees();
  if (dept === "Production") {
    return employees.filter(
      (e) =>
        e.department === "Production" ||
        e.department === "Production & Finishing",
    );
  }
  if (dept === "Finishing") {
    return employees.filter(
      (e) =>
        e.department === "Finishing" ||
        e.department === "Production & Finishing",
    );
  }
  return employees.filter((e) => e.department === dept);
}

export function saveEmployee(data: Omit<Employee, "id">): Employee {
  const employees = getEmployees();
  const id = nextId(KEYS.empCounter, "EMP");
  const emp: Employee = { id, ...data };
  employees.push(emp);
  setJSON(KEYS.employees, employees);
  return emp;
}

export function updateEmployee(emp: Employee): void {
  const employees = getEmployees();
  const idx = employees.findIndex((e) => e.id === emp.id);
  if (idx !== -1) {
    employees[idx] = emp;
    setJSON(KEYS.employees, employees);
  }
}

export function deleteEmployee(id: string): void {
  const employees = getEmployees().filter((e) => e.id !== id);
  setJSON(KEYS.employees, employees);
  const attendances = getAttendances().filter((a) => a.employeeId !== id);
  setJSON(KEYS.attendances, attendances);
  const productions = getProductions().filter((p) => p.employeeId !== id);
  setJSON(KEYS.productions, productions);
  const additionalWorks = getAdditionalWorks().filter(
    (a) => a.employeeId !== id,
  );
  setJSON(KEYS.additionalWork, additionalWorks);
}

// ─────────────────────────────────────────────
// Operations
// ─────────────────────────────────────────────

export function getOperations(): Operation[] {
  return getJSON<Operation[]>(KEYS.operations, []);
}

export function getOperationById(id: string): Operation | undefined {
  return getOperations().find((o) => o.id === id);
}

export function saveOperation(data: Omit<Operation, "id">): Operation {
  const operations = getOperations();
  const id = nextId(KEYS.opCounter, "OP");
  const op: Operation = { id, ...data };
  operations.push(op);
  setJSON(KEYS.operations, operations);
  return op;
}

export function updateOperation(op: Operation): void {
  const operations = getOperations();
  const idx = operations.findIndex((o) => o.id === op.id);
  if (idx !== -1) {
    operations[idx] = op;
    setJSON(KEYS.operations, operations);
  }
}

export function deleteOperation(id: string): void {
  const operations = getOperations().filter((o) => o.id !== id);
  setJSON(KEYS.operations, operations);
}

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────

export function getAttendances(): Attendance[] {
  return getJSON<Attendance[]>(KEYS.attendances, []);
}

export function getAttendanceByDate(date: string): Attendance[] {
  return getAttendances().filter((a) => a.date === date);
}

export function getAttendanceByEmployeeMonth(
  employeeId: string,
  month: string,
): Attendance[] {
  return getAttendances().filter(
    (a) => a.employeeId === employeeId && a.date.startsWith(month),
  );
}

export function markAttendance(
  date: string,
  employeeId: string,
  status: AttendanceStatus,
): void {
  const attendances = getAttendances();
  const existing = attendances.findIndex(
    (a) => a.date === date && a.employeeId === employeeId,
  );
  if (existing !== -1) {
    attendances[existing].status = status;
  } else {
    const id = nextId(KEYS.attCounter, "ATT");
    attendances.push({ id, date, employeeId, status });
  }
  setJSON(KEYS.attendances, attendances);
}

// ─────────────────────────────────────────────
// Production
// ─────────────────────────────────────────────

export function getProductions(): ProductionEntry[] {
  return getJSON<ProductionEntry[]>(KEYS.productions, []);
}

export function addProductionEntry(
  date: string,
  employeeId: string,
  operationId: string,
  quantity: number,
): ProductionEntry {
  const op = getOperationById(operationId);
  const rate = op?.ratePerPiece ?? 0;
  const amount = quantity * rate;
  const id = nextId(KEYS.prodCounter, "PROD");
  const entry: ProductionEntry = {
    id,
    date,
    employeeId,
    operationId,
    quantity,
    amount,
  };
  const productions = getProductions();
  productions.push(entry);
  setJSON(KEYS.productions, productions);
  return entry;
}

export function deleteProductionEntry(id: string): void {
  const productions = getProductions().filter((p) => p.id !== id);
  setJSON(KEYS.productions, productions);
}

export function getProductionByDate(date: string): ProductionEntry[] {
  return getProductions().filter((p) => p.date === date);
}

export function getProductionByEmployeeMonth(
  employeeId: string,
  month: string,
): ProductionEntry[] {
  return getProductions().filter(
    (p) => p.employeeId === employeeId && p.date.startsWith(month),
  );
}

export function getProductionByMonth(month: string): ProductionEntry[] {
  return getProductions().filter((p) => p.date.startsWith(month));
}

// ─────────────────────────────────────────────
// Additional Work
// ─────────────────────────────────────────────

export function getAdditionalWorks(): AdditionalWork[] {
  return getJSON<AdditionalWork[]>(KEYS.additionalWork, []);
}

export function getAdditionalWorkByDate(date: string): AdditionalWork[] {
  return getAdditionalWorks().filter((a) => a.date === date);
}

export function getAdditionalWorkByEmployeeMonth(
  employeeId: string,
  month: string,
): AdditionalWork[] {
  return getAdditionalWorks().filter(
    (a) => a.employeeId === employeeId && a.date.startsWith(month),
  );
}

export function addAdditionalWork(
  date: string,
  employeeId: string,
  description: string,
  amount: number,
): AdditionalWork {
  const works = getAdditionalWorks();
  const id = nextId(KEYS.addlWorkCounter, "AWK");
  const work: AdditionalWork = { id, date, employeeId, description, amount };
  works.push(work);
  setJSON(KEYS.additionalWork, works);
  return work;
}

export function deleteAdditionalWork(id: string): void {
  const works = getAdditionalWorks().filter((a) => a.id !== id);
  setJSON(KEYS.additionalWork, works);
}

// ─────────────────────────────────────────────
// Salary Sheet
// ─────────────────────────────────────────────

export function getMonthlySalarySheet(month: string): SalaryRow[] {
  const employees = getEmployees().filter((e) => e.status === "Active");
  return employees.map((emp) => {
    const attendance = getAttendanceByEmployeeMonth(emp.id, month);
    const attendanceCount = attendance.filter(
      (a) => a.status === "Present" || a.status === "HalfDay",
    ).length;
    const productions = getProductionByEmployeeMonth(emp.id, month);
    const productionAmount = productions.reduce((s, p) => s + p.amount, 0);
    const additionalWorkAmount = getAdditionalWorkByEmployeeMonth(
      emp.id,
      month,
    ).reduce((s, a) => s + a.amount, 0);
    return {
      employeeId: emp.id,
      name: emp.name,
      accountNumber: emp.accountNumber,
      ifscCode: emp.ifscCode,
      bankName: emp.bankName,
      attendanceCount,
      productionAmount,
      additionalWorkAmount,
      salary: productionAmount + additionalWorkAmount,
    };
  });
}

// ─────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────

export function getDashboardStats(): DashboardStats {
  const employees = getEmployees();
  const today = todayStr();
  const month = currentMonthStr();

  const todayAtt = getAttendanceByDate(today);
  const todayPresent = todayAtt.filter(
    (a) => a.status === "Present" || a.status === "HalfDay",
  ).length;

  const todayProd = getProductionByDate(today);
  const todayProductionTotal = todayProd.reduce((s, p) => s + p.amount, 0);

  const monthProd = getProductionByMonth(month);
  const currentMonthProductionTotal = monthProd.reduce(
    (s, p) => s + p.amount,
    0,
  );

  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((e) => e.status === "Active").length,
    todayAttendancePresent: todayPresent,
    todayProductionTotal,
    currentMonthProductionTotal,
  };
}

// ─────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────

export function getInventoryItems(): InventoryItem[] {
  return getJSON<InventoryItem[]>(KEYS.inventory, []);
}

export function getInventoryItemById(id: string): InventoryItem | undefined {
  return getInventoryItems().find((i) => i.id === id);
}

export function saveInventoryItem(
  data: Omit<InventoryItem, "id">,
): InventoryItem {
  const items = getInventoryItems();
  const id = nextId(KEYS.invCounter, "INV");
  const item: InventoryItem = { id, ...data };
  items.push(item);
  setJSON(KEYS.inventory, items);
  return item;
}

export function updateInventoryItem(item: InventoryItem): void {
  const items = getInventoryItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx !== -1) {
    items[idx] = item;
    setJSON(KEYS.inventory, items);
  }
}

export function deleteInventoryItem(id: string): void {
  const items = getInventoryItems().filter((i) => i.id !== id);
  setJSON(KEYS.inventory, items);
  const txns = getStockTransactions().filter((t) => t.itemId !== id);
  setJSON(KEYS.stockTxns, txns);
}

export function getStockTransactions(): StockTransaction[] {
  return getJSON<StockTransaction[]>(KEYS.stockTxns, []);
}

export function getStockTransactionsByItem(itemId: string): StockTransaction[] {
  return getStockTransactions().filter((t) => t.itemId === itemId);
}

export function addStockTransaction(
  itemId: string,
  date: string,
  type: StockTransactionType,
  quantity: number,
  note: string,
): StockTransaction {
  const txns = getStockTransactions();
  const id = nextId(KEYS.txnCounter, "TXN");
  const txn: StockTransaction = { id, itemId, date, type, quantity, note };
  txns.push(txn);
  setJSON(KEYS.stockTxns, txns);

  const items = getInventoryItems();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx !== -1) {
    if (type === "in") {
      items[idx].currentStock += quantity;
    } else {
      items[idx].currentStock = Math.max(0, items[idx].currentStock - quantity);
    }
    setJSON(KEYS.inventory, items);
  }
  return txn;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
}

export function getInventoryStats(): InventoryStats {
  const items = getInventoryItems();
  return {
    totalItems: items.length,
    lowStockCount: items.filter((i) => i.currentStock <= i.minStock).length,
    totalValue: items.reduce((s, i) => s + i.currentStock * i.unitCost, 0),
  };
}

// ─────────────────────────────────────────────
// Seed Data (for demo)
// ─────────────────────────────────────────────

export function seedDemoData(): void {
  if (getEmployees().length > 0) return;

  const ops = [
    { name: "Collar Join", ratePerPiece: 3 },
    { name: "Sleeve Attach", ratePerPiece: 4 },
    { name: "Button Stitch", ratePerPiece: 2 },
    { name: "Side Stitch", ratePerPiece: 5 },
    { name: "Hem Finish", ratePerPiece: 2.5 },
    { name: "Pocket Attach", ratePerPiece: 3.5 },
  ];
  const savedOps: Operation[] = [];
  for (const op of ops) {
    savedOps.push(saveOperation(op));
  }

  const employees: Omit<Employee, "id">[] = [
    {
      name: "Ravi Kumar",
      mobile: "9876543210",
      joiningDate: "2023-01-15",
      workerType: "PieceRate" as WorkerType,
      accountNumber: "1234567890",
      ifscCode: "SBIN0004567",
      bankName: "State Bank of India",
      status: "Active" as EmployeeStatus,
      department: "Production" as Department,
    },
    {
      name: "Suresh Patel",
      mobile: "9876543211",
      joiningDate: "2023-03-10",
      workerType: "PieceRate" as WorkerType,
      accountNumber: "2345678901",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      status: "Active" as EmployeeStatus,
      department: "Production & Finishing" as Department,
    },
    {
      name: "Meena Devi",
      mobile: "9876543212",
      joiningDate: "2023-06-20",
      workerType: "PieceRate" as WorkerType,
      accountNumber: "3456789012",
      ifscCode: "ICIC0002345",
      bankName: "ICICI Bank",
      status: "Active" as EmployeeStatus,
      department: "Finishing" as Department,
    },
    {
      name: "Anjali Singh",
      mobile: "9876543213",
      joiningDate: "2024-01-05",
      workerType: "DailyWage" as WorkerType,
      accountNumber: "4567890123",
      ifscCode: "PUNB0003456",
      bankName: "Punjab National Bank",
      status: "Active" as EmployeeStatus,
      department: "Back Office" as Department,
    },
    {
      name: "Ramesh Yadav",
      mobile: "9876543214",
      joiningDate: "2022-11-12",
      workerType: "PieceRate" as WorkerType,
      accountNumber: "5678901234",
      ifscCode: "BARB0004567",
      bankName: "Bank of Baroda",
      status: "Active" as EmployeeStatus,
      department: "Finishing" as Department,
    },
  ];
  const savedEmps: Employee[] = [];
  for (const e of employees) {
    savedEmps.push(saveEmployee(e));
  }

  const today = todayStr();
  const month = today.slice(0, 7);

  for (let d = 0; d < 5; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const emp of savedEmps) {
      const statuses: AttendanceStatus[] = [
        "Present",
        "Present",
        "Present",
        "HalfDay",
        "Absent",
      ];
      markAttendance(dateStr, emp.id, statuses[d]);
    }
  }

  const prodData = [
    { empIdx: 0, opIdx: 0, qty: 120 },
    { empIdx: 0, opIdx: 1, qty: 80 },
    { empIdx: 0, opIdx: 2, qty: 150 },
    { empIdx: 1, opIdx: 0, qty: 100 },
    { empIdx: 1, opIdx: 3, qty: 60 },
    { empIdx: 2, opIdx: 1, qty: 90 },
    { empIdx: 2, opIdx: 4, qty: 110 },
    { empIdx: 3, opIdx: 2, qty: 200 },
    { empIdx: 3, opIdx: 5, qty: 85 },
    { empIdx: 4, opIdx: 0, qty: 130 },
    { empIdx: 4, opIdx: 3, qty: 95 },
  ];

  for (const { empIdx, opIdx, qty } of prodData) {
    addProductionEntry(today, savedEmps[empIdx].id, savedOps[opIdx].id, qty);
  }

  for (let d = 1; d < 8; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.toISOString().slice(0, 7) !== month) break;
    const dateStr = date.toISOString().slice(0, 10);
    for (const { empIdx, opIdx, qty } of prodData.slice(0, 6)) {
      addProductionEntry(
        dateStr,
        savedEmps[empIdx].id,
        savedOps[opIdx].id,
        Math.floor(qty * 0.9),
      );
    }
  }
}
