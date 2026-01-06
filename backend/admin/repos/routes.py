"""
Repository helpers for `routes` table

Table schema (from database/ksts_schema.sql):
- route_id INT AUTO_INCREMENT PRIMARY KEY
- service_id INT NOT NULL (FK -> services.service_id)
- route_name VARCHAR(100) NOT NULL
"""

from typing import Optional, Dict, Any, List
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_routes(
    mysql=None, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Dict[str, Any]:
    mysql = mysql or get_mysql()
    offset = max(0, (page - 1)) * per_page
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        params: List[Any] = []
        where = ""
        if search:
            where = "WHERE r.route_name LIKE %s OR s.service_name LIKE %s"
            like = f"%{search}%"
            params.extend([like, like])

        # Total count
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM routes r
            LEFT JOIN services s ON r.service_id = s.service_id {where}""",
            params,
        )
        total = cursor.fetchone()[0]

        # Paginated list of routes with service info
        cursor.execute(
            f"""
            SELECT r.route_id, r.service_id, r.route_name, s.service_name
            FROM routes r
            LEFT JOIN services s ON r.service_id = s.service_id
            {where}
            ORDER BY r.route_id ASC
            LIMIT %s OFFSET %s
            """,
            params + [per_page, offset],
        )
        rows = cursor.fetchall()
        items = [_row_to_dict(cursor, row) for row in rows]

        return {"items": items, "total": total, "page": page, "per_page": per_page}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def get_route_by_id(mysql=None, route_id: int = None) -> Optional[Dict[str, Any]]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.route_id, r.service_id, r.route_name, s.service_name
            FROM routes r
            LEFT JOIN services s ON r.service_id = s.service_id
            WHERE r.route_id = %s
            """,
            (route_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_route(
    mysql=None, service_id: int = 0, route_name: str = ""
) -> Optional[int]:
    """
    Create a new route. Caller should ensure service_id exists (or handle FK error)
    Returns new route_id
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO routes (service_id, route_name) VALUES (%s, %s)",
            (service_id, route_name),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_route(
    mysql=None, route_id: int = None, fields: Dict[str, Any] = None
) -> int:
    """
    Update route fields
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
        params = list(fields.values()) + [route_id]
        sql = f"UPDATE routes SET {set_clause} WHERE route_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_route(mysql=None, route_id: int = None) -> int:
    """
    Delete a route by id
    Returns number of rows deleted (0 if none)
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM routes WHERE route_id = %s", (route_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
