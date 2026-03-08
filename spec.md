# Factory Production Manager

## Current State
New project. No existing implementation.

## Requested Changes (Diff)

### Add
- Single admin login (authorization component)
- Employee Management: create/edit/deactivate employees with fields: auto-generated ID, name, mobile, joining date, worker type (piece-rate / daily wage), bank details (account number, IFSC, bank name), status (active/inactive)
- Operation Master: create/edit operations with operation ID, name, rate per piece (INR)
- Attendance System: mark daily attendance per employee (present / absent / half-day), saved per date
- Daily Production Entry: enter multiple operations per worker per day; system auto-fetches rate from operation; calculates earnings = quantity x rate
- Worker Production Report: view daily / weekly / monthly production and earnings per worker
- Monthly Salary Sheet: auto-calculated from total production amounts; shows employee, attendance count, production amount, salary
- Bank Transfer Sheet: employee name, account number, IFSC, salary amount
- Search: by worker name, operation name, production date
- Dashboard: total employees, today's attendance, today's production total, monthly salary total
- Excel export: daily production report, monthly salary sheet, worker production report

### Modify
- None

### Remove
- None

## Implementation Plan
1. Select `authorization` component for single admin login
2. Generate Motoko backend with:
   - Employee CRUD (create, update, deactivate, list, get by ID)
   - Operation CRUD (create, update, list, get by ID)
   - Attendance: mark per employee per date, query by date/employee/month
   - Production Entry: add entries (employeeId, date, operationId, quantity, amount), query by employee/date/month
   - Salary computation: aggregate production amounts per employee per month
   - Dashboard stats: counts and totals
3. Build React frontend with:
   - Login page
   - Dashboard (stats cards)
   - Employees page (list, create, edit, toggle status)
   - Operations page (list, create, edit)
   - Attendance page (date picker, mark attendance per employee)
   - Production Entry page (fast entry: select worker -> select operation -> enter quantity -> auto-calculated amount -> submit)
   - Reports: production report (daily/weekly/monthly filter), salary sheet, bank transfer sheet
   - Search bar across workers/operations/dates
   - Excel export buttons on report pages
   - Mobile-friendly layout with bottom navigation or sidebar
