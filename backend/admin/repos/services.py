"""
Repository helpers for the `services` table

Table schema (from database/ksts_schema.sql):
- service_id INT AUTO_INCREMENT PRIMARY KEY
- service_name VARCHAR(100) NOT NULL
"""

from typing import Optional, Dict, Any, List
from .. import get_mysql


def _row_to_dict(cursor, row) -> Dict[str, Any]:
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_services(
    mysql=None, page: int = 1, per_page: int = 50, search: Optional[str] = None
) -> Dict[str, Any]:
    """
    Return paginated list of services with total count
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
            where = "WHERE service_name LIKE %s"
            params.append(f"%{search}%")

        # Total count
        cursor.execute(f"SELECT COUNT(*) FROM services {where}", params)
        total = cursor.fetchone()[0]

        params_with_limit = params + [per_page, offset]
        query = f"""
            SELECT service_id, service_name
            FROM services
            {where}
            ORDER BY service_id ASC
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


def get_service_by_id(mysql=None, service_id: int = None) -> Optional[Dict[str, Any]]:
    """
    Return a single service dict or None if not found
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "SELECT service_id, service_name FROM services WHERE service_id = %s",
            (service_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_service(mysql=None, service_name: str = "") -> Optional[int]:
    """
    Insert a new service and return its new service_id
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO services (service_name) VALUES (%s)",
            (service_name,),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_service(mysql=None, service_id: int = None, service_name: str = "") -> int:
    """
    Update the service_name for a given service_id. Returns rows affected
    """
    if service_id is None:
        return 0
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE services SET service_name = %s WHERE service_id = %s",
            (service_name, service_id),
        )
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_service(mysql=None, service_id: int = None) -> int:
    """
    Delete a service by service_id. Returns number of rows deleted (0 if none)
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM services WHERE service_id = %s", (service_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
