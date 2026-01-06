"""
Repository functions for payments CRUD operations.
"""


def _row_to_dict(cursor, row):
    """Convert a cursor row to a dictionary."""
    if row is None:
        return None
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_payments(mysql, page=1, per_page=10):
    """
    List all payments with pagination, including related data.
    """
    offset = (page - 1) * per_page
    cursor = mysql.connection.cursor()

    # Get payments with JOINs for booking, user, and trip info
    cursor.execute(
        """
        SELECT 
            p.payment_id,
            p.booking_id,
            p.amount,
            p.payment_date,
            p.method,
            p.status,
            u.username,
            u.full_name,
            r.route_name,
            b.seat_number
        FROM payments p
        JOIN bookings b ON p.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        JOIN trips t ON b.trip_id = t.trip_id
        JOIN routes r ON t.route_id = r.route_id
        ORDER BY p.payment_date DESC
        LIMIT %s OFFSET %s
    """,
        (per_page, offset),
    )

    rows = cursor.fetchall()
    payments = [_row_to_dict(cursor, row) for row in rows]

    # Get total count
    cursor.execute("SELECT COUNT(*) as total FROM payments")
    total_row = cursor.fetchone()
    total = total_row[0] if total_row else 0

    cursor.close()

    return {
        "payments": payments,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


def get_payment(mysql, payment_id):
    """
    Get a single payment by ID.
    """
    cursor = mysql.connection.cursor()
    cursor.execute(
        """
        SELECT 
            p.payment_id,
            p.booking_id,
            p.amount,
            p.payment_date,
            p.method,
            p.status,
            u.username,
            u.full_name,
            r.route_name,
            b.seat_number
        FROM payments p
        JOIN bookings b ON p.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        JOIN trips t ON b.trip_id = t.trip_id
        JOIN routes r ON t.route_id = r.route_id
        WHERE p.payment_id = %s
    """,
        (payment_id,),
    )
    row = cursor.fetchone()
    payment = _row_to_dict(cursor, row)
    cursor.close()
    return payment
