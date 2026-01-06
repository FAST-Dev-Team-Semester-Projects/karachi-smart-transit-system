-- ADMIN TRIGGERS: Enforce business rules and automate data cleaning. No schema changes required.

USE ksts_db;

-- ----------------------------------------------------------------------------
-- Route Name Cleaner: Trims leading/trailing spaces from route names on insert.
DROP TRIGGER IF EXISTS tr_bi_routes_clean;

DELIMITER //
CREATE TRIGGER tr_bi_routes_clean
BEFORE INSERT ON routes
FOR EACH ROW
BEGIN
    -- TRIM() removes leading and trailing whitespace from the route name
    SET NEW.route_name = TRIM(NEW.route_name);
END;
//
DELIMITER ;

-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_bi_drivers_clean;

DELIMITER //
CREATE TRIGGER tr_bi_drivers_clean
BEFORE INSERT ON drivers
FOR EACH ROW
BEGIN
    -- Remove dashes ('-') from the phone number
    -- Then remove spaces (' ')
    -- The inner REPLACE removes dashes, the outer removes spaces
    SET NEW.phone_number = REPLACE(REPLACE(NEW.phone_number, '-', ''), ' ', '');
END;
//
DELIMITER ;

-- ----------------------------------------------------------------------------
-- There are two triggers below:
--   1. BEFORE INSERT: Prevents inserting a new assignment that overlaps with any existing assignment for the same driver.
--   2. BEFORE UPDATE: Prevents updating an existing assignment in a way that would create a conflict (overlap) with other assignments for the same driver.
-- The INSERT trigger blocks new conflicts; the UPDATE trigger blocks changes that would create conflicts.
DROP TRIGGER IF EXISTS tr_bi_drivers_assignments_conflict;
DROP TRIGGER IF EXISTS tr_bu_drivers_assignments_conflict;

DELIMITER //
CREATE TRIGGER tr_bi_drivers_assignments_conflict
BEFORE INSERT ON drivers_assignments
FOR EACH ROW
BEGIN
    -- Check if the new assignment for this driver overlaps with any existing assignment
    IF EXISTS (
        SELECT 1 FROM drivers_assignments 
        WHERE driver_id = NEW.driver_id
        AND (
            -- New assignment starts during an existing assignment
            (NEW.start_time >= start_time AND NEW.start_time < COALESCE(end_time, '9999-12-31 23:59:59'))
            OR
            -- New assignment ends during an existing assignment
            (NEW.end_time IS NOT NULL AND NEW.end_time > start_time AND NEW.end_time <= COALESCE(end_time, '9999-12-31 23:59:59'))
            OR
            -- New assignment completely encompasses an existing assignment
            (NEW.start_time <= start_time AND (NEW.end_time IS NULL OR NEW.end_time >= COALESCE(end_time, '9999-12-31 23:59:59')))
        )
    ) THEN
        -- If overlap found, block the insert and show error
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ERROR: Driver assignment conflicts with existing assignment. A driver cannot be assigned to multiple buses simultaneously.';
    END IF;
END;
//
DELIMITER ;

DELIMITER //
CREATE TRIGGER tr_bu_drivers_assignments_conflict
BEFORE UPDATE ON drivers_assignments
FOR EACH ROW
BEGIN
    -- Only check for conflicts if driver or timing changed
    IF NEW.driver_id != OLD.driver_id OR NEW.start_time != OLD.start_time OR NEW.end_time != OLD.end_time THEN
        -- Check if the updated assignment for this driver overlaps with any other assignment (excluding itself)
        IF EXISTS (
            SELECT 1 FROM drivers_assignments 
            WHERE driver_id = NEW.driver_id
            AND (bus_id != NEW.bus_id OR start_time != NEW.start_time)  -- Exclude current record
            AND (
                -- Updated assignment starts during an existing assignment
                (NEW.start_time >= start_time AND NEW.start_time < COALESCE(end_time, '9999-12-31 23:59:59'))
                OR
                -- Updated assignment ends during an existing assignment
                (NEW.end_time IS NOT NULL AND NEW.end_time > start_time AND NEW.end_time <= COALESCE(end_time, '9999-12-31 23:59:59'))
                OR
                -- Updated assignment completely encompasses an existing assignment
                (NEW.start_time <= start_time AND (NEW.end_time IS NULL OR NEW.end_time >= COALESCE(end_time, '9999-12-31 23:59:59')))
            )
        ) THEN
            -- If overlap found, block the update and show error
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ERROR: Driver assignment conflicts with existing assignment. A driver cannot be assigned to multiple buses simultaneously.';
        END IF;
    END IF;
END;
//
DELIMITER ;

-- ----------------------------------------------------------------------------
-- Core Data Protection: Prevents deletion of routes with route_id 1-26 (system records).
DROP TRIGGER IF EXISTS tr_bd_routes_protect;

DELIMITER //
CREATE TRIGGER tr_bd_routes_protect
BEFORE DELETE ON routes
FOR EACH ROW
BEGIN
    -- Block deletion if the route is a core system route (ID 1-26)
    IF OLD.route_id <= 26 THEN
        -- Show error and prevent delete
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ERROR: Cannot delete Core Routes (ID 1-26). These are protected system records.';
    END IF;
END;
//
DELIMITER ;
