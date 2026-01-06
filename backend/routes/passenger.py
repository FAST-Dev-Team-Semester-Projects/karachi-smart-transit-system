from typing import Dict, Any
from datetime import datetime
import uuid

from flask import Blueprint, jsonify, request, session, current_app
import MySQLdb
import MySQLdb.cursors
from utils.fare_utils import calculate_fare

passenger_bp = Blueprint("passenger", __name__)


# ---------- GET ROUTES FOR A SERVICE ----------
@passenger_bp.route("/services/<int:service_id>/routes", methods=["GET"])
def get_service_routes(service_id):
    from app import mysql

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        "SELECT route_id, route_name, service_id FROM routes WHERE service_id = %s ORDER BY route_id",
        (service_id,),
    )
    routes = cursor.fetchall()
    return jsonify({"success": True, "routes": routes})


# ---------- GET ALL STOPS FOR A SERVICE ----------
@passenger_bp.route("/services/<int:service_id>/stops", methods=["GET"])
def get_service_stops(service_id):
    from app import mysql

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        """
        SELECT DISTINCT s.stop_id, s.stop_name, s.latitude, s.longitude
        FROM stops s
        JOIN routes_stops rs ON s.stop_id = rs.stop_id
        JOIN routes r ON rs.route_id = r.route_id
        WHERE r.service_id = %s
        ORDER BY s.stop_name
        """,
        (service_id,),
    )
    stops = cursor.fetchall()
    return jsonify({"success": True, "stops": stops})


# ---------- GET STOPS FOR A ROUTE ----------
@passenger_bp.route("/routes/<int:route_id>/stops", methods=["GET"])
def get_route_stops(route_id):
    from app import mysql

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        """
        SELECT s.stop_id, s.stop_name, s.latitude, s.longitude, rs.stop_order
        FROM stops s
        JOIN routes_stops rs ON s.stop_id = rs.stop_id
        WHERE rs.route_id = %s
        ORDER BY rs.stop_order ASC
        """,
        (route_id,),
    )
    stops = cursor.fetchall()
    cursor.close()

    # Return all stops in order - frontend will handle direction logic
    return jsonify(
        {
            "success": True,
            "stops": stops,
            "first_stop": stops[0] if stops else None,
            "last_stop": stops[-1] if stops else None,
        }
    )


# ---------- FIND MATCHING ROUTES FOR TWO STOPS ----------
@passenger_bp.route("/services/<int:service_id>/routes/matching", methods=["GET"])
def get_matching_routes(service_id):
    start_stop_id = request.args.get("start_stop_id", type=int)
    end_stop_id = request.args.get("end_stop_id", type=int)

    if not start_stop_id or not end_stop_id:
        return jsonify({"success": False, "message": "Both stops are required"}), 400

    from app import mysql

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    # Find routes that contain both stops (in any order - forward or backward)
    cursor.execute(
        """
        SELECT DISTINCT r.route_id, r.route_name,
               COUNT(DISTINCT rs.stop_id) as stop_count,
               rs1.stop_order as start_order,
               rs2.stop_order as end_order,
               CASE 
                   WHEN rs2.stop_order > rs1.stop_order THEN 'forward'
                   WHEN rs2.stop_order < rs1.stop_order THEN 'backward'
                   ELSE 'invalid'
               END as direction
        FROM routes r
        JOIN routes_stops rs1 ON r.route_id = rs1.route_id AND rs1.stop_id = %s
        JOIN routes_stops rs2 ON r.route_id = rs2.route_id AND rs2.stop_id = %s
        JOIN routes_stops rs ON r.route_id = rs.route_id
        WHERE r.service_id = %s AND rs1.stop_order != rs2.stop_order
        GROUP BY r.route_id, r.route_name, rs1.stop_order, rs2.stop_order
        ORDER BY r.route_name
        """,
        (start_stop_id, end_stop_id, service_id),
    )
    routes = cursor.fetchall()
    return jsonify({"success": True, "routes": routes})


# ---------- GET TRIPS WITH AVAILABILITY FOR A ROUTE ----------
def _serialize_trip_dt(trip: Dict[str, Any]) -> Dict[str, Any]:
    for field in ("departure_time", "arrival_time"):
        value = trip.get(field)
        if isinstance(value, datetime):
            trip[field] = value.isoformat()
    return trip


