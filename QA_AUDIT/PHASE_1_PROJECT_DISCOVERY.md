# Phase 1: Project Discovery

## 1. Technology Stack
- **Frontend:** React (v19.2), Vite (v8.3), TailwindCSS (v4.3), React Router DOM (v7), Axios, Recharts, Lucide-React.
- **Backend:** Node.js, Express (v5.2), MongoDB (Mongoose v9.10), bcryptjs, jsonwebtoken, zod (validation), multer (file uploads), puppeteer (PDF generation), handlebars.
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens) stored in HTTP-only cookies (`cookie-parser`), with `express-rate-limit` for brute-force protection.
- **State Management:** React Context API (via `AuthContext.jsx`), local component state (React hooks).
- **Validation:** Zod (Backend), HTML5/React controlled components (Frontend).

## 2. Project Structure
The project follows a standard decoupled Client-Server architecture.
- **Frontend (`/frontend`)**
  - `/src/api` - Axios configurations
  - `/src/context` - React contexts (AuthContext)
  - `/src/pages` - Page components structured by role (`/auth`, `/owner`, `/driver`)
  - `/src/routes` - Route guards and mapping
- **Backend (`/backend`)**
  - `/config` - DB and Env configuration
  - `/controllers` - Request handling logic
  - `/middleware` - Auth, Role Authorization, Error Handling, Scope Ownership
  - `/models` - Mongoose Schemas
  - `/routes` - Express Router mappings
  - `/services` - Upload services
  - `/utils` - Helpers (e.g., PDF generation)
  - `/validators` - Zod schemas for input validation

## 3. Module Map
**OWNER**
├── Dashboard (`/owner/dashboard`)
├── Trucks (`/owner/trucks`)
├── Drivers (`/owner/drivers`)
├── Trips (`/owner/trips`)
├── Expenses (`/owner/expenses`)
└── Reports (`/owner/reports`)

**DRIVER**
└── Dashboard (`/driver/dashboard`)

**AUTH**
├── Login (`/login`)
└── Register (`/register`)

## 4. Page Inventory

| Page | Role | Purpose | APIs Used | Database Entities |
|------|------|---------|-----------|-------------------|
| Login | Public | User authentication | `POST /api/auth/login` | User |
| RegisterOwner | Public | Owner account creation | `POST /api/auth/register-owner` | User |
| OwnerDashboard | Owner | High-level KPIs and active trips | `GET /api/reports/dashboard`, `GET /api/reports/overall`, `GET /api/trips?status=ON_TRIP` | Trip, Expense, TripReport, Truck, Driver |
| Trucks | Owner | Manage fleet vehicles | `GET /api/trucks`, `POST /api/trucks`, `PUT /api/trucks/:id` | Truck, Driver |
| Drivers | Owner | Manage driver profiles | `GET /api/drivers`, `POST /api/drivers`, `PUT /api/drivers/:id` | Driver, User |
| Trips | Owner | Dispatch and manage trips | `GET /api/trips`, `POST /api/trips`, `PATCH /api/trips/:id/confirm-end`, `GET /api/trucks`, `GET /api/drivers` | Trip, Truck, Driver |
| Expenses | Owner | Track operational costs | `GET /api/expenses`, `POST /api/expenses`, `GET /api/trips?status=ON_TRIP` | Expense, Trip, Truck, Driver |
| Reports | Owner | Financial analytics and PDFs | `GET /api/reports/dashboard`, `GET /api/reports/overall`, `GET /api/reports/trip/:id/pdf` | TripReport, Trip, Expense |
| DriverDashboard| Driver | View active trip, log expenses, end trip | `GET /api/auth/me`, `GET /api/trips?status=ON_TRIP`, `POST /api/expenses`, `PATCH /api/trips/:id/end` | User, Driver, Trip, Expense |

## 5. API Inventory

### Auth (`/api/auth`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/register-owner` | Public | Register new owner |
| POST | `/login` | Public | Authenticate user & set cookie |
| POST | `/refresh` | Public | Refresh JWT |
| POST | `/logout` | Public | Clear JWT cookie |
| GET | `/me` | Auth | Get current user profile |

### Trucks (`/api/trucks`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | Owner | Add a truck |
| GET | `/` | Owner | List all trucks |
| GET | `/:id` | Owner | Get truck details |
| PUT | `/:id` | Owner | Update truck details |
| PATCH| `/:id/status` | Owner | Manually update truck status |
| GET | `/:id/history` | Owner | Get truck's trip and expense history |

### Drivers (`/api/drivers`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | Owner | Add a driver |
| GET | `/` | Owner | List all drivers |
| GET | `/:id` | Owner | Get driver details |
| PUT | `/:id` | Owner | Update driver details |
| PATCH| `/:id/status` | Owner | Manually update driver status |

