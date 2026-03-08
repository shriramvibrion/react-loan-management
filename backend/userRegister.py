from flask import Blueprint, jsonify, request
import bcrypt
import mysql.connector
from database import get_connection

user_register_bp = Blueprint("user_register", __name__)


@user_register_bp.route("/api/user/register", methods=["POST"])
def register_user():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    phone = (data.get("phone") or "").strip()
    city = (data.get("city") or "").strip()

    # Basic validation
    if not name or not email or not password or not phone or not city:
        return jsonify({"error": "Name, email, password, phone, and city are required."}), 400
        
    if len(name) > 100 or len(email) > 100 or len(password) > 72 or len(phone) > 20 or len(city) > 50:
        return jsonify({"error": "Fields exceed maximum allowed lengths (password max 72 chars)."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if the email already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
        if existing_user:
            return jsonify({"error": "Email already registered."}), 400

        # Hash the password and store as string
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

        # Insert new user record
        cursor.execute(
            "INSERT INTO users (name, email, password, phone, city) VALUES (%s, %s, %s, %s, %s)",
            (name, email, hashed_password, phone, city),
        )
        conn.commit()

        return jsonify({"message": "User registered successfully."}), 201

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

