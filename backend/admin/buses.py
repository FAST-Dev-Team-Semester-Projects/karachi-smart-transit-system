from typing import Dict, Any, Optional

from flask import request, jsonify, current_app, make_response

from . import admin_bp, admin_required, get_mysql
from .repos import buses as buses_repo


def _validate_bus_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating:
        required = ["number_plate", "capacity"]
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    if "number_plate" in payload and not isinstance(payload["number_plate"], str):
        return "number_plate must be a string"
    if "capacity" in payload:
        try:
            cap = int(payload["capacity"])
            if cap < 1:
                return "capacity must be >= 1"
        except (ValueError, TypeError):
            return "capacity must be an integer"
    return None


@admin_bp.route("/buses", methods=["GET"])
@admin_required
def list_buses():
    try:
        page = int(request.args.get("page", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid page parameter"}), 400
    try:
        per_page = int(request.args.get("per_page", 20))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid per_page parameter"}), 400

    search = request.args.get("search")
    try:
        result = buses_repo.list_buses(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list buses")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/buses/<int:bus_id>", methods=["GET"])
@admin_required
def get_bus(bus_id: int):
    try:
        bus = buses_repo.get_bus_by_id(mysql=get_mysql(), bus_id=bus_id)
        if not bus:
            return jsonify({"error": "Bus not found"}), 404
        return jsonify(bus), 200
    except Exception:
        current_app.logger.exception("Failed to fetch bus")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/buses", methods=["POST"])
@admin_required
def create_bus():
    payload = request.get_json(silent=True)
    err = _validate_bus_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    number_plate = payload["number_plate"].strip()
    capacity = int(payload["capacity"])

    try:
        new_id = buses_repo.create_bus(
            mysql=get_mysql(), number_plate=number_plate, capacity=capacity
        )
        if not new_id:
            current_app.logger.warning(
                "create_bus returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create bus"}), 500
        created = buses_repo.get_bus_by_id(mysql=get_mysql(), bus_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create bus")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/buses/<int:bus_id>", methods=["PUT", "PATCH"])
@admin_required
def update_bus(bus_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    fields: Dict[str, Any] = {}
    if "number_plate" in payload:
        fields["number_plate"] = payload["number_plate"]
    if "capacity" in payload:
        try:
            cap = int(payload["capacity"])
            if cap < 1:
                return jsonify({"error": "capacity must be >= 1"}), 400
            fields["capacity"] = cap
        except (ValueError, TypeError):
            return jsonify({"error": "capacity must be an integer"}), 400

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = buses_repo.update_bus(mysql=get_mysql(), bus_id=bus_id, fields=fields)
        if rows == 0:
            return jsonify({"error": "Bus not found"}), 404
        updated = buses_repo.get_bus_by_id(mysql=get_mysql(), bus_id=bus_id)
        return jsonify(updated), 200
    except Exception:
        current_app.logger.exception("Failed to update bus")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/buses/<int:bus_id>", methods=["DELETE"])
@admin_required
def delete_bus(bus_id: int):
    try:
        rows = buses_repo.delete_bus(mysql=get_mysql(), bus_id=bus_id)
        if rows == 0:
            return jsonify({"error": "Bus not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete bus")
        return jsonify({"error": "Internal server error"}), 500
