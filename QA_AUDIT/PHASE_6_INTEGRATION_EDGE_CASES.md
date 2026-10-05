# Phase 6: Full Integration & Edge Case QA Audit

This document outlines the findings of the QA testing focused on cross-module integration, panel consistency, concurrency, and system edge cases.

## Executive Summary
The system handles empty states and boundary inputs very well. However, because the application uses a "dynamic status resolution" engine that isn't applied globally across all API controllers, there are significant contradictory states displayed across different panels. Furthermore, the lack of MongoDB transactions makes the system vulnerable to data corruption during network/server interruptions.

---

### BUG-16: Driver Status Desynchronization (Cross-Panel Contradiction)
**TEST ID:** INT-SYNC-01
**Severity:** HIGH

**Steps to Reproduce:**
1. Log in as an Owner. Verify Driver A is marked as "Available" in the database.
2. Dispatch a Trip and assign Driver A.
3. Owner's Driver Panel accurately shows Driver A as "On Trip" (thanks to the dynamic status resolver).
4. Log in as Driver A and view the Driver Dashboard.

**Expected Behavior:**
The Driver Dashboard should display "On Trip" to match the Owner's panel and the reality of the active trip.

**Actual Behavior:**
The Driver Dashboard displays **"Available"**. 
The Owner panel uses `GET /api/drivers`, which dynamically overrides the database status if an active trip exists. However, the Driver Dashboard uses `GET /api/auth/me`, which fetches the driver's raw profile directly from the database without invoking the dynamic resolver. This creates a glaring contradiction across user roles.

**Recommended Fix:**
Extract the dynamic status resolution logic into a shared utility function (e.g., `resolveDriverStatus(driver)`). Apply this function inside `getMe` in `authController.js` and immediately before returning populated objects in `getTrips`.

---

### BUG-17: Populated Object Status Desynchronization
**TEST ID:** INT-SYNC-02
**Severity:** MEDIUM

**Steps to Reproduce:**
1. Manually set a Truck's status to "MAINTENANCE".
2. Dispatch a Trip using that Truck. (The Owner's Truck panel dynamically shows it as "On Trip").
3. Inspect the API response for `GET /api/trips`.

**Expected Behavior:**
The populated `truckId` object inside the trip should accurately reflect the dynamic "On Trip" status.

**Actual Behavior:**
The `getTrips` controller uses Mongoose `.populate()`, which directly grabs the raw database document. The API payload returns `"status": "MAINTENANCE"` inside the populated truck object. While currently hidden by the UI (Trips.jsx only renders the registration number), any future UI expansion will accidentally display contradictory statuses.

**Recommended Fix:**
Map through the `trips` array before returning the API response and manually apply the dynamic status resolver to the populated `truckId` and `driverId` objects.

---

### BUG-18: Concurrent Trip Confirmation Crash (Duplicate Upsert)
**TEST ID:** INT-CONC-03
**Severity:** LOW

**Steps to Reproduce:**
1. Prepare a `PATCH /api/trips/:id/confirm-end` request for a trip.
2. Fire the request twice simultaneously (simulating an impatient double-click or automated spam).

**Expected Behavior:**
The system should confirm the trip idempotently and silently ignore the second request.

**Actual Behavior:**
Both requests successfully pass the `trip.status` check and concurrently invoke `generateTripReport(trip._id)`. In `tripReportService.js`, both threads execute `TripReport.findOneAndUpdate({ tripId }, ... { upsert: true })`. Because MongoDB `upsert` is not an atomic lock, if both queries evaluate before the document is created, MongoDB attempts two identical inserts. The second insert hits a unique index constraint (E11000 duplicate key error) and crashes the server thread with a `500 Server Error`.

**Recommended Fix:**
Add a UI-level debounce/lock on the "Confirm Trip" button (like `isSubmitting`). On the backend, wrap the `findOneAndUpdate` in a `try/catch` specifically looking for `code === 11000` to swallow the race condition error gracefully.

---

### BUG-19: Lack of Transactional Integrity (Half-Committed State)
**TEST ID:** INT-NET-04
**Severity:** CRITICAL / INFRASTRUCTURE

**Steps to Reproduce (Theoretical):**
1. Initiate `createTrip` dispatch.
2. Simulate a sudden MongoDB disconnection or Node.js crash exactly 1 millisecond after `Trip.create()` executes, but before `Truck.findByIdAndUpdate()` executes.

**Expected Behavior:**
The transaction should roll back, leaving the database clean.

**Actual Behavior:**
The backend controllers do not use MongoDB Transactions (`session.withTransaction`). 
In `tripController.js`, `Trip.create` is fired, followed sequentially by `Truck.findByIdAndUpdate` and `Driver.findByIdAndUpdate`. If the server drops between these `await` calls, the system enters a corrupted state: The Trip exists as "ON_TRIP", but the truck and driver are completely untouched (e.g., remaining in "MAINTENANCE" or "ON_LEAVE").

**Recommended Fix:**
Implement MongoDB transactions for all complex lifecycle operations (`createTrip`, `updateTrip`, `ownerConfirmEndTrip`).

---

## Validated Features (Working as Intended)
1. **Empty States:** Extensively checked `trips.length === 0` logic and empty array reductions. The UI perfectly handles `0` values without dividing by zero or crashing.
2. **Network Timeouts (Client-Side):** The frontend strictly utilizes `try/catch` and `finally { setIsSubmitting(false) }` blocks across all CRUD operations. If the server is unreachable, the UI gracefully renders a user-friendly error string instead of locking up indefinitely.
