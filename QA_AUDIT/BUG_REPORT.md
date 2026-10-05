# Master Bug Summary

| Bug ID | Module | Short Description | Severity | Status |
|--------|--------|-------------------|----------|--------|
| BUG-002 | Trip Management | Driver "End Trip" bypasses financial report generation | CRITICAL | OPEN |
| BUG-009 | Trip Management | Editing completed trips bypasses validations & desyncs financials | CRITICAL | OPEN |
| BUG-012 | Dashboard / Financials | Active expenses missing from Dashboard KPIs | CRITICAL | OPEN |
| BUG-019 | API / DB Integration | Lack of transactional integrity causes half-committed states | CRITICAL | OPEN |
| BUG-001 | Reports / Authorization | Driver PDF download fails with 404 Incorrect Context | HIGH | OPEN |
| BUG-003 | Truck & Driver | Missing API delete endpoints; UI just mocks alert | HIGH | OPEN |
| BUG-006 | Truck Assignment | IDOR: Owners can assign drivers belonging to other owners | HIGH | OPEN |
| BUG-010 | Trip Management | Race condition allows duplicate active trips for same truck/driver | HIGH | OPEN |
| BUG-013 | Expenses | Deleting expense from completed trip corrupts Dashboard Net Profit | HIGH | OPEN |
| BUG-016 | Driver Dashboard | Driver dashboard says "Available" while Owner sees "On Trip" | HIGH | OPEN |
| BUG-004 | Truck & Driver | Duplicate records cause ungraceful 500 Server Errors | MEDIUM | OPEN |
| BUG-007 | Trip Validation | Capacity validation bypassed entirely if capacity is non-numeric (NaN) | MEDIUM | OPEN |
| BUG-017 | Integration | API `getTrips` Populated objects contain contradictory database statuses | MEDIUM | OPEN |
| BUG-005 | Driver Management | License Number uniqueness not enforced | LOW | OPEN |
| BUG-008 | Trip Assignment | Dispatching trip permanently mutates truck's baseline default driver | LOW | OPEN |
| BUG-014 | Expenses | Invalid expense date throws Mongoose CastError (500 Error) | LOW | OPEN |
| BUG-018 | Trip Management | Concurrent trip confirmation throws E11000 duplicate upsert crash | LOW | OPEN |
| BUG-015 | Financials | Floating point rounding errors cause artifact strings on Dashboard | COSMETIC | OPEN |

# PRESENTATION BLOCKERS
- **The "Limbo Trip" Profit Blackhole:** If you demonstrate a Driver ending a trip, it permanently hides the "Complete Trip" button for the Owner. The Trip Report is never generated, and the Dashboard KPIs remain stubbornly at ₹0.
- **The Missing "Active Cashflow":** Dashboard calculates expenses only from completed trips. If you add an expense to an active trip on the demo, the dashboard remains at ₹0, making it look broken.
- **Driver Dashboard Contradiction:** Driver dashboard (`auth/me`) shows "Available", while Owner dashboard shows "On Trip". A side-by-side demo will fail.
- **The "Fake Delete" Buttons:** Clicking "Remove Truck" pops up a mock alert, proving the application is unfinished.
- **Driver PDF 404 Crash:** A driver attempting to download their own receipt receives a 404 Not Found.
- **500 Crash on Edits:** Deliberately testing validation by updating a truck to an existing registration number throws an ugly 500 Server Error console log instead of a clean validation warning.

# RECOMMENDED FIX ORDER

## Priority 1: CRITICAL
- **BUG-002, BUG-009, BUG-012, BUG-019**: These bugs actively destroy the financial integrity of the system or break the primary business workflow (Trip Completion). They must be addressed immediately to ensure data accuracy.

## Priority 2: HIGH
- **BUG-001, BUG-003, BUG-006, BUG-010, BUG-013, BUG-016**: These bugs cause major user-facing failures, authorization leaks (IDOR), or severely embarrass the presentation flow.

