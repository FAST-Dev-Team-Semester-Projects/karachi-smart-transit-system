from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

try:
    import MySQLdb
except Exception:
    MySQLdb = None
from flask import request, jsonify, current_app, make_response
from . import admin_bp, admin_required, get_mysql
from .repos import trips as trips_repo


ALLOWED_STATUS = {"scheduled", "completed", "cancelled"}
ALLOWED_DIRECTION = {"forward", "backward"}


def _serialize_trip(trip: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not trip:
        return trip
    serialized = dict(trip)
    for field in ("departure_time", "arrival_time"):
        value = serialized.get(field)
        if isinstance(value, datetime):
            serialized[field] = value.isoformat()
    return serialized


def _parse_iso_dt(value: Optional[str], name: str) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(value)
        except Exception:
            raise ValueError(f"Invalid ISO datetime for '{name}'")

    # Return naive datetime (assuming it's already local or we want to treat it as local)
    # If it's aware, convert to naive local (stripping tzinfo)
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)

    return dt


def _validate_trip_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating:
        required = ["bus_id", "route_id", "departure_time"]
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    if "bus_id" in payload:
        try:
            if int(payload["bus_id"]) < 1:
                return "bus_id must be a positive integer"
        except (ValueError, TypeError):
            return "bus_id must be an integer"
    if "route_id" in payload:
        try:
            if int(payload["route_id"]) < 1:
                return "route_id must be a positive integer"
        except (ValueError, TypeError):
            return "route_id must be an integer"
    if "status" in payload and payload["status"] not in ALLOWED_STATUS:
        return f"status must be one of: {', '.join(sorted(ALLOWED_STATUS))}"
    if "direction" in payload and payload["direction"] not in ALLOWED_DIRECTION:
        return f"direction must be one of: {', '.join(sorted(ALLOWED_DIRECTION))}"
    if "departure_time" in payload:
        try:
            _parse_iso_dt(payload["departure_time"], "departure_time")
        except ValueError as ve:
            return str(ve)
    if "arrival_time" in payload and payload["arrival_time"] is not None:
        try:
            _parse_iso_dt(payload["arrival_time"], "arrival_time")
        except ValueError as ve:
            return str(ve)
    return None


