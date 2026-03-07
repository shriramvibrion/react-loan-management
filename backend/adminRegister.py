from flask import Blueprint, jsonify, request
import bcrypt
import mysql.connector
from database import get_connection

admin_register_bp = Blueprint("admin_register", __name__)


@admin_register_bp.route("/api/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

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

        # Hash the password securely (store as utf-8 string in DB)
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

        # Insert new admin into the database
        cursor.execute(
            "INSERT INTO admin (username, email, password) VALUES (%s, %s, %s)",
            (username, email, hashed_password),
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