import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Operation {
    id: string;
    name: string;
    ratePerPiece: number;
}
export interface SalaryRecord {
    salary: number;
    employeeName: string;
    ifscCode: string;
    productionAmount: number;
    bankName: string;
    attendanceCount: bigint;
    employeeId: string;
    accountNumber: string;
}
export interface ProductionEntry {
    id: string;
    date: string;
    employeeId: string;
    operationId: string;
    quantity: bigint;
    amount: number;
}
export interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    pricePerUnit: number;
    currentQuantity: bigint;
    itemType: string;
    quantity: bigint;
}
export interface Counts {
    attendances: bigint;
    employees: bigint;
    inventoryItems: bigint;
    productions: bigint;
    operations: bigint;
    stockTransactions: bigint;
}
export interface Attendance {
    id: string;
    status: string;
    date: string;
    employeeId: string;
}
export interface Employee {
    id: string;
    status: string;
    ifscCode: string;
    name: string;
    joiningDate: string;
    bankName: string;
    accountNumber: string;
    mobile: string;
    workerType: string;
}
export interface StockTransaction {
    id: string;
    itemId: string;
    total: number;
    transactionType: string;
    date: string;
    pricePerUnit: number;
    quantity: bigint;
    transactedBy: string;
    remainingQuantity: bigint;
    remarks: string;
}
export interface InventoryStats {
    totalStockAdded: bigint;
    totalValue: number;
    totalStockRemoved: bigint;
    totalItems: bigint;
    totalQuantity: bigint;
}
export interface UserProfile {
    name: string;
}
export interface DashboardStats {
    totalEmployees: bigint;
    todayAttendancePresent: bigint;
    activeEmployees: bigint;
    todayProductionTotal: number;
    currentMonthProductionTotal: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addProductionEntry(date: string, employeeId: string, operationId: string, quantity: bigint): Promise<ProductionEntry | null>;
    addStockTransaction(itemId: string, transactionType: string, quantity: bigint, pricePerUnit: number, transactedBy: string, remarks: string, date: string): Promise<StockTransaction | null>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearAllAttendance(): Promise<void>;
    clearAllEmployees(): Promise<void>;
    clearAllInventory(): Promise<void>;
    clearAllOperations(): Promise<void>;
    clearAllProduction(): Promise<void>;
    clearAttendanceByMonth(month: string): Promise<void>;
    clearInventoryTransactions(): Promise<void>;
    clearProductionByMonth(month: string): Promise<void>;
    createEmployee(name: string, mobile: string, joiningDate: string, workerType: string, accountNumber: string, ifscCode: string, bankName: string): Promise<Employee>;
    createInventoryItem(name: string, quantity: bigint, unit: string, itemType: string, pricePerUnit: number): Promise<InventoryItem>;
    createOperation(name: string, ratePerPiece: number): Promise<Operation>;
    deleteEmployee(id: string): Promise<boolean>;
    deleteInventoryItem(id: string): Promise<boolean>;
    deleteOperation(id: string): Promise<boolean>;
    getAttendanceByDate(date: string): Promise<Array<Attendance>>;
    getAttendanceByEmployeeMonth(employeeId: string, month: string): Promise<Array<Attendance>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardStats(): Promise<DashboardStats>;
    getDataCounts(): Promise<Counts>;
    getEmployee(id: string): Promise<Employee | null>;
    getInventoryStats(): Promise<InventoryStats>;
    getMonthlySalarySheet(month: string): Promise<Array<SalaryRecord>>;
    getOperation(id: string): Promise<Operation | null>;
    getProductionByDate(date: string): Promise<Array<ProductionEntry>>;
    getProductionByEmployee(employeeId: string): Promise<Array<ProductionEntry>>;
    getProductionByEmployeeMonth(employeeId: string, month: string): Promise<Array<ProductionEntry>>;
    getProductionByMonth(month: string): Promise<Array<ProductionEntry>>;
    getStockTransactionsByItem(itemId: string): Promise<Array<StockTransaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listEmployees(): Promise<Array<Employee>>;
    listInventoryItems(): Promise<Array<InventoryItem>>;
    listOperations(): Promise<Array<Operation>>;
    markAttendance(date: string, employeeId: string, status: string): Promise<Attendance>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchEmployees(q: string): Promise<Array<Employee>>;
    searchOperations(q: string): Promise<Array<Operation>>;
    startsWith(t: string, prefix: string): Promise<boolean>;
    updateEmployee(id: string, name: string, mobile: string, joiningDate: string, workerType: string, accountNumber: string, ifscCode: string, bankName: string, status: string): Promise<Employee | null>;
    updateInventoryItem(id: string, name: string, quantity: bigint, unit: string, itemType: string, currentQuantity: bigint, pricePerUnit: number): Promise<InventoryItem | null>;
    updateOperation(id: string, name: string, ratePerPiece: number): Promise<Operation | null>;
}