@admin_bp.route("/trips", methods=["GET"])
@admin_required
def list_trips():
    try:
        page = int(request.args.get("page", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid page parameter"}), 400
    try:
        per_page = int(request.args.get("per_page", 20))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid per_page parameter"}), 400

    try:
        bus_id = request.args.get("bus_id")
        route_id = request.args.get("route_id")
        status = request.args.get("status")
        start_dt = request.args.get("start_dt")
        end_dt = request.args.get("end_dt")

        bus_id_v = int(bus_id) if bus_id is not None else None
        route_id_v = int(route_id) if route_id is not None else None
        status_v = (
            status
            if status in ALLOWED_STATUS
            else None if status is None else ("INVALID")
        )
        if status is not None and status_v == "INVALID":
            return (
                jsonify(
                    {
                        "error": f"status must be one of: {', '.join(sorted(ALLOWED_STATUS))}"
                    }
                ),
                400,
            )

        start_dt_v = None
        end_dt_v = None
        try:
            start_dt_v = _parse_iso_dt(start_dt, "start_dt") if start_dt else None
        except Exception:
            return (
                jsonify({"error": "Invalid start_dt format, expected ISO datetime"}),
                400,
            )
        try:
            end_dt_v = _parse_iso_dt(end_dt, "end_dt") if end_dt else None
        except Exception:
            return (
                jsonify({"error": "Invalid end_dt format, expected ISO datetime"}),
                400,
            )

        result = trips_repo.list_trips(
            mysql=get_mysql(),
            page=page,
            per_page=per_page,
            bus_id=bus_id_v,
            route_id=route_id_v,
            status=status_v,
            start_dt=start_dt_v,
            end_dt=end_dt_v,
        )

        # Enrich with live data from bus_tracker
        from bus_tracker import bus_tracker

        items = []
        for item in result.get("items", []):
            serialized = _serialize_trip(item)
            trip_id = serialized.get("trip_id")
            db_status = serialized.get("status", "")

            # Check if trip is active in bus_tracker
            live_status = bus_tracker.get_trip_status(trip_id)
            if live_status:
                serialized["current_stop_index"] = live_status.get("current_stop_index")
                serialized["current_stop_name"] = live_status.get("current_stop_name")
                serialized["total_stops"] = live_status.get("total_stops")

                # Bidirectional status sync - DB state is primary source of truth
                live_st = live_status.get("status", "")

                # If DB says completed, trust DB (trip finished and DB updated successfully)
                if db_status == "completed":
                    serialized["status"] = "completed"
                # If tracker says running, enrich with running status (DB might lag slightly)
                elif live_st == "running":
                    serialized["status"] = "running"
                # If tracker says completed but DB doesn't, log warning (DB update may have failed)
                elif live_st == "completed" and db_status != "completed":
                    current_app.logger.warning(
                        f"Trip {trip_id}: Tracker says completed but DB says {db_status}. Using tracker status."
                    )
                    serialized["status"] = "completed"

            items.append(serialized)

        result["items"] = items
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list trips")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/trips/<int:trip_id>", methods=["GET"])
@admin_required
def get_trip(trip_id: int):
    try:
        t = trips_repo.get_trip_by_id(mysql=get_mysql(), trip_id=trip_id)
        if not t:
            return jsonify({"error": "Trip not found"}), 404
        serialized = _serialize_trip(t)

        # Enrich with live data from bus_tracker
        from bus_tracker import bus_tracker

        live_status = bus_tracker.get_trip_status(trip_id)
        if live_status:
            serialized["current_stop_index"] = live_status.get("current_stop_index")
            serialized["current_stop_name"] = live_status.get("current_stop_name")
            serialized["total_stops"] = live_status.get("total_stops")
            if live_status.get("status") == "running":
                serialized["status"] = "running"

        return jsonify(serialized), 200
    except Exception:
        current_app.logger.exception("Failed to fetch trip")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/trips", methods=["POST"])
@admin_required
def create_trip():
    payload = request.get_json(silent=True)
    err = _validate_trip_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    try:
        bus_id = int(payload["bus_id"])
        route_id = int(payload["route_id"])
        departure_time = _parse_iso_dt(payload["departure_time"], "departure_time")
        arrival_time = _parse_iso_dt(payload.get("arrival_time", None), "arrival_time")
        status = payload.get("status", "scheduled")
        direction = payload.get("direction", "forward")  # Get direction from payload

        # Validate that departure time is in the future
        # Note: departure_time is stored as local time, so compare with local now
        if departure_time:
            now_local = datetime.now()
            if departure_time <= now_local:
                return (
                    jsonify(
                        {
                            "error": f"Departure time must be in the future. Current time: {now_local.strftime('%Y-%m-%d %H:%M:%S')}, Selected time: {departure_time.strftime('%Y-%m-%d %H:%M:%S')}"
                        }
                    ),
                    400,
                )

        try:
            new_id = trips_repo.create_trip(
                mysql=get_mysql(),
                bus_id=bus_id,
                route_id=route_id,
                departure_time=departure_time,
                arrival_time=arrival_time,
                status=status,
                direction=direction,
            )
        except Exception as e:
            # Detect duplicate unique constraint for (bus_id, route_id, departure_time)
            if (
                MySQLdb
                and isinstance(e, MySQLdb.IntegrityError)
                or (isinstance(e, Exception) and "Duplicate entry" in str(e))
            ):
                return (
                    jsonify(
                        {
                            "error": f"Trip already exists for Bus #{bus_id} on Route #{route_id} at {departure_time}. A bus cannot be in two places at once!",
                        }
                    ),
                    409,
                )
            raise
        if not new_id:
            current_app.logger.warning(
                "create_trip returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create trip"}), 500
        created = trips_repo.get_trip_by_id(mysql=get_mysql(), trip_id=new_id)
        return jsonify(_serialize_trip(created)), 201
    except Exception:
        current_app.logger.exception("Failed to create trip")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/trips/<int:trip_id>", methods=["PUT", "PATCH"])
