/*
 * Functions for KSTS Transit System
 * Return single values
 *
 * NOTE: These functions are not used in the running system and are included
 * for demonstration purposes only. The system uses stored procedures
 * from database/procedures/ and database/migrations/ directories, along with
 * direct SQL queries for business logic implementation.
 */

USE ksts_db;

-- =============================================================================
-- Calculate fare based on stop distance: Base Rs.20 + Rs.5 per stop
-- NOTE: This function is not used in the system and is for demonstration purposes only
-- =============================================================================
DROP FUNCTION IF EXISTS calculate_fare;

DELIMITER $$

CREATE FUNCTION calculate_fare(
    p_origin_stop_id INT,
    p_destination_stop_id INT,
    p_route_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
COMMENT 'Calculate fare: Base Rs.20 + Rs.5 per stop'
BEGIN
    DECLARE v_stop_distance INT DEFAULT 0;
    DECLARE v_base_fare DECIMAL(10,2) DEFAULT 20.00;
    DECLARE v_per_stop_rate DECIMAL(10,2) DEFAULT 5.00;
    DECLARE v_total_fare DECIMAL(10,2);

    -- Calculate absolute distance between stops (stop_order difference)
    SELECT ABS(origin.stop_order - dest.stop_order)
    INTO v_stop_distance
    FROM routes_stops origin
    JOIN routes_stops dest ON origin.route_id = dest.route_id
    WHERE origin.route_id = p_route_id
      AND origin.stop_id = p_origin_stop_id
      AND dest.stop_id = p_destination_stop_id;

    SET v_total_fare = v_base_fare + (v_stop_distance * v_per_stop_rate);

    RETURN v_total_fare;
END$$

DELIMITER ;

-- =============================================================================
-- Get available seats: bus capacity - confirmed bookings
-- NOTE: This function is not used in the system and is for demonstration purposes only
-- =============================================================================
DROP FUNCTION IF EXISTS get_available_seats;

DELIMITER $$

CREATE FUNCTION get_available_seats(p_trip_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
COMMENT 'Returns available seats: capacity - confirmed bookings'
BEGIN
    DECLARE v_capacity INT DEFAULT 0;
    DECLARE v_booked_seats INT DEFAULT 0;
    DECLARE v_available INT;

    SELECT b.capacity INTO v_capacity
    FROM trips t
    JOIN buses b ON t.bus_id = b.bus_id
    WHERE t.trip_id = p_trip_id;

    SELECT COUNT(*) INTO v_booked_seats
    FROM bookings
    WHERE trip_id = p_trip_id AND status = 'confirmed';

    SET v_available = v_capacity - v_booked_seats;

    IF v_available < 0 THEN
        SET v_available = 0;
    END IF;

    RETURN v_available;
END$$

DELIMITER ;

-- =============================================================================
-- Check if trip can accept bookings: scheduled status + available seats + future departure
-- NOTE: This function is not used in the system and is for demonstration purposes only
-- =============================================================================
DROP FUNCTION IF EXISTS is_trip_bookable;

DELIMITER $$

CREATE FUNCTION is_trip_bookable(p_trip_id INT)
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'Check if trip is schedulable and has seats'
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_departure DATETIME;
    DECLARE v_available_seats INT;
    DECLARE v_is_bookable TINYINT(1) DEFAULT 0;

    SELECT status, departure_time INTO v_status, v_departure
    FROM trips
    WHERE trip_id = p_trip_id;

    SET v_available_seats = get_available_seats(p_trip_id);

    -- Business rules: scheduled + seats available + departs >5 min from now
    IF v_status = 'scheduled'
       AND v_available_seats > 0
       AND v_departure > DATE_ADD(NOW(), INTERVAL 5 MINUTE) THEN
        SET v_is_bookable = 1;
    END IF;

    RETURN v_is_bookable;
END$$

DELIMITER ;

-- =============================================================================
-- Count total stops on a route
-- NOTE: This function is not used in the system and is for demonstration purposes only
-- =============================================================================
DROP FUNCTION IF EXISTS get_route_total_stops;

DELIMITER $$

CREATE FUNCTION get_route_total_stops(p_route_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
COMMENT 'Count total stops on a route'
BEGIN
    DECLARE v_stop_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_stop_count
    FROM routes_stops
    WHERE route_id = p_route_id;

    RETURN v_stop_count;
END$$

DELIMITER ;
