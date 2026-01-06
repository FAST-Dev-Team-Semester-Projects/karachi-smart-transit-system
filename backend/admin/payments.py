"""
Admin routes for viewing payments (read-only).
"""

from flask import request, jsonify
from . import admin_bp, get_mysql, admin_required
from .repos import payments as payments_repo


@admin_bp.route("/payments", methods=["GET"])
@admin_required
def list_payments():
    """List all payments with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    result = payments_repo.list_payments(
        mysql=get_mysql(), page=page, per_page=per_page
    )
    return jsonify(result), 200


@admin_bp.route("/payments/<int:payment_id>", methods=["GET"])
@admin_required
def get_payment(payment_id):
    """Get a single payment by ID."""
    payment = payments_repo.get_payment(mysql=get_mysql(), payment_id=payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(payment), 200