@admin_required
def update_trip(trip_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    err = _validate_trip_payload(payload, creating=False)
    if err:
        return jsonify({"error": err}), 400

    fields: Dict[str, Any] = {}
    if "bus_id" in payload:
        fields["bus_id"] = int(payload["bus_id"])
    if "route_id" in payload:
        fields["route_id"] = int(payload["route_id"])
    if "departure_time" in payload:
        departure_time = _parse_iso_dt(payload["departure_time"], "departure_time")

        # Validate that departure time is in the future (only for scheduled trips)
        # Note: departure_time is stored as naive UTC, so compare with UTC now
        if departure_time:
            # Get current trip status
            current_trip = trips_repo.get_trip_by_id(mysql=get_mysql(), trip_id=trip_id)
            if current_trip and current_trip.get("status") == "scheduled":
                now_local = datetime.now()
                if departure_time <= now_local:
                    return (
                        jsonify(
                            {
                                "error": f"Departure time must be in the future. Current time: {now_local.strftime('%Y-%m-%d %H:%M:%S')}, Selected time: {departure_time.strftime('%Y-%m-%d %H:%M:%S')}"
                            }
                        ),
                        400,
                    )

        fields["departure_time"] = departure_time
    if "arrival_time" in payload:
        fields["arrival_time"] = _parse_iso_dt(payload["arrival_time"], "arrival_time")
    if "status" in payload:
        fields["status"] = payload["status"]

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = trips_repo.update_trip(mysql=get_mysql(), trip_id=trip_id, fields=fields)
        if rows == 0:
            return jsonify({"error": "Trip not found"}), 404
        updated = trips_repo.get_trip_by_id(mysql=get_mysql(), trip_id=trip_id)
        return jsonify(_serialize_trip(updated)), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        # Handle unique constraint violation gracefully
        if (
            MySQLdb
            and isinstance(e, MySQLdb.IntegrityError)
            or (isinstance(e, Exception) and "Duplicate entry" in str(e))
        ):
            return (
                jsonify(
                    {
                        "error": "Update would cause duplicate trip for this bus/route/departure_time",
                    }
                ),
                409,
            )
        current_app.logger.exception("Failed to update trip")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/trips/<int:trip_id>", methods=["DELETE"])
@admin_required
def delete_trip(trip_id: int):
    try:
        rows = trips_repo.delete_trip(mysql=get_mysql(), trip_id=trip_id)
        if rows == 0:
            return jsonify({"error": "Trip not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete trip")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/trips/generate-daily", methods=["POST"])
@admin_required
def generate_daily_trips():
    """
    Generate daily trips for all routes (or filtered routes) using stored procedure.
    Only generates trips for routes that don't already have trips scheduled for today.

    Body (all optional with defaults):
    {
        "daily_start_time": "07:00:00",
        "daily_end_time": "21:00:00",
        "seconds_between_bus_departures": 30,  // CHANGED FROM MINUTES
        "seconds_between_each_stop": 15,
        "seconds_waiting_at_final_stop": 30,
        "service_id": 1,       // NEW: Optional filter
        "route_id": 2,         // NEW: Optional filter
        "max_routes": 3        // NEW: Optional limit
    }
    """
    payload = request.get_json(silent=True) or {}

    # Extract parameters with defaults
    daily_start_time = payload.get("daily_start_time", "07:00:00")
    daily_end_time = payload.get("daily_end_time", "21:00:00")
    seconds_between_bus_departures = payload.get(
        "seconds_between_bus_departures", 30
    )  # CHANGED FROM MINUTES
    seconds_between_each_stop = payload.get("seconds_between_each_stop", 15)
    seconds_waiting_at_final_stop = payload.get("seconds_waiting_at_final_stop", 30)

    # NEW: Extract optional filtering parameters
    service_id = payload.get("service_id", None)
    route_id = payload.get("route_id", None)
    max_routes = payload.get("max_routes", None)

    # Validate time format (HH:MM:SS)
    import re

    time_pattern = re.compile(r"^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$")

    if not time_pattern.match(daily_start_time):
        return (
            jsonify(
                {
                    "error": "daily_start_time must be in HH:MM:SS format (e.g., '07:00:00')"
                }
            ),
            400,
        )
    if not time_pattern.match(daily_end_time):
        return (
            jsonify(
                {
                    "error": "daily_end_time must be in HH:MM:SS format (e.g., '21:00:00')"
                }
            ),
            400,
        )

    # Validate that start time is before end time
    if daily_start_time >= daily_end_time:
        return jsonify({"error": "daily_start_time must be before daily_end_time"}), 400

    # Validate integer parameters
    try:
        seconds_between_bus_departures = int(
            seconds_between_bus_departures
        )  # CHANGED FROM MINUTES
        seconds_between_each_stop = int(seconds_between_each_stop)
        seconds_waiting_at_final_stop = int(seconds_waiting_at_final_stop)
    except (ValueError, TypeError):
        return jsonify({"error": "Numeric parameters must be integers"}), 400

    # Validate reasonable ranges for seconds_between_bus_departures (CHANGED FROM MINUTES)
    if seconds_between_bus_departures < 1:
        return (
            jsonify(
                {"error": "seconds_between_bus_departures must be at least 1 second"}
            ),
            400,
        )
    if seconds_between_bus_departures > 3600:
        return (
            jsonify(
                {
                    "error": "seconds_between_bus_departures must not exceed 3600 seconds (1 hour)"
                }
            ),
            400,
        )

    if seconds_between_each_stop < 5:
        return (
            jsonify({"error": "seconds_between_each_stop must be at least 5 seconds"}),
            400,
        )
    if seconds_between_each_stop > 300:
        return (
            jsonify(
                {
                    "error": "seconds_between_each_stop must not exceed 300 seconds (5 minutes)"
                }
            ),
            400,
        )

    if seconds_waiting_at_final_stop < 0:
        return (
            jsonify({"error": "seconds_waiting_at_final_stop must be non-negative"}),
            400,
        )
    if seconds_waiting_at_final_stop > 600:
        return (
            jsonify(
                {
                    "error": "seconds_waiting_at_final_stop must not exceed 600 seconds (10 minutes)"
                }
            ),
            400,
        )

    # NEW: Validate optional filtering parameters
    if service_id is not None:
        try:
            service_id = int(service_id)
            if service_id < 1:
                return jsonify({"error": "service_id must be a positive integer"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "service_id must be an integer"}), 400

    if route_id is not None:
        try:
            route_id = int(route_id)
            if route_id < 1:
                return jsonify({"error": "route_id must be a positive integer"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "route_id must be an integer"}), 400

    if max_routes is not None:
        try:
            max_routes = int(max_routes)
            if max_routes < 1:
                return jsonify({"error": "max_routes must be at least 1"}), 400
            if max_routes > 50:
                return jsonify({"error": "max_routes must not exceed 50"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "max_routes must be an integer"}), 400

    try:
        # Check if we are generating for today
        today_str = datetime.now().strftime("%Y-%m-%d")

        # If generating for today, ensure start time is in the future
        # We'll use a simple heuristic: if daily_start_time is passed, use NOW() + buffer

        # Parse start/end times to compare with current time
        now = datetime.now()
        start_dt = datetime.strptime(
            f"{today_str} {daily_start_time}", "%Y-%m-%d %H:%M:%S"
        )
        end_dt = datetime.strptime(f"{today_str} {daily_end_time}", "%Y-%m-%d %H:%M:%S")

        # If the entire window is in the past, return error or empty
        if end_dt <= now:
            return (
                jsonify(
                    {
                        "success": True,
                        "routes_processed": 0,
                        "routes_skipped": 0,
                        "trips_created": 0,
                        "summary": "Generation window is in the past. No trips generated.",
                        "parameters_used": {
                            "daily_start_time": daily_start_time,
                            "daily_end_time": daily_end_time,
                            "seconds_between_bus_departures": seconds_between_bus_departures,
                            "seconds_between_each_stop": seconds_between_each_stop,
                            "seconds_waiting_at_final_stop": seconds_waiting_at_final_stop,
                            "service_id": service_id,
                            "route_id": route_id,
                            "max_routes": max_routes,
                        },
                    }
                ),
                200,
            )

        # If start time is in the past, adjust it to now + 5 mins buffer
        if start_dt <= now:
            adjusted_start = now + timedelta(minutes=5)
            daily_start_time = adjusted_start.strftime("%H:%M:%S")
            # Re-validate against end time
            if adjusted_start >= end_dt:
                return (
                    jsonify(
                        {
                            "success": True,
                            "routes_processed": 0,
                            "routes_skipped": 0,
                            "trips_created": 0,
                            "summary": "Adjusted start time is after end time. No trips generated.",
                            "parameters_used": {
                                "daily_start_time": daily_start_time,
                                "daily_end_time": daily_end_time,
                                "seconds_between_bus_departures": seconds_between_bus_departures,
                                "seconds_between_each_stop": seconds_between_each_stop,
                                "seconds_waiting_at_final_stop": seconds_waiting_at_final_stop,
                                "service_id": service_id,
                                "route_id": route_id,
                                "max_routes": max_routes,
                            },
                        }
                    ),
                    200,
                )

        # Call repository function with new parameters
        result = trips_repo.generate_daily_trips(
            mysql=get_mysql(),
            daily_start_time=daily_start_time,
            daily_end_time=daily_end_time,
            seconds_between_bus_departures=seconds_between_bus_departures,  # CHANGED FROM MINUTES
            seconds_between_each_stop=seconds_between_each_stop,
            seconds_waiting_at_final_stop=seconds_waiting_at_final_stop,
            service_id=service_id,  # NEW
            route_id=route_id,  # NEW
            max_routes=max_routes,  # NEW
        )

        return (
            jsonify(
                {
                    "success": True,
                    "routes_processed": result["routes_processed"],
                    "routes_skipped": result["routes_skipped"],
                    "trips_created": result["trips_created"],
                    "summary": result["summary"],
                    "parameters_used": {
                        "daily_start_time": daily_start_time,
                        "daily_end_time": daily_end_time,
                        "seconds_between_bus_departures": seconds_between_bus_departures,  # CHANGED FROM MINUTES
                        "seconds_between_each_stop": seconds_between_each_stop,
                        "seconds_waiting_at_final_stop": seconds_waiting_at_final_stop,
                        "service_id": service_id,  # NEW
                        "route_id": route_id,  # NEW
                        "max_routes": max_routes,  # NEW
                    },
                }
            ),
            200,
        )

    except Exception as e:
        current_app.logger.exception("Failed to generate daily trips")
        return jsonify({"error": "Failed to generate trips", "details": str(e)}), 500


@admin_bp.route("/trips/clear-daily", methods=["POST"])
@admin_required
def clear_daily_trips():
    """
    Clear trips.
    By default, clears only trips scheduled for today.
    If truncate_all=true, clears ALL trips from the table.
    """
    try:
        payload = request.get_json(silent=True) or {}
        truncate_all = payload.get("truncate_all", False)

        result = trips_repo.clear_daily_trips(get_mysql(), truncate_all=truncate_all)

        return (
            jsonify(
                {
                    "success": True,
                    "trips_deleted": result["trips_deleted"],
                    "message": result["message"],
                }
            ),
            200,
        )

    except Exception as e:
        current_app.logger.exception("Failed to clear trips")
        return jsonify({"error": "Failed to clear trips", "details": str(e)}), 500
