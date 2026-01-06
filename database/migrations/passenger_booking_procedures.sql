USE ksts_db;

-- ============================================================================
-- PAYMENT PROCESSING WITH TRANSACTION ROLLBACK DEMONSTRATION
-- ============================================================================
--
-- Linking files (backend usage):
--   - backend/routes/passenger.py : Calls sp_create_passenger_booking_with_payment for booking/payment
--   - frontend (indirect): Uses backend API endpoints that trigger this procedure
--
-- This migration demonstrates:
-- 1. Credit Card Validation (Luhn Algorithm) - NO storage of full CC info
-- 2. Transaction Management (START TRANSACTION, COMMIT, ROLLBACK)
-- 3. Payment Processing with proper error handling
-- 4. Rollback demonstration when payment fails
-- ============================================================================

-- Schema extensions for payment processing

-- Check if 'transaction_reference' column exists before altering table (idempotent migration)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'ksts_db' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'transaction_reference');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE payments ADD COLUMN transaction_reference VARCHAR(100) NULL AFTER status',
    'SELECT "Column transaction_reference already exists" AS message');
PREPARE stmt FROM @sql;         -- Prepare dynamic SQL statement (needed for conditional DDL)
EXECUTE stmt;                  -- Execute the prepared statement
DEALLOCATE PREPARE stmt;       -- Free the prepared statement from memory


-- Check if 'card_last_four' column exists before altering table (idempotent migration)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'ksts_db' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'card_last_four');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE payments ADD COLUMN card_last_four CHAR(4) NULL AFTER transaction_reference',
    'SELECT "Column card_last_four already exists" AS message');
PREPARE stmt FROM @sql;         -- Prepare dynamic SQL statement (needed for conditional DDL)
EXECUTE stmt;                  -- Execute the prepared statement
DEALLOCATE PREPARE stmt;       -- Free the prepared statement from memory


DELIMITER $   -- Change statement delimiter so routines can use semicolons internally

-- ============================================================================
-- FUNCTION: fn_validate_luhn
-- Validates credit card number using Luhn algorithm (mod 10 check)
-- Returns: 1 if valid, 0 if invalid
-- ============================================================================
DROP FUNCTION IF EXISTS fn_validate_luhn $
CREATE FUNCTION fn_validate_luhn(p_card_number VARCHAR(19))
RETURNS BOOLEAN
DETERMINISTIC   -- Always returns the same result for the same input (no randomness or side effects)
BEGIN
    DECLARE v_sum INT DEFAULT 0;
    DECLARE v_digit INT;
    DECLARE v_length INT;
    DECLARE v_position INT;
    DECLARE v_is_even BOOLEAN;

    SET p_card_number = REPLACE(p_card_number, ' ', '');
    SET v_length = LENGTH(p_card_number);

    IF v_length < 13 OR v_length > 19 THEN
        RETURN FALSE;
    END IF;

    SET v_position = v_length;  -- Start from rightmost digit (check digit is units place)
    SET v_is_even = FALSE;      -- First digit from right is odd-positioned (1st, 3rd, 5th...)

    WHILE v_position > 0 DO
        SET v_digit = CAST(SUBSTRING(p_card_number, v_position, 1) AS UNSIGNED);

        IF v_is_even THEN
            SET v_digit = v_digit * 2;        -- Double even-positioned digits (2nd, 4th, 6th from right)
            IF v_digit > 9 THEN
                SET v_digit = v_digit - 9;    -- Digital root: 10→1, 12→3, 14→5, 16→7, 18→9
            END IF;
        END IF;
        -- Odd-positioned digits unchanged per Luhn specification

        SET v_sum = v_sum + v_digit;
        SET v_is_even = NOT v_is_even;  -- Toggle between even/odd position checking
        SET v_position = v_position - 1;
    END WHILE;

    RETURN (v_sum % 10 = 0);  -- Valid if sum ≡ 0 (mod 10)
END $

