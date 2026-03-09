from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import time
from collections import defaultdict

from adminLogin import admin_login_bp
from adminRegister import admin_register_bp
from userRegister import user_register_bp
from userLogin import user_login_bp
from loanRoutes import loan_bp

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10MB max upload

# CORS — restrict to known origins in production
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
CORS(app, origins=[o.strip() for o in allowed_origins])

# ── Simple in-memory rate limiter for login/register endpoints ────────────
_rate_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60   # seconds
RATE_LIMIT_MAX = 10      # max attempts per window per IP

RATE_LIMITED_PREFIXES = (
    "/api/user/login",
    "/api/admin/login",
    "/api/user/register",
    "/api/admin/register",
)

@app.before_request
def _rate_limit():
    if not any(request.path.startswith(p) for p in RATE_LIMITED_PREFIXES):
        return None
    ip = request.remote_addr or "unknown"
    now = time.time()
    # Prune old entries
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_store[ip]) >= RATE_LIMIT_MAX:
        return jsonify({"error": "Too many requests. Please try again later."}), 429
    _rate_store[ip].append(now)

app.register_blueprint(admin_login_bp)
app.register_blueprint(admin_register_bp)
app.register_blueprint(user_register_bp)
app.register_blueprint(user_login_bp)
app.register_blueprint(loan_bp)

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("true", "1", "yes")
    app.run(debug=debug)