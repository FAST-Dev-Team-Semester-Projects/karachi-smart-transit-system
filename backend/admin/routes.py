from typing import Dict, Any, Optional
from flask import request, jsonify, current_app, make_response
from . import admin_bp, admin_required, get_mysql
from .repos import routes as routes_repo

def _validate_route_payload(
    payload: Dict[str, Any], creating: bool = True) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating:
        required = ["service_id", "route_name"]
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    if "service_id" in payload:
        try:
            sid = int(payload["service_id"])
            if sid < 1:
                return "service_id must be a positive integer"
        except (ValueError, TypeError):
            return "service_id must be an integer"
    if "route_name" in payload and not isinstance(payload["route_name"], str):
        return "route_name must be a string"
    return None


@admin_bp.route("/routes", methods=["GET"])
@admin_required
def list_routes():
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
        result = routes_repo.list_routes(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list routes")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes/<int:route_id>", methods=["GET"])
@admin_required
def get_route(route_id: int):
    try:
        r = routes_repo.get_route_by_id(mysql=get_mysql(), route_id=route_id)
        if not r:
            return jsonify({"error": "Route not found"}), 404
        return jsonify(r), 200
    except Exception:
        current_app.logger.exception("Failed to fetch route")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes", methods=["POST"])
@admin_required
def create_route():
    payload = request.get_json(silent=True)
    err = _validate_route_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    service_id = int(payload["service_id"])
    route_name = payload["route_name"].strip()

    try:
        new_id = routes_repo.create_route(
            mysql=get_mysql(), service_id=service_id, route_name=route_name
        )
        if not new_id:
            current_app.logger.warning(
                "create_route returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create route"}), 500
        created = routes_repo.get_route_by_id(mysql=get_mysql(), route_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create route")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes/<int:route_id>", methods=["PUT", "PATCH"])
@admin_required
def update_route(route_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    fields: Dict[str, Any] = {}
    if "service_id" in payload:
        try:
            sid = int(payload["service_id"])
            if sid < 1:
                return jsonify({"error": "service_id must be a positive integer"}), 400
            fields["service_id"] = sid
        except (ValueError, TypeError):
            return jsonify({"error": "service_id must be an integer"}), 400
    if "route_name" in payload:
        if not isinstance(payload["route_name"], str):
            return jsonify({"error": "route_name must be a string"}), 400
        fields["route_name"] = payload["route_name"].strip()

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = routes_repo.update_route(
            mysql=get_mysql(), route_id=route_id, fields=fields
        )
        if rows == 0:
            return jsonify({"error": "Route not found"}), 404
        updated = routes_repo.get_route_by_id(mysql=get_mysql(), route_id=route_id)
        return jsonify(updated), 200
    except Exception:
        current_app.logger.exception("Failed to update route")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/routes/<int:route_id>", methods=["DELETE"])
@admin_required
def delete_route(route_id: int):
    try:
        rows = routes_repo.delete_route(mysql=get_mysql(), route_id=route_id)
        if rows == 0:
            return jsonify({"error": "Route not found"}), 404
        return make_response("", 204)
    except Exception as e:
        # Check for MySQL Trigger Error (Signal 45000 usually results in code 1644)
        if hasattr(e, 'args') and len(e.args) > 1 and e.args[0] == 1644:
            return jsonify({"error": str(e.args[1])}), 400
            
        current_app.logger.exception("Failed to delete route")
        return jsonify({"error": "Internal server error"}), 500