## Priority 3: MEDIUM
- **BUG-004, BUG-007, BUG-017**: These represent poorly handled validations or UI ungraceful errors. They impact the user experience but don't outright corrupt the core business workflow unless intentionally abused.

## Priority 4: LOW
- **BUG-005, BUG-008, BUG-014, BUG-018**: Minor edge cases, highly theoretical crashes, or UX inconveniences that users can work around.

## Priority 5: COSMETIC
- **BUG-015**: Simple UI formatting fixes for decimals.

---

# Detailed Bug Reports

BUG ID: BUG-001
TITLE: Driver Unable to Download Trip PDF
MODULE: Reports / Authorization
PAGE/PANEL: Driver Trip Details
ROLE: Driver
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. Log in as Driver. 2. Hit `GET /api/reports/trip/:id/pdf`.
EXPECTED RESULT: Receives PDF.
ACTUAL RESULT: Receives 404 Trip Not Found.
ROOT CAUSE: Controller searches using `ownerId = req.user._id`, treating the Driver's ID as the Owner's ID.
RECOMMENDED FIX: Resolve `ownerId` dynamically based on role.

BUG ID: BUG-002
TITLE: Driver End Trip Bypasses Financials
MODULE: Trip Management
PAGE/PANEL: Owner Trips Panel
ROLE: Owner & Driver
SEVERITY: CRITICAL
STATUS: OPEN
STEPS TO REPRODUCE: 1. Driver clicks "Request Trip End". 2. Owner attempts to confirm trip.
EXPECTED RESULT: Owner confirms and Report is generated.
ACTUAL RESULT: Driver endpoint hardcodes status to `COMPLETED`. Owner UI hides the confirmation button for `COMPLETED` trips. Owner is permanently locked out, and Report is never generated.
ROOT CAUSE: Lack of `DRIVER_ENDED` intermediary state or failure to call `generateTripReport` in driver endpoint.
RECOMMENDED FIX: Add `generateTripReport` to driver endpoint, or add `DRIVER_ENDED` status.

BUG ID: BUG-003
TITLE: Missing Delete API Endpoints for Trucks/Drivers
MODULE: Truck & Driver
PAGE/PANEL: Trucks / Drivers
ROLE: Owner
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. Click Remove Truck / Delete Account.
EXPECTED RESULT: Prompts deletion and removes from DB.
ACTUAL RESULT: Mock alert appears; no backend routes exist for DELETE.
ROOT CAUSE: Incomplete implementation.
RECOMMENDED FIX: Add DELETE endpoints with reference integrity checks.

BUG ID: BUG-004
TITLE: Ungraceful 500 Error on Duplicate Data Updates
MODULE: Truck & Driver
PAGE/PANEL: Edit Modals
ROLE: Owner
SEVERITY: MEDIUM
STATUS: OPEN
STEPS TO REPRODUCE: 1. Update truck registration to one that already exists.
EXPECTED RESULT: 400 Validation Error.
ACTUAL RESULT: 500 Server Error (MongoDB 11000 Unique Constraint violation).
ROOT CAUSE: Missing `findOne` check before `findOneAndUpdate`.
RECOMMENDED FIX: Add uniqueness checks before updates.

BUG ID: BUG-005
TITLE: License Number Uniqueness Not Enforced
MODULE: Driver Management
PAGE/PANEL: Add Driver
ROLE: Owner
SEVERITY: LOW
STATUS: OPEN
STEPS TO REPRODUCE: 1. Create two drivers with identical licenses.
EXPECTED RESULT: Rejected.
ACTUAL RESULT: Accepted.
ROOT CAUSE: No unique index or controller check.
RECOMMENDED FIX: Add unique index for license number.

BUG ID: BUG-006
TITLE: IDOR on Truck Driver Assignment
MODULE: Truck Management
PAGE/PANEL: Edit Truck API
ROLE: Owner
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. `PUT /api/trucks/:id` with `currentDriverId` belonging to another owner.
EXPECTED RESULT: 400/403 Error.
ACTUAL RESULT: Success, linking the cross-tenant driver.
ROOT CAUSE: Missing scope check on the assigned driver ID.
RECOMMENDED FIX: Validate driver ownership before assignment.

