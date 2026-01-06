"""
Repository helpers for `stops` table

Table schema (from database/ksts_schema.sql):
- stop_id INT AUTO_INCREMENT PRIMARY KEY
- stop_name VARCHAR(100) NOT NULL
- latitude DECIMAL(10,7) NOT NULL
- longitude DECIMAL(10,7) NOT NULL
"""

from typing import Optional, Dict, Any, List
from .. import get_mysql


def _row_to_dict(cursor, row) -> Dict[str, Any]:
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_stops(
    mysql=None, page: int = 1, per_page: int = 50, search: Optional[str] = None
) -> Dict[str, Any]:
    """
    Return paginated list of stops with total count
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
            where = "WHERE stop_name LIKE %s"
            params.append(f"%{search}%")

        cursor.execute(f"SELECT COUNT(*) FROM stops {where}", params)
        total = cursor.fetchone()[0]

        params_with_limit = params + [per_page, offset]
        query = f"""
            SELECT stop_id, stop_name, latitude, longitude
            FROM stops
            {where}
            ORDER BY stop_id ASC
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


def get_stop_by_id(mysql=None, stop_id: int = None) -> Optional[Dict[str, Any]]:
    """
    Return a single stop dict or None if not found
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "SELECT stop_id, stop_name, latitude, longitude FROM stops WHERE stop_id = %s",
            (stop_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_stop(
    mysql=None, stop_name: str = "", latitude: float = 0.0, longitude: float = 0.0
) -> Optional[int]:
    """
    Insert a new stop. Returns new stop_id
    Schema enforces unique (latitude, longitude) via constraint
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO stops (stop_name, latitude, longitude)
            VALUES (%s, %s, %s)
            """,
            (stop_name, latitude, longitude),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_stop(mysql=None, stop_id: int = None, fields: Dict[str, Any] = None) -> int:
    """
    Update stop fields (stop_name, latitude, longitude)
    Returns number of rows affected.
    """
    if not fields:
        return 0
    # Validate allowed columns to avoid accidental/untrudted keys
    allowed = {"stop_name", "latitude", "longitude"}
    for k in fields.keys():
        if k not in allowed:
            raise ValueError(f"Invalid field for update: {k}")

    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
        params = list(fields.values()) + [stop_id]
        query = f"UPDATE stops SET {set_clause} WHERE stop_id = %s"
        cursor.execute(query, params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_stop(mysql=None, stop_id: int = None) -> int:
    """
    Delete a stop by stop_id
    Returns number of rows deleted (0 if none)
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM stops WHERE stop_id = %s", (stop_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
