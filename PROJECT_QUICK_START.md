# LogiBrain (formerly FleetFlow) - Quick Start Guide

Welcome to LogiBrain! This guide will help you get the project running on your local machine in just a few minutes. 

## 1. What is LogiBrain?
LogiBrain is a fleet and logistics management system for transport business owners. It allows owners to track their trucks and drivers, create trip dispatches, monitor trip expenses, and visualize business profitability.

## 2. Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, Puppeteer (for PDF generation)
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (JSON Web Tokens)

## 3. How to Install and Run Locally

**Prerequisites:** Node.js (v18+) and a running MongoDB instance (local or MongoDB Atlas).

**Step 1: Clone the Repository**
```bash
git clone <repository_url>
cd LogiBrain_v2
```

**Step 2: Setup the Backend**
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/logibrain
JWT_SECRET=your_super_secret_key
```
Start the backend server:
```bash
npm run dev
```

**Step 3: Setup the Frontend**
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

## 4. Where to Start Coding
If you're tasked with building or fixing something, here are the most important files:

**Important Folders:**
- `backend/models/`: Database schemas (Start with `Trip.js` and `Expense.js`).
- `backend/routes/`: API endpoint definitions.
- `backend/controllers/`: Core business logic handling the API requests.
- `frontend/src/pages/owner/`: UI for the transport business owner (e.g. `OwnerDashboard.jsx`).
- `frontend/src/pages/driver/`: Mobile-friendly UI for the truck drivers (`DriverDashboard.jsx`).

**Important Main Workflows:**
1. **Trip Lifecycle**: A trip is created by the Owner (`backend/controllers/tripController.js`). The driver executes it on their dashboard, logs expenses (`backend/controllers/expenseController.js`), and requests an end to the trip. The owner then confirms completion.
2. **Profit Calculation**: Once a trip is completed, `backend/services/tripReportService.js` calculates total revenue and total expenses, generating a `TripReport` for analytics.

## 5. First Thing to Test
To understand the system quickly:
1. Go to the frontend and register as an **Owner**.
2. Add a **Truck** and a **Driver** from the sidebar.
3. Create a **New Trip** dispatch.
4. Log out, and log in with the **Driver's credentials**.
5. See the active trip, add an expense (like Fuel), and click "Request Trip End".
6. Log back in as the **Owner** to confirm completion and view the Profit Report!

For deep technical details, please refer to the `PROJECT_DOCUMENTATION.md` file.