BUG ID: BUG-007
TITLE: Truck Capacity Validation Bypassed via NaN
MODULE: Trip Validation
PAGE/PANEL: Dispatch Trip
ROLE: Owner
SEVERITY: MEDIUM
STATUS: OPEN
STEPS TO REPRODUCE: 1. Set truck capacity to "Ten Tons". 2. Dispatch trip with quantity 99999.
EXPECTED RESULT: Rejected for exceeding capacity or invalid capacity.
ACTUAL RESULT: Accepted.
ROOT CAUSE: `parseFloat` returns `NaN`. Math checks against `NaN` fail silently, bypassing validation.
RECOMMENDED FIX: Check for `isNaN` and reject if unparseable.

BUG ID: BUG-008
TITLE: Dispatch Unintentionally Mutates Truck's Default Driver
MODULE: Trip Assignment
PAGE/PANEL: Dispatch Trip
ROLE: Owner
SEVERITY: LOW
STATUS: OPEN
STEPS TO REPRODUCE: 1. Select truck with default Driver A. 2. Change dispatch dropdown to Driver B. 3. Submit.
EXPECTED RESULT: Trip uses Driver B; Truck retains Driver A as default.
ACTUAL RESULT: Truck's default driver is permanently overwritten to Driver B in the DB.
ROOT CAUSE: Deliberate but unexpected `updateTruckData.currentDriverId` assignment.
RECOMMENDED FIX: Remove permanent mutation unless requested.

BUG ID: BUG-009
TITLE: Editing Completed Trip Bypasses Validations & Desyncs Financials
MODULE: Trip Management
PAGE/PANEL: Edit Trip Modal
ROLE: Owner
SEVERITY: CRITICAL
STATUS: OPEN
STEPS TO REPRODUCE: 1. Edit a COMPLETED trip. 2. Change Truck, Driver, or Trip Rate.
EXPECTED RESULT: Blocked, or updates trip and regenerates TripReport.
ACTUAL RESULT: Validation logic is wrapped in `if (status === "ON_TRIP")`, allowing bypassing. TripReport is NOT updated, desyncing KPIs.
ROOT CAUSE: Logic gap and missing `generateTripReport` on update.
RECOMMENDED FIX: Block editing completed trips entirely.

BUG ID: BUG-010
TITLE: Race Condition Allows Duplicate Active Trips
MODULE: Trip Management
PAGE/PANEL: Dispatch Trip
ROLE: Owner
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. Rapidly double-click/spam dispatch API.
EXPECTED RESULT: 1 trip created, others rejected.
ACTUAL RESULT: 2+ identical active trips created for same truck/driver.
ROOT CAUSE: Lack of partial unique DB index on active trips.
RECOMMENDED FIX: Add DB-level partial index constraint.

BUG ID: BUG-012
TITLE: Active Expenses Missing from Dashboard
MODULE: Financials
PAGE/PANEL: Owner Dashboard
ROLE: Owner
SEVERITY: CRITICAL
STATUS: OPEN
STEPS TO REPRODUCE: 1. View Dashboard Total Expenses. 2. Add expense to an active trip. 3. View Dashboard again.
EXPECTED RESULT: Expenses increase.
ACTUAL RESULT: Remains unchanged. Dashboard only parses `TripReport` which strictly applies to `COMPLETED` trips.
ROOT CAUSE: Dashboard queries wrong collection for accurate real-time cash flow.
RECOMMENDED FIX: Query `Expense` collection directly for Dashboard KPIs.

