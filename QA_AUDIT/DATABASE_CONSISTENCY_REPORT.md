# Database Consistency Report

## Cross-Entity Relationships and Anomalies

This document outlines structural data integrity issues identified during the QA audit.

### 1. Duplicate Records
- **Driver License Numbers:** The `Driver` collection does not enforce unique constraints for `licenseNumber`. Multiple drivers can be created with identical licenses, polluting the schema (BUG-005).
- **Duplicate Active Trips:** Because of a race condition in `tripController.js` and a lack of a MongoDB Partial Unique Index (e.g., `unique: true, partialFilterExpression: { status: "ON_TRIP" }`), the system can generate multiple `ON_TRIP` records for the exact same `truckId` and `driverId` concurrently (BUG-010).

### 2. Orphan Records
- **Expenses on Deleted Data:** Since Truck and Driver `DELETE` routes were mocked/missing (BUG-003), orphaned expenses based on deleted trucks couldn't be directly tested. However, an owner can currently delete an `Expense` belonging to a `COMPLETED` trip. When this happens, the expense document is destroyed, but the parent `TripReport` permanently retains the financial footprint of that expense, creating a ghost financial record (BUG-013).

### 3. Inconsistent Statuses
- **Driver Dashboard Contradiction:** The `Driver` collection maintains a static string for `status` (e.g. `AVAILABLE`). When assigned to a trip, the backend *does not* mutate the database status string, it dynamically overrides it upon fetching. However, `getMe` ignores this override, meaning the driver views raw "AVAILABLE" database data while actively on a trip (BUG-016).
- **Populated Document Desync:** Any Mongoose `.populate("truckId")` execution reads directly from the database schema, skipping the dynamic controller resolution. As a result, APIs return Trips where `trip.status = ON_TRIP` but the nested `trip.truckId.status = MAINTENANCE` (BUG-017).

### 4. Incorrect References (IDOR)
- **Foreign Drivers:** During Truck Updates (`PUT /api/trucks/:id`), the API blindly accepts any valid MongoDB ObjectId for `currentDriverId`. If a malicious owner inputs a driver ID belonging to a different tenant, the DB accepts it. The `Truck` document is now permanently linked to a foreign `Driver` document, breaching multi-tenant scoping integrity (BUG-006).
- **Dispatch Mutability:** Creating a Trip (`POST /api/trips`) with a driver override automatically modifies the base `Truck.currentDriverId` reference in the database. While functional, this silently mutates the long-term fleet hierarchy configuration just to fulfill a single temporary dispatch (BUG-008).

### 5. Historical Data Corruption Risks
- **Completed Trip Mutability:** The API permits updating `COMPLETED` trips because `trip.status === "ON_TRIP"` is solely used to wrap the truck/driver availability validation checks. When a completed trip is edited (e.g., modifying `truckId` or `expectedRevenue`), the associated `TripReport` is NOT regenerated. The historical `Trip` document and its corresponding `TripReport` become permanently desynchronized, corrupting historical analytics (BUG-009).
- **TripReport Omissions:** `TripReport` documents are exclusively generated when a trip's status moves to `COMPLETED`. Because the Owner Dashboard strictly queries `TripReport`, all `ON_TRIP` expenses are invisible to the Dashboard. This creates massive cashflow blindness (BUG-012).

### 6. Half-Committed States (No Transactions)
- Without `session.withTransaction`, MongoDB is vulnerable to half-committed orchestrations. In `createTrip`, if the server halts after `Trip.create` but before `Truck.findByIdAndUpdate`, the Trip records its dependency on the truck, but the truck remains ignorant of the trip, creating permanent reference inconsistencies (BUG-019).
