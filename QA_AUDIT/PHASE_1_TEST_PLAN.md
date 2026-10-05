# Phase 1: Test Plan

## PHASE 2: Authentication & Permissions
1. **Registration Flow:** Verify Owner registration (`/register`) successfully creates User and sets Owner role. Ensure duplicate emails/phones throw expected validation errors.
2. **Login Flow:** Verify Owner and Driver logins (`/login`) successfully set JWT HTTP-only cookies and return the correct role profile.
3. **Session Persistence:** Verify `GET /api/auth/me` correctly identifies the active session on page refresh.
4. **Role Routing (Frontend):** Ensure Driver account cannot navigate to Owner routes (`/owner/dashboard`, `/owner/trips`, etc.), and Owner cannot navigate to `/driver/dashboard`.
5. **Authorization (Backend):** Attempt to call an Owner-only API (e.g., `POST /api/trips`) using a Driver JWT and verify it returns a 403 Forbidden.
6. **Data Isolation (Scope Ownership):** Ensure Owner A cannot view/edit Trucks, Drivers, or Trips belonging to Owner B. Verify Drivers can only view their assigned trips.

## PHASE 3: Truck & Driver Management
1. **Truck Creation:** Test adding a new truck. Verify duplicate registration numbers fail.
2. **Driver Creation:** Test adding a new driver. Verify duplicate phone numbers or emails fail.
3. **Truck-Driver Linkage:** Verify a driver can be assigned as the default `currentDriverId` for a truck.
4. **Status Manual Override:** Verify Owners can manually toggle Truck status (e.g., to "MAINTENANCE") and Driver status (e.g., to "ON_LEAVE").
5. **Availability Engine:** Verify that a Truck or Driver actively assigned to an `ON_TRIP` trip dynamically resolves its status as `ON_TRIP` on the Owner Dashboard, regardless of its baseline DB string.

## PHASE 4: Trips
1. **Trip Dispatch:** Test creating a new trip. 
   - Verify selecting a Truck auto-populates the default Driver.
   - Verify overriding the Driver works.
   - Verify attempting to dispatch a Truck or Driver already `ON_TRIP` fails validation.
2. **Trip Lifecycle (Driver Context):**
   - Verify Driver Dashboard dynamically displays the newly dispatched `ON_TRIP` trip.
   - Verify Driver can trigger `PATCH /api/trips/:id/end` to end the trip.
3. **Trip Lifecycle (Owner Context):**
   - Verify Owner can confirm completion via `PATCH /api/trips/:id/confirm-end`.
   - Verify trip disappears from "On Trip" dashboard aggregates upon completion.
   - Verify the Truck and Driver statuses revert back to "AVAILABLE" after completion.
4. **Trip Cancellation:** Verify Owner can cancel an active trip and that assets (Truck/Driver) are correctly released.
5. **Trip Deletion:** Verify deleting a trip cascades safely and cleans up orphaned expenses, or warns accordingly.

## PHASE 5: Financials
1. **Expense Logging (Driver):** Verify Driver can log an expense for their active `ON_TRIP` trip.
2. **Expense Logging (Owner):** Verify Owner can log an expense for an active `ON_TRIP` trip.
3. **Expense Deletion:** Verify Owner can delete an expense, but Driver cannot.
4. **Profit Calculation Trigger:** Verify that confirming a trip's end triggers the `generateTripReport` background task.
5. **Report Accuracy:** Check the generated `TripReport`. Ensure `netProfit` exactly equals (`grossRevenue` - `totalExpenses`).
6. **Dashboard KPIs:** Verify the Owner Dashboard accurately aggregates Total Revenue, Total Expenses, and Net Profit across all completed trip reports.
7. **PDF Generation:** Verify `GET /api/reports/trip/:id/pdf` successfully renders a downloadable invoice with the correct financial breakdowns.

## PHASE 6: Integration & Edge Cases
1. **Stale Status Fixes:** Test dispatching a trip, forcefully modifying the DB `trip.status` to `COMPLETED` without running the controller logic, and verify the `getTrucks` and `getDrivers` controllers self-heal the stale "ON_TRIP" DB flags back to "AVAILABLE".
2. **Legacy Status Compatibility:** Manually insert a Trip with status "ACTIVE" into the database. Verify that all standard queries (Dashboards, Expense additions, Trip closures) correctly treat it as "ON_TRIP".
3. **Concurrent Dispatches:** Attempt to dispatch two trips for the exact same driver simultaneously to ensure race conditions or DB locks handle it (or test if lack thereof is a risk).
4. **Zero-Expense Trips:** Verify completing a trip with 0 expenses calculates 100% profit margin without crashing.
5. **Large Number Formatting:** Verify UI handles large revenue amounts (e.g., ₹10,000,000) correctly using comma separators on the Dashboard and PDF.

## PHASE 7: Final Presentation
1. **End-to-End Walkthrough:**
   - Owner logs in -> Adds Truck -> Adds Driver.
   - Owner dispatches Trip.
   - Switch to Driver session -> View Trip -> Add Fuel Expense -> Add Toll Expense -> End Trip.
   - Switch back to Owner session -> Confirm End Trip -> View Trip Report -> Download PDF.
   - View Dashboard KPIs showing the finalized profit.
2. **UI/UX Polish Audit:** Ensure all terminology matches (e.g., "Trip Rate" instead of "Expected Revenue", "On Trip" instead of "Active"). Check responsive layouts on mobile views (especially Driver Dashboard).
