# LogiBrain — Truck Fleet & Trip Management System

A full-stack MERN application for managing truck fleets, trips, drivers, and expenses with role-based access control (Owner and Driver).

## Tech Stack
- **Frontend**: React (Vite), React Router, Tailwind CSS (v4), Recharts, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose
- **Auth**: JWT (Access Token & httpOnly Refresh Token), bcrypt
- **Validation**: Zod (Backend)

## Features
- **Owner Dashboard**: KPI metrics, charts for Revenue vs Expenses and Expense Breakdown.
- **Driver Dashboard**: Assigned truck, current trip, end trip requests.
- **Role-Based Access**: 
  - Owners have full access to manage trucks, drivers, trips, and expenses.
  - Drivers are strictly scoped to their own active trips and data.
- **Trip Lifecycle**: PENDING → ACTIVE → DRIVER_ENDED → COMPLETED
- **Trip Reports**: Auto-generated financial reports upon trip completion.

## Project Structure
This repository contains two main folders:
- `backend/`: Node.js API server
- `frontend/`: React Vite application

---

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally at `mongodb://localhost:27017` (or change the `MONGO_URI` in `.env`)

### 2. Backend Setup

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Run the seed script to populate demo data:
   ```bash
   node seed/seedData.js
   ```
   *(This will create a demo owner, trucks, drivers, and some initial trips/expenses)*
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *(Server runs on port 5000)*

### 3. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *(App runs on http://localhost:5173)*

---

## Demo Credentials

The `seedData.js` script provisions the following accounts:

**Owner:**
- Email: `owner@demo.com`
- Password: `password123`

**Driver:**
- Email: `driver1@demo.com`
- Password: `password123`

*(You can also register a new Owner account from the UI)*