@passenger_bp.route("/routes/<int:route_id>/trips/availability", methods=["GET"])
def get_route_trips_availability(route_id):
    from app import mysql
    from bus_tracker import bus_tracker

    # Get optional boarding stop filter
    boarding_stop_id = request.args.get("boarding_stop_id", type=int)
    alighting_stop_id = request.args.get("alighting_stop_id", type=int)

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    # Set timezone for this connection
    cursor.execute("SET time_zone = '+05:00'")

    # Get all trips for this route with bus details
    cursor.execute(
        """
        SELECT 
            t.trip_id,
            t.bus_id,
            t.direction,
            t.departure_time,
            t.arrival_time,
            t.status,
            b.number_plate,
            b.capacity,
            COALESCE(COUNT(bk.booking_id), 0) as booked
        FROM trips t
        JOIN buses b ON t.bus_id = b.bus_id
        LEFT JOIN bookings bk ON t.trip_id = bk.trip_id AND bk.status = 'confirmed'
        WHERE t.route_id = %s AND t.status IN ('scheduled', 'running')
        GROUP BY t.trip_id, t.bus_id, t.direction, t.departure_time, t.arrival_time, t.status, b.number_plate, b.capacity
        ORDER BY t.departure_time
        """,
        (route_id,),
    )
    trips = cursor.fetchall()

    # Debug logging
    current_app.logger.info(
        f"Trip availability request: route_id={route_id}, boarding_stop={boarding_stop_id}, alighting_stop={alighting_stop_id}"
    )
    current_app.logger.info(f"Found {len(trips)} trips for route {route_id}")

    # Build quick lookup for active trips to enrich response
    active_trips_map = {
        trip["trip_id"]: trip for trip in bus_tracker.get_all_active_trips()
    }

    # Get stop orders if boarding/alighting specified
    stop_orders = {}
    stop_filters = []
    stop_params = [route_id]
    if boarding_stop_id:
        stop_filters.append("stop_id = %s")
        stop_params.append(boarding_stop_id)
    if alighting_stop_id:
        stop_filters.append("stop_id = %s")
        stop_params.append(alighting_stop_id)
    if stop_filters:
        placeholders = " OR ".join(stop_filters)
        cursor.execute(
            f"""
            SELECT stop_id, stop_order
            FROM routes_stops
            WHERE route_id = %s AND ({placeholders})
            """,
            tuple(stop_params),
        )
        for row in cursor.fetchall():
            stop_orders[row["stop_id"]] = row["stop_order"]

    cursor.close()

    # Filter trips based on real-time bus position and direction compatibility
    available_trips = []
    for trip in trips:
        trip["available"] = trip["capacity"] - trip["booked"]
        trip["available"] = max(0, trip["available"])
        trip["boarding_allowed"] = True
        trip["blocked_reason"] = None

        realtime = active_trips_map.get(trip["trip_id"])
        trip["is_running"] = bool(realtime or trip["status"] == "running")

        if realtime:
            current_index = realtime.get("current_stop_index", 0)
            total_stops = realtime.get("total_stops", 1)
            current_stop_name = realtime.get("current_stop_name")

            # If current_stop_name is missing, try to get it from route_stops
            if not current_stop_name and "route_stops" in realtime:
                route_stops = realtime.get("route_stops", [])
                if route_stops and current_index < len(route_stops):
                    current_stop_name = route_stops[current_index].get(
                        "stop_name", "Unknown Stop"
                    )

            trip["status"] = "running"
            trip["current_stop_index"] = current_index
            trip["current_stop_name"] = current_stop_name or "Unknown Stop"
            trip["total_stops"] = total_stops
            trip["progress_percentage"] = round(
                (current_index / max(1, total_stops)) * 100, 1
            )
        else:
            trip["current_stop_index"] = None
            trip["current_stop_name"] = None
            trip["total_stops"] = None
            trip["progress_percentage"] = None

        # Check if passenger's journey matches trip direction
        if boarding_stop_id and alighting_stop_id:
            boarding_order = stop_orders.get(boarding_stop_id)
            alighting_order = stop_orders.get(alighting_stop_id)

            if boarding_order and alighting_order:
                # Determine required direction based on stop orders
                if alighting_order > boarding_order:
                    required_direction = "forward"
                elif alighting_order < boarding_order:
                    required_direction = "backward"
                else:
                    # Same stop - invalid
                    trip["available"] = 0
                    trip["status"] = "invalid"
                    available_trips.append(trip)
                    continue

                # Check if trip direction matches
                if trip["direction"] != required_direction:
                    trip["available"] = 0
                    trip["status"] = "wrong_direction"
                    trip["boarding_allowed"] = False
                    trip["blocked_reason"] = "wrong_direction"
                    available_trips.append(trip)
                    continue

        # If boarding stop is specified, check if bus hasn't passed it yet
        if boarding_stop_id:
            is_available = bus_tracker.is_trip_available_for_boarding(
                trip["trip_id"], boarding_stop_id
            )
            if not is_available:
                trip["status"] = "departed"  # Mark as departed from this stop
                trip["available"] = 0
                trip["boarding_allowed"] = False
                trip["blocked_reason"] = "passed_boarding_stop"

        available_trips.append(_serialize_trip_dt(trip))

    # Debug logging
    current_app.logger.info(f"Returning {len(available_trips)} trips after filtering")
    for trip in available_trips:
        current_app.logger.info(
            f"  Trip #{trip['trip_id']}: status={trip.get('status')}, boarding_allowed={trip.get('boarding_allowed')}, blocked_reason={trip.get('blocked_reason')}"
        )

    return jsonify({"success": True, "trips": available_trips})


