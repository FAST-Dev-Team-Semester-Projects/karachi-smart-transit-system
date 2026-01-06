"""
Repository helpers for the `buses` table.

Table schema (from database/ksts_schema.sql):
- bus_id INT AUTO_INCREMENT PRIMARY KEY
- number_plate VARCHAR(50) UNIQUE NOT NULL
- capacity INT NOT NULL
"""

from typing import Optional, Dict, Any
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_buses(
    mysql=None, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Dict[str, Any]:
    mysql = mysql or get_mysql()
    offset = max(0, (page - 1)) * per_page
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        params = []
        where = ""
        if search:
            where = "WHERE number_plate LIKE %s"
            params.append(f"%{search}%")

        # Total count
        cursor.execute(f"SELECT COUNT(*) FROM buses {where}", params)
        total = cursor.fetchone()[0]

        params_with_limit = params + [per_page, offset]
        query = f"""
            SELECT bus_id, number_plate, capacity
            FROM buses
            {where}
            ORDER BY bus_id ASC
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


def get_bus_by_id(mysql=None, bus_id: int = None) -> Optional[Dict[str, Any]]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "SELECT bus_id, number_plate, capacity FROM buses WHERE bus_id = %s",
            (bus_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_bus(mysql=None, number_plate: str = "", capacity: int = 0) -> Optional[int]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO buses (number_plate, capacity) VALUES (%s, %s)",
            (number_plate, capacity),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_bus(mysql=None, bus_id: int = None, fields: Dict[str, Any] = None) -> int:
    """
    Update bus fields. Returns number of rows affected.
    """
    if not fields:
        return 0
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
        params = list(fields.values()) + [bus_id]
        cursor.execute(f"UPDATE buses SET {set_clause} WHERE bus_id = %s", params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_bus(mysql=None, bus_id: int = None) -> int:
    """
    Delete a bus by id. Returns number of rows deleted (0 if none).
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM buses WHERE bus_id = %s", (bus_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
