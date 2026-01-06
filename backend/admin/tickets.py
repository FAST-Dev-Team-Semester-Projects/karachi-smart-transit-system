"""
Admin routes for viewing tickets (read-only).
"""

from flask import request, jsonify
from . import admin_bp, get_mysql, admin_required
from .repos import tickets as tickets_repo


@admin_bp.route("/tickets", methods=["GET"])
@admin_required
def list_tickets():
    """List all tickets with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    result = tickets_repo.list_tickets(mysql=get_mysql(), page=page, per_page=per_page)
    return jsonify(result), 200


@admin_bp.route("/tickets/<int:ticket_id>", methods=["GET"])
@admin_required
def get_ticket(ticket_id):
    """Get a single ticket by ID."""
    ticket = tickets_repo.get_ticket(mysql=get_mysql(), ticket_id=ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404
    return jsonify(ticket), 200
