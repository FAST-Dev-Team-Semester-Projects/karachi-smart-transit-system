import os
import threading
import time
from datetime import datetime, timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_mysqldb import MySQL
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

# Load .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "defaultsecret")

# Session configuration for proper multi-user support
app.config["SESSION_COOKIE_NAME"] = "ksts_session"  # Unique session cookie name
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_PATH"] = "/"
app.config["PERMANENT_SESSION_LIFETIME"] = (
    86400  # 24 hours session timeout (increased from 1 hour)
)
app.config["SESSION_REFRESH_EACH_REQUEST"] = True  # Refresh session on each request

# MySQL Configuration from .env
app.config["MYSQL_HOST"] = os.getenv("DB_HOST")
app.config["MYSQL_USER"] = os.getenv("DB_USER")
app.config["MYSQL_PASSWORD"] = os.getenv("DB_PASSWORD")
app.config["MYSQL_DB"] = os.getenv("DB_NAME")
app.config["MYSQL_PORT"] = int(os.getenv("DB_PORT", 3306))

mysql = MySQL(app)


# Error handling for production - prevent stack trace exposure
@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors without exposing stack traces"""
    current_app.logger.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors"""
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(400)
def bad_request_error(error):
    """Handle 400 errors"""
    return jsonify({"error": "Bad request"}), 400


# Set MySQL timezone to Pakistan Time (UTC+5) for all connections
@app.before_request
def set_mysql_timezone():
    """Set timezone for each database connection"""
    try:
        if hasattr(mysql, "connection"):
            cursor = mysql.connection.cursor()
            cursor.execute("SET time_zone = '+05:00'")
            cursor.close()
    except:
        pass  # Ignore errors if connection not yet established


# Initialize SocketIO with CORS support
socketio = SocketIO(
    app,
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    async_mode="threading",
)

# Enable CORS with specific configuration
CORS(
    app,
    resources={
        r"/api/.*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/admin/.*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]},
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# Initialize bus tracker with socketio
from bus_tracker import bus_tracker

bus_tracker.set_socketio(socketio)


# Import and register blueprints
from routes.auth import auth_bp
from routes.passenger import passenger_bp
from admin import init_app as init_admin

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(passenger_bp, url_prefix="/api")

# Initialize admin panel
init_admin(app)


# ---------- TEST ROUTE ----------
@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"message": "Flask backend is connected successfully!"})


# ---------- DEBUG SESSION ROUTE (Remove in production) ----------
@app.route("/api/debug/session", methods=["GET"])
def debug_session():
    from flask import session

    return jsonify(
        {
            "session_data": dict(session),
            "session_id": request.cookies.get(
                app.config.get("SESSION_COOKIE_NAME", "session")
            ),
            "has_session": bool(session),
        }
    )


# ---------- WEBSOCKET EVENTS ----------
@socketio.on("connect")
def handle_connect():
    # Send current active trips to newly connected client
    active_trips = bus_tracker.get_all_active_trips()
    emit("active_trips", {"trips": active_trips})


@socketio.on("disconnect")
def handle_disconnect():
    pass


@socketio.on("request_active_trips")
def handle_request_active_trips():
    """Client requests list of all active trips"""
    active_trips = bus_tracker.get_all_active_trips()
    emit("active_trips", {"trips": active_trips})


# ---------- MAIN ----------
if __name__ == "__main__":
    # Only enable debug mode in development
    debug_mode = os.getenv("FLASK_ENV") == "development" or os.getenv("DEBUG", "false").lower() == "true"
    socketio.run(app, debug=debug_mode, allow_unsafe_werkzeug=True)
