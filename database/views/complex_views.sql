-- ============================================================================ 
-- Complex views: multi-table JOINs, aggregations, and analytics for admin backend.
-- Each view is used for reporting, analytics, or as a backend data source.
-- ============================================================================

USE ksts_db;

-- ============================================================================
-- trip_details_view: All trip info with bus, route, service, and booking stats (trips, buses, routes, services, bookings).
-- Used in backend/admin/repos/trips.py for admin trip listing and analytics.
CREATE OR REPLACE VIEW trip_details_view AS
SELECT 
    t.trip_id,                        -- Trip primary key
    t.departure_time,                 -- Scheduled departure
    t.arrival_time,                   -- Scheduled arrival
    t.direction,                      -- Trip direction (forward/backward)
    t.status AS trip_status,          -- Trip status (scheduled, running, etc.)
    b.bus_id,                         -- Bus assigned
    b.number_plate,                   -- Bus number plate
    b.capacity AS bus_capacity,       -- Bus capacity
    r.route_id,                       -- Route assigned
    r.route_name,                     -- Route name
    s.service_id,                     -- Service assigned
    s.service_name,                   -- Service name
    COUNT(DISTINCT CASE WHEN bk.status = 'confirmed' THEN bk.booking_id END) AS confirmed_bookings,   -- Confirmed bookings
    COUNT(DISTINCT CASE WHEN bk.status = 'cancelled' THEN bk.booking_id END) AS cancelled_bookings,   -- Cancelled bookings
    COUNT(DISTINCT bk.booking_id) AS total_bookings,                                                  -- All bookings
    b.capacity - COUNT(DISTINCT CASE WHEN bk.status = 'confirmed' THEN bk.booking_id END) AS available_seats -- Seats left
FROM trips t                              -- Base trip records
INNER JOIN buses b ON t.bus_id = b.bus_id -- Join bus assigned to trip
INNER JOIN routes r ON t.route_id = r.route_id -- Join route for trip
INNER JOIN services s ON r.service_id = s.service_id -- Join service for route
LEFT JOIN bookings bk ON t.trip_id = bk.trip_id -- Join all bookings for trip (may be none)
GROUP BY 
    t.trip_id, t.departure_time, t.arrival_time, t.direction, t.status, -- Group by trip
    b.bus_id, b.number_plate, b.capacity,                               -- Group by bus
    r.route_id, r.route_name,                                           -- Group by route
    s.service_id, s.service_name                                        -- Group by service
ORDER BY t.departure_time DESC;                                         -- Most recent trips first

-- -----------------------------------------------------------------------------
-- booking_details_view: All booking info with user, trip, route, service, stops, payment (bookings, users, trips, routes, services, stops, payments).
-- Used in backend/admin/repos/bookings.py for admin booking listing and analytics.
CREATE OR REPLACE VIEW booking_details_view AS
SELECT 
    bk.booking_id,           -- Booking primary key
    bk.booking_date,         -- Date/time of booking
    bk.seat_number,          -- Seat number booked
    bk.status AS booking_status, -- Booking status (confirmed/cancelled)
    u.user_id,               -- Passenger user ID
    u.username,              -- Passenger username
    u.full_name AS passenger_name, -- Passenger full name
    u.email AS passenger_email,    -- Passenger email
    t.trip_id,               -- Trip ID
    t.departure_time,        -- Trip departure
    t.arrival_time,          -- Trip arrival
    t.direction,             -- Trip direction
    t.status AS trip_status, -- Trip status
    r.route_id,              -- Route ID
    r.route_name,            -- Route name
    s.service_id,            -- Service ID
    s.service_name,          -- Service name
    origin.stop_id AS origin_stop_id,         -- Origin stop ID
    origin.stop_name AS origin_stop_name,     -- Origin stop name
    dest.stop_id AS destination_stop_id,      -- Destination stop ID
    dest.stop_name AS destination_stop_name,  -- Destination stop name
    p.payment_id,            -- Payment ID (if paid)
    p.amount AS fare_amount, -- Fare paid
    p.payment_date,          -- Payment date
    p.method AS payment_method, -- Payment method
    p.status AS payment_status  -- Payment status
FROM bookings bk
INNER JOIN users u ON bk.user_id = u.user_id              -- Join passenger
INNER JOIN trips t ON bk.trip_id = t.trip_id              -- Join trip
INNER JOIN routes r ON t.route_id = r.route_id            -- Join route
INNER JOIN services s ON r.service_id = s.service_id      -- Join service
INNER JOIN stops origin ON bk.origin_stop_id = origin.stop_id -- Join origin stop
INNER JOIN stops dest ON bk.destination_stop_id = dest.stop_id -- Join destination stop
LEFT JOIN payments p ON bk.booking_id = p.booking_id      -- Join payment (if any)
ORDER BY bk.booking_date DESC;                            -- Most recent bookings first

