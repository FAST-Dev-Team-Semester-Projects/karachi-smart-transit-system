-- Table-Valued Procedures (simulate table-valued functions in MySQL)

USE ksts_db;



-- Procedure: Get Trip Revenue Breakdown
-- Purpose: Analyze financial performance of a specific trip
-- Returns: Result set with revenue metrics
-- Used by: Admin financial reports, trip analytics
-- Linked backend: backend/admin/reports.py (API endpoint: /admin/reports/trip-revenue/<trip_id>)
-- Linked frontend: frontend/src/pages/admin/AdminReports.jsx (admin UI calls backend API)

DROP PROCEDURE IF EXISTS get_trip_revenue_breakdown;

DELIMITER $$

CREATE PROCEDURE get_trip_revenue_breakdown(IN p_trip_id INT)
COMMENT 'Get comprehensive revenue analysis for a trip'
BEGIN
    -- Select trip and join with related route, service, and bus info
    SELECT 
        t.trip_id,  -- Unique trip identifier
        r.route_name,  -- Name of the route for this trip
        s.service_name,  -- Service (e.g., BRT, EV) for this route
        DATE_FORMAT(t.departure_time, '%Y-%m-%d %H:%i') AS departure_time,  -- Human-readable departure time
        t.status AS trip_status,  -- Trip status (scheduled, completed, etc.)
        bus.number_plate,  -- Bus number plate for traceability
        bus.capacity AS bus_capacity,  -- Bus capacity for utilization calculation
        COUNT(b.booking_id) AS total_bookings,  -- Total bookings (all statuses)
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,  -- Confirmed bookings only
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,  -- Cancelled bookings only
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS total_revenue,  -- Revenue from paid bookings
        COALESCE(AVG(CASE WHEN p.status = 'paid' THEN p.amount ELSE NULL END), 0) AS average_fare,  -- Average fare for paid bookings
        ROUND((SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) / bus.capacity) * 100, 2) AS utilization_percent  -- % of bus filled
    FROM trips t
    JOIN routes r ON t.route_id = r.route_id  -- Each trip is on a route
    JOIN services s ON r.service_id = s.service_id  -- Each route belongs to a service
    JOIN buses bus ON t.bus_id = bus.bus_id  -- Each trip uses a bus
    LEFT JOIN bookings b ON t.trip_id = b.trip_id  -- Bookings for this trip (may be none)
    LEFT JOIN payments p ON b.booking_id = p.booking_id  -- Payments for each booking (may be none)
    WHERE t.trip_id = p_trip_id  -- Only the requested trip
    GROUP BY t.trip_id, r.route_name, s.service_name, t.departure_time, 
             t.status, bus.number_plate, bus.capacity;  -- Grouping for aggregation
END$$

DELIMITER ;


-- Procedure: Get Daily Booking Analytics
-- Purpose: Generate daily performance metrics for admin dashboard
-- Returns: Result set with daily booking statistics
-- Used by: Daily reports, analytics dashboard
-- Linked backend: backend/admin/reports.py (API endpoint: /admin/reports/bookings/daily)
-- Linked frontend: frontend/src/pages/admin/AdminReports.jsx (admin UI calls backend API)

DROP PROCEDURE IF EXISTS get_daily_booking_analytics;

DELIMITER $$