BUG ID: BUG-013
TITLE: Deleting Expenses Corrupts Net Profit
MODULE: Expenses
PAGE/PANEL: Expenses List
ROLE: Owner
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. Delete an expense for a completed trip. 2. Check Dashboard.
EXPECTED RESULT: Net profit recalculates.
ACTUAL RESULT: Net profit is permanently frozen with the deleted expense still deducted.
ROOT CAUSE: `deleteExpense` lacks a trigger to recalculate `TripReport`.
RECOMMENDED FIX: Prevent deleting finalized expenses or trigger regeneration.

BUG ID: BUG-014
TITLE: Ungraceful 500 on Invalid Expense Dates
MODULE: Expenses
PAGE/PANEL: Expense API
ROLE: Owner/Driver
SEVERITY: LOW
STATUS: OPEN
STEPS TO REPRODUCE: 1. Send invalid date string.
EXPECTED RESULT: 400 Bad Request.
ACTUAL RESULT: 500 Server Error (CastError).
ROOT CAUSE: Zod schema lacks date parsing refinement.
RECOMMENDED FIX: Refine Zod schema for valid dates.

BUG ID: BUG-015
TITLE: Floating Point Rounding Errors
MODULE: Financials
PAGE/PANEL: Owner Dashboard
ROLE: Owner
SEVERITY: COSMETIC
STATUS: OPEN
STEPS TO REPRODUCE: 1. Enter expenses that create precision faults (e.g. 100.1 + 200.2).
EXPECTED RESULT: ₹300.30
ACTUAL RESULT: ₹300.30000000000004
ROOT CAUSE: IEEE-754 math and unrestrained `toLocaleString`.
RECOMMENDED FIX: Enforce fraction limits on UI.

BUG ID: BUG-016
TITLE: Driver Status Cross-Panel Contradiction
MODULE: Driver Dashboard
PAGE/PANEL: Driver Profile View
ROLE: Driver
SEVERITY: HIGH
STATUS: OPEN
STEPS TO REPRODUCE: 1. Assign driver to trip. 2. View Owner panel ("On Trip"). 3. View Driver panel.
EXPECTED RESULT: Driver sees "On Trip".
ACTUAL RESULT: Driver sees "Available".
ROOT CAUSE: `auth/me` does not utilize the dynamic status resolver.
RECOMMENDED FIX: Apply dynamic status resolver to `auth/me`.

BUG ID: BUG-017
TITLE: Populated Object Status Desync
MODULE: API / Integration
PAGE/PANEL: API Responses
ROLE: System
SEVERITY: MEDIUM
STATUS: OPEN
STEPS TO REPRODUCE: 1. Read API payload for `getTrips`.
EXPECTED RESULT: Populated truck/driver status reflects dynamic "On Trip" reality.
ACTUAL RESULT: Populated truck/driver contains raw database status (e.g. "MAINTENANCE").
ROOT CAUSE: Mongoose `.populate()` does not run controller-level dynamic resolvers.
RECOMMENDED FIX: Manually mutate populated statuses before returning JSON.

BUG ID: BUG-018
TITLE: Concurrent Trip Confirmation Crash
MODULE: Trip Management
PAGE/PANEL: API
ROLE: Owner
SEVERITY: LOW
STATUS: OPEN
STEPS TO REPRODUCE: 1. Spam `PATCH confirm-end`.
EXPECTED RESULT: Idempotent success.
ACTUAL RESULT: Server crash (E11000 duplicate key error) due to concurrent upsert.
ROOT CAUSE: MongoDB `upsert` lacks atomic locking.
RECOMMENDED FIX: Swallow 11000 errors on upsert.

BUG ID: BUG-019
TITLE: Lack of Transactional Integrity
MODULE: DB Integration
PAGE/PANEL: Dispatch Flow
ROLE: System
SEVERITY: CRITICAL
STATUS: OPEN
STEPS TO REPRODUCE: 1. Simulate server crash during `createTrip`.
EXPECTED RESULT: Rollback.
ACTUAL RESULT: Half-committed state (Trip exists, assets remain available).
ROOT CAUSE: Missing MongoDB Transactions.
RECOMMENDED FIX: Wrap complex orchestrations in DB sessions.
