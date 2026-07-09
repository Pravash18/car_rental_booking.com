# DriveElite — 3D Premium Car Rental

A production-ready, full-stack car rental web application with interactive 3D car visualization.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark glassmorphism) |
| 3D | React Three Fiber + Three.js |
| Animations | Framer Motion + CSS |
| Backend | Node.js + Express.js |
| Database | SQLite3 (file-based, no setup needed) |
| Auth | JWT + bcryptjs |

## Project Structure

```
car-rental-website/
├── backend/
│   ├── server.js           ← Express entry + middleware
│   ├── database.js         ← SQLite schema + seed data
│   ├── .env                ← Environment variables
│   ├── middleware/
│   │   └── auth.js         ← JWT verification
│   └── routes/
│       ├── auth.js         ← Register / Login / Profile
│       ├── cars.js         ← CRUD for cars
│       └── bookings.js     ← Create / Cancel / List bookings
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                    ← React Router
        ├── index.css                  ← Global styles
        ├── main.jsx
        ├── components/
        │   ├── CarModel3D.jsx         ← 3D interactive car (R3F)
        │   ├── Navbar.jsx
        │   ├── CarCard.jsx
        │   ├── BookingModal.jsx
        │   └── LoadingSpinner.jsx
        ├── pages/
        │   ├── Landing.jsx            ← Hero + 3D + Features
        │   ├── Login.jsx              ← Glassmorphism auth
        │   └── Dashboard.jsx          ← Fleet + Bookings
        ├── context/
        │   └── AuthContext.jsx        ← JWT auth state
        └── utils/
            └── api.js                 ← Axios + interceptors
```

## Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Start Backend Server (Terminal 1)
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### 4. Start Frontend Dev Server (Terminal 2)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 5. Open Browser
Navigate to: **http://localhost:5173**

## Default Credentials
- **Email:** `admin@carrental.com`
- **Password:** `admin123`

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/profile` — Get current user

### Cars
- `GET /api/cars` — List all cars (supports filters: category, fuel_type, transmission, min_price, max_price, search)
- `GET /api/cars/:id` — Get single car
- `POST /api/cars` — Add car (admin only)
- `PUT /api/cars/:id` — Update car (admin only)
- `DELETE /api/cars/:id` — Delete car (admin only)

### Bookings
- `POST /api/bookings` — Create booking
- `GET /api/bookings` — List user bookings
- `GET /api/bookings/:id` — Get single booking
- `PATCH /api/bookings/:id/cancel` — Cancel booking

## Features
- 🚗 **Interactive 3D Car** — Built with React Three Fiber, auto-rotating with physics-based materials
- 🌑 **Dark Glassmorphism UI** — Ultra-modern design with blur effects and gradients
- 🔐 **JWT Authentication** — Secure register/login with token expiry
- 📅 **Date Conflict Detection** — Backend checks overlapping bookings
- 🔍 **Advanced Filters** — Filter by category, fuel type, transmission, price range, search
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop
- ⚡ **Real-time Updates** — Cars become unavailable after booking

## Seeded Cars
1. Tesla Model S Plaid (Electric) — $299/day
2. Lamborghini Huracán EVO (Supercar) — $899/day
3. Porsche 911 Turbo S (Sports) — $599/day
4. BMW M5 Competition (Luxury Sedan) — $349/day
5. Range Rover Autobiography (SUV) — $449/day
6. Ferrari Roma (Supercar) — $799/day
7. Mercedes-AMG GT63S (Gran Turismo) — $499/day
8. Audi RS e-tron GT (Electric) — $399/day
