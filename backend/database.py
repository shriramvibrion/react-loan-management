import mysql.connector
import mysql.connector.pooling
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

# Connection pool for faster response times (avoids per-request connection overhead)
_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="lms_pool",
    pool_size=5,
    pool_reset_session=True,
    **db_config,
)


def _column_exists(cursor, table_name, column_name):
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cursor.fetchone() is not None


def _table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
        LIMIT 1
        """,
        (table_name,),
    )
    return cursor.fetchone() is not None


def ensure_schema_convergence():
    """Create/patch critical tables & columns expected by current API routes."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _column_exists(cursor, "loans", "viewed_by_admin"):
            cursor.execute("ALTER TABLE loans ADD COLUMN viewed_by_admin TINYINT(1) NOT NULL DEFAULT 0")

        for col_def in (
            ("parent_name", "VARCHAR(255) NULL"),
            ("parent_occupation", "VARCHAR(255) NULL"),
            ("parent_annual_income", "DECIMAL(15, 2) NULL"),
            ("cibil_score", "INT NULL"),
        ):
            if not _column_exists(cursor, "loan_application_details", col_def[0]):
                cursor.execute(f"ALTER TABLE loan_application_details ADD COLUMN {col_def[0]} {col_def[1]}")

        if _table_exists(cursor, "loan_documents"):
            if not _column_exists(cursor, "loan_documents", "document_status"):
                cursor.execute(
                    "ALTER TABLE loan_documents ADD COLUMN document_status ENUM('under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'under_review'"
                )
            if not _column_exists(cursor, "loan_documents", "updated_at"):
                cursor.execute(
                    "ALTER TABLE loan_documents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
                )
            if not _column_exists(cursor, "loan_documents", "front_verified"):
                cursor.execute(
                    "ALTER TABLE loan_documents ADD COLUMN front_verified TINYINT(1) NOT NULL DEFAULT 0"
                )
            if not _column_exists(cursor, "loan_documents", "back_verified"):
                cursor.execute(
                    "ALTER TABLE loan_documents ADD COLUMN back_verified TINYINT(1) NOT NULL DEFAULT 0"
                )
            if not _column_exists(cursor, "loan_documents", "is_fully_verified"):
                cursor.execute(
                    "ALTER TABLE loan_documents ADD COLUMN is_fully_verified TINYINT(1) NOT NULL DEFAULT 0"
                )

            cursor.execute(
                """
                UPDATE loan_documents
                SET document_status = 'under_review'
                WHERE LOWER(document_status) IN ('pending', 'under review')
                """
            )

            cursor.execute(
                """
                ALTER TABLE loan_documents
                MODIFY COLUMN document_status ENUM('under_review', 'accepted', 'rejected')
                NOT NULL DEFAULT 'under_review'
                """
            )

            cursor.execute(
                """
                UPDATE loan_documents
                SET document_status = 'under_review'
                WHERE document_status IS NULL
                   OR LOWER(document_status) NOT IN ('under_review', 'accepted', 'rejected')
                """
            )

            cursor.execute(
                """
                UPDATE loan_documents
                SET is_fully_verified = CASE
                    WHEN IFNULL(front_verified, 0) = 1 AND IFNULL(back_verified, 0) = 1 THEN 1
                    ELSE 0
                END
                """
            )

        if _column_exists(cursor, "loan_application_details", "notes"):
            cursor.execute("ALTER TABLE loan_application_details DROP COLUMN notes")

        cursor.execute(
            """
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
            )
            """
        )

        if not _table_exists(cursor, "admin_remarks"):
            cursor.execute(
                """
                CREATE TABLE admin_remarks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    loan_id INT NOT NULL,
                    admin_id INT NOT NULL,
                    remark TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
                )
                """
            )
        else:
            # Handle old schema variant using admin_email instead of admin_id.
            if not _column_exists(cursor, "admin_remarks", "admin_id"):
                cursor.execute("ALTER TABLE admin_remarks ADD COLUMN admin_id INT NULL")
            if not _column_exists(cursor, "admin_remarks", "remark"):
                cursor.execute("ALTER TABLE admin_remarks ADD COLUMN remark TEXT NULL")
            if not _column_exists(cursor, "admin_remarks", "created_at"):
                cursor.execute("ALTER TABLE admin_remarks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS loan_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                loan_id INT NOT NULL,
                old_status VARCHAR(50) NULL,
                new_status VARCHAR(50) NOT NULL,
                changed_by VARCHAR(255) NOT NULL,
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
            )
            """
        )

        conn.commit()
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def get_connection():
    return _pool.get_connection()

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


    