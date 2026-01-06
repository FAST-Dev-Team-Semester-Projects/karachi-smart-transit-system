"""
Repository helpers for `routes_stops` table

Table schema (from database/ksts_schema.sql):
- route_id INT NOT NULL (FK -> routes.route_id)
- stop_id INT NOT NULL (FK -> stops.stop_id)
- stop_order INT NOT NULL
- PRIMARY KEY (route_id, stop_id)
"""

from typing import Optional, Dict, Any, List
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_routes_stops(
    mysql=None, page: int = 1, per_page: int = 50, search: Optional[str] = None
) -> Dict[str, Any]:
    """
    List routes_stops using route_stops_detail_view.
    
    Enhanced with database view integration:
    - Uses route_stops_detail_view (4-table JOIN pre-computed)
    - Includes route_name, service_name, stop details, coordinates
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
            where = "WHERE v.route_id = %s OR v.stop_id = %s"
            params.extend([search, search])
        # Total count from view
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM route_stops_detail_view v {where}""",
            params,
        )
        total = cursor.fetchone()[0]
        params_with_limit = params + [per_page, offset]
        # Query from route_stops_detail_view
        query = f"""
            SELECT v.route_id, v.stop_id, v.stop_order, v.route_name, 
                   v.service_id, v.service_name, v.stop_name,
                   v.latitude, v.longitude, v.total_stops_on_route
            FROM route_stops_detail_view v
            {where}
            ORDER BY v.route_id, v.stop_order
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, params_with_limit)
        rows = cursor.fetchall()
        items = [_row_to_dict(cursor, r) for r in rows]
        return {"items": items, "total": total, "page": page, "per_page": per_page}
    finally:
        if cursor:
            cursor.close()


def get_routes_stop_by_id(
    mysql=None, route_id: int = None, stop_id: int = None
) -> Optional[Dict[str, Any]]:
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.route_id, r.stop_id, r.stop_order, rt.route_name, s.stop_name
            FROM routes_stops r
            LEFT JOIN routes rt ON r.route_id = rt.route_id
            LEFT JOIN stops s ON r.stop_id = s.stop_id
            WHERE r.route_id = %s AND r.stop_id = %s
            """,
            (route_id, stop_id),
        )
        row = cursor.fetchone()
        if row:
            return _row_to_dict(cursor, row)
        return None
    finally:
        if cursor:
            cursor.close()


def create_routes_stop(mysql=None, payload: Dict[str, Any] = None) -> Dict[str, int]:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO routes_stops (route_id, stop_id, stop_order)
        VALUES (%s, %s, %s)
        """,
        (payload["route_id"], payload["stop_id"], payload["stop_order"]),
    )
    conn.commit()
    cursor.close()
    return {"route_id": payload["route_id"], "stop_id": payload["stop_id"]}


def update_routes_stop(
    mysql=None,
    route_id: int = None,
    stop_id: int = None,
    payload: Dict[str, Any] = None,
) -> bool:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE routes_stops SET stop_order=%s WHERE route_id=%s AND stop_id=%s
        """,
        (payload["stop_order"], route_id, stop_id),
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    return affected > 0


def delete_routes_stop(mysql=None, route_id: int = None, stop_id: int = None) -> bool:
    mysql = mysql or get_mysql()
    conn = mysql.connection
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM routes_stops WHERE route_id=%s AND stop_id=%s", (route_id, stop_id)
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    return affected > 0
