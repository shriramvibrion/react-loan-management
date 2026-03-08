from flask import Blueprint, jsonify, request
import bcrypt
import mysql.connector
from database import get_connection

user_login_bp = Blueprint("user_login", __name__)


@user_login_bp.route("/api/user/login", methods=["POST"])
def user_login():
    data = request.get_json() or {}

    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"message": "Email and Password are required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Fetch user by email
        cursor.execute(
            "SELECT email, password, name, phone, city FROM users WHERE email = %s",
            (email,),
        )
        user = cursor.fetchone()

        if user is None:
            return jsonify({"message": "Invalid credentials."}), 401

        db_email = user[0]
        db_password = user[1]  # hashed password string
        db_name = user[2]
        db_phone = user[3]
        db_city = user[4]

        # Verify password
        password_match = bcrypt.checkpw(
            password.encode("utf-8"),
            db_password.encode("utf-8"),
        )

        if password_match:
            return jsonify(
                {
                    "message": "Login successful.",
                    "user": {
                        "name": db_name,
                        "email": db_email,
                        "phone": db_phone,
                        "city": db_city,
                    },
                }
            ), 200
        else:
            return jsonify({"message": "Invalid credentials."}), 401

    except mysql.connector.Error as e:
        err_msg = str(e).strip() if e else "Server error. Please try again later."
        return jsonify({"message": err_msg}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

