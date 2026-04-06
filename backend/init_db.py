"""
Initialize the database and create required tables.
Run: python init_db.py
"""
import mysql.connector
import os

# Same config as database.py — use environment variables
DB_NAME = os.getenv("DB_NAME", "reactloanmanagement")
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    city VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    tenure INT NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    emi DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    viewed_by_admin TINYINT(1) NOT NULL DEFAULT 0,
    applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_application_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    alternate_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    loan_purpose VARCHAR(255),
    parent_name VARCHAR(255),
    parent_occupation VARCHAR(255),
    parent_annual_income DECIMAL(15, 2),
    cibil_score INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coapplicants (
    coapplicant_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guarantors (
    guarantor_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    document_type VARCHAR(255),
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500),
    file_path VARCHAR(1000),
    front_verified TINYINT(1) NOT NULL DEFAULT 0,
    back_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_fully_verified TINYINT(1) NOT NULL DEFAULT 0,
    document_status ENUM('under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'under_review',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    admin_id INT NULL,
    loan_id INT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_admin (admin_id),
    INDEX idx_notifications_loan (loan_id)
);

CREATE TABLE IF NOT EXISTS admin_remarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    admin_id INT NOT NULL,
    remark TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);
"""


def main():
    conn = None
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        cursor.execute(f"USE {DB_NAME}")

        for stmt in SCHEMA.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                cursor.execute(stmt)

        conn.commit()
        print(
            "Database '%s' initialized. Tables: admin, users, loans, loan_application_details, "
            "coapplicants, guarantors, loan_documents, notifications, admin_remarks, loan_status_history" % DB_NAME
        )
    except mysql.connector.Error as e:
        print(f"Error: {e}")
        raise
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    main()
