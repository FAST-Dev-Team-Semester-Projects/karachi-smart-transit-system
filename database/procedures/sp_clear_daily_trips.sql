
-- ============================================================================
-- DAILY TRIP CLEANUP PROCEDURE
-- ============================================================================
-- Purpose: Remove all trips scheduled for today (CURDATE()) to allow re-generation or cleanup during testing/development.
-- Safety: Only deletes trips with status 'scheduled' or 'cancelled'.
--         Preserves 'running' and 'completed' trips for historical tracking.
-- Returns: Result set with deletion summary (trips deleted, date cleared).
-- Used by: Admin dashboard trip management, testing/cleanup workflows.
-- Linking note: The admin dashboard's trip-clear action uses backend Python code (see backend/admin/repos/trips.py), which re-implements this logic in SQL, but does NOT call this stored procedure directly.
-- This procedure is available for manual use or future integration, but is not currently invoked by backend code.
-- ============================================================================


USE ksts_db;

DROP PROCEDURE IF EXISTS sp_clear_daily_trips;

DELIMITER $$

CREATE PROCEDURE sp_clear_daily_trips()
COMMENT 'Clear scheduled/cancelled trips for today while preserving active/completed trips'
BEGIN
    DECLARE v_deleted_count INT DEFAULT 0;

    -- Delete only scheduled/cancelled trips for today (safe for repeated use)
    DELETE FROM trips
    WHERE DATE(departure_time) = CURDATE()
      AND status IN ('scheduled', 'cancelled');

    -- Get count of deleted rows (ROW_COUNT returns affected rows from last statement)
    SET v_deleted_count = ROW_COUNT();

    -- Set session variable for reporting in client code
    SET @v_trips_deleted = v_deleted_count;

    -- Return summary result set for admin/reporting
    SELECT 
        v_deleted_count AS trips_deleted,
        CURDATE() AS date_cleared,
        CONCAT('Deleted ', v_deleted_count, ' scheduled/cancelled trips for ', CURDATE()) AS summary;

END$$

DELIMITER ;


-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test clearing today's trips
-- CALL sp_clear_daily_trips();
-- SELECT @v_trips_deleted;

-- Verify deletion
-- SELECT COUNT(*) as remaining_trips
-- FROM trips
-- WHERE DATE(departure_time) = CURDATE()
--   AND status IN ('scheduled', 'cancelled');

-- Verify running/completed trips are preserved
-- SELECT COUNT(*) as preserved_trips
-- FROM trips
-- WHERE DATE(departure_time) = CURDATE()
--   AND status IN ('running', 'completed');
