import Map "mo:core/Map";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";

actor {
  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ── Types ──────────────────────────────────────────────────────────────────
  public type UserProfile = {
    name : Text;
  };

  public type Employee = {
    id : Text;
    name : Text;
    mobile : Text;
    joiningDate : Text;
    workerType : Text;
    accountNumber : Text;
    ifscCode : Text;
    bankName : Text;
    status : Text;
  };

  public type Operation = {
    id : Text;
    name : Text;
    ratePerPiece : Float;
  };

  public type Attendance = {
    id : Text;
    date : Text;
    employeeId : Text;
    status : Text;
  };

  public type ProductionEntry = {
    id : Text;
    date : Text;
    employeeId : Text;
    operationId : Text;
    quantity : Nat;
    amount : Float;
  };

  public type SalaryRecord = {
    employeeId : Text;
    employeeName : Text;
    accountNumber : Text;
    ifscCode : Text;
    bankName : Text;
    attendanceCount : Nat;
    productionAmount : Float;
    salary : Float;
  };

  public type DashboardStats = {
    totalEmployees : Nat;
    activeEmployees : Nat;
    todayAttendancePresent : Nat;
    todayProductionTotal : Float;
    currentMonthProductionTotal : Float;
  };

  public type InventoryItem = {
    id : Text;
    name : Text;
    quantity : Nat;
    unit : Text;
    itemType : Text;
    currentQuantity : Nat;
    pricePerUnit : Float;
  };

  public type StockTransaction = {
    id : Text;
    itemId : Text;
    transactionType : Text;
    quantity : Nat;
    pricePerUnit : Float;
    total : Float;
    remainingQuantity : Nat;
    transactedBy : Text;
    remarks : Text;
    date : Text;
  };

  public type InventoryStats = {
    totalItems : Nat;
    totalQuantity : Nat;
    totalValue : Float;
    totalStockAdded : Nat;
    totalStockRemoved : Nat;
  };

  public type Counts = {
    employees : Nat;
    operations : Nat;
    attendances : Nat;
    productions : Nat;
    inventoryItems : Nat;
    stockTransactions : Nat;
  };

  // ── State ──────────────────────────────────────────────────────────────────
  var employeeCounter : Nat = 0;
  var operationCounter : Nat = 0;
  var attendanceCounter : Nat = 0;
  var productionCounter : Nat = 0;
  var inventoryCounter : Nat = 0;
  var stockTxnCounter : Nat = 0;

  let employees = Map.empty<Text, Employee>();
  let operations = Map.empty<Text, Operation>();
  let attendances = Map.empty<Text, Attendance>();
  let productions = Map.empty<Text, ProductionEntry>();
  let inventoryItems = Map.empty<Text, InventoryItem>();
  let stockTransactions = Map.empty<Text, StockTransaction>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // ── User Profile Functions ────────────────────────────────────────────────
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin access required");
    };
  };

  func padTwo(n : Nat) : Text {
    if (n < 10) { "0" # n.toText() } else { n.toText() };
  };

  func nextEmpId() : Text {
    employeeCounter += 1;
    let s = employeeCounter.toText();
    "EMP" # (if (employeeCounter < 10) "00" # s else if (employeeCounter < 100) "0" # s else s);
  };

  func nextOpId() : Text {
    operationCounter += 1;
    let s = operationCounter.toText();
    "OP" # (if (operationCounter < 10) "00" # s else if (operationCounter < 100) "0" # s else s);
  };

  func nextAttId() : Text {
    attendanceCounter += 1;
    "ATT" # attendanceCounter.toText();
  };

  func nextProdId() : Text {
    productionCounter += 1;
    "PROD" # productionCounter.toText();
  };

  func nextInvId() : Text {
    inventoryCounter += 1;
    "INV" # inventoryCounter.toText();
  };

  func nextTxnId() : Text {
    stockTxnCounter += 1;
    "ST" # stockTxnCounter.toText();
  };

  public query ({} : {}) func startsWith(t : Text, prefix : Text) : async Bool {
    let tCount = t.chars().toArray().size();
    let prefixCount = prefix.chars().toArray().size();
    if (prefix.size() > t.size() or prefixCount > tCount) { return false };
    let pSize = prefix.size();
    var i = 0;
    let tc = t.chars();
    let pc = prefix.chars();
    var match = true;
    label L loop {
      if (i >= pSize) break L;
      switch (tc.next(), pc.next()) {
        case (?c1, ?c2) { if (c1 != c2) { match := false; break L } };
        case _ { break L };
      };
      i += 1;
    };
    match;
  };

  func textStartsWithPrefix(t : Text, prefix : Text) : Bool {
    let tCount = t.chars().toArray().size();
    let prefixCount = prefix.chars().toArray().size();
    if (prefix.size() > t.size() or prefixCount > tCount) { return false };
    let pSize = prefix.size();
    var i = 0;
    let tc = t.chars();
    let pc = prefix.chars();
    var match = true;
    label L loop {
      if (i >= pSize) break L;
      switch (tc.next(), pc.next()) {
        case (?c1, ?c2) { if (c1 != c2) { match := false; break L } };
        case _ { break L };
      };
      i += 1;
    };
    match;
  };

  func toLower(t : Text) : Text {
    t.map(func(c : Char) : Char {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(c.toNat32() + 32);
      } else { c };
    });
  };

  func containsText(haystack : Text, needle : Text) : Bool {
    if (needle.size() == 0) return true;
    let h = toLower(haystack);
    let n = toLower(needle);
    if (n.size() > h.size()) return false;
    let ha = h.chars().toArray();
    let na = n.chars().toArray();
    let hLen = ha.size();
    let nLen = na.size();
    var i = 0;
    var found = false;
    label OL while (i + nLen <= hLen and not found) {
      var j = 0;
      var match = true;
      label IL while (j < nLen and match) {
        if (ha[i + j] != na[j]) { match := false };
        j += 1;
      };
      if (match) { found := true };
      i += 1;
    };
    found;
  };

  func todayText() : Text {
    let ns = Int.abs(Time.now());
    let secs = ns / 1_000_000_000;
    let totalDays = secs / 86400;
    var rem = totalDays;
    var yr : Nat = 1970;
    var leap = false;
    label YL loop {
      leap := (yr % 4 == 0 and (yr % 100 != 0 or yr % 400 == 0));
      let diy : Nat = if (leap) { 366 } else { 365 };
      if (rem < diy) break YL;
      rem -= diy;
      yr += 1;
    };
    let mdays : [Nat] = [31, if (leap) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var mo : Nat = 1;
    label ML for (md in mdays.vals()) {
      if (rem < md) break ML;
      rem -= md;
      mo += 1;
    };
    let dy = rem + 1;
    yr.toText() # "-" # padTwo(mo) # "-" # padTwo(dy);
  };

  func monthOf(date : Text) : Text {
    var result = "";
    var i = 0;
    let iter = date.chars();
    label L loop {
      if (i >= 7) break L;
      switch (iter.next()) {
        case (?c) { result #= Text.fromChar(c) };
        case null { break L };
      };
      i += 1;
    };
    result;
  };

  // ── Employees ──────────────────────────────────────────────────────────────
  public shared ({ caller }) func createEmployee(
    name : Text, mobile : Text, joiningDate : Text, workerType : Text,
    accountNumber : Text, ifscCode : Text, bankName : Text,
  ) : async Employee {
    requireAdmin(caller);
    let id = nextEmpId();
    let e : Employee = { id; name; mobile; joiningDate; workerType; accountNumber; ifscCode; bankName; status = "Active" };
    employees.add(id, e);
    e;
  };

  public shared ({ caller }) func updateEmployee(
    id : Text, name : Text, mobile : Text, joiningDate : Text, workerType : Text,
    accountNumber : Text, ifscCode : Text, bankName : Text, status : Text,
  ) : async ?Employee {
    requireAdmin(caller);
    switch (employees.get(id)) {
      case (null) { null };
      case (?_) {
        let e : Employee = { id; name; mobile; joiningDate; workerType; accountNumber; ifscCode; bankName; status };
        employees.add(id, e);
        ?e;
      };
    };
  };

  public shared ({ caller }) func deleteEmployee(id : Text) : async Bool {
    requireAdmin(caller);
    switch (employees.get(id)) {
      case (null) { false };
      case (_) {
        employees.remove(id);
        let filteredAtt = attendances.entries().toArray().filter(func((_, a)) { a.employeeId != id });
        attendances.clear();
        for ((id, a) in filteredAtt.values()) { attendances.add(id, a) };
        let filteredProd = productions.entries().toArray().filter(func((_, p)) { p.employeeId != id });
        productions.clear();
        for ((id, p) in filteredProd.values()) { productions.add(id, p) };
        true;
      };
    };
  };

  public query ({} : {}) func listEmployees() : async [Employee] {
    employees.values().toArray();
  };

  public query ({} : {}) func getEmployee(id : Text) : async ?Employee {
    employees.get(id);
  };

  public query ({} : {}) func searchEmployees(q : Text) : async [Employee] {
    let filtered = employees.entries().toArray().filter(
      func((_, e)) {
        containsText(e.name, q) or containsText(e.id, q);
      }
    );
    filtered.map(func((_, e)) { e });
  };

  // ── Operations ────────────────────────────────────────────────────────────
  public shared ({ caller }) func createOperation(name : Text, ratePerPiece : Float) : async Operation {
    requireAdmin(caller);
    let id = nextOpId();
    let op : Operation = { id; name; ratePerPiece };
    operations.add(id, op);
    op;
  };

  public shared ({ caller }) func updateOperation(id : Text, name : Text, ratePerPiece : Float) : async ?Operation {
    requireAdmin(caller);
    switch (operations.get(id)) {
      case (null) { null };
      case (?_) {
        let op : Operation = { id; name; ratePerPiece };
        operations.add(id, op);
        ?op;
      };
    };
  };

  public shared ({ caller }) func deleteOperation(id : Text) : async Bool {
    requireAdmin(caller);
    switch (operations.get(id)) {
      case (null) { false };
      case (_) {
        operations.remove(id);
        true;
      };
    };
  };

  public query ({} : {}) func listOperations() : async [Operation] {
    operations.values().toArray();
  };

  public query ({} : {}) func getOperation(id : Text) : async ?Operation {
    operations.get(id);
  };

  public query ({} : {}) func searchOperations(q : Text) : async [Operation] {
    let filtered = operations.entries().toArray().filter(
      func((_, op)) {
        containsText(op.name, q) or containsText(op.id, q);
      }
    );
    filtered.map(func((_, op)) { op });
  };

  // ── Attendance ────────────────────────────────────────────────────────────
  public shared ({ caller }) func markAttendance(date : Text, employeeId : Text, status : Text) : async Attendance {
    requireAdmin(caller);
    let existing = attendances.entries().toArray().find(func((_, a)) { a.date == date and a.employeeId == employeeId });
    switch (existing) {
      case (?(k, _)) {
        let a : Attendance = { id = k; date; employeeId; status };
        attendances.add(k, a);
        a;
      };
      case (null) {
        let id = nextAttId();
        let a : Attendance = { id; date; employeeId; status };
        attendances.add(id, a);
        a;
      };
    };
  };

  public shared ({ caller }) func clearAllAttendance() : async () {
    requireAdmin(caller);
    attendances.clear();
    attendanceCounter := 0;
  };

  public shared ({ caller }) func clearAttendanceByMonth(month : Text) : async () {
    requireAdmin(caller);
    let filtered = attendances.entries().toArray().filter(func((_, v)) { not textStartsWithPrefix(v.date, month) });
    attendances.clear();
    for ((id, a) in filtered.values()) { attendances.add(id, a) };
  };

  public query ({} : {}) func getAttendanceByDate(date : Text) : async [Attendance] {
    let filtered = attendances.entries().toArray().filter(func((_, v)) { v.date == date });
    let attValues = filtered.map(func((_, v)) { v });
    attValues;
  };

  public query ({} : {}) func getAttendanceByEmployeeMonth(employeeId : Text, month : Text) : async [Attendance] {
    let filtered = attendances.entries().toArray().filter(
      func((_, v)) {
        v.employeeId == employeeId and textStartsWithPrefix(v.date, month)
      }
    );
    let attValues = filtered.map(func((_, v)) { v });
    attValues;
  };

  // ── Production ────────────────────────────────────────────────────────────
  public shared ({ caller }) func addProductionEntry(
    date : Text, employeeId : Text, operationId : Text, quantity : Nat,
  ) : async ?ProductionEntry {
    requireAdmin(caller);
    switch (operations.get(operationId)) {
      case (null) { null };
      case (?op) {
        let id = nextProdId();
        let amount = quantity.toFloat() * op.ratePerPiece;
        let e : ProductionEntry = { id; date; employeeId; operationId; quantity; amount };
        productions.add(id, e);
        ?e;
      };
    };
  };

  public shared ({ caller }) func clearAllProduction() : async () {
    requireAdmin(caller);
    productions.clear();
    productionCounter := 0;
  };

  public shared ({ caller }) func clearProductionByMonth(month : Text) : async () {
    requireAdmin(caller);
    let filtered = productions.entries().toArray().filter(func((_, v)) { not textStartsWithPrefix(v.date, month) });
    productions.clear();
    for ((id, p) in filtered.values()) { productions.add(id, p) };
  };

  public query ({} : {}) func getProductionByDate(date : Text) : async [ProductionEntry] {
    let filtered = productions.entries().toArray().filter(func((_, v)) { v.date == date });
    let prodValues = filtered.map(func((_, v)) { v });
    prodValues;
  };

  public query ({} : {}) func getProductionByEmployeeMonth(employeeId : Text, month : Text) : async [ProductionEntry] {
    let filtered = productions.entries().toArray().filter(
      func((_, v)) {
        v.employeeId == employeeId and textStartsWithPrefix(v.date, month)
      }
    );
    let prodValues = filtered.map(func((_, v)) { v });
    prodValues;
  };

  public query ({} : {}) func getProductionByMonth(month : Text) : async [ProductionEntry] {
    let filtered = productions.entries().toArray().filter(
      func((_, v)) { textStartsWithPrefix(v.date, month) }
    );
    let prodValues = filtered.map(func((_, v)) { v });
    prodValues;
  };

  public query ({} : {}) func getProductionByEmployee(employeeId : Text) : async [ProductionEntry] {
    let filtered = productions.entries().toArray().filter(func((_, v)) { v.employeeId == employeeId });
    let prodValues = filtered.map(func((_, v)) { v });
    prodValues;
  };

  // ── Inventory ─────────────────────────────────────────────────────────────
  public shared ({ caller }) func createInventoryItem(name : Text, quantity : Nat, unit : Text, itemType : Text, pricePerUnit : Float) : async InventoryItem {
    requireAdmin(caller);
    let id = nextInvId();
    let item : InventoryItem = { id; name; quantity; unit; itemType; currentQuantity = quantity; pricePerUnit };
    inventoryItems.add(id, item);
    item;
  };

  public shared ({ caller }) func updateInventoryItem(id : Text, name : Text, quantity : Nat, unit : Text, itemType : Text, currentQuantity : Nat, pricePerUnit : Float) : async ?InventoryItem {
    requireAdmin(caller);
    switch (inventoryItems.get(id)) {
      case (null) { null };
      case (?_) {
        let item : InventoryItem = { id; name; quantity; unit; itemType; currentQuantity; pricePerUnit };
        inventoryItems.add(id, item);
        ?item;
      };
    };
  };

  public shared ({ caller }) func deleteInventoryItem(id : Text) : async Bool {
    requireAdmin(caller);
    switch (inventoryItems.get(id)) {
      case (null) { false };
      case (_) {
        inventoryItems.remove(id);
        let filtered = stockTransactions.entries().toArray().filter(func((_, v)) { v.itemId != id });
        stockTransactions.clear();
        for ((id, txn) in filtered.values()) { stockTransactions.add(id, txn) };
        true;
      };
    };
  };

  public shared ({ caller }) func addStockTransaction(
    itemId : Text, transactionType : Text, quantity : Nat,
    pricePerUnit : Float, transactedBy : Text, remarks : Text, date : Text,
  ) : async ?StockTransaction {
    requireAdmin(caller);
    switch (inventoryItems.get(itemId)) {
      case (null) { null };
      case (?item) {
        var remaining = item.currentQuantity;
        if (transactionType == "IN") { remaining += quantity } else if (quantity <= remaining) {
          remaining -= quantity;
        };

        let txnId = nextTxnId();
        let newTxn : StockTransaction = {
          id = txnId;
          itemId;
          transactionType;
          quantity;
          pricePerUnit;
          total = pricePerUnit * quantity.toFloat();
          remainingQuantity = remaining;
          transactedBy;
          remarks;
          date;
        };

        let newItem : InventoryItem = { item with currentQuantity = remaining };
        inventoryItems.add(itemId, newItem);
        stockTransactions.add(txnId, newTxn);
        ?newTxn;
      };
    };
  };

  public query ({} : {}) func listInventoryItems() : async [InventoryItem] {
    inventoryItems.values().toArray();
  };

  public query ({} : {}) func getStockTransactionsByItem(itemId : Text) : async [StockTransaction] {
    let filtered = stockTransactions.entries().toArray().filter(func((_, v)) { v.itemId == itemId });
    filtered.map(func((_, v)) { v });
  };

  public query ({} : {}) func getInventoryStats() : async InventoryStats {
    var totalQty = 0;
    var totalVal = 0.0;
    for ((_, item) in inventoryItems.entries()) {
      totalQty += item.currentQuantity;
      totalVal += item.currentQuantity.toFloat() * item.pricePerUnit;
    };

    var totalIn = 0;
    var totalOut = 0;
    for ((_, txn) in stockTransactions.entries()) {
      if (txn.transactionType == "IN") {
        totalIn += txn.quantity;
      } else if (txn.transactionType == "OUT" and txn.quantity > totalOut) {
        totalOut += txn.quantity;
      };
    };

    {
      totalItems = inventoryItems.size();
      totalQuantity = totalQty;
      totalValue = totalVal;
      totalStockAdded = totalIn;
      totalStockRemoved = totalOut;
    };
  };

  public shared ({ caller }) func clearInventoryTransactions() : async () {
    requireAdmin(caller);
    stockTransactions.clear();
    stockTxnCounter := 0;
  };

  public shared ({ caller }) func clearAllInventory() : async () {
    requireAdmin(caller);
    inventoryItems.clear();
    stockTransactions.clear();
    inventoryCounter := 0;
    stockTxnCounter := 0;
  };

  // ── Clear All Functions ────────────────────────────────────────────────────
  public shared ({ caller }) func clearAllEmployees() : async () {
    requireAdmin(caller);
    employees.clear();
    attendances.clear();
    productions.clear();
    employeeCounter := 0;
    attendanceCounter := 0;
    productionCounter := 0;
  };

  public shared ({ caller }) func clearAllOperations() : async () {
    requireAdmin(caller);
    operations.clear();
    operationCounter := 0;
  };

  public query ({} : {}) func getDataCounts() : async Counts {
    {
      employees = employees.size();
      operations = operations.size();
      attendances = attendances.size();
      productions = productions.size();
      inventoryItems = inventoryItems.size();
      stockTransactions = stockTransactions.size();
    };
  };

  // ── Salary Sheet ──────────────────────────────────────────────────────────
  public query ({} : {}) func getMonthlySalarySheet(month : Text) : async [SalaryRecord] {
    let empArray = employees.values().toArray();
    empArray.map(func(emp) {
      var prodTotal : Float = 0.0;
      for ((_, p) in productions.entries()) {
        if (p.employeeId == emp.id and textStartsWithPrefix(p.date, month)) {
          prodTotal += p.amount;
        };
      };
      var attCount : Nat = 0;
      for ((_, a) in attendances.entries()) {
        if (a.employeeId == emp.id and textStartsWithPrefix(a.date, month)) {
          if (a.status == "Present" or a.status == "HalfDay") { attCount += 1 };
        };
      };
      {
        employeeId = emp.id;
        employeeName = emp.name;
        accountNumber = emp.accountNumber;
        ifscCode = emp.ifscCode;
        bankName = emp.bankName;
        attendanceCount = attCount;
        productionAmount = prodTotal;
        salary = prodTotal;
      };
    });
  };

  // ── Dashboard ────────────────────────────────────────────────────────────
  public query ({} : {}) func getDashboardStats() : async DashboardStats {
    let today = todayText();
    let month = monthOf(today);
    var total : Nat = 0;
    var active : Nat = 0;
    for ((_, e) in employees.entries()) {
      total += 1;
      if (e.status == "Active") { active += 1 };
    };
    var present : Nat = 0;
    for ((_, a) in attendances.entries()) {
      if (a.date == today and (a.status == "Present" or a.status == "HalfDay")) { present += 1 };
    };
    var todayProd : Float = 0.0;
    var monthProd : Float = 0.0;
    for ((_, p) in productions.entries()) {
      if (p.date == today) { todayProd += p.amount };
      if (textStartsWithPrefix(p.date, month)) { monthProd += p.amount };
    };
    {
      totalEmployees = total;
      activeEmployees = active;
      todayAttendancePresent = present;
      todayProductionTotal = todayProd;
      currentMonthProductionTotal = monthProd;
    };
  };
};
