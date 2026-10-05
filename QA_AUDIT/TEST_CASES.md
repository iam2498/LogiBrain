# Consolidated Test Cases

| Test ID | Module | Feature | Expected | Actual | Result | Severity |
|---------|--------|---------|----------|--------|--------|----------|
| AUTH-001 | Auth | Valid/Invalid login | Authenticates properly | Works as expected | PASS | N/A |
| AUTH-002 | Auth | Role Access Control | Driver deflected from Owner pages | Access denied successfully | PASS | N/A |
| AUTH-003 | API | Privilege Escalation | Driver calling Owner APIs fails | Fails with 403 Forbidden | PASS | N/A |
| AUTH-004 | API | Cross-Tenant Leakage | Cannot read other owner data | Returns 404/Empty properly | PASS | N/A |
| AUTH-005 | API | Driver PDF Access | Driver can download own trip PDF | 404 Error (wrong ownerId) | FAIL | HIGH |
| LOGIC-006 | API | End Trip Bypass | Owner confirms trip successfully | Button hidden, report lost | FAIL | CRITICAL |
| TD-DEL-01 | Trucks | Delete Truck Endpoint | Truck is soft/hard deleted | Mocked alert, missing route | FAIL | HIGH |
| TD-CRUD-02 | Trucks | Duplicate Registration | Clean 400 validation error | 500 DB constraint crash | FAIL | MEDIUM |
| TD-CRUD-03 | Drivers | License Uniqueness | Rejected duplicate license | Saved duplicate license | FAIL | LOW |
| TD-ASSIGN-04 | Trucks | Driver Assignment IDOR | Rejected if driver not owned | Assigned foreign driver | FAIL | HIGH |
| TD-CAP-05 | Trips | Capacity (NaN Bypass) | Rejected capacity mismatch | NaN parses as false, allows | FAIL | MEDIUM |
| TD-ASSIGN-06 | Trips | Dispatch Driver Mutate | Doesn't change baseline driver | Mutates default driver | FAIL | LOW |
| TD-STAT-07 | Status | Dynamic Resolution | Owner sees "On Trip" | Works as expected | PASS | N/A |
| TRIP-CAP-08 | Trips | Capacity (Numeric) | 41 > 40 is rejected | Works as expected | PASS | N/A |
| TRIP-EDIT-01 | Trips | Edit Completed Trip | Edits blocked or trigger report | Bypasses validation, desyncs | FAIL | CRITICAL |
| TRIP-RACE-02 | Trips | Concurrent Dispatch | Second request blocked | Duplicates active trip | FAIL | HIGH |
| TRIP-HIST-09 | Trips | Historical Integrity | Retains old driver on update | Works as expected | PASS | N/A |
| TRIP-VAL-10 | Trips | Zod Form Validation | Empties & negatives rejected | Works as expected | PASS | N/A |
| FIN-DASH-01 | Finance | Dashboard Real-Time | Dashboard shows active expense | Dashboard ignores active exp | FAIL | CRITICAL |
| FIN-EXP-02 | Finance | Expense Deletion Sync | Recalculates trip report | Net Profit permanently frozen | FAIL | HIGH |
| FIN-VAL-03 | Finance | Invalid Date String | 400 Bad Request | 500 Mongoose CastError | FAIL | LOW |
| FIN-CALC-04 | Finance | Float Precision | Clean formatted decimal | Floating point artifacts | FAIL | COSMETIC |
| FIN-TERM-11 | UI | Terminology Standard | "Expected Revenue" is gone | "Trip Rate" everywhere | PASS | N/A |
| FIN-MARG-12 | Finance | Negative Margin | Margin evaluates to negatives | Works as expected | PASS | N/A |
| FIN-ZERO-13 | Finance | Zero Value Defense | Zero trip rates rejected | Works as expected | PASS | N/A |
| INT-SYNC-01 | Status | Driver Profile View | Driver sees "On Trip" | Driver sees "Available" | FAIL | HIGH |
| INT-SYNC-02 | API | Populated References | Populated status resolved | Returns raw DB status | FAIL | MEDIUM |
| INT-CONC-03 | Trips | Concurrent Confirm | Idempotent | 500 E11000 Duplicate Upsert | FAIL | LOW |
| INT-NET-04 | DB | Transactional Integrity | Clean rollback | Half-committed data leak | FAIL | CRITICAL |
| INT-EMPT-14 | UI | Empty State Math | No divide-by-zero crashes | Works as expected | PASS | N/A |
| INT-FAIL-15 | UI | Client Network Errors | Graceful error handling | Works as expected | PASS | N/A |
