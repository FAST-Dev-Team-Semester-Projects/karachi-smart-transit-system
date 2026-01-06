from typing import Dict, Any, Optional

from flask import request, jsonify, current_app, make_response

from . import admin_bp, admin_required, get_mysql
from .repos import services as services_repo


def _validate_service_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating and "service_name" not in payload:
        return "Missing required field: service_name"
    if "service_name" in payload and not isinstance(payload["service_name"], str):
        return "service_name must be a string"
    return None


@admin_bp.route("/services", methods=["GET"])
@admin_required
def list_services():
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
        result = services_repo.list_services(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list services")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/services/<int:service_id>", methods=["GET"])
@admin_required
def get_service(service_id: int):
    try:
        s = services_repo.get_service_by_id(mysql=get_mysql(), service_id=service_id)
        if not s:
            return jsonify({"error": "Service not found"}), 404
        return jsonify(s), 200
    except Exception:
        current_app.logger.exception("Failed to fetch service")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/services", methods=["POST"])
@admin_required
def create_service():
    payload = request.get_json(silent=True)
    err = _validate_service_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    service_name = payload["service_name"].strip()
    try:
        new_id = services_repo.create_service(
            mysql=get_mysql(), service_name=service_name
        )
        if not new_id:
            current_app.logger.warning(
                "create_service returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create service"}), 500
        created = services_repo.get_service_by_id(mysql=get_mysql(), service_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create service")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/services/<int:service_id>", methods=["PUT", "PATCH"])
@admin_required
def update_service(service_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    err = _validate_service_payload(payload, creating=False)
    if err:
        return jsonify({"error": err}), 400

    service_name = payload.get("service_name")
    if service_name is None:
        return jsonify({"error": "No updatable fields provided"}), 400
    service_name = service_name.strip()

    try:
        rows = services_repo.update_service(
            mysql=get_mysql(), service_id=service_id, service_name=service_name
        )
        if rows == 0:
            return jsonify({"error": "Service not found"}), 404
        updated = services_repo.get_service_by_id(
            mysql=get_mysql(), service_id=service_id
        )
        return jsonify(updated), 200
    except Exception:
        current_app.logger.exception("Failed to update service")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/services/<int:service_id>", methods=["DELETE"])
@admin_required
def delete_service(service_id: int):
    try:
        rows = services_repo.delete_service(mysql=get_mysql(), service_id=service_id)
        if rows == 0:
            return jsonify({"error": "Service not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete service")
        return jsonify({"error": "Internal server error"}), 500
