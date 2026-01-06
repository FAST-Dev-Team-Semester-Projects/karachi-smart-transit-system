from typing import Dict, Any, Optional
from flask import request, jsonify, current_app, make_response
from . import admin_bp, admin_required, get_mysql
from .repos import routes_stops as routes_stops_repo


def _validate_routes_stops_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    required = ["route_id", "stop_id", "stop_order"]
    if creating:
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    for k in ["route_id", "stop_id", "stop_order"]:
        if k in payload:
            try:
                v = int(payload[k])
                if v < 1:
                    return f"{k} must be a positive integer"
            except (ValueError, TypeError):
                return f"{k} must be an integer"
    return None


@admin_bp.route("/routes-stops", methods=["GET"])
@admin_required
def list_routes_stops():
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
        result = routes_stops_repo.list_routes_stops(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list route-stop mappings")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops/routes", methods=["GET"])
@admin_required
def list_routes_for_dropdown():
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT route_id, route_name FROM routes ORDER BY route_name")
        routes = [
            dict(zip([col[0] for col in cursor.description], row))
            for row in cursor.fetchall()
        ]
        cursor.close()
        return jsonify(routes), 200
    except Exception:
        current_app.logger.exception("Failed to list routes for dropdown")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops/stops", methods=["GET"])
@admin_required
def list_stops_for_dropdown():
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT stop_id, stop_name FROM stops ORDER BY stop_name")
        stops = [
            dict(zip([col[0] for col in cursor.description], row))
            for row in cursor.fetchall()
        ]
        cursor.close()
        return jsonify(stops), 200
    except Exception:
        current_app.logger.exception("Failed to list stops for dropdown")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops/<int:route_id>/<int:stop_id>", methods=["GET"])
@admin_required
def get_routes_stop(route_id: int, stop_id: int):
    try:
        mapping = routes_stops_repo.get_routes_stop_by_id(
            mysql=get_mysql(), route_id=route_id, stop_id=stop_id
        )
        if not mapping:
            return jsonify({"error": "Route-Stop mapping not found"}), 404
        return jsonify(mapping), 200
    except Exception:
        current_app.logger.exception("Failed to fetch route-stop mapping")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops", methods=["POST"])
@admin_required
def create_routes_stops():
    payload = request.get_json(silent=True)
    err = _validate_routes_stops_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400
    try:
        keys = routes_stops_repo.create_routes_stop(mysql=get_mysql(), payload=payload)
        created = routes_stops_repo.get_routes_stop_by_id(
            mysql=get_mysql(), route_id=keys["route_id"], stop_id=keys["stop_id"]
        )
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create route-stop mapping")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops/<int:route_id>/<int:stop_id>", methods=["PUT", "PATCH"])
@admin_required
def update_routes_stops(route_id: int, stop_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    if "stop_order" not in payload:
        return jsonify({"error": "stop_order is required"}), 400

    try:
        stop_order = int(payload["stop_order"])
        if stop_order < 1:
            return jsonify({"error": "stop_order must be a positive integer"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "stop_order must be an integer"}), 400

    try:
        updated = routes_stops_repo.update_routes_stop(
            mysql=get_mysql(), route_id=route_id, stop_id=stop_id, payload=payload
        )
        if not updated:
            return jsonify({"error": "Route-Stop mapping not found"}), 404
        result = routes_stops_repo.get_routes_stop_by_id(
            mysql=get_mysql(), route_id=route_id, stop_id=stop_id
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to update route-stop mapping")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes-stops/<int:route_id>/<int:stop_id>", methods=["DELETE"])
@admin_required
def delete_routes_stops(route_id: int, stop_id: int):
    try:
        deleted = routes_stops_repo.delete_routes_stop(
            mysql=get_mysql(), route_id=route_id, stop_id=stop_id
        )
        if not deleted:
            return jsonify({"error": "Route-Stop mapping not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete route-stop mapping")
        return jsonify({"error": "Internal server error"}), 500
