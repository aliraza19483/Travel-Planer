# 🌍 WanderPlan — Intelligent Travel Planner & Itinerary Management

> **7th Semester Server-Side Web Development Project**  
> Built with Node.js, Express.js, RESTful Architecture, JWT Authentication & Real-Time Weather Integration.

---

## 📌 Project Overview
**WanderPlan** is a full-featured travel planning and itinerary management platform engineered to solve the fragmentation in vacation planning. It empowers travelers to:
- 🗺️ **Discover Destinations:** Explore curated travel spots with search and category filters (Mountains, Beaches, Heritage, Urban).
- 📅 **Build Dynamic Itineraries:** Automatically generate day-by-day schedules with customizable activities and transportation modes (Flight, Train, Volvo/Bus, Car/Cab, Walking, Ferry).
- 🌦️ **Real-Time Weather & Advisories:** Live forecast sync with temperature, humidity, wind, and intelligent weather preparedness alerts (e.g. thermal wear packing alerts, UV warnings).
- 💰 **Travel Budget Tracker:** Set target budgets, log expenses across categorized buckets (Lodging, Transport, Food, Activities, Shopping, Misc), and track progress bars with real-time utilization warnings.
- 🔗 **Trip Sharing & Collaboration:** Generate secure, unguessable public share tokens (`/shared/trip/:token`) allowing friends or the public to view itineraries without logging in.
- ⭐ **Destination Reviews & Ratings:** Read and post verified community reviews and star ratings to assist future travelers.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

### 2. Installation
Open your terminal in this project folder and run:
```bash
# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Run the Application
Start the server:
```bash
npm start
# or for auto-reloading dev mode:
npm run dev
```

The application will be live at:
- **Web Interface:** [http://localhost:5000](http://localhost:5000)
- **Health Check API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## ⚡ 1-Click Evaluation / Viva Demo Mode

For quick presentation to professors and external examiners:
1. Open [http://localhost:5000](http://localhost:5000) in any browser.
2. Click the **⚡ Demo Login** button in the top navbar.
3. You will be automatically signed in as **Alex Rivera** with a pre-configured multi-day trip:
   - **Trip:** *Himalayan Escape: Manali Adventure*
   - **Live Weather Forecast:** 11°C Crisp Mountain Breeze with packing advisories
   - **Itinerary:** Day 1–3 schedules with Volvo bus, Hadimba Temple walk, and Solang paragliding
   - **Budget:** ₹25,000 budget with ₹18,000 spent and ₹7,000 remaining balance
   - **Sharing:** Pre-generated public link viewable without authentication

---

## 🏗️ System Architecture & Directory Structure

```
Travel Planer/
├── client/                     # Frontend Client Interface
│   ├── index.html              # Main single-page application entry
│   ├── css/
│   │   └── style.css           # Modern design system (tokens, glassmorphism, responsive)
│   └── js/
│       ├── api.js              # Centralized REST API fetch client & JWT handler
│       └── app.js              # UI controller, state sync, modals & dynamic rendering
├── server/                     # Server-Side Backend (Node.js + Express)
│   ├── data/
│   │   └── travel_planner_db.json # Persistent JSON-backed relational database store
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js          # Environment variables & constants
│   │   ├── controllers/
│   │   │   ├── authController.js        # Register, login, profile verification
│   │   │   ├── destinationController.js # Search, details, and live weather endpoints
│   │   │   ├── tripController.js       # Trip CRUD & day-by-day itinerary item engine
│   │   │   ├── budgetController.js     # Expense logger & categorized analytics
│   │   │   ├── reviewController.js     # Destination rating & reviews
│   │   │   └── shareController.js      # Public read-only trip viewer
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification & RBAC guard
│   │   │   └── errorHandler.js # Standardized 404 & 500 error handlers
│   │   ├── models/
│   │   │   └── db.js           # Relational collection model layer
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── destinationRoutes.js
│   │   │   ├── tripRoutes.js
│   │   │   └── shareRoutes.js
│   │   ├── services/
│   │   │   └── weatherService.js # Live OpenWeatherMap API + 30-min cache + fallback engine
│   │   ├── utils/
│   │   │   └── seed.js         # Database auto-seeder with realistic travel data
│   │   └── server.js           # Express main server entrypoint
│   ├── .env                    # Server environment variables
│   └── package.json            # Server dependencies
├── PROJECT_PLAN.md             # Detailed implementation plan sheet & academic documentation
└── package.json                # Project root runner scripts
```

---

## 📡 RESTful API Endpoints Matrix

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register new user account | No |
| **Auth** | `POST` | `/api/auth/login` | Authenticate and retrieve JWT token | No |
| **Auth** | `GET` | `/api/auth/me` | Fetch currently logged in user profile | Bearer Token |
| **Destinations** | `GET` | `/api/destinations` | Search destinations with keyword & category filters | No |
| **Destinations** | `GET` | `/api/destinations/:id` | Fetch destination details and average rating | No |
| **Destinations** | `GET` | `/api/destinations/:id/weather` | Live weather forecast & packing advisories | No |
| **Trips** | `GET` | `/api/trips` | Get all trips created by authenticated user | Bearer Token |
| **Trips** | `POST` | `/api/trips` | Create trip (auto-generates daily itinerary slots) | Bearer Token |
| **Trips** | `GET` | `/api/trips/:id` | Get trip with full day-by-day itinerary breakdown | Bearer Token |
| **Trips** | `DELETE`| `/api/trips/:id` | Cascading delete of trip, days, items & expenses | Bearer Token |
| **Itinerary** | `POST` | `/api/trips/:id/days/:dayId/items` | Add activity with transportation mode & cost | Bearer Token |
| **Itinerary** | `DELETE`| `/api/trips/:id/items/:itemId` | Remove activity from day schedule | Bearer Token |
| **Itinerary** | `PUT` | `/api/trips/:id/days/:dayId/reorder` | Update route order of daily activities | Bearer Token |
| **Budget** | `GET` | `/api/trips/:id/expenses` | Get categorized budget utilization summary | Bearer Token |
| **Budget** | `POST` | `/api/trips/:id/expenses` | Log a new travel expense | Bearer Token |
| **Budget** | `DELETE`| `/api/trips/:id/expenses/:expId` | Delete an expense entry | Bearer Token |
| **Sharing** | `POST` | `/api/trips/:id/share` | Toggle public sharing & generate share token | Bearer Token |
| **Sharing** | `GET` | `/api/shared/trip/:shareToken` | Public read-only access to trip itinerary | No |
| **Reviews** | `POST` | `/api/destinations/:id/reviews` | Submit destination rating & review | Bearer Token |
| **Reviews** | `GET` | `/api/destinations/:id/reviews` | List all reviews for a destination | No |

---

## 🎓 Academic Viva Defense Notes

1. **Why is the architecture decoupled?**  
   The backend operates as a pure RESTful API server (`/server`), returning JSON payloads with JWT security. This allows any frontend (web, mobile app, CLI) to consume the same endpoints.
2. **How is weather rate-limiting prevented?**  
   `weatherService.js` incorporates a 30-minute in-memory cache keyed by destination coordinates, preventing quota exhaustion from repetitive client queries.
3. **How does public sharing protect private user data?**  
   The public endpoint `/api/shared/trip/:shareToken` projects only non-sensitive itinerary information, stripping out user emails, private password hashes, and personal financial receipts.
