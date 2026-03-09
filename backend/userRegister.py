from flask import Blueprint, jsonify, request
import bcrypt
import logging
import re
import mysql.connector
from database import get_connection

user_register_bp = Blueprint("user_register", __name__)
logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PASSWORD_MIN_LEN = 8


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

    except mysql.connector.Error as e:
        logger.exception("Database error during user registration: %s", e)
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

