import base64
import os
import shutil
from datetime import datetime

try:
    import bcrypt
except Exception:
    bcrypt = None

from database import get_connection


MINI_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7nS3sAAAAASUVORK5CYII="
)

MINI_PDF_BYTES = b"%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<<>> >>endobj\n4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 40 80 Td (Sample Loan Document) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000063 00000 n \n0000000120 00000 n \n0000000221 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n327\n%%EOF\n"


def _table_columns(cursor, table_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
        """,
        (table_name,),
    )
    return {row[0] for row in cursor.fetchall()}


def _insert_dynamic(cursor, table_name, values):
    cols = _table_columns(cursor, table_name)
    payload = {k: v for k, v in values.items() if k in cols}
    keys = list(payload.keys())
    placeholders = ", ".join(["%s"] * len(keys))
    sql = f"INSERT INTO {table_name} ({', '.join(keys)}) VALUES ({placeholders})"
    cursor.execute(sql, tuple(payload[k] for k in keys))
    return cursor.lastrowid


def _ensure_sample_user(cursor):
    email = "sample.user@loanapp.com"
    cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
    row = cursor.fetchone()
    if row:
        return row[0], email

    if bcrypt is not None:
        hashed = bcrypt.hashpw(b"Password@123", bcrypt.gensalt()).decode("utf-8")
    else:
        hashed = "Password@123"

    cursor.execute(
        """
        INSERT INTO users (name, email, password, phone, city)
        VALUES (%s, %s, %s, %s, %s)
        """,
        ("Sample User", email, hashed, "9876543210", "Chennai"),
    )
    return cursor.lastrowid, email


def _prepare_upload_root(base_dir):
    uploads_root = os.path.join(base_dir, "uploads")
    os.makedirs(uploads_root, exist_ok=True)

    for name in os.listdir(uploads_root):
        if name.startswith("loan_"):
            path = os.path.join(uploads_root, name)
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
    return uploads_root


def _write_sample_files(loan_folder):
    os.makedirs(loan_folder, exist_ok=True)

    files = {
        "aadhaar_front.png": base64.b64decode(MINI_PNG_BASE64),
        "aadhaar_back.png": base64.b64decode(MINI_PNG_BASE64),
        "pan_front.pdf": MINI_PDF_BYTES,
        "pan_back.pdf": MINI_PDF_BYTES,
        "salary_slip.pdf": MINI_PDF_BYTES,
        "bank_statement.pdf": MINI_PDF_BYTES,
    }

    created = {}
    for name, content in files.items():
        full_path = os.path.join(loan_folder, name)
        with open(full_path, "wb") as fh:
            fh.write(content)
        created[name] = full_path

    return created


def seed():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_root = _prepare_upload_root(base_dir)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Delete all existing loan-domain data
        cursor.execute("DELETE FROM notifications WHERE loan_id IS NOT NULL")
        cursor.execute("DELETE FROM admin_remarks")
        cursor.execute("DELETE FROM loan_status_history")
        cursor.execute("DELETE FROM loan_documents")
        cursor.execute("DELETE FROM loan_application_details")
        cursor.execute("DELETE FROM loans")

        user_id, user_email = _ensure_sample_user(cursor)

        now = datetime.now()

        loan1_id = _insert_dynamic(
            cursor,
            "loans",
            {
                "user_id": user_id,
                "loan_amount": 850000,
                "tenure": 60,
                "interest_rate": 10.25,
                "emi": 18175.55,
                "status": "Under Review",
                "applied_date": now,
                "viewed_by_admin": 1,
            },
        )

        _insert_dynamic(
            cursor,
            "loan_application_details",
            {
                "loan_id": loan1_id,
                "full_name": "Ravi Kumar",
                "contact_email": user_email,
                "primary_mobile": "9876543210",
                "alternate_mobile": "9123456780",
                "dob": "1992-08-14",
                "address_line1": "12, Anna Nagar West",
                "address_line2": "Near Metro Station",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600040",
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123412341234",
                "monthly_income": 95000,
                "employer_name": "TechNova Systems",
                "employment_type": "Salaried",
                "loan_purpose": "Home Loan",
                "parent_name": "S. Kumar",
                "parent_occupation": "Retired Teacher",
                "parent_annual_income": 360000,
                "cibil_score": 742,
                "created_at": now,
            },
        )

        loan1_folder = os.path.join(uploads_root, f"loan_{loan1_id}")
        files_loan1 = _write_sample_files(loan1_folder)

        docs_loan1 = [
            ("Applicant Aadhaar Front", "aadhaar_front.png", "accepted", 1, 1, 1),
            ("Applicant Aadhaar Back", "aadhaar_back.png", "accepted", 1, 1, 1),
            ("Applicant PAN Front", "pan_front.pdf", "accepted", 1, 1, 1),
            ("Applicant PAN Back", "pan_back.pdf", "under_review", 0, 0, 0),
            ("Income - Latest 3 Salary Slips", "salary_slip.pdf", "under_review", 0, 0, 0),
            ("Income - Bank Statement (6 Months)", "bank_statement.pdf", "rejected", 0, 0, 0),
        ]

        for doc_type, filename, status, front_verified, back_verified, full_verified in docs_loan1:
            rel_path = os.path.relpath(files_loan1[filename], base_dir)
            _insert_dynamic(
                cursor,
                "loan_documents",
                {
                    "loan_id": loan1_id,
                    "document_type": doc_type,
                    "original_filename": filename,
                    "stored_filename": filename,
                    "file_path": rel_path,
                    "front_verified": front_verified,
                    "back_verified": back_verified,
                    "is_fully_verified": full_verified,
                    "document_status": status,
                    "uploaded_at": now,
                    "updated_at": now,
                },
            )

        loan2_id = _insert_dynamic(
            cursor,
            "loans",
            {
                "user_id": user_id,
                "loan_amount": 420000,
                "tenure": 36,
                "interest_rate": 11.1,
                "emi": 13758.42,
                "status": "Pending",
                "applied_date": now,
                "viewed_by_admin": 0,
            },
        )

        _insert_dynamic(
            cursor,
            "loan_application_details",
            {
                "loan_id": loan2_id,
                "full_name": "Meena Lakshmi",
                "contact_email": user_email,
                "primary_mobile": "9988776655",
                "alternate_mobile": "",
                "dob": "1995-03-22",
                "address_line1": "44, T Nagar",
                "address_line2": "South Usman Road",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "postal_code": "600017",
                "pan_number": "PQRSX6789L",
                "aadhaar_number": "567856785678",
                "monthly_income": 72000,
                "employer_name": "FinAxis Pvt Ltd",
                "employment_type": "Salaried",
                "loan_purpose": "Vehicle Loan",
                "parent_name": "Lakshmi Narayanan",
                "parent_occupation": "Business",
                "parent_annual_income": 540000,
                "cibil_score": 711,
                "created_at": now,
            },
        )

        loan2_folder = os.path.join(uploads_root, f"loan_{loan2_id}")
        files_loan2 = _write_sample_files(loan2_folder)
        docs_loan2 = [
            ("Applicant Aadhaar Front", "aadhaar_front.png", "under_review", 0, 0, 0),
            ("Applicant Aadhaar Back", "aadhaar_back.png", "under_review", 0, 0, 0),
            ("Applicant PAN Front", "pan_front.pdf", "under_review", 0, 0, 0),
            ("Applicant PAN Back", "pan_back.pdf", "under_review", 0, 0, 0),
        ]

        for doc_type, filename, status, front_verified, back_verified, full_verified in docs_loan2:
            rel_path = os.path.relpath(files_loan2[filename], base_dir)
            _insert_dynamic(
                cursor,
                "loan_documents",
                {
                    "loan_id": loan2_id,
                    "document_type": doc_type,
                    "original_filename": filename,
                    "stored_filename": filename,
                    "file_path": rel_path,
                    "front_verified": front_verified,
                    "back_verified": back_verified,
                    "is_fully_verified": full_verified,
                    "document_status": status,
                    "uploaded_at": now,
                    "updated_at": now,
                },
            )

        conn.commit()

        print("Loan data reset completed.")
        print(f"Sample user email: {user_email}")
        print(f"Created loan IDs: {loan1_id}, {loan2_id}")
        print(f"Sample files directory: {uploads_root}")

    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    seed()
