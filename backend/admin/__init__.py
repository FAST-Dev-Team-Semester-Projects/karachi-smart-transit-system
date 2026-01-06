"""
backend.admin package initiliaser
"""

from functools import wraps
from flask import Blueprint, current_app, session, jsonify

admin_bp = Blueprint("admin", __name__)


def admin_required(f):
    """
    Session-based admin check with detailed logging
    """

    @wraps(f)
    def wrapped(*args, **kwargs):
        # Check if user is logged in
        if not session.get("loggedin") or not session.get("user_id"):
            print(f"DEBUG: Authentication failed. Session data: {dict(session)}")
            return jsonify({"error": "Authentication required"}), 401

        # Check if user has admin role
        role = session.get("role")
        user_id = session.get("user_id")
        username = session.get("username")

        if str(role).lower() != "admin":
            print(
                f"DEBUG: Access denied. User: {username} (ID: {user_id}), Role: {role}"
            )
            return jsonify({"error": "Admin role required", "current_role": role}), 403

        # Log successful admin access
        print(f"DEBUG: Admin access granted. User: {username} (ID: {user_id})")
        return f(*args, **kwargs)

    return wrapped


def get_mysql():
    """Lazily fetch MySQL extension from current_app.

    This attempts multiple lookup strategies to be tolerant of how the
    MySQL extension was registered (different packages register under
    different keys). It will try these in order:
    - current_app.extensions['mysql']
    - current_app.extensions['mysqldb']
    - current_app.extensions['flask_mysqldb']
    - attribute `current_app.mysql`
    - variable `mysql` from `app` module (if present)

    If none are found a RuntimeError is raised with actionable advice.
    """

    # Try to use the same variable defined in app.py first
    try:
        import importlib

        app_module = importlib.import_module("app")
        mysql = getattr(app_module, "mysql", None)
        if mysql:
            return mysql
    except Exception:
        # ignore import-time errors; fall back to other lookup methods
        pass

    # Common extension keys used by different MySQL Flask integrations
    ext_keys = ("mysql", "mysqldb", "flask_mysqldb")
    for k in ext_keys:
        mysql = current_app.extensions.get(k)
        if mysql:
            return mysql

    # Some apps may attach the extension directly on the app object
    mysql = getattr(current_app, "mysql", None)
    if mysql:
        return mysql

    raise RuntimeError(
        "MySQL extension is not initialised on the app. "
        "Ensure you have created the MySQL extension (e.g. `mysql = MySQL(app)`) "
        "and registered it before calling admin.init_app(app). "
        "As a quick fix you can also set `app.extensions['mysql'] = mysql` in your "
        "application factory or app module."
    )


def init_app(app):
    """Register 'admin_bp' and import admin submodules

    Call `init_app(app)` after app creation (e.g. from the application entrypoint).
    """
    # Import admin route modules here so they can attach their routes to admin_bp
    # Import each module individually so a failure in one doesn't prevent others
    import importlib

    # Import admin route modules using relative imports
    try:
        from . import (
            users,
            buses,
            routes,
            trips,
            reports,
            stops,
            services,
            bus_control,
            routes_stops,
            drivers,
            drivers_assignments,
            bookings,
            payments,
            tickets,
        )
    except Exception:
        app.logger.exception("Failed to import admin submodules")

    # Register blueprint after importing submodules so all route decorators
    # have been applied to `admin_bp` before the blueprint is frozen by
    # Flask's registration process.
    app.register_blueprint(admin_bp, url_prefix="/admin")
    return admin_bp


__all__ = ["admin_bp", "admin_required", "get_mysql", "init_app"]
