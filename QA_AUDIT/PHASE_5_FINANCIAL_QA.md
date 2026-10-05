# Phase 5: Financial & Expense QA Audit

This document details the findings from the QA testing of the financial lifecycle, expense tracking, and dashboard KPI calculations.

## Executive Summary
The system successfully enforces the new terminology standard ("Trip Rate") and isolates expenses securely based on roles and scoping rules. Net Profit and Margin calculations are logically sound. However, the financial reporting architecture suffers from severe data synchronization issues and missing aggregation logic, particularly between active expenses and finalized trip reports.

---

### BUG-12: Massive Financial Discrepancy (Active Expenses Missing from Dashboard)
**TEST ID:** FIN-DASH-01
**Severity:** CRITICAL

**Steps to Reproduce:**
1. Check the Dashboard "Total Expenses" KPI.
2. Dispatch a new Trip.
3. As a Driver (or Owner), add a heavy expense (e.g., Fuel = ₹50,000) to the active trip.
4. Go to the Owner's "Expenses" page. Verify the total reflects the ₹50,000.
5. Go back to the Dashboard page.

**Expected Behavior:**
The Dashboard's Total Expenses should increase by ₹50,000 to reflect the company's real-time outgoing cash flow.

**Actual Behavior:**
The Dashboard KPI ignores the expense completely. 
In `reportController.js`, `getDashboardKPIs` aggregates its totals exclusively from `TripReport` documents. Because `TripReport` documents are ONLY generated when a trip is marked `COMPLETED`, all expenses from `ON_TRIP` journeys are completely absent from the company's financial dashboard. Conversely, the `Expenses.jsx` page pulls directly from the `Expense` collection. This results in the Owner seeing two drastically different "Total Expenses" across the application.

**Recommended Fix:**
Refactor `getDashboardKPIs` to calculate `totalExpenses` directly from the `Expense` collection (using a MongoDB aggregation pipeline) rather than relying on `TripReport` records, ensuring real-time financial accuracy.

---

### BUG-13: Deleting Expenses Corrupts Dashboard Net Profit (Desync)
**TEST ID:** FIN-EXP-02
**Severity:** HIGH

**Steps to Reproduce:**
1. Complete a trip that has ₹10,000 in expenses. (Dashboard KPI increases by ₹10,000).
2. Go to the Expenses page and delete that ₹10,000 expense.
3. Check the Dashboard KPI again.

**Expected Behavior:**
The system should either block deleting expenses from finalized trips OR gracefully recalculate the Trip Report to drop the ₹10,000.

**Actual Behavior:**
The backend `deleteExpense` controller has no guardrails to prevent deleting expenses from `COMPLETED` trips. When deleted, the expense disappears from the database. However, `generateTripReport(tripId)` is never invoked. The `TripReport` document is permanently frozen with the old ₹10,000 value, meaning the Dashboard KPI is now corrupted and will display ghost expenses forever.

**Recommended Fix:**
In `deleteExpense`, fetch the associated trip. If the trip is `COMPLETED`, `await generateTripReport(trip._id)` before returning the response. Alternatively, block the deletion of expenses if the parent trip is completed.

---

### BUG-14: Ungraceful 500 Error on Invalid Expense Dates
**TEST ID:** FIN-VAL-03
**Severity:** LOW

**Steps to Reproduce:**
1. Fire `POST /api/expenses` with `"date": "Not-A-Real-Date"`.

**Expected Behavior:**
The API should return a `400 Bad Request` citing an invalid date format.

**Actual Behavior:**
The `createExpenseSchema` defines `date: z.string()` but lacks a refine method to check if the string is actually parseable as a date. Zod passes the payload to MongoDB. Mongoose attempts to cast "Not-A-Real-Date" to its `Date` type, fails, and throws a `CastError`. Because `errorHandler.js` doesn't handle Mongoose CastErrors, the API crashes with a `500 Server Error`.

**Recommended Fix:**
Add `.refine((date) => !isNaN(new Date(date).getTime()), "Invalid date")` to the `date` field in `expenseValidator.js`.

---

### BUG-15: Floating Point Precision (Rounding Errors)
**TEST ID:** FIN-CALC-04
**Severity:** UX / MINOR

**Steps to Reproduce:**
1. Submit two expenses for a trip: ₹100.10 and ₹200.20.
2. Complete the trip and check the Dashboard KPIs.

**Expected Behavior:**
The dashboard should display ₹300.30.

**Actual Behavior:**
Because `tripReportService.js` aggregates using simple JS addition (`totalExpenses += exp.amount`), standard IEEE-754 floating point arithmetic issues occur (`100.1 + 200.2 = 300.30000000000004`). The frontend uses `toLocaleString()` but does not enforce fractional limits. The dashboard UI will occasionally render long artifact strings like `₹300.30000000000004`.

**Recommended Fix:**
In `tripReportService.js`, round numeric values before saving (e.g., `Math.round(val * 100) / 100`), or force the frontend to use `toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })`.

---

## Validated Features (Working as Intended)
1. **Terminology Standardization:** Verified globally. All UI components (Trips, Dashboard, Reports, Modals) and API endpoints successfully use the exact phrase "Trip Rate" instead of "Expected Revenue".
2. **Negative Margin Calculations:** Tested the scenario where Expenses > Trip Rate. `tripReportService.js` elegantly handles the math, correctly writing negative `netProfit` and negative `profitMarginPercent` to the DB.
3. **Empty Values:** Zod validators correctly reject 0 and negative amounts for both Expenses and Trip Rates.
