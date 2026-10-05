# Phase 7: Final Teacher Demo QA

This document simulates a live presentation of the Fleet Management System from start to finish, evaluating whether each step succeeds or fails based on the combined QA audit findings from Phases 1-6. 

---

## Demo Flow Evaluation

### 1. Initial Setup & Dashboard
1. **Start application.** -> `PASS`
2. **Login as Owner.** -> `PASS` (Auth functions securely)
3. **Open Owner Dashboard.** -> `PASS`
4. **Verify: Total Trucks, On Trip, Total Drivers, Total Revenue, Total Expenses, Net Profit.** -> `FAIL` (Dashboard completely ignores expenses from active trips. If the teacher asks to verify ongoing expenses, the KPI will embarrassingly show ₹0 despite the database holding records).

### 2. Fleet Management
5. **Open Truck Management.** -> `PASS`
6. **Show truck information.** -> `PASS`
7. **Verify: Capacity, Driver, Status.** -> `PASS`
8. **Open Driver Management.** -> `PASS`
9. **Verify driver status.** -> `PASS` (Owner panel correctly uses dynamic resolution).

### 3. Trip Creation & Dispatch
10. **Create a new trip.** -> `PASS`
11. **Select a truck.** -> `PASS`
12. **Verify default driver automatically appears.** -> `PASS`
13. **Enter quantity within truck capacity.** -> `PASS`
14. **Verify accepted.** -> `PASS`
15. **Enter quantity above truck capacity.** -> `PASS / CONDITIONAL FAIL` (Passes if the truck capacity is a pure number like "40". However, if the truck was saved with "40 Tons", parsing evaluates to `NaN` and the validation silently fails).
16. **Verify rejected.** -> `PASS / CONDITIONAL FAIL` (See above).
17. **Enter Trip Rate.** -> `PASS` (Terminology correctly updated globally).
18. **Dispatch trip.** -> `PASS`
19. **Verify: Trip → On Trip, Truck → On Trip, Driver → On Trip.** -> `PASS` (Owner sees this correctly).

### 4. Cross-Panel Sync
20. **Open dashboard.** -> `PASS`
21. **Verify On Trip count increased.** -> `PASS`
22. **Open trip list.** -> `PASS`
23. **Verify same trip appears.** -> `PASS`
24. **Open Driver panel (Login as assigned driver).** -> `PASS`
25. **Verify same trip appears.** -> `PASS` (Driver sees active trip).
26. **Verify statuses across panels.** -> `FAIL` (The Owner panel says "On Trip", but the Driver's own dashboard will say "Available" due to a lack of dynamic status resolution on the `auth/me` endpoint).

### 5. Lifecycle Completion
27. **Add/view expense if supported.** -> `PASS` (Driver can add expense).
28. **Complete trip.** -> `CRITICAL FAIL` (When the Driver clicks "Request Trip End", the API immediately sets the trip to `COMPLETED`. When the Owner goes to confirm it, the UI hides the "Complete Trip" button for `COMPLETED` trips. The Owner is permanently locked out of confirming the trip, breaking the flow).
29. **Verify statuses changed to Available.** -> `PASS` (Underlying DB statuses update).
30. **Return to dashboard.** -> `PASS`
31. **Verify statistics updated.** -> `CRITICAL FAIL` (Because the Owner was locked out of step 28, the `generateTripReport` function is NEVER called. Total Revenue, Total Expenses, and Net Profit will stubbornly remain unchanged, ruining the climax of the demo).

### 6. Post-Trip Interactions
32. **Open trip history.** -> `PASS`
33. **Verify historical data.** -> `PASS`
34. **Verify Trip Rate.** -> `PASS` (Trip retains original rate).
35. **(Extra) Download PDF.** -> `FAIL` (If the Teacher asks the driver to download the trip PDF, they will receive a `404 Not Found` due to `ownerId` scoping issues).
