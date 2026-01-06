"""
Repository helpers for the `users` table.

Table schema (from database/ksts_schema.sql):
- user_id INT AUTO_INCREMENT PRIMARY KEY
- username VARCHAR(100) UNIQUE NOT NULL
- full_name VARCHAR(100) NOT NULL
- email VARCHAR(150) UNIQUE NOT NULL
- password VARCHAR(255) NOT NULL
- phone_number VARCHAR(20)
- role ENUM('admin','passenger') NOT NULL
"""

from typing import Optional, Dict, Any
from .. import get_mysql


def _row_to_dict(cursor, row) -> Dict[str, Any]:
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))


def list_users(
    mysql=None, page: int = 1, per_page: int = 20, search: Optional[str] = None
) -> Dict[str, Any]:
    """
    Return paginated users and total count.
    Returns a dict with keys: items, total, page, per_page
    """
    mysql = mysql or get_mysql()
    offset = max(0, (page - 1)) * per_page
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()

        params = []
        where = ""
        if search:
            where = "WHERE username LIKE %s OR full_name LIKE %s OR email LIKE %s"
            like = f"%{search}%"
            params.extend([like, like, like])

        cursor.execute(f"SELECT COUNT(*) FROM users {where}", params)
        total = cursor.fetchone()[0]

        params.extend([per_page, offset])
        query = f"""
            SELECT user_id, username, full_name, email, phone_number, role
            FROM users
            {where}
            ORDER BY user_id ASC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()
        items = [_row_to_dict(cursor, r) for r in rows]
        return {"items": items, "total": total, "page": page, "per_page": per_page}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def get_user_by_id(mysql=None, user_id: int = None) -> Optional[Dict[str, Any]]:
    """
    Return a single user dict or None if not found
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, full_name, email, phone_number, role FROM users WHERE user_id = %s",
            (user_id,),
        )
        row = cursor.fetchone()
        return _row_to_dict(cursor, row) if row else None
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def create_user(
    mysql=None,
    username: str = "",
    full_name: str = "",
    email: str = "",
    password_hash: str = "",
    phone_number: Optional[str] = None,
    role: str = "passenger",
) -> Optional[int]:
    """
    Insert a new user. Caller must provide `password_hash` (already hashed).
    Returns new `user_id` (int) or None.
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, full_name, email, password, phone_number, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (username, full_name, email, password_hash, phone_number, role),
        )
        conn.commit()
        return getattr(cursor, "lastrowid", None)
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def update_user(mysql=None, user_id: int = None, fields: Dict[str, Any] = None) -> int:
    """
    Update user fields. `fields` is mapping column->value. Returns rows affected.
    Allowed keys: username, full_name, email, password, phone_number, role
    (caller should provide hashed password under the `password` key).
    """
    if not fields:
        return 0
    allowed = {"username", "full_name", "email", "password", "phone_number", "role"}
    for k in fields.keys():
        if k not in allowed:
            raise ValueError(f"Invalid field for update: {k}")

    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        set_clause = ", ".join(f"{k} = %s" for k in fields.keys())
        params = list(fields.values()) + [user_id]
        sql = f"UPDATE users SET {set_clause} WHERE user_id = %s"
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass


def delete_user(mysql=None, user_id: int = None) -> int:
    """
    Delete a user by id. Returns number of rows deleted (0 if none)
    """
    mysql = mysql or get_mysql()
    cursor = None
    try:
        conn = mysql.connection
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        return cursor.rowcount
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
