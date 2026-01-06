from typing import Dict, Any, Optional
from flask import request, jsonify, current_app, make_response
from . import admin_bp, admin_required, get_mysql
from .repos import drivers_assignments as drivers_assignments_repo


def _validate_drivers_assignment_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    required = ["driver_id", "bus_id", "start_time"]
    if creating:
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    for k in ["driver_id", "bus_id"]:
        if k in payload:
            try:
                v = int(payload[k])
                if v < 1:
                    return f"{k} must be a positive integer"
            except (ValueError, TypeError):
                return f"{k} must be an integer"
    if "start_time" in payload and not isinstance(payload["start_time"], str):
        return "start_time must be a string (datetime format)"
    if "end_time" in payload and payload["end_time"] is not None:
        if not isinstance(payload["end_time"], str):
            return "end_time must be a string (datetime format)"
    return None


@admin_bp.route("/drivers-assignments", methods=["GET"])
@admin_required
def list_drivers_assignments():
    try:
        page = int(request.args.get("page", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid page parameter"}), 400
    try:
        per_page = int(request.args.get("per_page", 50))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid per_page parameter"}), 400
    search = request.args.get("search")
    try:
        result = drivers_assignments_repo.list_drivers_assignments(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list driver assignments")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers-assignments/drivers", methods=["GET"])
@admin_required
def list_drivers_for_dropdown():
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT driver_id, full_name FROM drivers ORDER BY full_name")
        drivers = [
            dict(zip([col[0] for col in cursor.description], row))
            for row in cursor.fetchall()
        ]
        cursor.close()
        return jsonify(drivers), 200
    except Exception:
        current_app.logger.exception("Failed to list drivers for dropdown")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers-assignments/buses", methods=["GET"])
@admin_required
def list_buses_for_dropdown():
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT bus_id, number_plate FROM buses ORDER BY number_plate")
        buses = [
            dict(zip([col[0] for col in cursor.description], row))
            for row in cursor.fetchall()
        ]
        cursor.close()
        return jsonify(buses), 200
    except Exception:
        current_app.logger.exception("Failed to list buses for dropdown")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers-assignments", methods=["POST"])
@admin_required
def create_drivers_assignments():
    payload = request.get_json(silent=True)
    err = _validate_drivers_assignment_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400
    try:
        keys = drivers_assignments_repo.create_drivers_assignment(
            mysql=get_mysql(), payload=payload
        )
        created = drivers_assignments_repo.get_drivers_assignment_by_id(
            mysql=get_mysql(),
            driver_id=keys["driver_id"],
            bus_id=keys["bus_id"],
            start_time=keys["start_time"],
        )
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create driver assignment")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route(
    "/drivers-assignments/<int:driver_id>/<int:bus_id>/<path:start_time>",
    methods=["PUT", "PATCH"],
)
@admin_required
def update_drivers_assignments(driver_id: int, bus_id: int, start_time: str):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    if "end_time" not in payload:
        return jsonify({"error": "end_time is required"}), 400

    try:
        updated = drivers_assignments_repo.update_drivers_assignment(
            mysql=get_mysql(),
            driver_id=driver_id,
            bus_id=bus_id,
            start_time=start_time,
            payload=payload,
        )
        if not updated:
            return jsonify({"error": "Driver assignment not found"}), 404
        result = drivers_assignments_repo.get_drivers_assignment_by_id(
            mysql=get_mysql(), driver_id=driver_id, bus_id=bus_id, start_time=start_time
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to update driver assignment")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route(
    "/drivers-assignments/<int:driver_id>/<int:bus_id>/<path:start_time>",
    methods=["DELETE"],
)
@admin_required
def delete_drivers_assignments(driver_id: int, bus_id: int, start_time: str):
    try:
        deleted = drivers_assignments_repo.delete_drivers_assignment(
            mysql=get_mysql(), driver_id=driver_id, bus_id=bus_id, start_time=start_time
        )
        if not deleted:
            return jsonify({"error": "Driver assignment not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete driver assignment")
        return jsonify({"error": "Internal server error"}), 500
