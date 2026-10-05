# Phase 3: Truck & Driver Management QA Audit

This document outlines the findings of the QA testing for Truck and Driver CRUD operations, capacity validation, and status assignments.

## Executive Summary
Core functionality for adding, editing, and listing Trucks and Drivers is operational. Statuses synchronize properly between the Owner and Driver views using a robust dynamic resolution engine. However, critical gaps exist in the backend API regarding deletion, unhandled duplicate data during updates, and bypassable capacity validation logic.

---

### BUG-3: Missing Delete Endpoints for Trucks and Drivers
**TEST ID:** TD-DEL-01
**Severity:** HIGH

**Steps to Reproduce:**
1. Navigate to Trucks or Drivers page as an Owner.
2. Click the three dots menu on a specific Truck or Driver.
3. Click "Remove Truck" or "Delete Account".

**Expected Behavior:**
The system should delete the entity or intelligently block the deletion if active/historical trips exist (reference integrity check).

**Actual Behavior:**
The UI displays a JavaScript alert: `Functionality mocked.`
Code inspection reveals that the backend `truckRoutes.js` and `driverRoutes.js` completely lack `DELETE` routes.

**Recommended Fix:**
Implement `router.delete("/:id", deleteTruck)` and `deleteDriver` in the backend. Add logic to prevent deletion if the asset is linked to historical or active trips, or soft-delete them by setting `isActive = false`.

---

### BUG-4: Ungraceful 500 Errors on Duplicate Data Updates
**TEST ID:** TD-CRUD-02
**Severity:** MEDIUM

**Steps to Reproduce:**
1. Create Truck A with registration `GJ-01-AA-1111`.
2. Create Truck B with registration `GJ-01-BB-2222`.
3. Update Truck B's registration to `GJ-01-AA-1111` via `PUT /api/trucks/:id`.

**Expected Behavior:**
The API should return a `400 Bad Request` with a friendly validation error ("Registration number already exists").

**Actual Behavior:**
The controller `updateTruck` lacks a duplicate check. It attempts to save, causing a MongoDB Unique Constraint Violation (Code 11000). Because `errorHandler.js` does not parse Mongoose unique errors, the server returns an ungraceful `500 Server Error`.
*(This exact same bug applies to `updateDriver` when changing a driver's phone or email to an existing one).*

**Recommended Fix:**
Add `findOne` uniqueness checks inside `updateTruck` and `updateDriver` controllers, similar to their respective `create` controllers, or update `errorHandler.js` to parse MongoDB 11000 errors into 400 responses.

---

### BUG-5: License Number Uniqueness Not Enforced
**TEST ID:** TD-CRUD-03
**Severity:** LOW

**Steps to Reproduce:**
1. Create Driver A with License Number `DL-12345`.
2. Create Driver B with License Number `DL-12345`.

**Expected Behavior:**
The system should reject duplicate license numbers.

**Actual Behavior:**
The drivers are created successfully. Neither the `Driver.js` schema nor the `driverController.js` logic enforces uniqueness for license numbers.

**Recommended Fix:**
Add a unique index to `licenseNumber` in the `Driver` model (scoped by `ownerId` if necessary) or add a controller check.

---

### BUG-6: Insecure Direct Object Reference (IDOR) on Truck Driver Assignment
**TEST ID:** TD-ASSIGN-04
**Severity:** HIGH

**Steps to Reproduce:**
1. Send `PUT /api/trucks/:id` with `{"currentDriverId": "<ID_OF_DRIVER_OWNED_BY_ANOTHER_OWNER>"}`.

**Expected Behavior:**
The API should reject the driver ID since it doesn't belong to the requesting owner.

**Actual Behavior:**
The `updateTruck` controller accepts the string unconditionally and updates the database, cross-linking assets between different owners.

**Recommended Fix:**
Validate that `currentDriverId` exists and belongs to `req.user._id` before saving it in `updateTruck` and `createTruck`.

---

### BUG-7: Truck Capacity Validation Bypass (Non-Numeric Parsing)
**TEST ID:** TD-CAP-05
**Severity:** MEDIUM

**Steps to Reproduce:**
1. Create a Truck and set its Capacity to a non-numeric string (e.g., `"Ten Tons"` or leave it empty).
2. Dispatch a Trip for this truck with a massive Quantity (e.g., `"999999"`).

**Expected Behavior:**
The validation should either fail or appropriately handle the strings.

**Actual Behavior:**
The trip is created successfully. In `tripController.js`, the validation uses `parseFloat(truck.capacity)`. If the string doesn't start with a number, it evaluates to `NaN`. The conditional `if (!isNaN(tripQuantity) && !isNaN(truckCapacity))` evaluates to `false`, causing the logic block to quietly bypass all capacity constraints. 
*(Note: Numeric string inputs like `"40 Tons"` evaluate correctly to `40` and are appropriately validated against the trip quantity, returning 400 if exceeded).*

**Recommended Fix:**
Standardize truck `capacity` to a strictly numeric type (Number) in the database schema, separating the unit into a different field, or implement stricter parsing/validation that throws an error if the capacity cannot be parsed.

---

### BUG-8: Trip Dispatch Unintentionally Mutates Truck's Default Driver
**TEST ID:** TD-ASSIGN-06
**Severity:** LOW/UX

**Steps to Reproduce:**
1. Select a Truck during Trip Dispatch. The UI auto-selects its default Driver A.
2. Manually change the dropdown to Driver B.
3. Submit the trip.
4. Check the Truck's profile.

**Expected Behavior:**
Driver B completes the specific trip, but Driver A remains the default driver of the Truck.

**Actual Behavior:**
In `tripController.js`, if the dispatched driver differs from the truck's default driver, the controller permanently reassigns `truck.currentDriverId = newDriver._id`. This unintentionally mutates the fleet's baseline configuration during a routine operational dispatch.

**Recommended Fix:**
Remove the `updateTruckData.currentDriverId = driver._id;` assignment in `createTrip` unless explicitly requested via a toggle switch in the UI.

---

## Validated Features (Working as Intended)
1. **Dynamic Status Resolution:** If a Truck/Driver is manually set to "AVAILABLE" but is assigned to a trip, it dynamically shows as "ON_TRIP". If a trip completes, it correctly reverts to "AVAILABLE".
2. **Maintenance & Leave Overrides:** If a Truck is placed on "MAINTENANCE" while on a trip, it correctly resolves to "ON_TRIP" until the trip ends, after which it smoothly drops into "MAINTENANCE".
3. **Capacity Math:** Assuming standard numeric-prefixed strings (e.g., "40 Tons"), the math works correctly (Quantity 39/40 passes, Quantity 41 fails). Negative quantities are blocked by Zod schemas.