-- ============================================================================
-- FUNCTION: fn_haversine_km
-- Calculate distance between two GPS coordinates in kilometers
-- ============================================================================
DROP FUNCTION IF EXISTS fn_haversine_km $
CREATE FUNCTION fn_haversine_km(
    p_lat1 DECIMAL(10,7),
    p_lon1 DECIMAL(10,7),
    p_lat2 DECIMAL(10,7),
    p_lon2 DECIMAL(10,7)
)
RETURNS DECIMAL(10,4)
DETERMINISTIC   -- Always returns the same result for the same input (no randomness or side effects)
BEGIN
    DECLARE v_radius DOUBLE DEFAULT 6371;
    DECLARE v_dlat DOUBLE;
    DECLARE v_dlon DOUBLE;
    DECLARE v_a DOUBLE;
    DECLARE v_c DOUBLE;

    SET v_dlat = RADIANS(p_lat2 - p_lat1);  -- ?lat in radians
    SET v_dlon = RADIANS(p_lon2 - p_lon1);  -- ?lon in radians
    SET v_a = SIN(v_dlat / 2) * SIN(v_dlat / 2) +           -- Haversine 'a' = sin�(?lat/2)
              COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2)) * -- cos(lat1) � cos(lat2)
              SIN(v_dlon / 2) * SIN(v_dlon / 2);            -- sin�(?lon/2)
    SET v_c = 2 * ATAN2(SQRT(v_a), SQRT(1 - v_a));         -- Angular distance 'c' = 2 � atan2(va, v(1-a))

    RETURN v_radius * v_c;  -- Distance = 6371km � angular separation in radians
END $

-- ============================================================================
-- FUNCTION: fn_calculate_fare_amount
-- Calculate fare based on service type and distance
-- ============================================================================
DROP FUNCTION IF EXISTS fn_calculate_fare_amount $
CREATE FUNCTION fn_calculate_fare_amount(
    p_service_id INT,
    p_distance_km DECIMAL(10,4)
)
RETURNS INT
DETERMINISTIC   -- Always returns the same result for the same input (no randomness or side effects)
BEGIN
    DECLARE v_amount INT;

    IF p_service_id <= 6 THEN          -- BRT Services (1-6): Distance-based progressive pricing
        IF p_distance_km <= 2 THEN SET v_amount = 15;      -- Short BRT trips (0-2km)
        ELSEIF p_distance_km <= 4 THEN SET v_amount = 20;  -- Medium BRT trips (2-4km)
        ELSEIF p_distance_km <= 6 THEN SET v_amount = 25;  -- Longer BRT trips (4-6km)
        ELSEIF p_distance_km <= 8 THEN SET v_amount = 30;  -- Extended BRT trips (6-8km)
        ELSEIF p_distance_km <= 10 THEN SET v_amount = 35; -- Long BRT trips (8-10km)
        ELSEIF p_distance_km <= 12 THEN SET v_amount = 40; -- Very long BRT trips (10-12km)
        ELSEIF p_distance_km <= 14 THEN SET v_amount = 45; -- Extended long BRT trips (12-14km)
        ELSEIF p_distance_km <= 16 THEN SET v_amount = 50; -- Maximum standard BRT (14-16km)
        ELSE SET v_amount = 55;        -- Ultra-long distance BRT fares (16km+)
        END IF;
    ELSE                               -- Red / EV / Pink services (IDs 7+): simplified flat-rate pricing (fewer bands)
        IF p_distance_km <= 15 THEN 
            SET v_amount = 80;        -- Flat fare for trips up to and including 15 km
        ELSE 
            SET v_amount = 120;       -- Long-distance flat fare for trips over 15 km
        END IF;
        END IF;
    END IF;

    RETURN v_amount;
END $

