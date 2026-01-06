# Karachi Smart Transit System (KSTS)

**Undergraduate Database Systems Project** — A comprehensive transit booking and administration platform with MySQL database, Flask REST API, React frontend, and real-time features.

This project implements a complete transit management system demonstrating relational database design, stored procedures, triggers, and modern web development practices.

---

## Key Features

### Passenger Features
- **Online Booking System**: Book tickets for BRT (Green/Red Lines) and Peoples Bus services
- **Simulated Real-time Bus Tracking**: Live stop-by-stop updates showing bus progression along routes
- **Fare Calculation**: Dynamic pricing based on distance and service type
- **Demo Payment Processing**: Mock payment handling with test card support for academic demonstration

### Admin Dashboard
- **Trip Management**: Create and schedule daily trips across all routes
- **Driver Assignment**: Assign drivers to buses with conflict prevention
- **Route & Stop Management**: Configure routes, stops, and service mappings
- **User Management**: Admin and passenger account management
- **Analytics & Reports**: Revenue reports, booking statistics, and performance metrics

### Database Features
- **Normalization**: 3NF schema design with proper entity relationships and data integrity
- **Transactions**: ACID-compliant payment processing with rollback capabilities
- **Triggers**: Automated business rule enforcement (driver conflict prevention, data validation)
- **Stored Procedures**: Complex business logic for trip generation, booking, and reporting
- **Views**: Optimized data access patterns for analytics and reporting
- **Indexes**: Performance optimization for large-scale transit operations
- **Data Integrity**: Foreign key constraints, check constraints, and referential integrity

### Technical Features
- **Session-based Authentication**: Secure login system with role-based access
- **RESTful API**: Well-documented endpoints for all operations
- **Simulated Real-time Updates**: WebSocket integration for live bus stop progression (15-second intervals)
- **Responsive UI**: Modern React interface with Tailwind CSS

### Database Design
- **Comprehensive Schema**: 12 normalized tables with proper relationships
- **Advanced Features**: Triggers, stored procedures, transactions, and views
- **Performance Optimized**: Strategic indexing and query optimization
- **[View Database Documentation](database/README.md)** for detailed database concepts and implementation

---

## Architecture

### Tech Stack
- **Backend**: Flask (Python) with MySQL database and session-based authentication
- **Frontend**: React single-page application with Vite build system
- **Real-time Communication**: Socket.IO for live bus tracking updates
- **Styling**: Tailwind CSS with dark mode support
- **Database**: MySQL with stored procedures, triggers, and complex views

### System Design
- **Monolithic Architecture**: Single Flask application serving both public and admin APIs
- **Session Management**: Server-side sessions with role-based access control
- **Database Layer**: Repository pattern with direct SQL queries and stored procedures
- **Real-time Updates**: Simulated bus tracking with periodic updates via WebSocket

---

## Project Structure

- **Backend:** Flask (MySQL, session auth, admin API) — see [`backend/README.md`](backend/README.md)
- **Frontend:** React + Vite SPA — see [`frontend/README.md`](frontend/README.md)
- **Database:** MySQL schema & seeds — see [`database/README.md`](database/README.md)

---

## Quick Start

### Database Setup

1. **Install MySQL** and create a database named `ksts_db`
2. **Load the schema:**
   ```sql
   mysql -u your_username -p ksts_db < database/ksts_schema.sql
   ```
3. **Load essential procedures and triggers:**
   ```sql
   mysql -u your_username -p ksts_db < database/triggers/triggers.sql
   mysql -u your_username -p ksts_db < database/procedures/table_valued_procedures.sql
   mysql -u your_username -p ksts_db < database/procedures/sp_generate_daily_trips.sql
   mysql -u your_username -p ksts_db < database/migrations/passenger_booking_procedures.sql
   mysql -u your_username -p ksts_db < database/views/complex_views.sql
   ```
4. **Optional:** Load sample data from `database/seed_data/` and performance indexes from `database/indexes/`

### Backend

```powershell
cd backend
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

---

## Key Locations

- **Backend entry:** `backend/app.py`
- **Frontend entry:** `frontend/src/main.jsx`
- **Admin UI:** `frontend/src/pages/admin/`
- **Database schema:** [database/ksts_schema.sql](database/ksts_schema.sql)
- **Database ERD:** [database/ERD/ERD.png](database/ERD/ERD.png)

---

## Documentation

- **Backend details:** [`backend/README.md`](backend/README.md)
- **Database setup:** [`database/README.md`](database/README.md)
- **API & analytics:** See [docs/](docs/) for API and analytics enhancements

---

## Notes

- All session-auth API calls from the frontend must use `credentials: 'include'`.
- Seed scripts are idempotent; see [database/README.md](database/README.md) for safe usage.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
