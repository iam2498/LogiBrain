# API Test Report

## Consolidated Endpoint Findings

| Endpoint | Method | Role | Test | Expected | Actual | HTTP Status | Result | Bug ID |
|----------|--------|------|------|----------|--------|-------------|--------|--------|
| `/api/reports/trip/:id/pdf` | GET | Driver | Download own trip PDF | Success | Context mismatch `req.user._id` | 404 | FAIL | BUG-001 |
| `/api/trips/:id/end` | PATCH | Driver | End active trip | Success, Report generated | Success, Report bypassed | 200 | FAIL | BUG-002 |
| `/api/trucks/:id` | DELETE | Owner | Delete existing truck | Soft/Hard Delete | Mocked UI, no backend route | 404 | FAIL | BUG-003 |
| `/api/trucks/:id` | PUT | Owner | Update with duplicate reg # | 400 Validation Error | Crash (E11000 Duplicate Key) | 500 | FAIL | BUG-004 |
| `/api/drivers/:id` | PUT | Owner | Update with duplicate phone | 400 Validation Error | Crash (E11000 Duplicate Key) | 500 | FAIL | BUG-004 |
| `/api/drivers` | POST | Owner | Create with duplicate license | 400 Validation Error | Accepted duplicate | 201 | FAIL | BUG-005 |
| `/api/trucks/:id` | PUT | Owner | IDOR cross-tenant driver ID | 400 Validation Error | Accepted foreign ID | 200 | FAIL | BUG-006 |
| `/api/trips` | POST | Owner | NaN Capacity string parsing | 400 Validation Error | Bypassed, Accepted | 201 | FAIL | BUG-007 |
| `/api/trips/:id` | PUT | Owner | Edit `COMPLETED` trip | 400 Validation Error | Allowed, validation skipped | 200 | FAIL | BUG-009 |
| `/api/trips` | POST | Owner | Concurrent Dispatch | 400 Active Trip Exists | Concurrent duplicated trips | 201 | FAIL | BUG-010 |
| `/api/expenses/:id` | DELETE | Owner | Delete completed trip expense| Updates TripReport / 400 | Orphaned KPI data permanently | 200 | FAIL | BUG-013 |
| `/api/expenses` | POST | Owner | Invalid Date string payload | 400 Validation Error | Crash (Mongoose CastError) | 500 | FAIL | BUG-014 |
| `/api/auth/me` | GET | Driver | Dynamic Driver Status | Dynamic "On Trip" | Raw DB "Available" | 200 | FAIL | BUG-016 |
| `/api/trips` | GET | Owner | Populated Object Status | Dynamic "On Trip" | Raw DB "Maintenance" | 200 | FAIL | BUG-017 |
| `/api/trips/:id/confirm-end` | PATCH | Owner | Concurrent UPSERT | Success (Idempotent) | Crash (E11000 Duplicate Key) | 500 | FAIL | BUG-018 |

---

## 4xx Errors
- **Expected:** Drivers hitting `/owner` API endpoints correctly return `403 Forbidden` due to `authorize("OWNER")`.
- **Unexpected:** Drivers hitting `/api/reports/trip/:id/pdf` return `404 Not Found` because the controller assumes `req.user._id` is the owner ID.
- **Missing:** Missing 400 Validation errors for duplicate registrations, invalid date strings, and editing completed trips.

## 5xx Errors
- **E11000 Duplicate Key Errors:** Present in `PUT /api/trucks/:id` and `PUT /api/drivers/:id` when data already exists. Present in `PATCH /api/trips/:id/confirm-end` during concurrent rapid fires due to Mongo upsert race conditions.
- **CastError:** Present in `POST /api/expenses` when Zod passes a non-date string to the MongoDB date field.

## Authorization Failures
- **IDOR (BUG-006):** In `updateTruck`, `currentDriverId` is accepted blindly without checking if the target driver actually belongs to `req.user._id`.

## Data Integrity Issues
- Missing database transactions for `POST /api/trips` makes the API vulnerable to generating half-committed states if the server halts mid-request (BUG-019).
- Missing TripReport generation when trips are forcibly completed by the driver endpoint (BUG-002) or deleted expenses (BUG-013).
