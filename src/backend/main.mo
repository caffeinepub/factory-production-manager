import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Int "mo:core/Int";

persistent actor {

  stable var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin access required");
    };
  };

  // ── Types ──────────────────────────────────────────────────────────────────
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

  // ── State ──────────────────────────────────────────────────────────────────
  var employeeCounter : Nat = 0;
  var operationCounter : Nat = 0;
  var attendanceCounter : Nat = 0;
  var productionCounter : Nat = 0;

  let employees = Map.empty<Text, Employee>();
  let operations = Map.empty<Text, Operation>();
  let attendances = Map.empty<Text, Attendance>();
  let productions = Map.empty<Text, ProductionEntry>();

  // ── Helpers ────────────────────────────────────────────────────────────────
  func padTwo(n : Nat) : Text {
    if (n < 10) { "0" # n.toText() } else { n.toText() }
  };

  func nextEmpId() : Text {
    employeeCounter += 1;
    let s = employeeCounter.toText();
    "EMP" # (if (employeeCounter < 10) "00" # s else if (employeeCounter < 100) "0" # s else s)
  };

  func nextOpId() : Text {
    operationCounter += 1;
    let s = operationCounter.toText();
    "OP" # (if (operationCounter < 10) "00" # s else if (operationCounter < 100) "0" # s else s)
  };

  func nextAttId() : Text {
    attendanceCounter += 1;
    "ATT" # attendanceCounter.toText()
  };

  func nextProdId() : Text {
    productionCounter += 1;
    "PROD" # productionCounter.toText()
  };

  func startsWith(t : Text, prefix : Text) : Bool {
    if (prefix.size() > t.size()) return false;
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
    match
  };

  func toLower(t : Text) : Text {
    t.map(func(c : Char) : Char {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(c.toNat32() + 32)
      } else { c }
    })
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
    found
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
      let diy : Nat = if (leap) 366 else 365;
      if (rem < diy) break YL;
      rem -= diy;
      yr += 1;
    };
    let mdays : [Nat] = [31, if (leap) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var mo : Nat = 1;
    label ML for (md in mdays.vals()) {
      if (rem < md) break ML;
      rem -= md;
      mo += 1;
    };
    let dy = rem + 1;
    yr.toText() # "-" # padTwo(mo) # "-" # padTwo(dy)
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
    result
  };

  // ── Employees ──────────────────────────────────────────────────────────────
  public shared ({ caller }) func createEmployee(
    name : Text, mobile : Text, joiningDate : Text, workerType : Text,
    accountNumber : Text, ifscCode : Text, bankName : Text
  ) : async Employee {
    requireAdmin(caller);
    let id = nextEmpId();
    let e : Employee = { id; name; mobile; joiningDate; workerType; accountNumber; ifscCode; bankName; status = "Active" };
    employees.add(id, e);
    e
  };

  public shared ({ caller }) func updateEmployee(
    id : Text, name : Text, mobile : Text, joiningDate : Text, workerType : Text,
    accountNumber : Text, ifscCode : Text, bankName : Text, status : Text
  ) : async ?Employee {
    requireAdmin(caller);
    switch (employees.get(id)) {
      case (null) null;
      case (?_) {
        let e : Employee = { id; name; mobile; joiningDate; workerType; accountNumber; ifscCode; bankName; status };
        employees.add(id, e);
        ?e
      };
    }
  };

  public query func listEmployees() : async [Employee] {
    employees.entries()
      .map(func((_k, e) : (Text, Employee)) : Employee { e })
      .toArray()
  };

  public query func getEmployee(id : Text) : async ?Employee {
    employees.get(id)
  };

  public query func searchEmployees(q : Text) : async [Employee] {
    employees.entries()
      .filter(func((_k, e) : (Text, Employee)) : Bool { containsText(e.name, q) or containsText(e.id, q) })
      .map(func((_k, e) : (Text, Employee)) : Employee { e })
      .toArray()
  };

  // ── Operations ────────────────────────────────────────────────────────────
  public shared ({ caller }) func createOperation(name : Text, ratePerPiece : Float) : async Operation {
    requireAdmin(caller);
    let id = nextOpId();
    let op : Operation = { id; name; ratePerPiece };
    operations.add(id, op);
    op
  };

  public shared ({ caller }) func updateOperation(id : Text, name : Text, ratePerPiece : Float) : async ?Operation {
    requireAdmin(caller);
    switch (operations.get(id)) {
      case (null) null;
      case (?_) {
        let op : Operation = { id; name; ratePerPiece };
        operations.add(id, op);
        ?op
      };
    }
  };

  public query func listOperations() : async [Operation] {
    operations.entries()
      .map(func((_k, op) : (Text, Operation)) : Operation { op })
      .toArray()
  };

  public query func getOperation(id : Text) : async ?Operation {
    operations.get(id)
  };

  public query func searchOperations(q : Text) : async [Operation] {
    operations.entries()
      .filter(func((_k, op) : (Text, Operation)) : Bool { containsText(op.name, q) or containsText(op.id, q) })
      .map(func((_k, op) : (Text, Operation)) : Operation { op })
      .toArray()
  };

  // ── Attendance ────────────────────────────────────────────────────────────
  public shared ({ caller }) func markAttendance(date : Text, employeeId : Text, status : Text) : async Attendance {
    requireAdmin(caller);
    let existing = attendances.entries().find(func((_k, a) : (Text, Attendance)) : Bool {
      a.date == date and a.employeeId == employeeId
    });
    switch (existing) {
      case (?(k, _)) {
        let a : Attendance = { id = k; date; employeeId; status };
        attendances.add(k, a);
        a
      };
      case (null) {
        let id = nextAttId();
        let a : Attendance = { id; date; employeeId; status };
        attendances.add(id, a);
        a
      };
    }
  };

  public query func getAttendanceByDate(date : Text) : async [Attendance] {
    attendances.entries()
      .filter(func((_k, a) : (Text, Attendance)) : Bool { a.date == date })
      .map(func((_k, a) : (Text, Attendance)) : Attendance { a })
      .toArray()
  };

  public query func getAttendanceByEmployeeMonth(employeeId : Text, month : Text) : async [Attendance] {
    attendances.entries()
      .filter(func((_k, a) : (Text, Attendance)) : Bool {
        a.employeeId == employeeId and startsWith(a.date, month)
      })
      .map(func((_k, a) : (Text, Attendance)) : Attendance { a })
      .toArray()
  };

  // ── Production ────────────────────────────────────────────────────────────
  public shared ({ caller }) func addProductionEntry(
    date : Text, employeeId : Text, operationId : Text, quantity : Nat
  ) : async ?ProductionEntry {
    requireAdmin(caller);
    switch (operations.get(operationId)) {
      case (null) null;
      case (?op) {
        let id = nextProdId();
        let amount = quantity.toFloat() * op.ratePerPiece;
        let e : ProductionEntry = { id; date; employeeId; operationId; quantity; amount };
        productions.add(id, e);
        ?e
      };
    }
  };

  public query func getProductionByDate(date : Text) : async [ProductionEntry] {
    productions.entries()
      .filter(func((_k, p) : (Text, ProductionEntry)) : Bool { p.date == date })
      .map(func((_k, p) : (Text, ProductionEntry)) : ProductionEntry { p })
      .toArray()
  };

  public query func getProductionByEmployeeMonth(employeeId : Text, month : Text) : async [ProductionEntry] {
    productions.entries()
      .filter(func((_k, p) : (Text, ProductionEntry)) : Bool {
        p.employeeId == employeeId and startsWith(p.date, month)
      })
      .map(func((_k, p) : (Text, ProductionEntry)) : ProductionEntry { p })
      .toArray()
  };

  public query func getProductionByMonth(month : Text) : async [ProductionEntry] {
    productions.entries()
      .filter(func((_k, p) : (Text, ProductionEntry)) : Bool { startsWith(p.date, month) })
      .map(func((_k, p) : (Text, ProductionEntry)) : ProductionEntry { p })
      .toArray()
  };

  public query func getProductionByEmployee(employeeId : Text) : async [ProductionEntry] {
    productions.entries()
      .filter(func((_k, p) : (Text, ProductionEntry)) : Bool { p.employeeId == employeeId })
      .map(func((_k, p) : (Text, ProductionEntry)) : ProductionEntry { p })
      .toArray()
  };

  // ── Salary Sheet ──────────────────────────────────────────────────────────
  public query func getMonthlySalarySheet(month : Text) : async [SalaryRecord] {
    let empArr = employees.entries()
      .map(func((_k, e) : (Text, Employee)) : Employee { e })
      .toArray();
    empArr.map(func(emp : Employee) : SalaryRecord {
      var prodTotal : Float = 0.0;
      for ((_k, p) in productions.entries()) {
        if (p.employeeId == emp.id and startsWith(p.date, month)) {
          prodTotal += p.amount;
        };
      };
      var attCount : Nat = 0;
      for ((_k, a) in attendances.entries()) {
        if (a.employeeId == emp.id and startsWith(a.date, month)) {
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
      }
    })
  };

  // ── Dashboard ────────────────────────────────────────────────────────────
  public query func getDashboardStats() : async DashboardStats {
    let today = todayText();
    let month = monthOf(today);
    var total : Nat = 0;
    var active : Nat = 0;
    for ((_k, e) in employees.entries()) {
      total += 1;
      if (e.status == "Active") { active += 1 };
    };
    var present : Nat = 0;
    for ((_k, a) in attendances.entries()) {
      if (a.date == today and (a.status == "Present" or a.status == "HalfDay")) { present += 1 };
    };
    var todayProd : Float = 0.0;
    var monthProd : Float = 0.0;
    for ((_k, p) in productions.entries()) {
      if (p.date == today) { todayProd += p.amount };
      if (startsWith(p.date, month)) { monthProd += p.amount };
    };
    {
      totalEmployees = total;
      activeEmployees = active;
      todayAttendancePresent = present;
      todayProductionTotal = todayProd;
      currentMonthProductionTotal = monthProd;
    }
  };
};
