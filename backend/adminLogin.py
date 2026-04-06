from flask import Blueprint, request, jsonify
import logging
import mysql.connector
import bcrypt
from database import get_connection

admin_login_bp = Blueprint("admin_login", __name__)
logger = logging.getLogger(__name__)


@admin_login_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}

    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    # ── Validation ────────────────────────────────────────────────
    if not email or not password:
        return jsonify({"message": "Email and Password are required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Fetch admin record by email (table name must match registration)
        cursor.execute("SELECT email, password FROM admin WHERE email = %s", (email,))
        admin = cursor.fetchone()

        # ── Check if email exists in DB ───────────────────────────────
        if admin is None:
            return jsonify({"message": "Invalid credentials."}), 401

        db_email = admin[0]  # email from DB
        db_password = (admin[1] or "")

        # Support either bcrypt hash or legacy plaintext storage.
        password_match = False
        if db_password.startswith("$2a$") or db_password.startswith("$2b$") or db_password.startswith("$2y$"):
            try:
                password_match = bcrypt.checkpw(password.encode("utf-8"), db_password.encode("utf-8"))
            except Exception:
                password_match = False
        else:
            password_match = password == db_password

        if password_match:
            return jsonify({"message": "Login successful.", "admin": db_email}), 200
        else:
            return jsonify({"message": "Invalid credentials."}), 401

    except mysql.connector.Error:
        logger.exception("Admin login database error")
        return jsonify({"message": "Database error. Please try again later."}), 500

    except Exception:
        logger.exception("Admin login unexpected error")
        # Avoid leaking internals to client
        return jsonify({"message": "Server error. Please try again later."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()