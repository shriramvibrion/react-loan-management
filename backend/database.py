import mysql.connector

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "Shriram@123",
    "database": "reactloanmanagement"
}

def get_connection():
    return mysql.connector.connect(**db_config)
    
def get_root_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Shriram@123"
    )


    