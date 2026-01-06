# Backend (Flask)

This backend powers the Karachi Smart Transit System. It is a modular Flask application with MySQL, session-based authentication, real-time bus tracking, and a robust admin API.

---

## Quick Facts
- **Backend dev URL:** http://localhost:5000
- **Frontend dev URL (Vite):** http://localhost:5173
- **Entrypoint:** `backend/app.py` (Flask app, CORS, MySQL, SocketIO)
- **Admin API:** All admin endpoints are under `/admin` and require session-based admin authentication.
- **Public API:** Passenger endpoints are under `/api`.

## Features
- **Authentication & Authorization**: Session-based login/logout with role-based access (admin/passenger)
- **Real-time Bus Tracking**: Live trip updates via WebSocket, automatic return trip generation
- **Booking System**: Seat availability checking, fare calculation, payment processing with Luhn validation
- **Admin Dashboard**: Full CRUD operations for routes, buses, drivers, trips, bookings, payments, tickets
- **Database Integration**: ACID-compliant transactions, stored procedures, triggers for business rules
- **API Documentation**: RESTful endpoints with comprehensive error handling

## Prerequisites
- Python 3.10+ (3.11+ recommended)
- MySQL server (schema in `database/`)
- PowerShell (Windows) or Bash (Linux/macOS)

## Setup (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment Variables
- Copy `.env.example` to `.env` in `backend/` and set:
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `SECRET_KEY`

## Running the App (Development)
```powershell
# From backend/ with venv active
python app.py
```

## Running Tests
```powershell
# From project root or backend/ with venv active
pytest backend/tests/ -v
# If you have import errors, try:
cd backend; pytest tests/ -v
# Or set PYTHONPATH:
set PYTHONPATH=backend; pytest backend/tests/ -v
```

- `backend/app.py` — Main Flask app, CORS, MySQL, SocketIO, blueprint registration
## Real-Time Bus Tracking (Socket.IO)

The backend uses **Flask-SocketIO** to provide real-time bus tracking and push updates to connected clients (e.g., the frontend dashboard):
- Socket.IO is initialized in `backend/app.py` and configured for CORS with the frontend.
- The `bus_tracker.py` module manages active trips and emits updates via Socket.IO.
  - Automatic return trips are enabled by default: when a trip completes, the backend will create a return trip scheduled for arrival_time + buffer (30s by default). The return trip's departure_time uses the recorded arrival_time + buffer and the system will auto-start it after the configured buffer. Admins can toggle this behavior via `PUT /admin/trips/auto-return/config`.
- WebSocket events:
  - `connect`/`disconnect`: Client connection lifecycle
  - `request_active_trips`: Client requests all active trips
  - `active_trips`: Server emits current active trips to clients
- The Socket.IO instance is injected into the bus tracker with `bus_tracker.set_socketio(socketio)`.
- See [backend/bus_tracker.py](backend/bus_tracker.py) for implementation details and event handlers.

- `backend/app.py` — Main Flask app, CORS, MySQL, SocketIO, blueprint registration
- `backend/routes/` — Public/passenger APIs (`auth.py`, `passenger.py`)
- `backend/admin/` — Admin blueprint, access control, and all admin resource modules
  - `backend/admin/repos/` — DB helper functions for admin modules
- `backend/utils/` — Fare calculation (`fare_utils.py`), payment validation (`payment_validator.py`)
- `backend/bus_tracker.py` — Real-time bus tracking (WebSocket)
- `backend/tests/` — Pytest-based tests (see notes below)

## Key Patterns & Conventions
- **Session-based auth:**
  - Login sets `session['user_id']`, `session['role']`, etc.
  - Frontend must use `credentials: 'include'` for all API calls.
- **CORS:**
  - Only allows requests from `http://localhost:5173` (dev) with credentials.
- **MySQL access:**
  - Public/passenger routes: `from app import mysql`
  - Admin modules: `get_mysql()` from `backend/admin/__init__.py`
- **Blueprints:**
  - Public: `auth_bp`, `passenger_bp` (registered at `/api`)
  - Admin: `admin_bp` (registered at `/admin`)
- **Fare logic:**
  - `backend/utils/fare_utils.py` (update tests if you change pricing)
- **Admin access control:**
  - Use `@admin_required` decorator from `backend/admin/__init__.py`

## Testing & Mocking
- Use pytest. Tests are in `backend/tests/`.
- For admin API tests, patch `backend.admin.get_mysql` to use a mock DB (see test examples).
- If you see `ModuleNotFoundError: No module named 'bus_tracker'`, run tests from `backend/` or set `PYTHONPATH`.
- **Never run destructive schema scripts on production DBs!**

## Troubleshooting
- **Session/cookie issues:** Ensure frontend uses `credentials: 'include'` and CORS is set up for your frontend origin.
- **Import errors:** Run tests from `backend/` or set `PYTHONPATH=backend`.
- **DB connection errors:** Check `.env` values and MySQL server status.
- **Blueprint/route 404s:** Ensure all blueprints are registered in `app.py`.
- **Test isolation:** Always use mock DBs or a dedicated test DB for tests.

## Database
- Schema: `database/ksts_schema.sql`
- Seed data: see [database/README.md](database/README.md) and [database/seed_data/](database/seed_data/)
- **Warning:** The schema script drops and truncates all tables. Never run on production DBs.

## Requirements
- See [backend/requirements.txt](backend/requirements.txt) for all Python dependencies (Flask, Flask-MySQLdb, flask-cors, flask-socketio, pytest, etc.)

## Security & Production Notes
- Set `SESSION_COOKIE_SECURE=True` and use HTTPS in production.
- Never expose test card info or debug endpoints in production.
- Always use strong, unique `SECRET_KEY` in `.env`.

---

For more details, see:
- [database/README.md](database/README.md) (schema, seed, and DB provisioning)
- [docs/API.md](docs/API.md) (API reference)
