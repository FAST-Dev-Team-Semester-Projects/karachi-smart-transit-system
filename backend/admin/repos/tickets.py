"""
Repository functions for tickets CRUD operations.
"""


def _row_to_dict(cursor, row):
    """Convert a cursor row to a dictionary."""
    if row is None:
        return None
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_tickets(mysql, page=1, per_page=10):
    """
    List all tickets with pagination, including related data.
    """
    offset = (page - 1) * per_page
    cursor = mysql.connection.cursor()

    # Get tickets with JOINs for booking, user, and trip info
    cursor.execute(
        """
        SELECT 
            t.ticket_id,
            t.booking_id,
            t.issue_date,
            t.qr_code,
            u.username,
            u.full_name,
            r.route_name,
            b.seat_number,
            b.booking_date,
            b.status as booking_status
        FROM tickets t
        JOIN bookings b ON t.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        JOIN trips tr ON b.trip_id = tr.trip_id
        JOIN routes r ON tr.route_id = r.route_id
        ORDER BY t.issue_date DESC
        LIMIT %s OFFSET %s
    """,
        (per_page, offset),
    )

    rows = cursor.fetchall()
    tickets = [_row_to_dict(cursor, row) for row in rows]

    # Get total count
    cursor.execute("SELECT COUNT(*) as total FROM tickets")
    total_row = cursor.fetchone()
    total = total_row[0] if total_row else 0

    cursor.close()

    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


def get_ticket(mysql, ticket_id):
    """
    Get a single ticket by ID.
    """
    cursor = mysql.connection.cursor()
    cursor.execute(
        """
        SELECT 
            t.ticket_id,
            t.booking_id,
            t.issue_date,
            t.qr_code,
            u.username,
            u.full_name,
            r.route_name,
            b.seat_number,
            b.booking_date,
            b.status as booking_status
        FROM tickets t
        JOIN bookings b ON t.booking_id = b.booking_id
        JOIN users u ON b.user_id = u.user_id
        JOIN trips tr ON b.trip_id = tr.trip_id
        JOIN routes r ON tr.route_id = r.route_id
        WHERE t.ticket_id = %s
    """,
        (ticket_id,),
    )
    row = cursor.fetchone()
    ticket = _row_to_dict(cursor, row)
    cursor.close()
    return ticket
