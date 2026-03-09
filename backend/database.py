import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "reactloanmanagement"),
}

# Aiven and other cloud MySQL providers require SSL
if os.getenv("DB_SSL", "").lower() in ("true", "1", "yes"):
    db_config["ssl_disabled"] = False

def get_connection():
    return mysql.connector.connect(**db_config)

def get_root_connection():
    config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
    }
    if os.getenv("DB_SSL", "").lower() in ("true", "1", "yes"):
        config["ssl_disabled"] = False
    return mysql.connector.connect(**config)


    