-- -----------------------------------------------------------------------------
-- route_stops_detail_view: Route stops with route, service, stop details (routes_stops, routes, services, stops).
-- Used in backend/admin/repos/routes_stops.py for admin route-stop listing and analytics.
CREATE OR REPLACE VIEW route_stops_detail_view AS
SELECT 
    rs.route_id,                        -- Route ID
    r.route_name,                       -- Route name
    s.service_id,                       -- Service ID
    s.service_name,                     -- Service name
    rs.stop_id,                         -- Stop ID
    st.stop_name,                       -- Stop name
    st.latitude,                        -- Stop latitude
    st.longitude,                       -- Stop longitude
    rs.stop_order,                      -- Stop order in route
    (SELECT COUNT(*) FROM routes_stops rs2 WHERE rs2.route_id = rs.route_id) AS total_stops_on_route -- Total stops on this route
FROM routes_stops rs
INNER JOIN routes r ON rs.route_id = r.route_id            -- Join route
INNER JOIN services s ON r.service_id = s.service_id       -- Join service
INNER JOIN stops st ON rs.stop_id = st.stop_id             -- Join stop
ORDER BY rs.route_id, rs.stop_order;                       -- Order by route and stop order

-- -----------------------------------------------------------------------------
-- driver_assignment_details_view: Driver assignments with bus and driver info, computed status (drivers_assignments, drivers, buses).
-- Used in backend/admin/repos/drivers_assignments.py for admin assignment listing and analytics.
CREATE OR REPLACE VIEW driver_assignment_details_view AS
SELECT 
    da.driver_id,                        -- Driver ID
    d.full_name AS driver_name,           -- Driver name
    d.license_number,                     -- License number
    d.phone_number AS driver_phone,       -- Driver phone
    da.bus_id,                            -- Bus ID
    b.number_plate,                       -- Bus number plate
    b.capacity AS bus_capacity,           -- Bus capacity
    da.start_time,                        -- Assignment start
    da.end_time,                          -- Assignment end
    CASE                                  -- Assignment status
        WHEN da.end_time IS NULL THEN 'active'
        WHEN da.end_time > NOW() THEN 'active'
        ELSE 'completed'
    END AS assignment_status,
    CASE                                  -- Assignment duration (hours)
        WHEN da.end_time IS NULL THEN NULL
        ELSE TIMESTAMPDIFF(HOUR, da.start_time, da.end_time)
    END AS assignment_duration_hours
FROM drivers_assignments da
INNER JOIN drivers d ON da.driver_id = d.driver_id      -- Join driver
INNER JOIN buses b ON da.bus_id = b.bus_id              -- Join bus
ORDER BY da.start_time DESC;                            -- Most recent assignments first

-- -----------------------------------------------------------------------------
-- Purpose: Service-level route/trip statistics for admin analytics and reporting.
-- (No direct usage; view is available for analytics/reporting.)
CREATE OR REPLACE VIEW service_routes_overview AS
SELECT 
    s.service_id,                                    -- Service ID
    s.service_name,                                  -- Service name
    COUNT(DISTINCT r.route_id) AS total_routes,      -- Number of routes for service
    COUNT(DISTINCT t.trip_id) AS total_trips,        -- Number of trips for service
    SUM(CASE WHEN t.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_trips,   -- Scheduled trips
    SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END) AS running_trips,       -- Running trips
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_trips,   -- Completed trips
    SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_trips    -- Cancelled trips
FROM services s
LEFT JOIN routes r ON s.service_id = r.service_id    -- LEFT JOIN: include services even if they have no routes
LEFT JOIN trips t ON r.route_id = t.route_id         -- LEFT JOIN: include routes even if they have no trips
GROUP BY s.service_id, s.service_name                -- Group by service
ORDER BY s.service_name;                             -- Alphabetical by service

-- -----------------------------------------------------------------------------
-- Purpose: Daily booking statistics and revenue for admin analytics and reporting.
-- (No direct usage; view is available for analytics/reporting.)
CREATE OR REPLACE VIEW daily_booking_summary AS
SELECT 
    DATE(bk.booking_date) AS booking_date, -- Date of booking (aggregation key)
    COUNT(DISTINCT bk.booking_id) AS total_bookings, -- Total bookings per day
    COUNT(DISTINCT CASE WHEN bk.status = 'confirmed' THEN bk.booking_id END) AS confirmed_bookings, -- Confirmed bookings per day
    COUNT(DISTINCT CASE WHEN bk.status = 'cancelled' THEN bk.booking_id END) AS cancelled_bookings, -- Cancelled bookings per day
    COUNT(DISTINCT bk.user_id) AS unique_passengers, -- Unique passengers per day
    COUNT(DISTINCT bk.trip_id) AS trips_booked, -- Unique trips booked per day
    COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) AS daily_revenue -- Total revenue from paid payments per day
FROM bookings bk
LEFT JOIN payments p ON bk.booking_id = p.booking_id -- LEFT JOIN: include all bookings, even if not paid (for accurate booking stats)
GROUP BY DATE(bk.booking_date) -- Group by day
ORDER BY booking_date DESC; -- Most recent days first
