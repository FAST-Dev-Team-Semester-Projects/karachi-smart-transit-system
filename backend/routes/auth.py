from flask import Blueprint, jsonify, request, session
import MySQLdb.cursors
import re
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)


# ---------- LOGIN ----------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    identifier = data.get("identifier")
    password = data.get("password")

    from app import mysql
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        "SELECT * FROM users WHERE (username = %s OR email = %s)",
        (identifier, identifier),
    )

    account = cursor.fetchone()

    if account and check_password_hash(account["password"], password):
        # Clear any existing session data first
        session.clear()
        
        # Set session as permanent (uses PERMANENT_SESSION_LIFETIME from config)
        session.permanent = True
        
        # Set session data
        session["loggedin"] = True
        session["user_id"] = account["user_id"]
        session["username"] = account["username"]
        session["email"] = account["email"]
        session["role"] = account["role"]
        
        # Force session to be saved
        session.modified = True
        
        return jsonify(
            {
                "success": True,
                "message": "Login successful!",
                "username": account["username"],
                "email": account["email"],
                "role": account["role"],
            }
        )
    else:
        return jsonify(
            {"success": False, "message": "Incorrect username/email or password."}
        )


# ---------- LOGOUT ----------
@auth_bp.route("/logout", methods=["POST"])
def logout():
    username = session.get("username", "Unknown")
    print(f"DEBUG: User {username} logging out")
    
    # Clear all session data
    session.clear()
    
    # Force session to be saved
    session.modified = True
    
    return jsonify({"success": True, "message": "Logged out successfully!"})


# ---------- REGISTER ----------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("user_name")
    full_name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    phone_number = data.get("phone_number", None)
    role = data.get("role", "passenger")

    from app import mysql
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        "SELECT * FROM users WHERE email = %s OR username = %s", (email, username)
    )
    account = cursor.fetchone()

    if account:
        return jsonify(
            {
                "success": False,
                "message": "Account with this email or username already exists!",
            }
        )
    elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"success": False, "message": "Invalid email address!"})
    elif not re.match(r"^[A-Za-z0-9_]+$", username):
        return jsonify(
            {
                "success": False,
                "message": "Username must contain only letters, numbers, and underscores!",
            }
        )
    elif not username or not full_name or not password or not email:
        return jsonify(
            {"success": False, "message": "Please fill out all required fields!"}
        )
    else:
        hashed_password = generate_password_hash(password)
        cursor.execute(
            """
            INSERT INTO users (username, full_name, email, password, phone_number, role)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (username, full_name, email, hashed_password, phone_number, role),
        )
        mysql.connection.commit()
        return jsonify(
            {"success": True, "message": "You have successfully registered!"}
        )


# ---------- CHECK AUTH STATUS ----------
@auth_bp.route("/auth/check", methods=["GET"])
def check_auth():
    # Debug: Print session info
    print(f"DEBUG: Auth check - Session ID: {session.get('user_id')}, Role: {session.get('role')}, Logged in: {session.get('loggedin')}")
    
    if session.get("loggedin") and session.get("user_id"):
        return jsonify({
            "success": True,
            "user": {
                "user_id": session.get("user_id"),
                "username": session.get("username"),
                "email": session.get("email"),
                "role": session.get("role")
            }
        })
    else:
        return jsonify({"success": False, "message": "Not authenticated"}), 401


# ---------- SHOW USERS ----------
@auth_bp.route("/users", methods=["GET"])
def get_users():
    from app import mysql
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    return jsonify(users)
