from flask import Blueprint, jsonify, request
import re
import mysql.connector
from database import get_connection

admin_register_bp = Blueprint("admin_register", __name__)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PASSWORD_MIN_LEN = 8


@admin_register_bp.route("/api/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if len(username) > 100 or len(email) > 100 or len(password) > 72:
        return jsonify({"error": "Fields exceed maximum allowed lengths."}), 400

    if not EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format."}), 400

    if len(password) < PASSWORD_MIN_LEN:
        return jsonify({"error": f"Password must be at least {PASSWORD_MIN_LEN} characters."}), 400

    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return jsonify({"error": "Password must contain at least one letter and one number."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if the email already exists (table name must match login)
        cursor.execute("SELECT * FROM admin WHERE email = %s", (email,))
        existing_admin = cursor.fetchone()
        if existing_admin:
            return jsonify({"error": "Email already registered."}), 400

        # Store password as plaintext (as requested)
        cursor.execute(
            "INSERT INTO admin (username, email, password) VALUES (%s, %s, %s)",
            (username, email, password),
        )
        conn.commit()

        return jsonify({"message": "Admin registered successfully."}), 201

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()