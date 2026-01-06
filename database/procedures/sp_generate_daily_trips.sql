-- DAILY TRIP GENERATION PROCEDURE
-- Purpose: Generate trips for all or filtered routes, with flexible timing/filtering. Skips routes with trips today.
-- Returns: Generation stats (routes processed, trips created, summary message).
-- Used by: backend/admin/repos/trips.py (admin dashboard), frontend admin dashboard (via backend API)

USE ksts_db;
DROP PROCEDURE IF EXISTS sp_generate_daily_trips;
DELIMITER $$

CREATE PROCEDURE sp_generate_daily_trips(
    IN p_daily_start_time TIME,
    IN p_daily_end_time TIME,
    IN p_seconds_between_bus_departures INT,  -- Interval between bus departures (in seconds)
    IN p_seconds_between_each_stop INT,       -- Duration at each stop (in seconds)
    IN p_seconds_waiting_at_final_stop INT,   -- Buffer time at final stop before return trip (in seconds)
    IN p_service_id INT,      -- Optional: filter by service (NULL = all)
    IN p_route_id INT,        -- Optional: filter by route (NULL = all)
    IN p_max_routes INT       -- Optional: limit number of routes processed (NULL = no limit)
)
COMMENT 'Generate daily forward/backward trips with optional filtering for controlled trip generation'
BEGIN
    DECLARE v_routes_processed INT DEFAULT 0;
    DECLARE v_routes_skipped INT DEFAULT 0;
    DECLARE v_trips_created INT DEFAULT 0;
    DECLARE v_current_route_id INT;
    DECLARE v_current_route_name VARCHAR(100);
    DECLARE v_current_num_stops INT;
    DECLARE v_check_existing_count INT;
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_loop_time TIME;
    DECLARE v_duration_sec INT;
    DECLARE v_fwd_depart DATETIME;
    DECLARE v_fwd_arrive DATETIME;
    DECLARE v_bwd_depart DATETIME;
    DECLARE v_bwd_arrive DATETIME;
    DECLARE v_current_bus INT DEFAULT 1;
    DECLARE v_bus_seq INT DEFAULT 1;

        -- Cursor: selects all routes matching optional filters (service, route)
        DECLARE route_cursor CURSOR FOR
                SELECT 
                        r.route_id,                                 -- Unique route identifier
                        r.route_name,                               -- Human-readable route name
                        COUNT(rs.stop_id) as num_stops              -- Number of stops on this route
                FROM routes r
                INNER JOIN routes_stops rs ON r.route_id = rs.route_id  -- INNER JOIN: only include routes that have at least one stop (no orphan routes)
                WHERE (p_service_id IS NULL OR r.service_id = p_service_id)  -- Filter by service if provided
                    AND (p_route_id IS NULL OR r.route_id = p_route_id)        -- Filter by route if provided
                GROUP BY r.route_id, r.route_name               -- Group by route to count stops per route
                ORDER BY r.route_id;                            -- Process routes in ID order for predictability

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;  -- End loop when no more routes (MySQL cursor idiom)

    OPEN route_cursor;  -- Start iterating over filtered routes


    route_loop: LOOP
        FETCH route_cursor INTO v_current_route_id, v_current_route_name, v_current_num_stops;  -- Load next route's info

        IF v_done THEN
            LEAVE route_loop;  -- No more routes to process (exit main loop)
        END IF;

        -- Enforce max_routes limit if specified (for demo/testing)
        IF p_max_routes IS NOT NULL AND v_routes_processed >= p_max_routes THEN
            LEAVE route_loop;  -- Stop if reached max_routes (for demo/testing)
        END IF;

        -- Skip route if trips already exist today (idempotency)
                SET v_check_existing_count = 0;
                -- Check if any SCHEDULED or RUNNING trips already exist for this route today
                -- (completed trips should NOT block new trip generation)
                SELECT COUNT(*) INTO v_check_existing_count
                FROM trips
                WHERE route_id = v_current_route_id
                    AND DATE(departure_time) = CURDATE()
                    AND status IN ('scheduled', 'running');

        IF v_check_existing_count > 0 THEN
            SET v_routes_skipped = v_routes_skipped + 1;
            ITERATE route_loop;  -- Skip this route, move to next
        END IF;

        -- Calculate trip duration (total seconds for all stops)
        SET v_duration_sec = v_current_num_stops * p_seconds_between_each_stop;  -- Total trip time in seconds
        SET v_loop_time = p_daily_start_time;  -- Start time for first trip

        -- Generate trips for this route (loop over time slots)
        -- Use < instead of <= so the last trip STARTS at or before end time, not after
        trip_generation_loop: WHILE v_loop_time < p_daily_end_time DO  -- Loop until we reach end time

            -- Forward trip: bus starts at first stop, goes to last
            SET v_fwd_depart = CONCAT(CURDATE(), ' ', v_loop_time);  -- Departure datetime for forward trip
            SET v_fwd_arrive = DATE_ADD(v_fwd_depart, INTERVAL v_duration_sec SECOND);  -- Arrival time after all stops

            INSERT INTO trips (bus_id, route_id, direction, departure_time, arrival_time, status)
            VALUES (v_current_bus, v_current_route_id, 'forward', v_fwd_depart, v_fwd_arrive, 'scheduled');  -- Create forward trip

            SET v_trips_created = v_trips_created + 1;  -- Increment trip count

            -- Backward trip: bus returns from last stop to first
            SET v_bwd_depart = DATE_ADD(v_fwd_arrive, INTERVAL p_seconds_waiting_at_final_stop SECOND);  -- Wait at final stop
            SET v_bwd_arrive = DATE_ADD(v_bwd_depart, INTERVAL v_duration_sec SECOND);  -- Arrival time for backward trip

            INSERT INTO trips (bus_id, route_id, direction, departure_time, arrival_time, status)
            VALUES (v_current_bus, v_current_route_id, 'backward', v_bwd_depart, v_bwd_arrive, 'scheduled');  -- Create backward trip

            SET v_trips_created = v_trips_created + 1;  -- Increment trip count

            -- Next time slot: add interval between bus departures
            SET v_loop_time = ADDTIME(v_loop_time, SEC_TO_TIME(p_seconds_between_bus_departures));  -- Advance to next departure slot

            -- Cycle buses 1-50 (simulate bus fleet)
            SET v_bus_seq = v_bus_seq + 1;  -- Move to next bus in fleet
            IF v_bus_seq > 50 THEN
                SET v_bus_seq = 1;  -- Wrap around to bus 1 after 50
            END IF;
            SET v_current_bus = v_bus_seq;  -- Assign bus for next trip

        END WHILE trip_generation_loop;  -- All time slots for this route done

        SET v_routes_processed = v_routes_processed + 1;  -- One more route processed

    END LOOP route_loop;  -- All routes done

    CLOSE route_cursor;  -- Done with all routes

    -- Set session variables for reporting (can be read by client)
    SET @v_routes_processed = v_routes_processed;
    SET @v_routes_skipped = v_routes_skipped;
    SET @v_trips_created = v_trips_created;

    -- Return summary result set for API/frontend
    SELECT 
        v_routes_processed AS routes_processed,      -- How many routes processed
        v_routes_skipped AS routes_skipped,          -- How many routes skipped (already had trips)
        v_trips_created AS trips_created,            -- Total trips created
        CONCAT('Generated ', v_trips_created, ' trips for ', v_routes_processed, 
               ' routes. Skipped ', v_routes_skipped, ' routes with existing trips.') AS summary;  -- Human-readable summary

END$$

DELIMITER ;
