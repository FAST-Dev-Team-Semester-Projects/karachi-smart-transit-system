from typing import Dict, Any, Optional

from flask import request, jsonify, current_app, make_response
from werkzeug.security import generate_password_hash

from . import admin_bp, admin_required, get_mysql
from .repos import users as users_repo


def _validate_user_payload(
    payload: Dict[str, Any], creating: bool = True
) -> Optional[str]:
    """
    Validation for user payloads
    - creating=True: require username, full_name, email, password
    - creating=False: allow partial updates
    """
    if not isinstance(payload, dict):
        return "Invalid payload format"

    if creating:
        required = ["username", "full_name", "email", "password"]
        for k in required:
            if not payload.get(k):
                return f"Missing required field: {k}"

    # Simple checks
    if "username" in payload and not isinstance(payload["username"], str):
        return "username must be a string"
    if "full_name" in payload and not isinstance(payload["full_name"], str):
        return "full_name must be a string"
    if "email" in payload and not isinstance(payload["email"], str):
        return "email must be a string"
    if "password" in payload and not isinstance(payload["password"], str):
        return "password must be a string"
    if "role" in payload and payload["role"] not in {"admin", "passenger"}:
        return "role must be either 'admin' or 'passenger'"

    return None


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    try:
        page = int(request.args.get("page", "1"))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid page parameter"}), 400

    try:
        per_page = int(request.args.get("per_page", "20"))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid per_page parameter"}), 400

    search = request.args.get("search")
    try:
        result = users_repo.list_users(
            mysql=get_mysql(), page=page, per_page=per_page, search=search
        )
        return jsonify(result), 200
    except Exception:
        current_app.logger.exception("Failed to list users")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@admin_required
def get_user(user_id: int):
    try:
        user = users_repo.get_user_by_id(mysql=get_mysql(), user_id=user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user), 200
    except Exception:
        current_app.logger.exception("Failed to fetch user")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/users", methods=["POST"])
@admin_required
def create_user():
    payload = request.get_json(silent=True)
    err = _validate_user_payload(payload, creating=True)
    if err:
        return jsonify({"error": err}), 400

    username = payload["username"].strip()
    full_name = payload["full_name"].strip()
    email = payload["email"].strip()
    password = payload["password"]
    phone_number = payload.get("phone_number")
    role = payload.get("role", "passenger")

    password_hash = generate_password_hash(password)

    try:
        new_id = users_repo.create_user(
            mysql=get_mysql(),
            username=username,
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            phone_number=phone_number,
            role=role,
        )
        if not new_id:
            current_app.logger.error(
                "create_user returned no id for payload: %s", payload
            )
            return jsonify({"error": "Failed to create user"}), 500

        created = users_repo.get_user_by_id(mysql=get_mysql(), user_id=new_id)
        return jsonify(created), 201
    except Exception:
        current_app.logger.exception("Failed to create user")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/users/<int:user_id>", methods=["PUT", "PATCH"])
@admin_required
def update_user(user_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Empty payload"}), 400

    fields: Dict[str, Any] = {}
    for key in ("username", "full_name", "email", "phone_number", "role"):
        if key in payload:
            fields[key] = payload[key]

    if "password" in payload:
        pw = payload["password"]
        if not isinstance(pw, str):
            return jsonify({"error": "Invalid password"}), 400
        pw_stripped = pw.strip()
        # Only update password when a non-empty value is provided.
        if pw_stripped:
            fields["password"] = generate_password_hash(pw_stripped)

    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400

    try:
        rows = users_repo.update_user(mysql=get_mysql(), user_id=user_id, fields=fields)
        if rows == 0:
            return jsonify({"error": "User not found"}), 404
        updated = users_repo.get_user_by_id(mysql=get_mysql(), user_id=user_id)
        return jsonify(updated), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception:
        current_app.logger.exception("Failed to update user")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id: int):
    try:
        rows = users_repo.delete_user(mysql=get_mysql(), user_id=user_id)
        if rows == 0:
            return jsonify({"error": "User not found"}), 404
        return make_response("", 204)
    except Exception:
        current_app.logger.exception("Failed to delete user")
        return jsonify({"error": "Internal server error"}), 500
