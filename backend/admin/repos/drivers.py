"""
Repostitory helpers for `drivers` table

Table schema (from database/ksts_schema.sql):
- driver_id INT AUTO_INCREMENT PRIMARY KEY
- full_name VARCHAR(100) NOT NULL
- license_number VARCHAR(20) UNIQUE NOT NULL
- phone_number VARCHAR(20)
"""

from typing import Optional, Dict, Any
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_drivers(
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
            where = "WHERE full_name LIKE %s OR license_number LIKE %s"
            like = f"%{search}%"
            params.extend([like, like])

        # Total count
        cursor.execute(f"SELECT COUNT(*) FROM drivers {where}", params)
        total = cursor.fetchone()[0]

        params_with_limit = params + [per_page, offset]
        query = f"""
            SELECT driver_id, full_name, license_number, phone_number
            FROM drivers
            {where}
            ORDER BY driver_id ASC
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


def get_driver_by_id(mysql=None, driver_id: int = None) -> Optional[Dict[str, Any]]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "SELECT driver_id, full_name, license_number, phone_number "
            "FROM drivers "
            "WHERE driver_id = %s",
            (driver_id,),
        )
        row = cursor.fetchone()
        if row:
            return _row_to_dict(cursor, row)
        return None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_driver(
    mysql=None,
    full_name: str = "",
    license_number: str = "",
    phone_number: Optional[str] = None,
) -> Optional[int]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO drivers (full_name, license_number, phone_number) "
            "VALUES (%s, %s, %s)",
            (full_name, license_number, phone_number),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_driver(
    mysql=None, driver_id: int = None, fields: Dict[str, Any] = None
) -> int:
    """
    Returns number of rows affected.
    """
    if not fields:
        return 0
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
        params = list(fields.values()) + [driver_id]
        # Build a single SQL string to avoid multiline quoting issues
        sql = f"UPDATE drivers SET {set_clause} WHERE driver_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_driver(mysql=None, driver_id: int = None) -> int:
    """
    Returns number of rows affected.
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM drivers WHERE driver_id = %s", (driver_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
