from flask import Flask
from flask_cors import CORS

from adminLogin import admin_login_bp
from adminRegister import admin_register_bp
from userRegister import user_register_bp
from userLogin import user_login_bp
from loanRoutes import loan_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(admin_login_bp)
app.register_blueprint(admin_register_bp)
app.register_blueprint(user_register_bp)
app.register_blueprint(user_login_bp)
app.register_blueprint(loan_bp)

if __name__ == "__main__":
    app.run(debug=True)