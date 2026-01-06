"""
Admin routes for managing bookings.
"""

from flask import request, jsonify, session
from . import admin_bp, get_mysql, admin_required
from .repos import bookings as bookings_repo


@admin_bp.route("/bookings", methods=["GET"])
@admin_required
def list_bookings():
    """List all bookings with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    result = bookings_repo.list_bookings(
        mysql=get_mysql(), page=page, per_page=per_page
    )
    return jsonify(result), 200


@admin_bp.route("/bookings/<int:booking_id>", methods=["GET"])
@admin_required
def get_booking(booking_id):
    """Get a single booking by ID."""
    booking = bookings_repo.get_booking(mysql=get_mysql(), booking_id=booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    return jsonify(booking), 200


@admin_bp.route("/bookings", methods=["POST"])
@admin_required
def create_booking():
    """Create a new booking."""
    data = request.get_json()

    # Validate required fields
    required = [
        "user_id",
        "trip_id",
        "seat_number",
        "origin_stop_id",
        "destination_stop_id",
        "booking_date",
        "status",
    ]
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        booking_id = bookings_repo.create_booking(
            mysql=get_mysql(),
            user_id=data["user_id"],
            trip_id=data["trip_id"],
            seat_number=data["seat_number"],
            origin_stop_id=data["origin_stop_id"],
            destination_stop_id=data["destination_stop_id"],
            booking_date=data["booking_date"],
            status=data["status"],
        )
        return jsonify({"message": "Booking created", "booking_id": booking_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/bookings/<int:booking_id>", methods=["PUT"])
@admin_required
def update_booking(booking_id):
    """Update an existing booking."""
    data = request.get_json()

    # Validate required fields
    required = [
        "user_id",
        "trip_id",
        "seat_number",
        "origin_stop_id",
        "destination_stop_id",
        "booking_date",
        "status",
    ]
    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    # Check if booking exists
    existing = bookings_repo.get_booking(mysql=get_mysql(), booking_id=booking_id)
    if not existing:
        return jsonify({"error": "Booking not found"}), 404

    try:
        bookings_repo.update_booking(
            mysql=get_mysql(),
            booking_id=booking_id,
            user_id=data["user_id"],
            trip_id=data["trip_id"],
            seat_number=data["seat_number"],
            origin_stop_id=data["origin_stop_id"],
            destination_stop_id=data["destination_stop_id"],
            booking_date=data["booking_date"],
            status=data["status"],
        )
        return jsonify({"message": "Booking updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/bookings/<int:booking_id>", methods=["DELETE"])
@admin_required
def delete_booking(booking_id):
    """Delete a booking."""
    # Check if booking exists
    existing = bookings_repo.get_booking(mysql=get_mysql(), booking_id=booking_id)
    if not existing:
        return jsonify({"error": "Booking not found"}), 404

    try:
        bookings_repo.delete_booking(mysql=get_mysql(), booking_id=booking_id)
        return jsonify({"message": "Booking deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Dropdown endpoints for foreign keys
@admin_bp.route("/bookings/users", methods=["GET"])
@admin_required
def get_users_for_bookings():
    """Get list of users for dropdown."""
    mysql = get_mysql()
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT user_id, username, full_name FROM users ORDER BY username")
    users = cursor.fetchall()
    cursor.close()
    return jsonify(users), 200


@admin_bp.route("/bookings/trips", methods=["GET"])
@admin_required
def get_trips_for_bookings():
    """Get list of trips for dropdown."""
    mysql = get_mysql()
    cursor = mysql.connection.cursor()
    cursor.execute(
        """
        SELECT t.trip_id, r.route_name, t.departure_time, t.status
        FROM trips t
        JOIN routes r ON t.route_id = r.route_id
        ORDER BY t.departure_time DESC
    """
    )
    trips = cursor.fetchall()
    cursor.close()
    return jsonify(trips), 200


@admin_bp.route("/bookings/stops", methods=["GET"])
@admin_required
def get_stops_for_bookings():
    """Get list of stops for dropdown."""
    mysql = get_mysql()
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT stop_id, stop_name FROM stops ORDER BY stop_name")
    stops = cursor.fetchall()
    cursor.close()
    return jsonify(stops), 200
