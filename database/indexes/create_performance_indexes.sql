-- Strategic indexes to optimize query performance based on application usage patterns.

USE ksts_db;

-- ============================================================================
-- 1. USERS TABLE INDEXES
-- ============================================================================

-- Login queries: WHERE username = ? OR email = ?
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Role-based filtering: WHERE role = 'admin' or 'passenger'
CREATE INDEX idx_users_role ON users(role);

-- Phone number lookups (user registration and admin operations)
CREATE INDEX idx_users_phone ON users(phone_number);


-- ============================================================================
-- 2. TRIPS TABLE INDEXES
-- ============================================================================

-- Foreign keys (JOIN operations)
CREATE INDEX idx_trips_route_id ON trips(route_id);
CREATE INDEX idx_trips_bus_id ON trips(bus_id);

-- Status filtering (scheduled, running, completed, cancelled)
-- Used in: Admin dashboard, passenger booking pages
CREATE INDEX idx_trips_status ON trips(status);

-- Direction filtering (forward/backward)
CREATE INDEX idx_trips_direction ON trips(direction);

-- Time-based queries (find trips by departure time)
-- Used in: Passenger booking, daily trip generation
CREATE INDEX idx_trips_departure_time ON trips(departure_time);
CREATE INDEX idx_trips_arrival_time ON trips(arrival_time);

-- Composite index for common passenger query:
-- "Find available trips for route X departing after NOW"
CREATE INDEX idx_trips_route_departure_status ON trips(route_id, departure_time, status);

-- Composite index for admin filtering:
-- "Find all running trips for a specific route"
CREATE INDEX idx_trips_status_route ON trips(status, route_id);

-- Date-based trip lookups (used in daily trip generation check)
CREATE INDEX idx_trips_departure_date ON trips(DATE(departure_time));


-- ============================================================================
-- 3. BOOKINGS TABLE INDEXES
-- ============================================================================

-- Foreign keys
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_origin_stop ON bookings(origin_stop_id);
CREATE INDEX idx_bookings_destination_stop ON bookings(destination_stop_id);

-- Status filtering (confirmed, cancelled)
CREATE INDEX idx_bookings_status ON bookings(status);

-- Booking date range queries (for analytics)
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- Composite index for user booking history:
-- "Show all bookings for user X ordered by date"
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date DESC);

-- Composite index for trip capacity check:
-- "Count confirmed bookings for trip X"
CREATE INDEX idx_bookings_trip_status ON bookings(trip_id, status);

-- Seat number lookups (prevent duplicate seat assignments)
CREATE INDEX idx_bookings_trip_seat ON bookings(trip_id, seat_number);


-- ============================================================================
-- 4. PAYMENTS TABLE INDEXES
-- ============================================================================

-- Foreign key
CREATE INDEX idx_payments_booking_id ON payments(booking_id);

-- Payment status filtering (paid, pending, failed)
CREATE INDEX idx_payments_status ON payments(status);

-- Payment method analytics
CREATE INDEX idx_payments_method ON payments(payment_method);

-- Payment date range queries (daily revenue reports)
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Composite index for revenue analytics:
-- "Calculate total revenue for date range by status"
CREATE INDEX idx_payments_date_status_amount ON payments(payment_date, status, amount);


-- ============================================================================
-- 5. TICKETS TABLE INDEXES
-- ============================================================================

-- Foreign key
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);

-- Issue date queries (ticket history and analytics)
CREATE INDEX idx_tickets_issue_date ON tickets(issue_date);


-- ============================================================================
-- 6. ROUTES TABLE INDEXES
-- ============================================================================

-- Foreign key (service grouping)
CREATE INDEX idx_routes_service_id ON routes(service_id);

-- Route name searches (used in admin panels)
CREATE INDEX idx_routes_name ON routes(route_name);


-- ============================================================================
-- 7. ROUTE_STOPS TABLE INDEXES (JUNCTION TABLE - CRITICAL)
-- ============================================================================

-- Find all routes passing through a stop
CREATE INDEX idx_route_stops_stop_id ON route_stops(stop_id);

-- Stop order queries (used in trip simulation)
-- "Get stops for route X in order"
CREATE INDEX idx_route_stops_route_order ON route_stops(route_id, stop_order);


-- ============================================================================
-- 8. BUSES TABLE INDEXES
-- ============================================================================

-- Capacity filtering (find buses with capacity > X)
CREATE INDEX idx_buses_capacity ON buses(capacity);


-- ============================================================================
-- 9. DRIVERS TABLE INDEXES
-- ============================================================================

-- Phone number lookup
CREATE INDEX idx_drivers_phone ON drivers(phone_number);

-- Full name search (for admin search functionality)
CREATE INDEX idx_drivers_name ON drivers(full_name);


-- ============================================================================
-- 10. DRIVERS_ASSIGNMENTS TABLE INDEXES
-- ============================================================================

-- Foreign keys
CREATE INDEX idx_assignments_driver_id ON drivers_assignments(driver_id);
CREATE INDEX idx_assignments_bus_id ON drivers_assignments(bus_id);

-- Date-based queries (find current assignments)
CREATE INDEX idx_assignments_date ON drivers_assignments(DATE(start_time));

-- Composite index: "Find driver assigned to bus X on date Y"
CREATE INDEX idx_assignments_bus_date ON drivers_assignments(bus_id, DATE(start_time));


-- ============================================================================
-- 11. STOPS TABLE INDEXES
-- ============================================================================

-- Stop name lookups (display and identification)
CREATE INDEX idx_stops_name ON stops(stop_name);

-- Stop coordinates (used in fare calculation with distance formulas)
CREATE INDEX idx_stops_lat_lng ON stops(latitude, longitude);


-- ============================================================================
-- 12. SERVICES TABLE INDEXES
-- ============================================================================

-- Service name search
CREATE INDEX idx_services_name ON services(service_name);


-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Admin Analytics: Daily booking summary by route and status
CREATE INDEX idx_analytics_bookings ON bookings(booking_date, trip_id, status);

-- Passenger: "Find available seats on trips for route X departing after time Y"
CREATE INDEX idx_available_trips ON trips(route_id, departure_time, status, bus_id);

-- Revenue Analytics: Total payments by date and method
CREATE INDEX idx_revenue_analytics ON payments(payment_date, payment_method, status);

-- Trip Timeline: Order trips by departure time for route scheduling
CREATE INDEX idx_trip_timeline ON trips(route_id, departure_time, direction);


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all indexes created
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'ksts_db'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
