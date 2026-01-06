from typing import Dict, Any, Optional
from flask import request, jsonify, current_app, make_response
from . import admin_bp, admin_required, get_mysql
from .repos import drivers as drivers_repo


def _validate_driver_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    if not isinstance(payload, dict):
        return "Invalid JSON payload"
    if creating:
        required = ["full_name", "license_number"]
        for k in required:
            if k not in payload:
                return f"Missing required field: {k}"
    if "full_name" in payload and not isinstance(payload["full_name"], str):
        return "full_name must be a string"
    if "license_number" in payload and not isinstance(payload["license_number"], str):
        return "license_number must be a string"
    if "phone_number" in payload and payload["phone_number"] is not None:
        if not isinstance(payload["phone_number"], str):
            return "phone_number must be a string"
    return None


@admin_bp.route("/drivers", methods=["GET"])
@admin_required
def list_drivers():
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
        result = drivers_repo.list_drivers(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list drivers")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers/<int:driver_id>", methods=["GET"])
@admin_required
def get_driver(driver_id: int):
    try:
        driver = drivers_repo.get_driver_by_id(mysql=get_mysql(), driver_id=driver_id)
        if not driver:
            return jsonify({"error": "Driver not found"}), 404
        return jsonify(driver), 200
    except Exception:
        current_app.logger.exception("Failed to fetch driver")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers", methods=["POST"])
@admin_required
def create_driver():
    payload = request.get_json(silent=True)
    err = _validate_driver_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    full_name = payload["full_name"].strip()
    license_number = payload["license_number"].strip()
    phone_number = payload.get("phone_number", "").strip() or None

    try:
        new_id = drivers_repo.create_driver(
            mysql=get_mysql(),
            full_name=full_name,
            license_number=license_number,
            phone_number=phone_number,
        )
        if not new_id:
            current_app.logger.warning(
                "create_driver returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create driver"}), 500
        created = drivers_repo.get_driver_by_id(mysql=get_mysql(), driver_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create driver")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers/<int:driver_id>", methods=["PUT", "PATCH"])
@admin_required
def update_driver(driver_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    fields: Dict[str, Any] = {}
    if "full_name" in payload:
        fields["full_name"] = payload["full_name"]
    if "license_number" in payload:
        fields["license_number"] = payload["license_number"]
    if "phone_number" in payload:
        fields["phone_number"] = (
            payload["phone_number"] if payload["phone_number"] else None
        )

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = drivers_repo.update_driver(
            mysql=get_mysql(), driver_id=driver_id, fields=fields
        )
        if rows == 0:
            return jsonify({"error": "Driver not found"}), 404
        updated = drivers_repo.get_driver_by_id(mysql=get_mysql(), driver_id=driver_id)
        return jsonify(updated), 200
    except Exception:
        current_app.logger.exception("Failed to update driver")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/drivers/<int:driver_id>", methods=["DELETE"])
@admin_required
def delete_driver(driver_id: int):
    try:
        rows = drivers_repo.delete_driver(mysql=get_mysql(), driver_id=driver_id)
        if rows == 0:
            return jsonify({"error": "Driver not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete driver")
        return jsonify({"error": "Internal server error"}), 500
