"""
Provides small, focused report queries using the existing schema:
- bookings
- payments
- trips
- routes (for route names)

All SQL is parameterised. Functions return plain dict/list structures that the route layer can return as JSON responses
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from .. import get_mysql


def _row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


# ------------------ Bookings Reports ------------------


def bookings_count_by_day(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    DEPRECATED: Use get_daily_booking_analytics() stored procedure instead.
    
    This function only returns basic booking counts (day, bookings).
    The stored procedure provides 10+ comprehensive metrics:
    - total_bookings, confirmed_bookings, cancelled_bookings
    - unique_passengers, trips_booked
    - daily_revenue, avg_booking_value
    - most_popular_route, most_popular_service
    
    For single-day analytics, use: GET /admin/reports/daily-analytics?date=YYYY-MM-DD
    
    This function kept only for backward compatibility with multi-day range queries.
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = []
        if start_date is not None:
            where_clauses.append("booking_date >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("booking_date <= %s")
            params.append(end_date)
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        sql = f"""
            SELECT DATE(booking_date) AS day, COUNT(*) AS bookings
            FROM bookings
            {where_sql}
            GROUP BY DATE(booking_date)
            ORDER BY day ASC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [_row_to_dict(cursor, r) for r in rows]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def bookings_count_by_status(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns list of {status: 'confirmed'|'cancelled', count: int} filtered by date range
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = []
        if start_date is not None:
            where_clauses.append("booking_date >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("booking_date <= %s")
            params.append(end_date)
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        sql = f"""
            SELECT status, COUNT(*) AS count
            FROM bookings
            {where_sql}
            GROUP BY status
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [_row_to_dict(cursor, r) for r in rows]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


# ------------------ Revenue / Payments Reports ------------------


def revenue_by_day(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns list of {day: 'YYYY-MM-DD', revenue: int} for payments with status='paid'
    
    NOTE: For single-day revenue with additional metrics (bookings, passengers, routes),
    use get_daily_booking_analytics() stored procedure instead:
    GET /admin/reports/daily-analytics?date=YYYY-MM-DD
    
    This function is best for:
    - Multi-day date range queries (trends over time)
    - Simple revenue-only reporting
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = ["status = 'paid'"]
        if start_date is not None:
            where_clauses.append("payment_date >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("payment_date <= %s")
            params.append(end_date)
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        sql = f"""
            SELECT DATE(payment_date) AS day, SUM(amount) AS revenue
            FROM payments
            {where_sql}
            GROUP BY DATE(payment_date)
            ORDER BY day ASC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [_row_to_dict(cursor, r) for r in rows]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def total_revenue(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns total revenue (sum of paid payments) in the given date range
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = ["status = 'paid'"]
        if start_date is not None:
            where_clauses.append("payment_date >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("payment_date <= %s")
            params.append(end_date)
        where_sql = "WHERE " + " AND ".join(where_clauses)
        sql = f"""
            SELECT COALESCE(SUM(amount), 0) AS total_revenue
            FROM payments
            {where_sql}
        """
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return {"total_revenue": row[0] if row else 0}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


# ------------------ Trips / Route Reports ------------------


def trips_summary_by_route(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns summary per route: {route_id, route_name (if available), trips, completes, cancelled}
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = []
        if start_date is not None:
            where_clauses.append("departure_time >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("departure_time <= %s")
            params.append(end_date)
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # Use LEFT JOIN to get route_name if routes table exists
        sql = f"""
            SELECT t.route_id,
                   r.route_name,
                    COUNT(*) AS trips,
                    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM trips t
            LEFT JOIN routes r ON t.route_id = r.route_id
            {where_sql}
            GROUP BY t.route_id, r.route_name
            ORDER BY trips DESC, r.route_name ASC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [_row_to_dict(cursor, r) for r in rows]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def top_routes_by_bookings(
    mysql=None,
    limit: int = 10,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns top routes by number of bookings. Joins bookings -> trips -> routes
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        # Build date where clause and params (date params must come before LIMIT)
        date_where: List[str] = []
        date_params: List[Any] = []
        if start_date is not None:
            date_where.append("b.booking_date >= %s")
            date_params.append(start_date)
        if end_date is not None:
            date_where.append("b.booking_date <= %s")
            date_params.append(end_date)
        date_sql = ("AND " + " AND ".join(date_where)) if date_where else ""

        sql = f"""
            SELECT r.route_id,
                   r.route_name,
                   COUNT(*) AS bookings
            FROM bookings b
            JOIN trips t ON b.trip_id = t.trip_id
            JOIN routes r ON t.route_id = r.route_id
            WHERE 1=1 {date_sql}
            GROUP BY r.route_id, r.route_name
            ORDER BY bookings DESC, r.route_name ASC
            LIMIT %s
        """
        # final params: date params then limit
        final_params = date_params + [limit]
        cursor.execute(sql, final_params)
        rows = cursor.fetchall()
        return [_row_to_dict(cursor, r) for r in rows]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


# ------------------ Misc helpers ------------------


def bookings_and_payments_summary(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns a small summary dict with counts and totals:
    {
        bookings: int,
        paid_payments: int,
        total_revenue: int,
        tickets_issued: int
    }
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        params: List[Any] = []
        where_clauses: List[str] = []
        if start_date is not None:
            where_clauses.append("b.booking_date >= %s")
            params.append(start_date)
            where_clauses.append("p.payment_date >= %s")
            params.append(start_date)
            where_clauses.append("t.issue_date >= %s")
            params.append(start_date)
        if end_date is not None:
            where_clauses.append("b.booking_date <= %s")
            params.append(end_date)
            where_clauses.append("p.payment_date <= %s")
            params.append(end_date)
            where_clauses.append("t.issue_date <= %s")
            params.append(end_date)

        # Three small queries with same date filter where applicable
        # Bookings count
        b_where = ""
        b_params: List[Any] = []
        if start_date is not None or end_date is not None:
            bp_clauses = []
            if start_date is not None:
                bp_clauses.append("b.booking_date >= %s")
                b_params.append(start_date)
            if end_date is not None:
                bp_clauses.append("b.booking_date <= %s")
                b_params.append(end_date)
            b_where = "WHERE " + " AND ".join(bp_clauses)
        cursor.execute(f"SELECT COUNT(*) FROM bookings {b_where}", b_params)
        bookings_count = cursor.fetchone()[0]

        # Paid payments and total revenue
        p_where = ""
        p_params: List[Any] = []
        p_clauses = ["status = 'paid'"]
        if start_date is not None:
            p_clauses.append("payment_date >= %s")
            p_params.append(start_date)
        if end_date is not None:
            p_clauses.append("payment_date <= %s")
            p_params.append(end_date)
        p_where = "WHERE " + " AND ".join(p_clauses)
        cursor.execute(
            f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM payments {p_where}",
            p_params,
        )
        paid_count, total_rev = cursor.fetchone()

        # Tickets issued
        t_where = ""
        t_params: List[Any] = []
        t_clauses = []
        if start_date is not None:
            t_clauses.append("issue_date >= %s")
            t_params.append(start_date)
        if end_date is not None:
            t_clauses.append("issue_date <= %s")
            t_params.append(end_date)
        if t_clauses:
            t_where = "WHERE " + " AND ".join(t_clauses)
        cursor.execute(f"SELECT COUNT(*) FROM tickets {t_where}", t_params)
        tickets_count = cursor.fetchone()[0]

        return {
            "bookings": bookings_count,
            "paid_payments": paid_count,
            "total_revenue": total_rev,
            "tickets_issued": tickets_count,
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def dashboard_overview(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns comprehensive dashboard overview with all key metrics
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        # Build date filters
        b_where, b_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("booking_date >= %s")
                b_params.append(start_date)
            if end_date:
                clauses.append("booking_date <= %s")
                b_params.append(end_date)
            b_where = "WHERE " + " AND ".join(clauses)

        p_where, p_params = "", []
        clauses = ["status = 'paid'"]
        if start_date:
            clauses.append("payment_date >= %s")
            p_params.append(start_date)
        if end_date:
            clauses.append("payment_date <= %s")
            p_params.append(end_date)
        p_where = "WHERE " + " AND ".join(clauses)

        t_where, t_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("departure_time >= %s")
                t_params.append(start_date)
            if end_date:
                clauses.append("departure_time <= %s")
                t_params.append(end_date)
            t_where = "WHERE " + " AND ".join(clauses)

        # Total bookings and cancellation rate
        cursor.execute(
            f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM bookings {b_where}
        """,
            b_params,
        )
        booking_stats = cursor.fetchone()
        total_bookings = booking_stats[0] or 0
        confirmed_bookings = booking_stats[1] or 0
        cancelled_bookings = booking_stats[2] or 0
        cancellation_rate = (
            (cancelled_bookings / total_bookings * 100) if total_bookings > 0 else 0
        )

        # Revenue stats
        cursor.execute(
            f"""
            SELECT 
                COUNT(*) as paid_count,
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(AVG(amount), 0) as avg_fare
            FROM payments {p_where}
        """,
            p_params,
        )
        revenue_stats = cursor.fetchone()
        paid_payments = revenue_stats[0] or 0
        total_revenue = int(revenue_stats[1] or 0)
        avg_fare = round(float(revenue_stats[2] or 0), 2)

        # Trip stats
        cursor.execute(
            f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
                SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM trips {t_where}
        """,
            t_params,
        )
        trip_stats = cursor.fetchone()

        # Active buses and drivers
        cursor.execute("SELECT COUNT(*) FROM buses")
        total_buses = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM drivers")
        total_drivers = cursor.fetchone()[0] or 0

        # Total users
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'passenger'")
        total_passengers = cursor.fetchone()[0] or 0

        # Total routes and stops
        cursor.execute("SELECT COUNT(*) FROM routes")
        total_routes = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM stops")
        total_stops = cursor.fetchone()[0] or 0

        return {
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings,
                "cancelled": cancelled_bookings,
                "cancellation_rate": round(cancellation_rate, 2),
            },
            "revenue": {
                "total": total_revenue,
                "paid_payments": paid_payments,
                "average_fare": avg_fare,
            },
            "trips": {
                "total": trip_stats[0] or 0,
                "completed": trip_stats[1] or 0,
                "running": trip_stats[2] or 0,
                "scheduled": trip_stats[3] or 0,
                "cancelled": trip_stats[4] or 0,
            },
            "resources": {
                "buses": total_buses,
                "drivers": total_drivers,
                "passengers": total_passengers,
                "routes": total_routes,
                "stops": total_stops,
            },
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def user_analytics(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns user behavior analytics
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        b_where, b_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("b.booking_date >= %s")
                b_params.append(start_date)
            if end_date:
                clauses.append("b.booking_date <= %s")
                b_params.append(end_date)
            b_where = "WHERE " + " AND ".join(clauses)

        # Top users by bookings
        cursor.execute(
            f"""
            SELECT 
                u.user_id,
                u.username,
                u.full_name,
                COUNT(*) as booking_count,
                SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            {b_where}
            GROUP BY u.user_id, u.username, u.full_name
            ORDER BY booking_count DESC, u.username ASC
            LIMIT 10
        """,
            b_params,
        )
        top_users = [_row_to_dict(cursor, r) for r in cursor.fetchall()]

        # New users registered
        u_where, u_params = "", []
        if start_date or end_date:
            # Note: users table doesn't have created_at, so we'll return total count
            pass
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'passenger'")
        total_users = cursor.fetchone()[0] or 0

        # User distribution by bookings
        cursor.execute(
            f"""
            SELECT 
                CASE 
                    WHEN booking_count = 0 THEN 'No bookings'
                    WHEN booking_count BETWEEN 1 AND 5 THEN '1-5 bookings'
                    WHEN booking_count BETWEEN 6 AND 20 THEN '6-20 bookings'
                    ELSE '20+ bookings'
                END as category,
                COUNT(*) as user_count
            FROM (
                SELECT u.user_id, COUNT(b.booking_id) as booking_count
                FROM users u
                LEFT JOIN bookings b ON u.user_id = b.user_id
                WHERE u.role = 'passenger'
                GROUP BY u.user_id
            ) as user_bookings
            GROUP BY category
            ORDER BY user_count DESC
        """
        )
        user_distribution = [_row_to_dict(cursor, r) for r in cursor.fetchall()]

        return {
            "total_users": total_users,
            "top_users": top_users,
            "user_distribution": user_distribution,
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def bus_utilization(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns bus utilization statistics
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        t_where, t_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("t.departure_time >= %s")
                t_params.append(start_date)
            if end_date:
                clauses.append("t.departure_time <= %s")
                t_params.append(end_date)
            t_where = "WHERE " + " AND ".join(clauses)

        # Bus utilization: trips, bookings, capacity usage
        cursor.execute(
            f"""
            SELECT 
                b.bus_id,
                b.number_plate,
                b.capacity,
                COUNT(DISTINCT t.trip_id) as total_trips,
                COUNT(bk.booking_id) as total_bookings,
                ROUND(COUNT(bk.booking_id) * 100.0 / (b.capacity * COUNT(DISTINCT t.trip_id)), 2) as utilization_rate
            FROM buses b
            LEFT JOIN trips t ON b.bus_id = t.bus_id {t_where.replace('WHERE', 'AND') if t_where else ''}
            LEFT JOIN bookings bk ON t.trip_id = bk.trip_id
            GROUP BY b.bus_id, b.number_plate, b.capacity
            ORDER BY utilization_rate DESC, b.number_plate ASC
        """,
            t_params,
        )

        return [_row_to_dict(cursor, r) for r in cursor.fetchall()]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def payment_analytics(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Returns payment method analytics and trends
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        p_where, p_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("payment_date >= %s")
                p_params.append(start_date)
            if end_date:
                clauses.append("payment_date <= %s")
                p_params.append(end_date)
            p_where = "WHERE " + " AND ".join(clauses)

        # Payment by method
        cursor.execute(
            f"""
            SELECT 
                method,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_amount
            FROM payments
            {p_where}
            GROUP BY method
        """,
            p_params,
        )
        by_method = [_row_to_dict(cursor, r) for r in cursor.fetchall()]

        # Payment success rate
        cursor.execute(
            f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM payments
            {p_where}
        """,
            p_params,
        )
        overall = cursor.fetchone()
        total_payments = overall[0] or 0
        success_rate = (overall[1] / total_payments * 100) if total_payments > 0 else 0

        return {
            "by_method": by_method,
            "overall": {
                "total": total_payments,
                "paid": overall[1] or 0,
                "failed": overall[2] or 0,
                "pending": overall[3] or 0,
                "success_rate": round(success_rate, 2),
            },
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def peak_hours_analysis(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns booking patterns by hour of day
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        b_where, b_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("booking_date >= %s")
                b_params.append(start_date)
            if end_date:
                clauses.append("booking_date <= %s")
                b_params.append(end_date)
            b_where = "WHERE " + " AND ".join(clauses)

        cursor.execute(
            f"""
            SELECT 
                HOUR(booking_date) as hour,
                COUNT(*) as bookings,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
            FROM bookings
            {b_where}
            GROUP BY HOUR(booking_date)
            ORDER BY hour
        """,
            b_params,
        )

        return [_row_to_dict(cursor, r) for r in cursor.fetchall()]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def route_performance(
    mysql=None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Returns detailed route performance metrics
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        b_where, b_params = "", []
        if start_date or end_date:
            clauses = []
            if start_date:
                clauses.append("b.booking_date >= %s")
                b_params.append(start_date)
            if end_date:
                clauses.append("b.booking_date <= %s")
                b_params.append(end_date)
            b_where = "AND " + " AND ".join(clauses)

        cursor.execute(
            f"""
            SELECT 
                r.route_id,
                r.route_name,
                s.service_name,
                COUNT(DISTINCT t.trip_id) as total_trips,
                COUNT(b.booking_id) as total_bookings,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_trips,
                SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_trips,
                COALESCE(SUM(p.amount), 0) as revenue
            FROM routes r
            JOIN services s ON r.service_id = s.service_id
            LEFT JOIN trips t ON r.route_id = t.route_id
            LEFT JOIN bookings b ON t.trip_id = b.trip_id {b_where}
            LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
            GROUP BY r.route_id, r.route_name, s.service_name
            ORDER BY total_bookings DESC, r.route_id ASC
        """,
            b_params,
        )

        return [_row_to_dict(cursor, r) for r in cursor.fetchall()]
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
