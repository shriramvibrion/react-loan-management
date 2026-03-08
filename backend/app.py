from flask import Flask
from flask_cors import CORS

from adminLogin import admin_login_bp
from adminRegister import admin_register_bp
from userRegister import user_register_bp
from userLogin import user_login_bp
from loanRoutes import loan_bp

import logging
from logging.config import dictConfig

# Configure structured logging for production observability
dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Note: Restrict origins in real prod

# Security Hardening: Apply secure headers to all responses
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

import random
import time
from flask import request, jsonify, abort

# Chaos Engineering Middleware
@app.before_request
def chaos_middleware():
    # Only apply chaos to API routes, not static or preflight
    if request.path.startswith("/api/") and request.method != "OPTIONS":
        chaos_chance = random.random()
        
        # 5% chance of network delay (timeout simulation)
        if chaos_chance < 0.05:
            time.sleep(random.uniform(2.0, 5.0))
            
        # 5% chance of random server error
        elif chaos_chance < 0.10:
            return jsonify({"error": "Chaos Monkey: Simulated Internal Server Error"}), 500
            
        # 5% chance of simulated data corruption (closing connection/aborting ungracefully)
        elif chaos_chance < 0.15:
            abort(400, description="Chaos Monkey: Simulated Bad Request / Corrupted Payload")

app.register_blueprint(admin_login_bp)
app.register_blueprint(admin_register_bp)
app.register_blueprint(user_register_bp)
app.register_blueprint(user_login_bp)
app.register_blueprint(loan_bp)

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Load-balancer health check endpoint.
    Verifies DB connectivity and basic app state.
    """
    try:
        from database import get_connection
        conn = get_connection()
        conn.close()
        return jsonify({
            "status": "healthy",
            "message": "Application and Database are responding optimally.",
            "uptime": time.time() # Simplistic uptime representation
        }), 200
    except Exception as e:
        app.logger.error(f"Healthcheck failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": "Database connection failed"
        }), 503

if __name__ == "__main__":
    app.run(debug=True)