# ---------- FARE CALCULATION ----------
@passenger_bp.route("/calculate_fare", methods=["GET"])
def get_fare():
    start_stop_id = request.args.get("start_stop_id", type=int)
    end_stop_id = request.args.get("end_stop_id", type=int)
    route_id = request.args.get("route_id", type=int)

    if not start_stop_id or not end_stop_id:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Both start_stop_id and end_stop_id are required",
                }
            ),
            400,
        )

    try:
        from app import mysql

        # Direction will be auto-detected by calculate_fare
        result = calculate_fare(mysql, int(start_stop_id), int(end_stop_id), route_id)
        return jsonify({"success": True, **result})
    except ValueError as e:
        # Return user-friendly validation errors
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        # Log internal errors but don't expose details to client
        current_app.logger.exception("Fare calculation error")
        return jsonify({"success": False, "message": "Unable to calculate fare. Please try again."}), 500


# ---------- VALIDATE PAYMENT ----------
@passenger_bp.route("/validate_payment", methods=["POST"])
def validate_payment():
    """Validate credit card before processing booking"""
    from utils.payment_validator import process_payment

    data = request.get_json()
    card_number = data.get("card_number", "").replace(" ", "")
    cvv = data.get("cvv", "")
    expiry = data.get("expiry", "")  # Format: MM/YY
    cardholder_name = data.get("cardholder_name", "")
    amount = data.get("amount", 0)

    # Parse expiry date
    try:
        expiry_parts = expiry.split("/")
        if len(expiry_parts) != 2:
            return (
                jsonify(
                    {"success": False, "message": "Invalid expiry format (use MM/YY)"}
                ),
                400,
            )
        expiry_month = expiry_parts[0]
        expiry_year = expiry_parts[1]
    except (ValueError, IndexError):
        return jsonify({"success": False, "message": "Invalid expiry date"}), 400

    # Validate payment
    success, message, transaction_id = process_payment(
        card_number, cvv, expiry_month, expiry_year, amount, cardholder_name
    )

    if success:
        return jsonify(
            {"success": True, "message": message, "transaction_id": transaction_id}
        )
    else:
        return jsonify({"success": False, "message": message}), 400


# ---------- GET TEST CARDS ----------
@passenger_bp.route("/test_cards", methods=["GET"])
def get_test_cards():
    """Get list of test credit cards for demo purposes"""
    from utils.payment_validator import get_test_cards_info

    cards = get_test_cards_info()
    return jsonify({"success": True, "cards": cards})


