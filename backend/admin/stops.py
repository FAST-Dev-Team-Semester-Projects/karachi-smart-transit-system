from typing import Dict, Any, Optional

from flask import request, jsonify, current_app, make_response

from . import admin_bp, admin_required, get_mysql
from .repos import stops as stops_repo


def _validate_stop_payload(payload: Dict[str, Any], creating: bool = True) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating:
        required = ["stop_name", "latitude", "longitude"]
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    if "stop_name" in payload and not isinstance(payload["stop_name"], str):
        return "stop_name must be a string"
    if "latitude" in payload:
        try:
            lat = float(payload["latitude"])
            if not (-90.0 <= lat <= 90.0):
                return "latitude must be between -90 and 90"
        except (ValueError, TypeError):
            return "latitude must be a number"
    if "longitude" in payload:
        try:
            lng = float(payload["longitude"])
            if not (-180.0 <= lng <= 180.0):
                return "longitude must be between -180 and 180"
        except (ValueError, TypeError):
            return "longitude must be a number"
    return None


@admin_bp.route("/stops", methods=["GET"])
@admin_required
def list_stops():
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
        result = stops_repo.list_stops(mysql=get_mysql(), page=page, per_page=per_page, search=search)
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list stops")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/stops/<int:stop_id>", methods=["GET"])
@admin_required
def get_stop(stop_id: int):
    try:
        s = stops_repo.get_stop_by_id(mysql=get_mysql(), stop_id=stop_id)
        if not s:
            return jsonify({"error": "Stop not found"}), 404
        return jsonify(s), 200
    except Exception:
        current_app.logger.exception("Failed to fetch stop")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/stops", methods=["POST"])
@admin_required
def create_stop():
    payload = request.get_json(silent=True)
    err = _validate_stop_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    stop_name = payload["stop_name"].strip()
    latitude = float(payload["latitude"])
    longitude = float(payload["longitude"])

    try:
        new_id = stops_repo.create_stop(mysql=get_mysql(), stop_name=stop_name, latitude=latitude, longitude=longitude)
        if not new_id:
            current_app.logger.warning("create_stop returned no id for payload: %s", payload)
            return jsonify({"error": "Failed to create stop"}), 500
        created = stops_repo.get_stop_by_id(mysql=get_mysql(), stop_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create stop")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/stops/<int:stop_id>", methods=["PUT", "PATCH"])
@admin_required
def update_stop(stop_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    err = _validate_stop_payload(payload, creating=False)
    if err:
        return jsonify({"error": err}), 400

    fields: Dict[str, Any] = {}
    if "stop_name" in payload:
        fields["stop_name"] = payload["stop_name"].strip()
    if "latitude" in payload:
        fields["latitude"] = float(payload["latitude"])
    if "longitude" in payload:
        fields["longitude"] = float(payload["longitude"])

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = stops_repo.update_stop(mysql=get_mysql(), stop_id=stop_id, fields=fields)
        if rows == 0:
            return jsonify({"error": "Stop not found"}), 404
        updated = stops_repo.get_stop_by_id(mysql=get_mysql(), stop_id=stop_id)
        return jsonify(updated), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception:
        current_app.logger.exception("Failed to update stop")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/stops/<int:stop_id>", methods=["DELETE"])
@admin_required
def delete_stop(stop_id: int):
    try:
        rows = stops_repo.delete_stop(mysql=get_mysql(), stop_id=stop_id)
        if rows == 0:
            return jsonify({"error": "Stop not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete stop")
        return jsonify({"error": "Internal server error"}), 500
