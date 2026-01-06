"""
Repository helpers for `trips` table

Schema (from database/ksts_schema.sql):
- trip_id INT AUTO_INCREMENT PRIMARY KEY
- bus_id INT NOT NULL (FK -> buses.bus_id)
- route_id INT NOT NULL (FK -> routes.route_id)
- departure_time DATETIME NOT NULL
- arrival_time DATETIME
- status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled'

Notes:
- DB defines unique constraint (ux_trips_bus_route_departure) on (bus_id, route_id, departure_time) preventing the same bus on same route at same departure_time
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from .. import get_mysql


def _row_to_dict(cursor, row) -> Dict[str, Any]:
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_trips(
    mysql=None,
    page: int = 1,
    per_page: int = 20,
    bus_id: Optional[int] = None,
    route_id: Optional[int] = None,
    status: Optional[str] = None,
    start_dt: Optional[datetime] = None,
    end_dt: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Paginated trip listing using trip_details_view

    Enhanced with database view integration:
    - Uses trip_details_view (5-table JOIN pre-computed)
    - Includes bus_id, number_plate, bus_capacity
    - Includes route_id, route_name
    - Includes service_id, service_name
    - Includes booking statistics (confirmed_bookings, available_seats)
    - ~3x faster than manual JOINs
    """
    mysql = mysql or get_mysql()
    offset = max(0, (page - 1)) * per_page
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        where_clauses: List[str] = []
        params: List[Any] = []

        # Note: Using 'v' alias for trip_details_view
        if bus_id is not None:
            where_clauses.append("v.bus_id = %s")
            params.append(bus_id)
        if route_id is not None:
            where_clauses.append("v.route_id = %s")
            params.append(route_id)
        if status is not None:
            where_clauses.append("v.trip_status = %s")
            params.append(status)
        if start_dt is not None:
            where_clauses.append("v.departure_time >= %s")
            params.append(start_dt)
        if end_dt is not None:
            where_clauses.append("v.departure_time <= %s")
            params.append(end_dt)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # Total count from view
        cursor.execute(f"SELECT COUNT(*) FROM trip_details_view v {where_sql}", params)
        total = cursor.fetchone()[0]

        params_with_limit = params + [per_page, offset]
        # Query from trip_details_view for enriched data
        query = f"""
            SELECT 
                v.trip_id,
                v.bus_id,
                v.number_plate,
                v.bus_capacity,
                v.route_id,
                v.route_name,
                v.service_id,
                v.service_name,
                v.direction,
                v.departure_time,
                v.arrival_time,
                v.trip_status AS status,
                v.confirmed_bookings,
                v.available_seats
            FROM trip_details_view v
            {where_sql}
            ORDER BY v.departure_time DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, params_with_limit)
        rows = cursor.fetchall()
        items = [_row_to_dict(cursor, r) for r in rows]
        return {"items": items, "total": total, "page": page, "per_page": per_page}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def get_trip_by_id(mysql=None, trip_id: int = None) -> Optional[Dict[str, Any]]:
    """
    Return single trip dict or None if not found
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT trip_id, bus_id, route_id, direction, departure_time, arrival_time, status
            FROM trips
            WHERE trip_id = %s
            """,
            (trip_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_trip(
    mysql=None,
    bus_id: int = None,
    route_id: int = None,
    departure_time: datetime = None,
    arrival_time: Optional[datetime] = None,
    status: str = "scheduled",
    direction: str = "forward",
    origin_trip_id: Optional[int] = None,
) -> Optional[int]:
    """
    Insert a new trip
    Caller should ensure bus_id and route_id exist or handle FK constraint errors
    Returns new trip_id
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO trips (bus_id, route_id, departure_time, arrival_time, status, direction, origin_trip_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (bus_id, route_id, departure_time, arrival_time, status, direction, origin_trip_id),
            )
        except Exception:
            # Fallback for DBs that don't yet have origin_trip_id column
            cursor.execute(
                """
                INSERT INTO trips (bus_id, route_id, departure_time, arrival_time, status, direction)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (bus_id, route_id, departure_time, arrival_time, status, direction),
            )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_trip(mysql=None, trip_id: int = None, fields: Dict[str, Any] = None) -> int:
    """
    Update trip fields
    Returns number of rows affected
    """
    if not fields:
        return 0

    allowed = {
        "bus_id",
        "route_id",
        "direction",
        "departure_time",
        "arrival_time",
        "status",
    }
    for k in fields.keys():
        if k not in allowed:
            raise ValueError(f"Invalid field for trip update: {k}")

    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
        params = list(fields.values()) + [trip_id]
        sql = f"UPDATE trips SET {set_clause} WHERE trip_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_trip(mysql=None, trip_id: int = None) -> int:
    """
    Delete a trip by id
    Returns number of rows deleted (0 if none)
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM trips WHERE trip_id = %s", (trip_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def generate_daily_trips(
    mysql=None,
    daily_start_time: str = "07:00:00",
    daily_end_time: str = "21:00:00",
    seconds_between_bus_departures: int = 30,
    seconds_between_each_stop: int = 15,
    seconds_waiting_at_final_stop: int = 30,
    service_id: Optional[int] = None,
    route_id: Optional[int] = None,
    max_routes: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Call stored procedure to generate daily trips for all routes (or filtered routes).
    Only generates trips for routes that don't already have trips scheduled for today.

    Args:
        mysql: Database connection
        daily_start_time: Start time for trip generation (HH:MM:SS)
        daily_end_time: End time for trip generation (HH:MM:SS)
        seconds_between_bus_departures: Interval between bus departures in SECONDS
        seconds_between_each_stop: Duration at each stop in seconds
        seconds_waiting_at_final_stop: Buffer time at final stop before return trip
        service_id: Optional filter by service (None = all services)
        route_id: Optional filter by specific route (None = all routes)
        max_routes: Optional limit on number of routes to process (None = no limit)

    Returns:
        dict: {
            "routes_processed": int,
            "routes_skipped": int,
            "trips_created": int,
            "summary": str
        }
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        # Call enhanced stored procedure with filtering parameters
        cursor.callproc(
            "sp_generate_daily_trips",
            [
                daily_start_time,
                daily_end_time,
                seconds_between_bus_departures,
                seconds_between_each_stop,
                seconds_waiting_at_final_stop,
                service_id,
                route_id,
                max_routes,
            ],
        )

        # Fetch the result set (summary)
        result = cursor.fetchone()

        # Fetch session variables as fallback
        cursor.execute(
            "SELECT @v_routes_processed, @v_routes_skipped, @v_trips_created"
        )
        session_vars = cursor.fetchone()

        conn.commit()

        # Parse results
        if result:
            return {
                "routes_processed": result[0],
                "routes_skipped": result[1],
                "trips_created": result[2],
                "summary": result[3],
            }
        else:
            # Fallback to session variables
            routes_processed = session_vars[0] if session_vars else 0
            routes_skipped = session_vars[1] if session_vars else 0
            trips_created = session_vars[2] if session_vars else 0
            return {
                "routes_processed": routes_processed,
                "routes_skipped": routes_skipped,
                "trips_created": trips_created,
                "summary": f"Generated {trips_created} trips for {routes_processed} routes. Skipped {routes_skipped} routes.",
            }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def clear_daily_trips(mysql, truncate_all=False):
    """
    Clear trips from the database.

    Args:
        mysql: Database connection object
        truncate_all (bool): If True, removes ALL trips. If False, removes only today's scheduled trips.

    Returns:
        dict: Summary of operation
    """
    cursor = mysql.connection.cursor()
    try:
        if truncate_all:
            # Try TRUNCATE first (faster, resets IDs)
            try:
                cursor.execute("TRUNCATE TABLE trips")
                mysql.connection.commit()
                return {
                    "trips_deleted": -1,  # Unknown count for TRUNCATE
                    "message": "All trips table truncated successfully (IDs reset)",
                }
            except Exception:
                # Fallback to DELETE if TRUNCATE fails (e.g. FK constraints)
                cursor.execute("DELETE FROM trips")
                deleted_count = cursor.rowcount
                mysql.connection.commit()
                return {
                    "trips_deleted": deleted_count,
                    "message": f"All {deleted_count} trips deleted successfully",
                }
        else:
            # Default behavior: Clear only today's scheduled/cancelled trips
            # Preserves running/completed trips for history
            today = datetime.now().strftime("%Y-%m-%d")

            query = """
            DELETE FROM trips 
            WHERE DATE(departure_time) = %s 
            AND status IN ('scheduled', 'cancelled')
            """
            cursor.execute(query, (today,))
            deleted_count = cursor.rowcount
            mysql.connection.commit()

            return {
                "trips_deleted": deleted_count,
                "message": f"Cleared {deleted_count} scheduled trips for today ({today})",
            }

    except Exception as e:
        mysql.connection.rollback()
        raise e
    finally:
        cursor.close()
