# Phase 2: Authentication & Authorization Security Audit

This document outlines the findings of the QA security testing focused on Authentication, Authorization, Role Access, and API Security.

## Executive Summary
The system's role-based access control (RBAC) and data isolation (`scopeOwnership`) middleware are fundamentally sound and secure. Drivers are strictly isolated from Owner routes and other drivers' data. However, two critical business logic bugs were discovered related to shared API routes and trip lifecycle transitions.

---

### BUG-1: Driver Unable to Generate/Download Trip PDF (Incorrect Context Resolution)

**TEST ID:** AUTH-API-01
**Severity:** HIGH

**Steps to Reproduce:**
1. Log in as a Driver.
2. Attempt to download the PDF for one of your assigned trips by triggering `GET /api/reports/trip/:tripId/pdf`.

**Expected Behavior:**
The driver should successfully receive the PDF for their own trip, as the route is placed under "Shared but scoped routes" and is not protected by `authorize("OWNER")`.

**Actual Behavior:**
The API returns a `404 Trip not found` error.

**Evidence:**
In `backend/controllers/reportController.js -> getTripReportPdf`:
```javascript
const ownerId = req.user._id;
const tripId = req.params.tripId;
const trip = await Trip.findOne({ _id: tripId, ownerId })
```
When a Driver makes this request, `req.user._id` is the Driver's User ID, not the true Owner's User ID. Therefore, the database query looks for a trip where `ownerId === <Driver's ID>`, which fails and returns a 404.

**Recommended Fix:**
Update `getTripReportPdf` to resolve the `ownerId` dynamically based on the role, similar to how it's done in `scopeOwnership` or `getDriverReport`:
```javascript
const ownerId = req.user.role === "OWNER" ? req.user._id : req.ownerId;
```

---

### BUG-2: Driver Trip Ending Permanently Bypasses Financial Report Generation

**TEST ID:** AUTH-LOGIC-02
**Severity:** CRITICAL

**Steps to Reproduce:**
1. Dispatch a trip as an Owner.
2. Log in as the assigned Driver and click "Request Trip End" on the Driver Dashboard.
3. Log back in as the Owner and navigate to the Trips page.
4. Try to confirm the trip completion to generate the financial report.
5. Check the Owner Dashboard KPIs.

**Expected Behavior:**
The driver's request to end the trip should notify the owner. The owner should then be able to confirm the completion, which triggers `generateTripReport(trip._id)` to calculate profits and update the dashboard KPIs.

**Actual Behavior:**
When the driver calls `PATCH /api/trips/:id/end`, the backend directly hardcodes `trip.status = "COMPLETED"`. 
However, the `Trip.js` schema does not support a `DRIVER_ENDED` status. Because the trip is now `"COMPLETED"`, the Owner UI in `Trips.jsx` disables the "Complete Trip" button and instead renders a static "Trip Completed" label. 
Since the owner can never click the button, `ownerConfirmEndTrip` is permanently bypassed. Because `driverEndTrip` does not call `generateTripReport(trip._id)`, the report is never generated, and the financials for that trip are lost forever from the dashboard KPIs.

**Evidence:**
In `backend/controllers/tripController.js -> driverEndTrip`:
```javascript
trip.status = "COMPLETED"; // Sets status directly
trip.actualEndDate = new Date();
await trip.save();
// generateTripReport(trip._id) is missing here!
```
In `frontend/src/pages/owner/Trips.jsx`:
```javascript
{selectedTrip.status === "ON_TRIP" && (
  <button onClick={() => handleStatusChange(selectedTrip._id, "COMPLETED")}> Complete Trip </button>
)}
{selectedTrip.status === "COMPLETED" && (
  <div> Trip Completed </div> // Owner can no longer click anything to confirm
)}
```

**Recommended Fix:**
*Option A:* Add `generateTripReport(trip._id)` to the end of `driverEndTrip` in `tripController.js` so financials are calculated immediately.
*Option B (If owner confirmation is strictly required):* Add `"DRIVER_ENDED"` to the `Trip.js` schema enum. Have the driver endpoint set `"DRIVER_ENDED"`. Then update the Owner UI to render the "Complete Trip" button if `status === "DRIVER_ENDED" || status === "ON_TRIP"`.

---

## Validated Security Controls (Working as Intended)

The following tests **passed** successfully with no bugs found:

1. **Role Access (Frontend):** 
   - `ProtectedRoute.jsx` correctly deflects Drivers trying to access `/owner/*` routes.
2. **Privilege Escalation (Backend API):**
   - Driver attempts to call `POST /api/trucks`, `DELETE /api/trips/:id`, or `GET /api/reports/dashboard` correctly return `403 Forbidden` due to `authorize("OWNER")`.
3. **Cross-Tenant Data Leakage:**
   - The `scopeOwnership` middleware successfully enforces data boundaries. If Owner A requests `/api/trips`, they cannot see Owner B's trips because the query is strictly appended with `ownerId: req.user._id`.
   - If a Driver attempts to add an expense to another driver's trip via `POST /api/expenses`, it fails because `Trip.findOne` uses `...req.scopedQuery` which enforces `driverId: req.driverId`.
4. **Auth Validation:**
   - Invalid credentials correctly return 401 Unauthorized.
   - Missing JWT tokens return 401.
   - Mongoose unique indexes prevent duplicate email/phone registrations.
