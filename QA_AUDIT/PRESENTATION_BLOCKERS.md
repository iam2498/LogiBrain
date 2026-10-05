# Presentation Blockers
*These are critical flaws that will cause severe embarrassment or a failed grade during a live Teacher Demonstration. They must be addressed before presenting.*

---

## 1. The "Limbo Trip" Profit Blackhole (CRITICAL)
**The Scenario:** You demonstrate a driver requesting to end a trip, and then log back in as the Owner to confirm it and show off the updated financial dashboard.
**The Embarrassment:** When the driver ends the trip, its status becomes `COMPLETED`. Because it is `COMPLETED`, your Owner UI hides the "Complete Trip" confirmation button. You are permanently locked out of confirming the trip. Because you can't confirm it, the system never generates the `TripReport`. The dashboard KPIs (Revenue/Profit) will remain at ₹0, making it look like the core financial engine is completely broken.

## 2. The Missing "Active Cashflow" (CRITICAL)
**The Scenario:** The teacher asks, "If I have 10 trucks currently on trips incurring fuel costs, where do I see those expenses?" You point to the Dashboard's "Total Expenses" KPI.
**The Embarrassment:** The Dashboard calculates expenses solely from *finalized* trip reports. If you add ₹50,000 in fuel to an active trip in front of the teacher, the Dashboard will still say ₹0. The teacher will immediately flag this as a critical accounting failure.

## 3. Driver Dashboard Contradiction (HIGH)
**The Scenario:** You proudly demonstrate the real-time status syncing. You show the Owner panel where a driver is marked "On Trip". You then seamlessly switch to the Driver's tablet view to show their side.
**The Embarrassment:** The Driver's profile dashboard will say "Available" in bright text, directly contradicting the Owner's screen. The teacher will assume your data synchronization or WebSockets/state management is broken.

## 4. The "Fake Delete" Buttons (HIGH)
**The Scenario:** The teacher asks you to demonstrate deleting a truck or a driver to test your cascading delete logic.
**The Embarrassment:** You click the "Remove Truck" button, and a native browser pop-up appears saying `"Functionality mocked."` The teacher realizes the backend CRUD operations were never actually finished.

## 5. Driver PDF 404 Crash (HIGH)
**The Scenario:** You mention the system generates beautiful PDF reports. The teacher asks you to log in as a Driver and download the receipt for their completed trip.
**The Embarrassment:** The driver clicks "Download PDF", and the API immediately returns a `404 Not Found` error because the backend strictly searches for the `ownerId` instead of allowing the assigned driver to view it.

## 6. The 500 Crash on Edits (MEDIUM)
**The Scenario:** The teacher tells you to edit a truck's registration number to see how the system handles duplicates.
**The Embarrassment:** Instead of a nice red validation error saying "Truck already exists", your Node server crashes and returns an ugly unhandled `500 Internal Server Error` in the browser console because MongoDB duplicate key errors (11000) are not caught by the error handler.
