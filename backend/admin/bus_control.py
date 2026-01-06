"""
Admin endpoints for controlling bus trips in real-time
"""
from flask import request, jsonify, current_app
from datetime import datetime
import MySQLdb.cursors
from . import admin_bp, admin_required, get_mysql
from bus_tracker import bus_tracker


@admin_bp.route("/trips/<int:trip_id>/start", methods=["POST"])
@admin_required
def start_bus_trip(trip_id: int):
    """
    Start a bus trip - begins real-time tracking
    Admin can specify starting stop (first or last) to determine direction
    """
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Get starting_stop_id from request (optional)
        data = request.get_json(silent=True) or {}
        starting_stop_id = data.get('starting_stop_id')
        
        # Get trip details with route stops
        cursor.execute(
            """
            SELECT t.trip_id, t.route_id, t.bus_id, t.status, t.direction,
                   r.route_name, b.number_plate
            FROM trips t
            JOIN routes r ON t.route_id = r.route_id
            JOIN buses b ON t.bus_id = b.bus_id
            WHERE t.trip_id = %s
            """,
            (trip_id,)
        )
        trip = cursor.fetchone()
        
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        
        if trip['status'] not in ['scheduled', 'running']:
            return jsonify({"error": f"Cannot start trip with status: {trip['status']}"}), 400
        
        # Get route stops in order
        cursor.execute(
            """
            SELECT rs.stop_id, s.stop_name, rs.stop_order
            FROM routes_stops rs
            JOIN stops s ON rs.stop_id = s.stop_id
            WHERE rs.route_id = %s
            ORDER BY rs.stop_order
            """,
            (trip['route_id'],)
        )
        route_stops = cursor.fetchall()
        
        if not route_stops:
            cursor.close()
            return jsonify({"error": "No stops found for this route"}), 400
        
        # Determine direction based on starting stop
        first_stop = route_stops[0]
        last_stop = route_stops[-1]
        
        if starting_stop_id:
            # Admin specified starting stop
            if starting_stop_id == first_stop['stop_id']:
                direction = 'forward'
                ordered_stops = route_stops
            elif starting_stop_id == last_stop['stop_id']:
                direction = 'backward'
                ordered_stops = list(reversed(route_stops))
            else:
                cursor.close()
                return jsonify({"error": "Starting stop must be either first or last stop of route"}), 400
        else:
            # Use trip's direction or default to forward
            direction = trip.get('direction', 'forward')
            if direction == 'backward':
                ordered_stops = list(reversed(route_stops))
            else:
                ordered_stops = route_stops
        
        # Update trip direction in database
        cursor.execute(
            "UPDATE trips SET direction = %s WHERE trip_id = %s",
            (direction, trip_id)
        )
        mysql.connection.commit()
        cursor.close()
        
        # Start the trip with ordered stops
        success = bus_tracker.start_trip(trip_id, ordered_stops, mysql, direction, route_id=trip['route_id'], route_name=trip['route_name'])
        
        if not success:
            return jsonify({"error": "Trip is already running"}), 400
        
        return jsonify({
            "success": True,
            "message": "Trip started successfully",
            "trip_id": trip_id,
            "route_name": trip['route_name'],
            "bus": trip['number_plate'],
            "direction": direction,
            "total_stops": len(ordered_stops),
            "starting_stop": ordered_stops[0]['stop_name'],
            "ending_stop": ordered_stops[-1]['stop_name']
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to start trip")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/trips/<int:trip_id>/stop", methods=["POST"])
@admin_required
def stop_bus_trip(trip_id: int):
    """
    Manually stop a running bus trip
    """
    try:
        mysql = get_mysql()
        success = bus_tracker.stop_trip(trip_id, mysql)
        
        if not success:
            return jsonify({"error": "Trip is not running"}), 400
        
        return jsonify({
            "success": True,
            "message": "Trip stopped successfully"
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to stop trip")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/trips/<int:trip_id>/status", methods=["GET"])
@admin_required
def get_trip_status(trip_id: int):
    """
    Get current status of a running trip
    """
    try:
        status = bus_tracker.get_trip_status(trip_id)
        
        if not status:
            return jsonify({
                "trip_id": trip_id,
                "status": "not_running"
            }), 200
        
        return jsonify({
            "trip_id": trip_id,
            "status": status['status'],
            "current_stop_index": status['current_stop_index'],
            "current_stop_name": status['current_stop_name'],
            "total_stops": status['total_stops'],
            "started_at": status['started_at'].isoformat(),
            "last_update": status['last_update'].isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to get trip status")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/trips/active", methods=["GET"])
@admin_required
def get_active_trips():
    """
    Get all currently active/running trips
    """
    try:
        # Ensure sync with DB before returning (force immediate sync)
        bus_tracker.sync_active_trips(get_mysql(), force=True)
        
        active_trips = bus_tracker.get_all_active_trips()
        
        # Format response
        trips_data = []
        for trip in active_trips:
            trips_data.append({
                "trip_id": trip['trip_id'],
                "route_id": trip.get('route_id'),
                "route_name": trip.get('route_name'),
                "current_stop_index": trip['current_stop_index'],
                "current_stop_name": trip['current_stop_name'],
                "total_stops": trip['total_stops'],
                "status": trip['status'],
                "started_at": trip['started_at'].isoformat(),
                "progress_percentage": round((trip['current_stop_index'] / trip['total_stops']) * 100, 1)
            })
        
        return jsonify({
            "success": True,
            "active_trips": trips_data,
            "count": len(trips_data)
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to get active trips")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/debug/time", methods=["GET"])
@admin_required
def debug_time():
    """
    Diagnostic endpoint to compare server time, DB NOW(), and trip departure_time for debugging scheduler/tz issues.
    """
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        # Get DB server time
        cursor.execute("SELECT NOW()")
        db_now = cursor.fetchone()[0]

        # Get upcoming scheduled trips
        cursor.execute(
            "SELECT trip_id, departure_time, status FROM trips WHERE status = 'scheduled' ORDER BY departure_time ASC LIMIT 10"
        )
        upcoming = cursor.fetchall()

        # Optionally return details for a single trip via ?trip_id=123
        trip_id_param = request.args.get('trip_id', type=int)
        detailed_trip = None
        if trip_id_param:
            cursor2 = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
            cursor2.execute(
                "SELECT trip_id, bus_id, route_id, direction, status, departure_time, arrival_time FROM trips WHERE trip_id = %s",
                (trip_id_param,)
            )
            trow = cursor2.fetchone()
            if trow:
                # Fetch route stops too
                cursor2.execute(
                    "SELECT rs.stop_id, s.stop_name, rs.stop_order FROM routes_stops rs JOIN stops s ON rs.stop_id = s.stop_id WHERE rs.route_id = %s ORDER BY rs.stop_order",
                    (trow['route_id'],)
                )
                stops = cursor2.fetchall()
                detailed_trip = {
                    'trip': trow,
                    'route_stops': stops
                }
            cursor2.close()
        cursor.close()

        return jsonify({
            "success": True,
            "server_time": datetime.now().isoformat(),
            "db_now": db_now.isoformat() if hasattr(db_now, 'isoformat') else str(db_now),
            "upcoming_scheduled_trips": [
                {"trip_id": r[0], "departure_time": r[1].isoformat() if hasattr(r[1], 'isoformat') else str(r[1]), "status": r[2]}
                for r in upcoming
            ],
            # Optionally provide details for a specific trip (if ?trip_id=ID passed)
            "detailed_trip": detailed_trip,
        }), 200
    except Exception as e:
        current_app.logger.exception("Failed to get debug time data")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/trips/auto-return/config", methods=["GET"])
@admin_required
def get_auto_return_config():
    """
    Get current auto-return trip configuration
    """
    try:
        return jsonify({
            "success": True,
            "auto_return_enabled": bus_tracker.auto_return_enabled,
            "auto_start_return_trip": getattr(bus_tracker, 'auto_start_return_trip', False),
            "return_buffer_seconds": bus_tracker.return_buffer_seconds
        }), 200
    except Exception as e:
        current_app.logger.exception("Failed to get auto-return config")
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/trips/auto-return/config", methods=["PUT"])
@admin_required
def update_auto_return_config():
    """
    Update auto-return trip configuration
    """
    try:
        data = request.get_json()
        
        if "auto_return_enabled" in data:
            enabled = data["auto_return_enabled"]
            if not isinstance(enabled, bool):
                return jsonify({"error": "auto_return_enabled must be a boolean"}), 400
            bus_tracker.auto_return_enabled = enabled
        
        if "return_buffer_seconds" in data:
            buffer_seconds = data["return_buffer_seconds"]
            try:
                buffer_seconds = int(buffer_seconds)
                if buffer_seconds < 0 or buffer_seconds > 3600:
                    return jsonify({"error": "return_buffer_seconds must be between 0 and 3600"}), 400
                bus_tracker.return_buffer_seconds = buffer_seconds
            except (ValueError, TypeError):
                return jsonify({"error": "return_buffer_seconds must be an integer"}), 400

        if "auto_start_return_trip" in data:
            auto_start = data["auto_start_return_trip"]
            if not isinstance(auto_start, bool):
                return jsonify({"error": "auto_start_return_trip must be a boolean"}), 400
            bus_tracker.auto_start_return_trip = auto_start
        
        return jsonify({
            "success": True,
            "message": "Auto-return configuration updated",
            "auto_return_enabled": bus_tracker.auto_return_enabled,
            "return_buffer_seconds": bus_tracker.return_buffer_seconds
        }), 200
        
    except Exception as e:
        current_app.logger.exception("Failed to update auto-return config")
        return jsonify({"error": str(e)}), 500