CREATE PROCEDURE get_daily_booking_analytics(IN p_report_date DATE)
COMMENT 'Get daily booking and revenue analytics'
BEGIN
    -- Aggregate daily booking and revenue statistics for the given date
    SELECT 
        DATE(b.booking_date) AS booking_date,  -- The report date
        COUNT(DISTINCT b.booking_id) AS total_bookings,  -- Total bookings made that day
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,  -- Confirmed bookings
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,  -- Cancelled bookings
        COUNT(DISTINCT b.user_id) AS unique_passengers,  -- Unique users who booked
        COUNT(DISTINCT b.trip_id) AS trips_booked,  -- Number of distinct trips booked
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS daily_revenue,  -- Total revenue from paid bookings
        COALESCE(AVG(CASE WHEN p.status = 'paid' THEN p.amount ELSE NULL END), 0) AS avg_booking_value,  -- Average paid booking value
        -- Subquery: most popular route by booking count
        (SELECT r.route_name 
         FROM bookings b2
         JOIN trips t ON b2.trip_id = t.trip_id
         JOIN routes r ON t.route_id = r.route_id
         WHERE DATE(b2.booking_date) = p_report_date
         GROUP BY r.route_id, r.route_name
         ORDER BY COUNT(*) DESC
         LIMIT 1) AS most_popular_route,
        -- Subquery: most popular service by booking count
        (SELECT s.service_name
         FROM bookings b3
         JOIN trips t ON b3.trip_id = t.trip_id
         JOIN routes r ON t.route_id = r.route_id
         JOIN services s ON r.service_id = s.service_id
         WHERE DATE(b3.booking_date) = p_report_date
         GROUP BY s.service_id, s.service_name
         ORDER BY COUNT(*) DESC
         LIMIT 1) AS most_popular_service
    FROM bookings b
    LEFT JOIN payments p ON b.booking_id = p.booking_id  -- Join payments for revenue
    WHERE DATE(b.booking_date) = p_report_date  -- Only bookings for the report date
    GROUP BY DATE(b.booking_date);  -- One row per day
END$$

DELIMITER ;



DROP PROCEDURE IF EXISTS get_user_complete_profile;

DELIMITER $$

-- Procedure: Get User Complete Profile with Analytics
-- Purpose: Retrieve comprehensive user information with booking statistics
-- Returns: Result set with user profile and analytics
-- Used by: User management, customer insights
-- Linked backend: backend/admin/reports.py (API endpoint: /admin/reports/user-profile/<user_id>)
-- Linked frontend: Not used in frontend (no UI integration)

CREATE PROCEDURE get_user_complete_profile(IN p_user_id INT)
COMMENT 'Get user profile with booking history and analytics'
BEGIN
    -- Select user profile and aggregate booking/payment analytics
    SELECT 
        u.user_id,  -- User's unique ID
        u.username,  -- Username
        u.full_name,  -- Full name
        u.email,  -- Email address
        u.phone_number,  -- Phone number
        u.role,  -- User role (passenger, admin, etc.)
        COUNT(DISTINCT b.booking_id) AS total_bookings,  -- Total bookings by user
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,  -- Confirmed bookings
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,  -- Cancelled bookings
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS total_spent,  -- Total paid by user
        COALESCE(AVG(CASE WHEN p.status = 'paid' THEN p.amount ELSE NULL END), 0) AS avg_booking_value,  -- Average paid booking
        MAX(b.booking_date) AS last_booking_date,  -- Most recent booking date
        -- Subquery: user's most frequently booked route
        (SELECT r.route_name
         FROM bookings b2
         JOIN trips t ON b2.trip_id = t.trip_id
         JOIN routes r ON t.route_id = r.route_id
         WHERE b2.user_id = p_user_id
         GROUP BY r.route_id, r.route_name
         ORDER BY COUNT(*) DESC
         LIMIT 1) AS favorite_route,
        -- Subquery: user's most frequently booked service
        (SELECT s.service_name
         FROM bookings b3
         JOIN trips t ON b3.trip_id = t.trip_id
         JOIN routes r ON t.route_id = r.route_id
         JOIN services s ON r.service_id = s.service_id
         WHERE b3.user_id = p_user_id
         GROUP BY s.service_id, s.service_name
         ORDER BY COUNT(*) DESC
         LIMIT 1) AS favorite_service
    FROM users u
    LEFT JOIN bookings b ON u.user_id = b.user_id  -- User's bookings (may be none)
    LEFT JOIN payments p ON b.booking_id = p.booking_id  -- Payments for user's bookings
    WHERE u.user_id = p_user_id  -- Only the requested user
    GROUP BY u.user_id, u.username, u.full_name, u.email, u.phone_number, u.role;  -- Grouping for aggregation
END$$

DELIMITER ;