### Trips (`/api/trips`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | Owner | Dispatch a new trip |
| GET | `/` | Auth | List trips (scoped by role) |
| GET | `/history` | Auth | Get completed/cancelled trips |
| GET | `/:id` | Auth | Get specific trip details |
| PUT | `/:id` | Owner | Update trip details |
| PATCH| `/:id/confirm-end`| Owner | Owner completes a trip |
| PATCH| `/:id/cancel` | Owner | Owner cancels a trip |
| DELETE| `/:id` | Owner | Owner deletes a trip |
| PATCH| `/:id/end` | Driver | Driver requests trip completion |

### Expenses (`/api/expenses`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/` | Auth | Add an expense (Owner/Driver) |
| GET | `/` | Auth | List expenses |
| GET | `/:id` | Auth | Get expense details |
| DELETE| `/:id` | Owner | Delete an expense |

### Reports (`/api/reports`)
| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/dashboard` | Owner | High-level KPI aggregates |
| GET | `/truck/:id` | Owner | Truck specific financial report |
| GET | `/overall` | Owner | Organization-wide report |
| GET | `/analytics` | Owner | Time-series data for charts |
| GET | `/trip/:id` | Auth | JSON representation of trip financials |
| GET | `/trip/:id/pdf` | Auth | Download PDF invoice for a trip |
| GET | `/driver/:id` | Auth | Driver specific trip report |

## 6. Database Entities

- **User**: Core authentication. `name`, `email`, `phone`, `passwordHash`, `role` (OWNER/DRIVER), `isActive`.
- **Driver**: Extended profile for Driver roles. `userId` (Ref User), `ownerId` (Ref User), `licenseNumber`, `status` ("AVAILABLE", "ON_TRIP", "ON_LEAVE").
- **Truck**: Fleet vehicle. `ownerId` (Ref User), `registrationNumber`, `capacity`, `status` ("AVAILABLE", "ON_TRIP", "MAINTENANCE"), `currentDriverId` (Ref Driver).
- **Trip**: Dispatch log. `ownerId`, `truckId`, `driverId`, `source`, `destination`, `expectedRevenue` (Trip Rate), `startDate`, `actualEndDate`, `status` ("ON_TRIP", "COMPLETED", "CANCELLED").
- **Expense**: Operational costs. `tripId`, `truckId`, `driverId`, `ownerId`, `category`, `amount`, `receiptUrl`, `addedBy`.
- **TripReport**: Pre-calculated analytical summary of a completed trip. `tripId`, `ownerId`, `grossRevenue`, `totalExpenses`, `netProfit`, `profitMarginPercent`.

## 7. Business Logic

- **Truck -> Driver Assignment**: A `Truck` maintains a `currentDriverId` reference. This acts as the default assignment when dispatching a trip, but can be manually overridden during dispatch if the driver is unavailable.
- **Availability Calculations**: While `status` fields exist on `Truck` and `Driver` models, the backend controllers dynamically calculate real-time availability by querying the `Trip` collection for active `"ON_TRIP"` records to prevent stale states.
- **Trip Lifecycle**:
  - Dispatch: Creates a `Trip` with `status="ON_TRIP"`.
  - In-Progress: Expenses can be logged against the active trip.
  - Completion: Driver can end it (via `driverEndTrip`) setting it to `COMPLETED`, or Owner can confirm it (`ownerConfirmEndTrip`). Completing a trip triggers a background `generateTripReport` calculation.
- **Financial Logic**:
  - **Revenue**: Expected Revenue (Trip Rate) is set at dispatch. Can be overridden with Actual Revenue at completion.
  - **Expenses**: Simple summation of all `Expense` documents linked to the `tripId`.
  - **Profit**: Revenue - Total Expenses.

## 8. Status System Audit

- **Truck**: "AVAILABLE", "ON_TRIP", "MAINTENANCE"
- **Driver**: "AVAILABLE", "ON_TRIP", "ON_LEAVE"
- **Trip**: "ON_TRIP", "COMPLETED", "CANCELLED"
*(Legacy "ACTIVE" and "INACTIVE" strings are mapped dynamically in backend controllers for backwards compatibility to "ON_TRIP" / "AVAILABLE" / "ON_LEAVE").*

## 9. Validation Inventory
- **Backend**: Strict validation via `zod` schemas for all POST/PUT routes (e.g., `createTripSchema`, `createTruckSchema`, `createExpenseSchema`).
- **Frontend**: Required fields (`required` HTML attributes), basic numeric formatting (type="number"), and dropdown value enforcements.

## 10. Role/Permission Map
**OWNER CAN:**
- Create and manage Trucks, Drivers, Trips.
- Add expenses to any trip.
- Delete trips and expenses.
- Generate and view all financial reports and KPIs.

**DRIVER CAN:**
- Only access the Driver Dashboard.
- View their current active trip (`ON_TRIP`).
- Add expenses to their active trip.
- Mark their active trip as ended.

**DRIVER CANNOT:**
- Create trips, trucks, or drivers.
- Delete trips or expenses.
- View organization financials, reports, or other drivers' trips.
