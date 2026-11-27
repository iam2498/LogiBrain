# 🚛 LogiBrain — Fleet, Trip & Financial Management System

LogiBrain is a full-stack MERN platform for transport businesses to manage multi-truck dispatches, drivers, real-time trip expenses, profit analytics, and PDF trip manifests with role-based portals for **Admins**, **Fleet Owners**, and **Drivers**.

---

## ✨ Key Features

### 🔐 Authentication & Role-Based Portals
- **JWT + HTTP-Only Refresh Cookies:** Secure authentication (`POST /api/auth/login`, `/refresh`, `/logout`, `/register-owner`, `PATCH /api/auth/change-password`) with Zod validation, `bcryptjs` password hashing, `lastLoginAt` tracking, and live account-suspension enforcement in `authenticate` middleware.
- **Email/Phone Login & OTP Password Reset:** Supports sign-in with email or 10-digit phone number, plus Nodemailer-backed 6-digit OTP reset (`/forgot-password`).
- **3 Role Portals (Strict Role & Data Isolation):**
  - **Admin (`/admin/dashboard`):** Single-page **Platform Administration Dashboard** with strict data privacy (zero access to private owner trucks, drivers, trips, expenses, or financial reports). Includes Platform Overview, Owner Account Management (view basic account info, suspend with mandatory reason, reactivate without deleting fleet records), Support Request Management, Live System Monitoring, Admin Activity Logs, and Profile/Password Security.
  - **Owner (`/owner/*`):** Real-time dashboard, fleet & driver management, multi-truck trip dispatch, full expense ledger (add/edit/delete), interactive financial analytics, and PDF trip reports (showing truck numbers and driver names).
  - **Driver (`/driver/*`):** Live trip assignment card, assigned truck details, contact mobile number display, expense logging on active legs, per-driver trip end requests, and personal trip history.

### 🚚 Multi-Truck & Per-Driver Trip Lifecycle
- **Unified Fleet & Crew Assignment:** Assign one or multiple trucks to a single trip, pair each truck with an individual driver, auto-fill default truck drivers, and validate combined truck capacity.
- **Independent Per-Truck / Per-Driver Execution:**
  - Each driver logs expenses attributed directly to their own paired truck and driver profile.
  - When one driver finishes and requests trip end (`END_REQUESTED`), the trip remains `ON_TRIP` for remaining drivers until they finish too.
  - Owners can accept individual truck end requests (`Accept End`) to release completed trucks/drivers early, and individual assignment status (`tripAssignmentHelper.js`) is checked across trip creation, trip editing (`updateTrip`), and truck/driver status endpoints so completed legs never block new assignments.
- **Transactional Integrity:** Multi-document trip operations (dispatch, edits, completion, cancellation, deletion) run inside MongoDB ACID transactions on replica sets with automatic rollback compensation on standalone MongoDB instances.

### 💰 Real-Time Financials, Expenses & PDF Reports
- **Live Cashflow Synchronization:** Dashboard KPIs and Expense Breakdown charts aggregate active and completed trip expenses directly from the `Expense` collection while tracking realized revenue from completed trips.
- **Full Expense Ledger:** View trip routes (`Source → Destination`), truck registration numbers, and the actual name + role of the person who added each expense, plus edit/delete support that automatically recalculates `TripReport` metrics.
- **Branded PDF Trip Reports:** Generates downloadable A4 PDF invoices (`GET /api/reports/trip/:tripId/pdf`) via Puppeteer + Handlebars showing KPI summaries, every assigned truck-driver pair, expense distribution charts, and itemized expenses attributed by truck and person.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v7, Axios, Recharts, Lucide React |
| **Backend** | Node.js, Express 5, Mongoose 9, Zod 4, JSON Web Tokens, bcryptjs, Multer, Nodemailer |
| **Database** | MongoDB |
| **PDF Engine** | Puppeteer + Handlebars |

---

## 📁 Project Structure

```text
LogiBrain_v2/
├── backend/
│   ├── config/          # Environment and MongoDB connection config
│   ├── controllers/     # Auth, Admin, Support, Truck, Driver, Trip, Expense, Report handlers
│   ├── middleware/      # JWT & active-account auth, role authorization, ownership scoping, error handling
│   ├── models/          # Mongoose schemas (User, Truck, Driver, Trip, Expense, TripReport, SupportRequest, AdminActivityLog)
│   ├── routes/          # Express routes (/api/auth, /trucks, /drivers, /trips, /expenses, /reports, /admin, /support)
│   ├── seed/            # Database seeders (seedAdmin.js, seedData.js)
│   ├── services/        # Email (Nodemailer), file uploads (Multer), TripReport aggregation
│   ├── utils/           # Transaction helper, assignment query helper, system metrics, PDF builder & template, validators
│   ├── validators/      # Zod request validation schemas
│   ├── app.js           # Express app setup
│   └── server.js        # Server entrypoint
├── frontend/
│   └── src/
│       ├── api/         # Axios client with token refresh interceptor
│       ├── context/     # AuthContext, ToastContext
│       ├── pages/       # auth/, admin/ (single-page dashboard), owner/, driver/ views
│       ├── routes/      # AppRoutes & ProtectedRoute role guards
│       └── utils/       # Vehicle & license formatting/validation helpers
└── QA_AUDIT/            # QA discovery, API, database, and financial audit reports
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** running locally (`mongodb://localhost:27017`) or a MongoDB Atlas connection string

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env` as needed (defaults work out of the box for local MongoDB on port `27017`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fleetflow
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_ORIGIN=http://localhost:5173
```

Seed the database (optional demo data and/or Admin account):

```bash
# Seed demo Owner, Trucks, Drivers, Trips, and Expenses
node seed/seedData.js

# Seed Admin account (admin@logibrain.com / admin@123)
node seed/seedAdmin.js
```

Start the backend server (port `5000`):

```bash
node server.js
# or with hot reload:
npx nodemon server.js
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Default / Seeded Credentials

| Role | Email | Password | Seed Script |
|---|---|---|---|
| **Admin** | `admin@logibrain.com` | `admin@123` | `node seed/seedAdmin.js` |
| **Owner** | `owner@demo.com` | `password123` | `node seed/seedData.js` |
| **Driver** | `driver1@demo.com` | `password123` | `node seed/seedData.js` |

> Fleet Owners can also register directly from `/register` and create driver accounts from the Owner portal.

---

## 🌐 Core API Modules

| Base Path | Purpose |
|---|---|
| `/api/auth` | Owner registration, login, token refresh, logout, password reset/change, current profile |
| `/api/trucks` | Fleet vehicle CRUD, manual status updates, truck trip/expense history |
| `/api/drivers` | Driver profile creation, updates, availability status |
| `/api/trips` | Multi-truck trip dispatch, updates, per-driver end requests, owner confirmation, cancellation, history |
| `/api/expenses` | Trip expense creation (with optional receipt upload), listing, editing, deletion |
| `/api/reports` | Dashboard KPIs, overall/analytics reports, per-truck/driver/trip reports, PDF generation |
| `/api/support` | Owner-scoped support request creation and ticket status tracking |
| `/api/admin` | Platform overview, owner account listing/status management (suspend/reactivate), support handling, live system health, and admin activity logs |
