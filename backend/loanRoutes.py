from flask import Blueprint, jsonify, request, send_file
import os
from uuid import uuid4

import mysql.connector
from werkzeug.utils import secure_filename

from database import get_connection

loan_bp = Blueprint("loan", __name__)


@loan_bp.route("/api/loan/apply", methods=["POST"])
def apply_loan():
    # Support both JSON and multipart/form-data. For uploads we expect multipart.
    if request.content_type and request.content_type.startswith(
        "multipart/form-data"
    ):
        form_data = request.form
    else:
        form_data = request.get_json() or {}

    def _get(field_name: str) -> str:
        return (form_data.get(field_name) or "").strip()

    email = _get("email")
    loan_amount_raw = _get("loan_amount")
    tenure_raw = _get("tenure")
    loan_purpose = _get("loan_purpose")

    full_name = _get("full_name")
    contact_email = _get("contact_email")
    primary_mobile = _get("primary_mobile")
    alternate_mobile = _get("alternate_mobile")
    dob = _get("dob")
    address_line1 = _get("address_line1")
    address_line2 = _get("address_line2")
    city = _get("city")
    state = _get("state")
    postal_code = _get("postal_code")

    pan_number = _get("pan_number")
    aadhaar_number = _get("aadhaar_number")
    monthly_income_raw = _get("monthly_income")
    employer_name = _get("employer_name")
    employment_type = _get("employment_type")
    notes = _get("notes")

    if not email or not loan_amount_raw or not tenure_raw:
        return (
            jsonify({"error": "Email, loan amount and tenure are required."}),
            400,
        )

    if (
        not full_name
        or not contact_email
        or not primary_mobile
        or not pan_number
        or not aadhaar_number
        or not loan_purpose
    ):
        return (
            jsonify(
                {
                    "error": "Full name, contact email, mobile, PAN, Aadhaar and loan purpose are required."
                }
            ),
            400,
        )

    try:
        loan_amount = float(loan_amount_raw)
        tenure = int(tenure_raw)
    except ValueError:
        return (
            jsonify(
                {
                    "error": "Loan amount must be a number and tenure must be an integer."
                }
            ),
            400,
        )

    if loan_amount <= 0 or tenure <= 0:
        return (
            jsonify(
                {
                    "error": "Loan amount and tenure must be greater than zero."
                }
            ),
            400,
        )

    monthly_income = None
    if monthly_income_raw:
        try:
            monthly_income = float(monthly_income_raw)
        except ValueError:
            monthly_income = None

    # For now, use a fixed interest rate.
    interest_rate = 10.0  # 10% annual interest
    monthly_rate = interest_rate / 12 / 100.0

    # EMI calculation: P * r * (1+r)^n / ((1+r)^n - 1)
    if monthly_rate == 0:
        emi = loan_amount / tenure
    else:
        emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** tenure) / (
            (1 + monthly_rate) ** tenure - 1
        )

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get user_id from users table using email
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        user_row = cursor.fetchone()

        if user_row is None:
            return (
                jsonify({"error": "User not found for the given email."}),
                404,
            )

        user_id = user_row[0]

        cursor.execute(
            """
            INSERT INTO loans (user_id, loan_amount, tenure, interest_rate, emi, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, loan_amount, tenure, interest_rate, emi, "Pending"),
        )
        loan_id = cursor.lastrowid

        # Insert detailed application information
        cursor.execute(
            """
            INSERT INTO loan_application_details (
                loan_id,
                full_name,
                contact_email,
                primary_mobile,
                alternate_mobile,
                dob,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                pan_number,
                aadhaar_number,
                monthly_income,
                employer_name,
                employment_type,
                loan_purpose,
                notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                loan_id,
                full_name,
                contact_email,
                primary_mobile,
                alternate_mobile or None,
                dob or None,
                address_line1 or None,
                address_line2 or None,
                city or None,
                state or None,
                postal_code or None,
                pan_number,
                aadhaar_number,
                monthly_income,
                employer_name or None,
                employment_type or None,
                loan_purpose,
                notes or None,
            ),
        )

        # Handle document uploads if present
        upload_root = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(upload_root, exist_ok=True)
        loan_folder = os.path.join(upload_root, f"loan_{loan_id}")
        os.makedirs(loan_folder, exist_ok=True)

        def save_and_record(file_obj, document_type_label: str) -> None:
            if file_obj is None or not getattr(file_obj, "filename", ""):
                return

            original_filename = file_obj.filename
            safe_name = secure_filename(original_filename) or "file"
            unique_prefix = uuid4().hex
            stored_filename = f"{unique_prefix}_{safe_name}"
            file_path = os.path.join(loan_folder, stored_filename)
            file_obj.save(file_path)

            relative_path = os.path.relpath(
                file_path, os.path.dirname(__file__)
            )

            cursor.execute(
                """
                INSERT INTO loan_documents (
                    loan_id,
                    document_type,
                    original_filename,
                    stored_filename,
                    file_path
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    loan_id,
                    document_type_label,
                    original_filename,
                    stored_filename,
                    relative_path,
                ),
            )

        # Single, named document uploads (PAN, Aadhaar, income docs)
        if request.files:
            save_and_record(request.files.get("pan_file"), "PAN")
            save_and_record(request.files.get("aadhaar_file"), "Aadhaar")
            save_and_record(
                request.files.get("income_tax_certificate"),
                "Income Tax Certificate",
            )
            save_and_record(
                request.files.get("tax_document"),
                "Tax Document",
            )
            save_and_record(
                request.files.get("employment_proof"),
                "Employment Proof",
            )

            # Dynamic loan-specific documents
            extra_types = form_data.getlist("document_types[]") if hasattr(
                form_data, "getlist"
            ) else form_data.get("document_types[]", [])

            extra_files = (
                request.files.getlist("document_files[]")
                if hasattr(request.files, "getlist")
                else []
            )

            if isinstance(extra_types, str):
                extra_types = [extra_types]

            for index, file_obj in enumerate(extra_files):
                label = (
                    extra_types[index]
                    if index < len(extra_types)
                    else "Supporting Document"
                )
                label = label or "Supporting Document"
                save_and_record(file_obj, label)

        conn.commit()

        return (
            jsonify(
                {
                    "message": "Loan application submitted.",
                    "status": "Pending",
                    "loan": {
                        "loan_id": loan_id,
                        "loan_amount": loan_amount,
                        "tenure": tenure,
                        "interest_rate": interest_rate,
                        "emi": round(emi, 2),
                        "status": "Pending",
                    },
                }
            ),
            201,
        )

    except mysql.connector.Error:
        if conn is not None:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/user/loans", methods=["GET"])
def get_user_loans():
    email = (request.args.get("email") or "").strip()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Join loans with users to filter by email and use new schema columns
        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.loan_amount,
                l.tenure,
                l.interest_rate,
                l.emi,
                l.status,
                l.applied_date,
                u.user_id,
                u.name,
                u.email
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE u.email = %s
            ORDER BY l.applied_date DESC
            """,
            (email,),
        )
        rows = cursor.fetchall()

        loans = [
            {
                "loan_id": row[0],
                "loan_amount": float(row[1]),
                "tenure": int(row[2]),
                "interest_rate": float(row[3]),
                "emi": float(row[4]),
                "status": row[5],
                "applied_date": row[6].isoformat() if row[6] is not None else None,
                "user_id": row[7],
                "user_name": row[8],
                "user_email": row[9],
            }
            for row in rows
        ]

        return jsonify({"loans": loans}), 200

    except mysql.connector.Error:
        return jsonify({"message": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/user/loans/<int:loan_id>", methods=["GET"])
def get_user_loan_detail(loan_id):
    email = (request.args.get("email") or "").strip()

    if not email:
        return jsonify({"message": "Email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.user_id,
                l.loan_amount,
                l.tenure,
                l.interest_rate,
                l.emi,
                l.status,
                l.applied_date,
                u.email,
                u.name
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.loan_id = %s AND u.email = %s
            """,
            (loan_id, email),
        )
        loan_row = cursor.fetchone()
        if not loan_row:
            return jsonify({"message": "Loan not found."}), 404

        loan = {
            "loan_id": loan_row[0],
            "user_id": loan_row[1],
            "loan_amount": float(loan_row[2]),
            "tenure": int(loan_row[3]),
            "interest_rate": float(loan_row[4]),
            "emi": float(loan_row[5]),
            "status": loan_row[6],
            "applied_date": loan_row[7].isoformat() if loan_row[7] else None,
            "user_email": loan_row[8],
            "user_name": loan_row[9],
        }

        cursor.execute(
            """
            SELECT
                id, full_name, contact_email, primary_mobile, alternate_mobile,
                dob, address_line1, address_line2, city, state, postal_code,
                pan_number, aadhaar_number, monthly_income, employer_name,
                employment_type, loan_purpose, notes, created_at
            FROM loan_application_details
            WHERE loan_id = %s
            """,
            (loan_id,),
        )
        detail_row = cursor.fetchone()
        applicant = None
        if detail_row:
            applicant = {
                "id": detail_row[0],
                "full_name": detail_row[1],
                "contact_email": detail_row[2],
                "primary_mobile": detail_row[3],
                "alternate_mobile": detail_row[4],
                "dob": str(detail_row[5]) if detail_row[5] else None,
                "address_line1": detail_row[6],
                "address_line2": detail_row[7],
                "city": detail_row[8],
                "state": detail_row[9],
                "postal_code": detail_row[10],
                "pan_number": detail_row[11],
                "aadhaar_number": detail_row[12],
                "monthly_income": float(detail_row[13]) if detail_row[13] else None,
                "employer_name": detail_row[14],
                "employment_type": detail_row[15],
                "loan_purpose": detail_row[16],
                "notes": detail_row[17],
                "created_at": detail_row[18].isoformat() if detail_row[18] else None,
            }

        cursor.execute(
            """
            SELECT document_id, document_type, original_filename, stored_filename, file_path, uploaded_at
            FROM loan_documents
            WHERE loan_id = %s
            ORDER BY document_id
            """,
            (loan_id,),
        )
        doc_rows = cursor.fetchall()
        documents = [
            {
                "document_id": row[0],
                "document_type": row[1],
                "original_filename": row[2],
                "stored_filename": row[3],
                "file_path": row[4],
                "uploaded_at": row[5].isoformat() if row[5] else None,
                "view_url": f"/api/admin/document/{row[0]}",
            }
            for row in doc_rows
        ]

        return jsonify({"loan": loan, "applicant": applicant, "documents": documents}), 200

    except mysql.connector.Error:
        return jsonify({"message": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/user/loans/<int:loan_id>/contact", methods=["PATCH"])
def update_user_loan_contact(loan_id):
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    contact_email = (data.get("contact_email") or "").strip()
    primary_mobile = (data.get("primary_mobile") or "").strip()
    alternate_mobile = (data.get("alternate_mobile") or "").strip()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    if not contact_email or not primary_mobile:
        return jsonify({"error": "Contact email and primary mobile are required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT l.loan_id
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.loan_id = %s AND u.email = %s
            """,
            (loan_id, email),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Loan not found."}), 404

        cursor.execute(
            """
            UPDATE loan_application_details
            SET contact_email = %s,
                primary_mobile = %s,
                alternate_mobile = %s
            WHERE loan_id = %s
            """,
            (
                contact_email,
                primary_mobile,
                alternate_mobile or None,
                loan_id,
            ),
        )
        conn.commit()

        return jsonify({"message": "Contact details updated successfully."}), 200

    except mysql.connector.Error:
        if conn is not None:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Admin APIs: list loans, loan detail with applicant & documents, update status
# ─────────────────────────────────────────────────────────────────────────────


@loan_bp.route("/api/admin/loans", methods=["GET"])
def admin_get_all_loans():
    """Fetch all user-applied loans for admin dashboard."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.loan_amount,
                l.tenure,
                l.interest_rate,
                l.emi,
                l.status,
                l.applied_date,
                u.user_id,
                u.email AS user_email,
                u.name AS user_name
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            ORDER BY l.applied_date DESC
            """,
        )
        rows = cursor.fetchall()

        loans = [
            {
                "loan_id": row[0],
                "loan_amount": float(row[1]),
                "tenure": int(row[2]),
                "interest_rate": float(row[3]),
                "emi": float(row[4]),
                "status": row[5],
                "applied_date": row[6].isoformat() if row[6] else None,
                "user_id": row[7],
                "user_email": row[8],
                "user_name": row[9],
            }
            for row in rows
        ]

        return jsonify({"loans": loans}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/loans/<int:loan_id>", methods=["GET"])
def admin_get_loan_detail(loan_id):
    """Fetch full loan + applicant details + documents for admin review."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                l.loan_id,
                l.user_id,
                l.loan_amount,
                l.tenure,
                l.interest_rate,
                l.emi,
                l.status,
                l.applied_date,
                u.email AS user_email,
                u.name AS user_name
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.loan_id = %s
            """,
            (loan_id,),
        )
        loan_row = cursor.fetchone()
        if not loan_row:
            return jsonify({"error": "Loan not found."}), 404

        loan = {
            "loan_id": loan_row[0],
            "user_id": loan_row[1],
            "loan_amount": float(loan_row[2]),
            "tenure": int(loan_row[3]),
            "interest_rate": float(loan_row[4]),
            "emi": float(loan_row[5]),
            "status": loan_row[6],
            "applied_date": loan_row[7].isoformat() if loan_row[7] else None,
            "user_email": loan_row[8],
            "user_name": loan_row[9],
        }

        cursor.execute(
            """
            SELECT
                id, full_name, contact_email, primary_mobile, alternate_mobile,
                dob, address_line1, address_line2, city, state, postal_code,
                pan_number, aadhaar_number, monthly_income, employer_name,
                employment_type, loan_purpose, notes, created_at
            FROM loan_application_details
            WHERE loan_id = %s
            """,
            (loan_id,),
        )
        detail_row = cursor.fetchone()
        applicant = None
        if detail_row:
            applicant = {
                "id": detail_row[0],
                "full_name": detail_row[1],
                "contact_email": detail_row[2],
                "primary_mobile": detail_row[3],
                "alternate_mobile": detail_row[4],
                "dob": str(detail_row[5]) if detail_row[5] else None,
                "address_line1": detail_row[6],
                "address_line2": detail_row[7],
                "city": detail_row[8],
                "state": detail_row[9],
                "postal_code": detail_row[10],
                "pan_number": detail_row[11],
                "aadhaar_number": detail_row[12],
                "monthly_income": float(detail_row[13]) if detail_row[13] else None,
                "employer_name": detail_row[14],
                "employment_type": detail_row[15],
                "loan_purpose": detail_row[16],
                "notes": detail_row[17],
                "created_at": detail_row[18].isoformat() if detail_row[18] else None,
            }

        cursor.execute(
            """
            SELECT document_id, document_type, original_filename, stored_filename, file_path, uploaded_at
            FROM loan_documents
            WHERE loan_id = %s
            ORDER BY document_id
            """,
            (loan_id,),
        )
        doc_rows = cursor.fetchall()
        documents = [
            {
                "document_id": row[0],
                "document_type": row[1],
                "original_filename": row[2],
                "stored_filename": row[3],
                "file_path": row[4],
                "uploaded_at": row[5].isoformat() if row[5] else None,
                "view_url": f"/api/admin/document/{row[0]}",
            }
            for row in doc_rows
        ]

        return jsonify({
            "loan": loan,
            "applicant": applicant,
            "documents": documents,
        }), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/loans/<int:loan_id>/status", methods=["PATCH", "POST"])
def admin_update_loan_status(loan_id):
    """Accept or reject loan. Body: { "status": "Approved" } or { "status": "Rejected" }"""
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip()

    if new_status not in ("Approved", "Rejected", "Accepted"):
        if new_status.lower() == "accepted":
            new_status = "Approved"
        else:
            return jsonify({"error": "Invalid status. Use 'Approved' or 'Rejected'."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE loans SET status = %s WHERE loan_id = %s",
            (new_status, loan_id),
        )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Loan not found."}), 404

        return jsonify({
            "message": f"Loan status updated to {new_status}.",
            "loan_id": loan_id,
            "status": new_status,
        }), 200

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/document/<int:document_id>", methods=["GET"])
def admin_serve_document(document_id):
    """Serve uploaded document file for admin viewing."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT file_path, original_filename FROM loan_documents WHERE document_id = %s",
            (document_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Document not found."}), 404

        rel_path, original_filename = row[0], row[1]
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(base_dir, rel_path)

        if not os.path.isfile(full_path):
            return jsonify({"error": "File not found on server."}), 404

        return send_file(
            full_path,
            as_attachment=False,
            download_name=original_filename or "document",
        )

    except Exception:
        return jsonify({"error": "Could not serve document."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