-- ============================================================================
-- STORED PROCEDURE: sp_create_passenger_booking_with_payment
-- Complete booking flow with credit card validation and payment processing
-- 
-- DEMONSTRATES:
-- - Transaction Management (START TRANSACTION, COMMIT, ROLLBACK)
-- - Credit Card Validation (Luhn algorithm)
-- - Conditional Logic (IF/ELSE statements)
-- - Loops (WHILE loop for counting stops)
-- - Error Handling (SIGNAL for custom errors)
-- - Row Locking (FOR UPDATE to prevent race conditions)
-- 
-- ROLLBACK SCENARIOS:
-- 1. Invalid credit card number (fails Luhn check)
-- 2. CVV = '000' (simulates payment gateway decline)
-- 3. Trip not available
-- 4. No seats available
-- 5. Invalid stops
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_create_passenger_booking_with_payment $
CREATE PROCEDURE sp_create_passenger_booking_with_payment(
    IN p_user_id INT,
    IN p_trip_id INT,
    IN p_origin_stop_id INT,
    IN p_destination_stop_id INT,
    IN p_card_number VARCHAR(19),
    IN p_cvv VARCHAR(4),
    IN p_cardholder_name VARCHAR(100)
)
BEGIN
    DECLARE v_route_id INT;
    DECLARE v_trip_status ENUM('scheduled','running','completed','cancelled');
    DECLARE v_trip_direction ENUM('forward','backward');
    DECLARE v_bus_capacity INT;
    DECLARE v_service_id INT;
    DECLARE v_origin_order INT;
    DECLARE v_destination_order INT;
    DECLARE v_origin_lat DECIMAL(10,7);
    DECLARE v_origin_lon DECIMAL(10,7);
    DECLARE v_destination_lat DECIMAL(10,7);
    DECLARE v_destination_lon DECIMAL(10,7);
    DECLARE v_detected_direction ENUM('forward','backward');
    DECLARE v_distance_km DECIMAL(10,4);
    DECLARE v_fare_amount INT;
    DECLARE v_booking_id INT;
    DECLARE v_payment_id INT;
    DECLARE v_confirmed_count INT DEFAULT 0;
    DECLARE v_loop_cursor INT;
    DECLARE v_stops_between INT DEFAULT 0;
    DECLARE v_card_valid BOOLEAN;
    DECLARE v_card_last_four CHAR(4);

    -- Error handler: rollback on any exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;   -- Roll back transaction if any SQL error occurs
        RESIGNAL;   -- Propagate the error up to the caller
    END;

    -- ========================================================================
    -- START TRANSACTION - All operations are atomic
    -- ========================================================================
    START TRANSACTION;

    -- ========================================================================
    -- STEP 1: VALIDATE CREDIT CARD (Luhn Algorithm)
    -- We NEVER store the full card number - only last 4 digits for reference
    -- ========================================================================
    SET v_card_valid = fn_validate_luhn(p_card_number);
    
    IF NOT v_card_valid THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid credit card number (failed Luhn check)';  -- Custom error signal (user-defined error)
    END IF;
    
    -- Extract last 4 digits for payment record (PCI compliance)
    SET v_card_last_four = RIGHT(REPLACE(p_card_number, ' ', ''), 4);

    -- ========================================================================
    -- STEP 2: VALIDATE TRIP AND GET DETAILS (with row locking)
    -- ========================================================================
    SELECT t.route_id, t.status, t.direction, b.capacity
    INTO v_route_id, v_trip_status, v_trip_direction, v_bus_capacity
    FROM trips t
    JOIN buses b ON t.bus_id = b.bus_id
    WHERE t.trip_id = p_trip_id
    FOR UPDATE;  -- Acquire exclusive row lock (prevents concurrent changes to this trip/bus during validation)

    IF v_route_id IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trip not found';  -- Custom error signal
    END IF;

    IF v_trip_status NOT IN ('scheduled','running') THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trip is not open for booking';  -- Custom error signal
    END IF;

    -- ========================================================================
    -- STEP 3: VALIDATE STOPS AND GET COORDINATES
    -- ========================================================================
    SELECT r.service_id,           -- Get service type for fare calculation
           rs_origin.stop_order,     -- Origin stop sequence number (1, 2, 3...)
           s_origin.latitude,        -- GPS coordinates for distance calculation
           s_origin.longitude,
           rs_dest.stop_order,       -- Destination stop sequence number
           s_dest.latitude,
           s_dest.longitude
    INTO v_service_id,
         v_origin_order,
         v_origin_lat,
         v_origin_lon,
         v_destination_order,
         v_destination_lat,
         v_destination_lon
    FROM routes r
    JOIN routes_stops rs_origin ON r.route_id = rs_origin.route_id 
        AND rs_origin.stop_id = p_origin_stop_id
    JOIN routes_stops rs_dest ON r.route_id = rs_dest.route_id 
        AND rs_dest.stop_id = p_destination_stop_id
    JOIN stops s_origin ON rs_origin.stop_id = s_origin.stop_id
    JOIN stops s_dest ON rs_dest.stop_id = s_dest.stop_id
    WHERE r.route_id = v_route_id
    LIMIT 1
    FOR UPDATE;  -- Lock the selected route/stop rows to prevent concurrent modifications

    IF v_origin_order IS NULL OR v_destination_order IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid stops for this route';  -- Custom error signal
    END IF;

    IF v_destination_order = v_origin_order THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Origin and destination cannot be the same';  -- Custom error signal
    END IF;

    -- ========================================================================
    -- STEP 4: VALIDATE TRIP DIRECTION
    -- ========================================================================
    IF v_destination_order > v_origin_order THEN
        SET v_detected_direction = 'forward';  -- journey follows increasing stop_order
    ELSE
        SET v_detected_direction = 'backward'; -- journey follows decreasing stop_order (return direction)
    END IF;

    IF v_trip_direction <> v_detected_direction THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Trip direction mismatch with journey';  -- Custom error signal
    END IF;

    -- ========================================================================
    -- STEP 5: CHECK SEAT AVAILABILITY (with row locking)
    -- ========================================================================
    SELECT COUNT(*) INTO v_confirmed_count
    FROM bookings
    WHERE trip_id = p_trip_id AND status = 'confirmed'
    FOR UPDATE;  -- Lock booking rows for this trip to get a consistent confirmed count (prevents overbooking)

    IF v_confirmed_count >= v_bus_capacity THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No seats available';  -- Custom error signal
    END IF;

    -- ========================================================================
    -- STEP 6: COUNT STOPS BETWEEN ORIGIN AND DESTINATION (Loop demonstration)
    -- ========================================================================
    SET v_loop_cursor = LEAST(v_origin_order, v_destination_order);
    SET v_stops_between = 0;

    WHILE v_loop_cursor < GREATEST(v_origin_order, v_destination_order) DO
        SET v_loop_cursor = v_loop_cursor + 1;            -- move to next stop in sequence
        SET v_stops_between = v_stops_between + 1;        -- increment count of stops between origin and destination
    END WHILE;

    -- ========================================================================
    -- STEP 7: CALCULATE FARE
    -- ========================================================================
    SET v_distance_km = fn_haversine_km(
        v_origin_lat, v_origin_lon,
        v_destination_lat, v_destination_lon
    );

    SET v_fare_amount = fn_calculate_fare_amount(v_service_id, v_distance_km);

    -- ========================================================================
    -- STEP 8: CREATE BOOKING RECORD
    -- Assign the next available seat number (confirmed_count + 1) and create booking row
    -- ========================================================================
    INSERT INTO bookings (
        user_id, trip_id, seat_number,
        origin_stop_id, destination_stop_id, status
    )
    VALUES (
        p_user_id, p_trip_id, v_confirmed_count + 1,
        p_origin_stop_id, p_destination_stop_id, 'confirmed'
    );

    SET v_booking_id = LAST_INSERT_ID();  -- Get the auto-incremented booking_id from the last insert

    -- ========================================================================
    -- STEP 9: PROCESS PAYMENT
    -- Call external payment gateway in production; here we simulate gateway behavior.
    -- ========================================================================
    
    -- Simulate payment gateway validation (demo): CVV = '000' simulates a declined transaction
    IF p_cvv = '000' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Payment declined by gateway (CVV rejected)';  -- Custom error signal
    END IF;
    
    -- Payment approved - persist payment metadata. Only store PCI-safe details (transaction reference, last 4 digits)
    INSERT INTO payments (
        booking_id, amount, method, status,
        transaction_reference, card_last_four
    )
    VALUES (
        v_booking_id, v_fare_amount, 'online', 'paid',
        CONCAT('TXN-', UNIX_TIMESTAMP(), '-', v_booking_id),
        v_card_last_four
    );
    
    SET v_payment_id = LAST_INSERT_ID();  -- Get the auto-incremented payment_id from the last insert

    -- ========================================================================
    -- STEP 10: COMMIT TRANSACTION
    -- All validations passed - make changes permanent
    -- ========================================================================
    COMMIT;

    -- ========================================================================
    -- STEP 11: RETURN BOOKING SUMMARY
    -- ========================================================================
    SELECT
        v_booking_id AS booking_id,
        v_payment_id AS payment_id,
        v_fare_amount AS fare_amount,
        v_stops_between AS stops_count,
        v_confirmed_count + 1 AS seat_number,
        v_card_last_four AS card_last_four,
        'Payment successful' AS message;
END $

-- ============================================================================
-- TRIGGER: trg_payments_after_insert
-- Automatically update booking status based on payment status
-- ============================================================================
DROP TRIGGER IF EXISTS trg_payments_after_insert $
CREATE TRIGGER trg_payments_after_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' THEN
        -- Payment succeeded: confirm the booking
        UPDATE bookings
        SET status = 'confirmed'
        WHERE booking_id = NEW.booking_id;
    ELSEIF NEW.status = 'failed' THEN
        -- Payment failed: cancel the booking
        UPDATE bookings
        SET status = 'cancelled'
        WHERE booking_id = NEW.booking_id;
    END IF;
END $

DELIMITER ;   -- Restore default statement delimiter