def _create_booking_via_proc(
    mysql,
    user_id,
    trip_id,
    origin_stop_id,
    destination_stop_id,
    card_number,
    cvv,
    cardholder_name,
):
    cursor = mysql.connection.cursor()

    # Call stored procedure with credit card details
    # NOTE: Card number is validated but NEVER stored in database
    cursor.execute(
        """
        CALL sp_create_passenger_booking_with_payment(%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            trip_id,
            origin_stop_id,
            destination_stop_id,
            card_number,
            cvv,
            cardholder_name,
        ),
    )

    # Fetch the result from the SELECT statement in the procedure
    row = cursor.fetchone()

    if not row:
        cursor.close()
        raise ValueError("Stored procedure returned no data")

    # Convert tuple to dict with known column names
    booking_summary = {
        "booking_id": row[0],
        "payment_id": row[1],
        "fare_amount": row[2],
        "stops_count": row[3],
        "seat_number": row[4],
        "card_last_four": row[5],
        "message": row[6],
    }

    # Generate QR code string
    booking_id = booking_summary["booking_id"]
    qr_code_data = f"TICKET-{booking_id}-{uuid.uuid4().hex[:8].upper()}"

    # Insert into tickets table
    cursor.execute(
        """
        INSERT INTO tickets (booking_id, qr_code)
        VALUES (%s, %s)
        """,
        (booking_id, qr_code_data),
    )
    mysql.connection.commit()

    booking_summary["qr_code"] = qr_code_data

    cursor.close()

    return booking_summary


def _create_booking_python_flow(
    mysql,
    user_id,
    trip_id,
    origin_stop_id,
    destination_stop_id,
    payment_context: Dict[str, Any],
):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    try:
        cursor.execute(
            """
            SELECT t.trip_id, t.route_id, t.status, t.direction, b.capacity
            FROM trips t
            JOIN buses b ON t.bus_id = b.bus_id
            WHERE t.trip_id = %s AND t.status IN ('scheduled', 'running')
            """,
            (trip_id,),
        )
        trip = cursor.fetchone()
        if not trip:
            raise ValueError("Trip not found or not available")

        cursor.execute(
            "SELECT COUNT(*) as count FROM bookings WHERE trip_id = %s AND status = 'confirmed'",
            (trip_id,),
        )
        booking_count = cursor.fetchone()["count"]
        if booking_count >= trip["capacity"]:
            raise ValueError("No seats available")

        fare_info = calculate_fare(
            mysql, origin_stop_id, destination_stop_id, trip["route_id"]
        )
        fare_amount = fare_info["fare_amount"]
        detected_direction = fare_info["direction"]

        trip_direction = trip.get("direction") or "forward"
        if trip_direction != detected_direction:
            raise ValueError(
                f"This trip is going {trip_direction}, but your journey requires {detected_direction} direction"
            )

        payment_mode = payment_context.get("mode")
        if payment_mode == "card":
            from utils.payment_validator import process_payment

            card_number = payment_context.get("card_number", "")
            cvv = payment_context.get("cvv", "")
            expiry_value = (payment_context.get("expiry") or "").strip()
            cardholder_name = payment_context.get("cardholder_name", "")

            expiry_parts = expiry_value.split("/")
            if len(expiry_parts) != 2:
                raise ValueError("Invalid expiry format (use MM/YY)")
            expiry_month, expiry_year = expiry_parts

            success, message, transaction_id = process_payment(
                card_number,
                cvv,
                expiry_month,
                expiry_year,
                fare_amount,
                cardholder_name,
            )
            if not success:
                raise ValueError(message or "Payment failed")
            card_last_four = card_number[-4:] if card_number else None
        elif payment_mode == "transaction":
            transaction_id = payment_context.get("transaction_id") or "N/A"
            card_last_four = payment_context.get("card_last_four")
        else:
            raise ValueError("Unsupported payment mode")

        cursor.execute(
            """
            INSERT INTO bookings (user_id, trip_id, origin_stop_id, destination_stop_id, seat_number)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, trip_id, origin_stop_id, destination_stop_id, booking_count + 1),
        )
        booking_id = cursor.lastrowid

        card_last_four = card_number[-4:] if card_number else None

        try:
            cursor.execute(
                """
                INSERT INTO payments (booking_id, amount, method, status, transaction_reference, card_last_four)
                VALUES (%s, %s, 'online', 'paid', %s, %s)
                """,
                (booking_id, fare_amount, transaction_id, card_last_four),
            )
        except MySQLdb.OperationalError as err:
            error_code = err.args[0] if err.args else None
            if error_code == 1054:
                current_app.logger.warning(
                    "payments table missing metadata columns, using legacy insert during fallback booking"
                )
                cursor.execute(
                    """
                    INSERT INTO payments (booking_id, amount, method, status)
                    VALUES (%s, %s, 'online', 'paid')
                    """,
                    (booking_id, fare_amount),
                )
            else:
                mysql.connection.rollback()
                raise

        payment_id = cursor.lastrowid

        # Generate QR code string
        qr_code_data = f"TICKET-{booking_id}-{uuid.uuid4().hex[:8].upper()}"

        # Insert into tickets table
        cursor.execute(
            """
            INSERT INTO tickets (booking_id, qr_code)
            VALUES (%s, %s)
            """,
            (booking_id, qr_code_data),
        )

        mysql.connection.commit()

        return {
            "booking_id": booking_id,
            "payment_id": payment_id,
            "fare_amount": fare_amount,
            "stops_count": fare_info["stops_count"],
            "seat_number": booking_count + 1,
            "card_last_four": card_last_four,
            "qr_code": qr_code_data,
            "message": "Booking and payment successful!",
        }
    except Exception:
        mysql.connection.rollback()
        raise
    finally:
        cursor.close()


