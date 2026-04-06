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
from notificationRoutes import notify_bp
from database import ensure_schema_convergence

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max upload

# Keep runtime DB schema aligned with APIs for older local databases.
ensure_schema_convergence()

# CORS — restrict to known origins in production, but keep common local ports available.
env_origins = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://localhost:3002",
    ).split(",")
    if o.strip()
]
local_dev_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]
allowed_origins = sorted(set(env_origins + local_dev_origins))

CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

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
app.register_blueprint(notify_bp)


@app.route("/api/meta/routes", methods=["GET"])
def list_api_routes():
    """Return all registered API routes grouped by HTTP method for testing clients."""
    grouped = {"GET": [], "POST": [], "PATCH": [], "PUT": [], "DELETE": []}

    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith("/api/"):
            continue

        methods = [m for m in rule.methods if m not in {"HEAD", "OPTIONS"}]
        if not methods:
            continue

        for method in methods:
            if method not in grouped:
                grouped[method] = []
            grouped[method].append(rule.rule)

    for method in grouped:
        grouped[method] = sorted(set(grouped[method]))

    return jsonify(
        {
            "message": "API routes grouped by method.",
            "routes": grouped,
            "counts": {k: len(v) for k, v in grouped.items()},
            "total": sum(len(v) for v in grouped.values()),
        }
    ), 200

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("true", "1", "yes")
    app.run(debug=debug)