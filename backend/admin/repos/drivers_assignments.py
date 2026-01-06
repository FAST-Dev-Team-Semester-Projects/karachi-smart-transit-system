"""
Repository helpers for `drivers_assignments` table

Table schema (from database/ksts_schema.sql):
- driver_id INT NOT NULL (FK -> drivers.driver_id)
- bus_id INT NOT NULL (FK -> buses.bus_id)
- start_time DATETIME NOT NULL
- end_time DATETIME
- PRIMARY KEY (driver_id, bus_id, start_time)
"""

from typing import Optional, Dict, Any, List
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_drivers_assignments(
    mysql=None, page: int = 1, per_page: int = 50, search: Optional[str] = None
) -> Dict[str, Any]:
    """
    List driver assignments using driver_assignment_details_view.
    
    Enhanced with database view integration:
    - Uses driver_assignment_details_view (3-table JOIN pre-computed)
    - Includes driver info, bus details, license number, phone
    - Includes computed assignment_status and assignment_duration_hours
    """
    mysql = mysql or get_mysql()
    offset = max(0, (page - 1)) * per_page
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where = ""
        if search:
            where = "WHERE v.driver_name LIKE %s OR v.number_plate LIKE %s"
            like = f"%{search}%"
            params.extend([like, like])
        # Total count from view
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM driver_assignment_details_view v {where}""",
            params,
        )
        total = cursor.fetchone()[0]
        params_with_limit = params + [per_page, offset]
        # Query from driver_assignment_details_view
        query = f"""
            SELECT v.driver_id, v.driver_name, v.license_number, v.driver_phone,
                   v.bus_id, v.number_plate, v.bus_capacity,
                   v.start_time, v.end_time, v.assignment_status,
                   v.assignment_duration_hours
            FROM driver_assignment_details_view v
            {where}
            ORDER BY v.start_time DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, params_with_limit)
        rows = cursor.fetchall()
        items = [_row_to_dict(cursor, r) for r in rows]
        return {"items": items, "total": total, "page": page, "per_page": per_page}
    finally:
        if cursor:
            cursor.close()


def get_drivers_assignment_by_id(
    mysql=None, driver_id: int = None, bus_id: int = None, start_time: str = None
) -> Optional[Dict[str, Any]]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT da.driver_id, da.bus_id, da.start_time, da.end_time,
                   d.full_name as driver_name, b.number_plate
            FROM drivers_assignments da
            LEFT JOIN drivers d ON da.driver_id = d.driver_id
            LEFT JOIN buses b ON da.bus_id = b.bus_id
            WHERE da.driver_id = %s AND da.bus_id = %s AND da.start_time = %s
            """,
            (driver_id, bus_id, start_time),
        )
        row = cursor.fetchone()
        if row:
            return _row_to_dict(cursor, row)
        return None
    finally:
        if cursor:
            cursor.close()


def create_drivers_assignment(
    mysql=None, payload: Dict[str, Any] = None
) -> Dict[str, Any]:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO drivers_assignments (driver_id, bus_id, start_time, end_time)
        VALUES (%s, %s, %s, %s)
        """,
        (
            payload["driver_id"],
            payload["bus_id"],
            payload["start_time"],
            payload.get("end_time"),
        ),
    )
    conn.commit()
    cursor.close()
    return {
        "driver_id": payload["driver_id"],
        "bus_id": payload["bus_id"],
        "start_time": payload["start_time"],
    }


def update_drivers_assignment(
    mysql=None,
    driver_id: int = None,
    bus_id: int = None,
    start_time: str = None,
    payload: Dict[str, Any] = None,
) -> bool:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE drivers_assignments SET end_time=%s WHERE driver_id=%s AND bus_id=%s AND start_time=%s
        """,
        (payload.get("end_time"), driver_id, bus_id, start_time),
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    return affected > 0


def delete_drivers_assignment(
    mysql=None, driver_id: int = None, bus_id: int = None, start_time: str = None
) -> bool:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM drivers_assignments WHERE driver_id=%s AND bus_id=%s AND start_time=%s",
        (driver_id, bus_id, start_time),
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    return affected > 0