# ---------- CREATE BOOKING WITH PAYMENT PROCESSING ----------
@passenger_bp.route("/bookings", methods=["POST"])
def create_booking():
    data = request.get_json() or {}
    trip_id = data.get("trip_id")
    origin_stop_id = data.get("boarding_stop_id")
    destination_stop_id = data.get("alighting_stop_id")

    # Payment details
    card_number = data.get("card_number", "").replace(" ", "")
    cvv = data.get("cvv", "")
    expiry = data.get("expiry") or data.get("expiry_date") or ""
    cardholder_name = data.get("cardholder_name", "")
    transaction_reference = data.get("transaction_id")
    card_last_four = (data.get("card_last_four") or "").strip() or None

    user_id = session.get("user_id", 1)

    missing_fields = []
    if not trip_id:
        missing_fields.append("trip_id")
    if not origin_stop_id:
        missing_fields.append("boarding_stop_id")
    if not destination_stop_id:
        missing_fields.append("alighting_stop_id")

    if missing_fields:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Missing required fields: {', '.join(missing_fields)}",
                }
            ),
            400,
        )

    payment_mode = None
    if card_number and cvv:
        payment_mode = "card"
        if not expiry:
            return (
                jsonify({"success": False, "message": "Expiry date is required"}),
                400,
            )
        if not cardholder_name:
            return (
                jsonify({"success": False, "message": "Cardholder name is required"}),
                400,
            )
    elif transaction_reference:
        payment_mode = "transaction"
    else:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Provide either card details or a transaction reference",
                }
            ),
            400,
        )

    # Real-time check (still done in Python for bus tracker integration)
    from bus_tracker import bus_tracker

    if not bus_tracker.is_trip_available_for_boarding(trip_id, origin_stop_id):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "This bus has already passed your boarding stop",
                }
            ),
            400,
        )

    from app import mysql

    if payment_mode == "card":
        try:
            booking_summary = _create_booking_via_proc(
                mysql,
                user_id,
                trip_id,
                origin_stop_id,
                destination_stop_id,
                card_number,
                cvv,
                cardholder_name,
            )
            return jsonify(
                {
                    "success": True,
                    "message": "Booking and payment successful!",
                    **booking_summary,
                }
            )
        except MySQLdb.OperationalError as err:
            error_code = err.args[0] if err.args else None
            if error_code == 1644:
                error_message = err.args[1] if len(err.args) > 1 else "Booking failed"
                return jsonify({"success": False, "message": error_message}), 400
            if error_code != 1305:
                current_app.logger.exception("Stored procedure error during booking")
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Database error. Please try again.",
                        }
                    ),
                    500,
                )
            current_app.logger.warning(
                "Stored procedure sp_create_passenger_booking_with_payment missing; using fallback booking flow."
            )
        except Exception as err:
            current_app.logger.exception("Stored procedure booking error: %s", err)
            return (
                jsonify(
                    {"success": False, "message": "Database error. Please try again."}
                ),
                500,
            )

        payment_context = {
            "mode": "card",
            "card_number": card_number,
            "cvv": cvv,
            "expiry": expiry,
            "cardholder_name": cardholder_name,
        }
    else:
        payment_context = {
            "mode": "transaction",
            "transaction_id": transaction_reference,
            "card_last_four": card_last_four,
        }

    # Stored procedure unavailable or transaction-based flow → Python implementation
    try:
        booking_summary = _create_booking_python_flow(
            mysql,
            user_id,
            trip_id,
            origin_stop_id,
            destination_stop_id,
            payment_context,
        )
        return jsonify({"success": True, **booking_summary})
    except ValueError as err:
        return jsonify({"success": False, "message": str(err)}), 400
    except Exception as err:
        current_app.logger.exception("Python fallback booking flow failed: %s", err)
        return (
            jsonify({"success": False, "message": "Database error. Please try again."}),
            500,
        )
