from flask import Blueprint, jsonify, request, send_file
import base64
from datetime import datetime
import json
import logging
import os
import re
from uuid import uuid4

import mysql.connector
from markupsafe import escape
from werkzeug.utils import secure_filename

from database import get_connection

loan_bp = Blueprint("loan", __name__)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

LOAN_PURPOSE_DOCS = {
    "Home Loan": ["Land Document", "Approved Building Plan", "Property Registration"],
    "Education Loan": ["Bonafide Certificate", "Fee Structure", "Academic Records"],
    "Vehicle Loan": ["Proforma Invoice", "RC Copy"],
    "Business Loan": ["Business Registration Proof", "Bank Statements", "GST Certificate"],
}

EMPLOYMENT_DOCS = {
    "Salaried": ["Latest 3 Salary Slips", "Form 16", "Bank Statement (6 Months)"],
    "Self-Employed": ["ITR (Last 2 Years)", "Business Bank Statement", "Profit & Loss Statement", "GST Returns"],
    "Student": ["Co-applicant Income Proof", "Sponsor Bank Statement"],
    "Retired": ["Pension Statement", "Bank Statement (6 Months)"],
    "Other": ["Income Source Proof", "Recent Bank Statement"],
}


def _related_income_document_labels(related_parties, party_prefix):
    labels = []
    for index, party in enumerate(related_parties or [], start=1):
        employment_type = (party.get("employment_type") or "").strip()
        required_docs = EMPLOYMENT_DOCS.get(employment_type, [])
        for doc_name in required_docs:
            labels.append(f"{party_prefix} {index} Income - {doc_name}")
    return labels


def _related_kyc_document_labels(related_parties, party_prefix):
    labels = []
    for index, _ in enumerate(related_parties or [], start=1):
        labels.extend([
            f"{party_prefix} {index} PAN Front",
            f"{party_prefix} {index} PAN Back",
            f"{party_prefix} {index} Aadhaar Front",
            f"{party_prefix} {index} Aadhaar Back",
        ])
    return labels

DOCUMENT_STATUS_ALLOWED = {"under_review", "accepted", "rejected"}


def _normalize_document_status(raw_status, default="under_review"):
    value = (raw_status or "").strip().lower().replace("-", "_").replace(" ", "_")
    if value in ("accepted", "approved"):
        return "accepted"
    if value == "rejected":
        return "rejected"
    if value == "pending":
        return "under_review"
    if value in ("under_review", "underreview"):
        return "under_review"
    return default


def _document_status_payload(raw_status):
    normalized = _normalize_document_status(raw_status)
    if normalized == "accepted":
        return {"key": "accepted", "label": "Accepted", "color": "green"}
    if normalized == "rejected":
        return {"key": "rejected", "label": "Rejected", "color": "red"}
    return {"key": "under_review", "label": "Under Review", "color": "amber"}


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


def _calculate_cibil_score(cursor, user_id):
    """Calculate CIBIL score from historical loans using dashboard scoring rules."""
    cursor.execute(
        """
        SELECT status
        FROM loans
        WHERE user_id = %s AND status NOT IN ('Draft', 'Archived')
        """,
        (user_id,),
    )
    statuses = [(row[0] or "").strip().lower() for row in cursor.fetchall()]

    accepted = sum(1 for s in statuses if s in ("approved", "accepted"))
    rejected = sum(1 for s in statuses if s == "rejected")
    pending = sum(1 for s in statuses if s not in ("approved", "accepted", "rejected"))

    score = 650 + accepted * 50 - rejected * 80 + pending * 5
    return max(300, min(900, score))


def _safe_iso(value):
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _safe_float(value, default=None):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _coerce_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return default


def _normalize_related_party(item):
    if not isinstance(item, dict):
        return None

    def _as_text(*keys):
        for key in keys:
            value = item.get(key)
            if value is not None:
                text = str(value).strip()
                if text:
                    return text
        return None

    monthly_income = _safe_float(item.get("monthly_income"), None)
    if monthly_income is None:
        annual_income = _safe_float(item.get("annual_income"), None)
        if annual_income is not None:
            monthly_income = round(annual_income / 12.0, 2)

    full_name = _as_text("full_name", "name")
    if full_name:
        full_name = str(escape(full_name))

    address_line1 = _as_text("address_line1")
    if address_line1:
        address_line1 = str(escape(address_line1))

    address_line2 = _as_text("address_line2")
    if address_line2:
        address_line2 = str(escape(address_line2))

    employer_name = _as_text("employer_name")
    if employer_name:
        employer_name = str(escape(employer_name))

    return {
        "full_name": full_name,
        "contact_email": _as_text("contact_email", "email"),
        "primary_mobile": _as_text("primary_mobile", "mobile"),
        "dob": _as_text("dob"),
        "address_line1": address_line1,
        "address_line2": address_line2,
        "city": _as_text("city"),
        "state": _as_text("state"),
        "postal_code": _as_text("postal_code"),
        "pan_number": _as_text("pan_number"),
        "aadhaar_number": _as_text("aadhaar_number"),
        "monthly_income": monthly_income,
        "employer_name": employer_name,
        "employment_type": _as_text("employment_type"),
        "relationship": _as_text("relationship"),
    }


def _parse_related_party_payload(form_data, json_key, legacy_prefix):
    raw_json = form_data.get(json_key) if hasattr(form_data, "get") else None
    # Accept common aliases used by clients (e.g., coapplicants / guarantors).
    if raw_json in (None, "") and json_key.endswith("_json") and hasattr(form_data, "get"):
        alias_key = json_key[:-5]
        raw_json = form_data.get(alias_key)

    if raw_json in (None, "") and hasattr(form_data, "get"):
        plural_alias = f"{legacy_prefix}s"
        raw_json = form_data.get(plural_alias)

    if raw_json in (None, "") and hasattr(form_data, "get"): 
        raw_json = form_data.get(legacy_prefix)
    raw_items = []

    if isinstance(raw_json, str) and raw_json.strip():
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, list):
                raw_items = parsed
            elif isinstance(parsed, dict):
                raw_items = [parsed]
        except (TypeError, ValueError):
            raw_items = []
    elif isinstance(raw_json, list):
        raw_items = raw_json
    elif isinstance(raw_json, dict):
        raw_items = [raw_json]

    if not raw_items:
        # Backward compatibility for older clients sending only one related party.
        fallback = {
            "full_name": (form_data.get(f"{legacy_prefix}_name") or "").strip(),
            "relationship": (form_data.get(f"{legacy_prefix}_relationship") or "").strip(),
            "primary_mobile": (form_data.get(f"{legacy_prefix}_mobile") or "").strip(),
            "pan_number": (form_data.get(f"{legacy_prefix}_pan_number") or "").strip(),
            "aadhaar_number": (form_data.get(f"{legacy_prefix}_aadhaar_number") or "").strip(),
            "annual_income": (form_data.get(f"{legacy_prefix}_annual_income") or "").strip(),
        }
        if any(v for v in fallback.values()):
            raw_items = [fallback]

    normalized = []
    for item in raw_items[:10]:
        data = _normalize_related_party(item)
        if not data:
            continue
        if not any(data.values()):
            continue
        normalized.append(data)
    return normalized


def _validate_related_party_for_api(item, label):
    required_party_fields = [
        "full_name",
        "primary_mobile",
        "dob",
        "address_line1",
        "city",
        "state",
        "postal_code",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "relationship",
    ]
    if any(not item.get(field) for field in required_party_fields):
        return f"Missing mandatory fields for {label}."

    if item.get("contact_email") and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", item["contact_email"]):
        return f"{label} contact_email is invalid."
    if not re.match(r"^[6-9]\d{9}$", item["primary_mobile"]):
        return f"{label} primary_mobile must be a valid 10-digit Indian number."
    if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", item["pan_number"]):
        return f"{label} pan_number must be in format ABCDE1234F."
    if not re.match(r"^\d{12}$", item["aadhaar_number"]):
        return f"{label} aadhaar_number must be exactly 12 digits."
    if not re.match(r"^\d{6}$", item["postal_code"]):
        return f"{label} postal_code must be exactly 6 digits."

    return None


def _loan_exists_for_party_api(cursor, loan_id, email=None):
    if email:
        cursor.execute(
            """
            SELECT l.loan_id
            FROM loans l
            JOIN users u ON u.user_id = l.user_id
            WHERE l.loan_id = %s AND u.email = %s
            """,
            (loan_id, email),
        )
    else:
        cursor.execute("SELECT loan_id FROM loans WHERE loan_id = %s", (loan_id,))
    return cursor.fetchone() is not None


def _fetch_related_rows(cursor, table_name, id_column, loan_id):
    if not _table_exists(cursor, table_name):
        return []

    table_cols = _table_columns(cursor, table_name)
    select_order = [
        id_column,
        "loan_id",
        "full_name",
        "contact_email",
        "primary_mobile",
        "dob",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "employer_name",
        "employment_type",
        "relationship",
        "created_at",
    ]
    select_cols = [c for c in select_order if c in table_cols]
    if not select_cols:
        return []

    cursor.execute(
        f"SELECT {', '.join(select_cols)} FROM {table_name} WHERE loan_id = %s ORDER BY {id_column}",
        (loan_id,),
    )
    rows = cursor.fetchall()
    results = []
    for row in rows:
        item = {}
        for idx, col in enumerate(select_cols):
            value = row[idx] if idx < len(row) else None
            if col == "monthly_income":
                item[col] = _safe_float(value)
            elif col in {"created_at", "dob"}:
                item[col] = _safe_iso(value)
            else:
                item[col] = value
        results.append(item)
    return results


def _insert_related_row(cursor, table_name, loan_id, payload):
    table_cols = _table_columns(cursor, table_name)
    ordered_cols = [
        "loan_id",
        "full_name",
        "contact_email",
        "primary_mobile",
        "dob",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "pan_number",
        "aadhaar_number",
        "monthly_income",
        "employer_name",
        "employment_type",
        "relationship",
    ]
    insert_cols = [c for c in ordered_cols if c in table_cols]
    if not insert_cols:
        return None

    values = []
    for col in insert_cols:
        if col == "loan_id":
            values.append(loan_id)
        else:
            values.append(payload.get(col))

    placeholders = ", ".join(["%s"] * len(insert_cols))
    cursor.execute(
        f"INSERT INTO {table_name} ({', '.join(insert_cols)}) VALUES ({placeholders})",
        tuple(values),
    )
    return cursor.lastrowid


def _validate_upload_file(file_obj, document_type_label: str):
    if file_obj is None or not getattr(file_obj, "filename", ""):
        raise ValueError(f"Missing file for '{document_type_label}'.")


    original_filename = file_obj.filename
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '{ext}' not allowed for '{document_type_label}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)
    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File '{original_filename}' exceeds {MAX_FILE_SIZE_MB}MB limit."
        )


def _normalize_json_upload_entry(entry, default_label):
    if entry is None:
        return None

    if isinstance(entry, str):
        return {
            "filename": default_label,
            "content": entry,
            "content_type": None,
        }

    if not isinstance(entry, dict):
        return None

    content = entry.get("content")
    if content is None:
        content = entry.get("base64")

    if content is None:
        return None

    return {
        "filename": (entry.get("filename") or default_label).strip() or default_label,
        "content": content,
        "content_type": (entry.get("content_type") or entry.get("mime_type") or "").strip() or None,
    }


def _decode_json_upload_content(content, document_type_label):
    if not isinstance(content, str) or not content.strip():
        raise ValueError(f"Missing file content for '{document_type_label}'.")

    raw_content = content.strip()
    if raw_content.startswith("data:") and "," in raw_content:
        raw_content = raw_content.split(",", 1)[1]

    try:
        file_bytes = base64.b64decode(raw_content, validate=True)
    except Exception as exc:
        raise ValueError(f"Invalid base64 content for '{document_type_label}'.") from exc

    if not file_bytes:
        raise ValueError(f"Empty file content for '{document_type_label}'.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File for '{document_type_label}' exceeds {MAX_FILE_SIZE_MB}MB limit."
        )

    return file_bytes


def _loan_required_document_labels(loan_purpose, employment_type, coapplicants, guarantors):
    expected_loan_docs = LOAN_PURPOSE_DOCS.get(loan_purpose or "", [])
    expected_employment_docs = EMPLOYMENT_DOCS.get(employment_type or "", [])
    expected_coapplicant_kyc_docs = _related_kyc_document_labels(coapplicants, "Co-applicant")
    expected_guarantor_kyc_docs = _related_kyc_document_labels(guarantors, "Guarantor")
    expected_coapplicant_income_docs = _related_income_document_labels(coapplicants, "Co-applicant")
    expected_guarantor_income_docs = _related_income_document_labels(guarantors, "Guarantor")

    return set(
        [
            "PAN",
            "Aadhaar",
            "Applicant PAN Back",
            "Applicant Aadhaar Back",
        ]
        + expected_loan_docs
        + [f"Income - {d}" for d in expected_employment_docs]
        + expected_coapplicant_kyc_docs
        + expected_guarantor_kyc_docs
        + expected_coapplicant_income_docs
        + expected_guarantor_income_docs
    )


def _save_uploaded_document(cursor, loan_id, loan_folder, document_columns, file_obj, document_type_label):
    if file_obj is None or not getattr(file_obj, "filename", ""):
        return None

    original_filename = file_obj.filename
    _validate_upload_file(file_obj, document_type_label)

    safe_name = secure_filename(original_filename) or "file"
    unique_prefix = uuid4().hex
    stored_filename = f"{unique_prefix}_{safe_name}"
    file_path = os.path.join(loan_folder, stored_filename)
    file_obj.save(file_path)

    relative_path = os.path.relpath(file_path, os.path.dirname(__file__))

    if "document_status" in document_columns and "updated_at" in document_columns:
        cursor.execute(
            """
            INSERT INTO loan_documents (
                loan_id,
                document_type,
                original_filename,
                stored_filename,
                file_path,
                document_status,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                loan_id,
                document_type_label,
                original_filename,
                stored_filename,
                relative_path,
                "under_review",
            ),
        )
    elif "document_status" in document_columns:
        cursor.execute(
            """
            INSERT INTO loan_documents (
                loan_id,
                document_type,
                original_filename,
                stored_filename,
                file_path,
                document_status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                loan_id,
                document_type_label,
                original_filename,
                stored_filename,
                relative_path,
                "under_review",
            ),
        )
    else:
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

    return document_type_label


def _save_uploaded_document_bytes(
    cursor,
    loan_id,
    loan_folder,
    document_columns,
    file_bytes,
    original_filename,
    document_type_label,
):
    if file_bytes is None:
        return None

    safe_name = secure_filename(original_filename or "file") or "file"
    unique_prefix = uuid4().hex
    stored_filename = f"{unique_prefix}_{safe_name}"
    file_path = os.path.join(loan_folder, stored_filename)

    with open(file_path, "wb") as handle:
        handle.write(file_bytes)

    relative_path = os.path.relpath(file_path, os.path.dirname(__file__))

    if "document_status" in document_columns and "updated_at" in document_columns:
        cursor.execute(
            """
            INSERT INTO loan_documents (
                loan_id,
                document_type,
                original_filename,
                stored_filename,
                file_path,
                document_status,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                loan_id,
                document_type_label,
                original_filename,
                stored_filename,
                relative_path,
                "under_review",
            ),
        )
    elif "document_status" in document_columns:
        cursor.execute(
            """
            INSERT INTO loan_documents (
                loan_id,
                document_type,
                original_filename,
                stored_filename,
                file_path,
                document_status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                loan_id,
                document_type_label,
                original_filename,
                stored_filename,
                relative_path,
                "under_review",
            ),
        )
    else:
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

    return document_type_label


def _build_document_payload(row):
    status_payload = _document_status_payload(row[6] if len(row) > 6 else None)
    front_verified = _coerce_bool(row[8] if len(row) > 8 else False)
    back_verified = _coerce_bool(row[9] if len(row) > 9 else False)
    is_fully_verified = _coerce_bool(
        row[10] if len(row) > 10 else (front_verified and back_verified)
    )
    return {
        "document_id": row[0],
        "document_type": row[1],
        "original_filename": row[2],
        "stored_filename": row[3],
        "file_path": row[4],
        "uploaded_at": _safe_iso(row[5]),
        "document_status": status_payload["key"],
        "document_status_label": status_payload["label"],
        "document_status_color": status_payload["color"],
        "updated_at": _safe_iso(row[7] if len(row) > 7 else None),
        "front_verified": front_verified,
        "back_verified": back_verified,
        "is_fully_verified": is_fully_verified,
    }


@loan_bp.route("/api/loan/apply", methods=["POST"])
def apply_loan():
    # Support both JSON and multipart/form-data. For uploads we expect multipart.
    is_json_request = bool(request.is_json or (request.content_type and request.content_type.startswith("application/json")))
    if request.content_type and request.content_type.startswith(
        "multipart/form-data"
    ):
        form_data = request.form
    else:
        form_data = request.get_json() or {}

    def _get(field_name: str) -> str:
        return (form_data.get(field_name) or "").strip()

    email = _get("email")
    submission_type = (_get("submission_type") or "submit").lower()
    agreement_decision = (_get("agreement_decision") or "").lower()
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
    parent_name = _get("parent_name")
    parent_occupation = _get("parent_occupation")
    parent_annual_income_raw = _get("parent_annual_income")
    coapplicants = _parse_related_party_payload(form_data, "coapplicants_json", "coapplicant")
    guarantors = _parse_related_party_payload(form_data, "guarantors_json", "guarantor")

    if submission_type not in ("submit", "draft"):
        submission_type = "submit"

    is_draft = submission_type == "draft"

    if not email:
        return jsonify({"error": "Email is required."}), 400

    if not is_draft:
        if agreement_decision not in ("accepted", "denied"):
            return jsonify({"error": "Please select agreement decision (Accepted or Denied)."}), 400

        if agreement_decision != "accepted":
            return jsonify({"error": "You must accept the agreement to submit the loan application."}), 400

        if not loan_amount_raw or not tenure_raw:
            return (
                jsonify({"error": "Email, loan amount and tenure are required."}),
                400,
            )

        cibil_score_raw = _get("cibil_score")
        if not cibil_score_raw:
            return jsonify({"error": "CIBIL score is required."}), 400
        try:
            cibil_score_input = int(cibil_score_raw)
        except ValueError:
            return jsonify({"error": "CIBIL score must be a number between 300 and 900."}), 400
        if cibil_score_input < 300 or cibil_score_input > 900:
            return jsonify({"error": "CIBIL score must be between 300 and 900."}), 400

        required_text_fields = [
            full_name,
            contact_email,
            primary_mobile,
            dob,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            pan_number,
            aadhaar_number,
            monthly_income_raw,
            employer_name,
            employment_type,
            loan_purpose,
        ]
        if any(not field for field in required_text_fields):
            return (
                jsonify(
                    {
                        "error": "All fields are required except alternate mobile number."
                    }
                ),
                400,
            )

        def _validate_party_rows(items, label):
            for idx, row in enumerate(items, start=1):
                required_party_fields = [
                    "full_name",
                    "primary_mobile",
                    "pan_number",
                    "aadhaar_number",
                    "monthly_income",
                    "relationship",
                    "dob",
                    "address_line1",
                    "city",
                    "state",
                    "postal_code",
                ]
                if any(not row.get(field) for field in required_party_fields):
                    return f"Please complete all mandatory fields for {label} {idx}."

                if row.get("contact_email") and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", row["contact_email"]):
                    return f"{label} {idx} contact email is invalid."
                if not re.match(r"^[6-9]\d{9}$", row["primary_mobile"]):
                    return f"{label} {idx} mobile must be a valid 10-digit Indian number."
                if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", row["pan_number"]):
                    return f"{label} {idx} PAN must be in format ABCDE1234F."
                if not re.match(r"^\d{12}$", row["aadhaar_number"]):
                    return f"{label} {idx} Aadhaar must be exactly 12 digits."
                if not re.match(r"^\d{6}$", row["postal_code"]):
                    return f"{label} {idx} postal code must be exactly 6 digits."

            return None

        co_party_error = _validate_party_rows(coapplicants, "Co-applicant")
        if co_party_error:
            return jsonify({"error": co_party_error}), 400

        guarantor_error = _validate_party_rows(guarantors, "Guarantor")
        if guarantor_error:
            return jsonify({"error": guarantor_error}), 400

        # Validate parent income details for Education Loan
        if loan_purpose == "Education Loan":
            if not parent_name or not parent_occupation or not parent_annual_income_raw:
                return jsonify({"error": "Parent income details are required for Education Loan."}), 400
            try:
                parent_annual_income = float(parent_annual_income_raw)
                if parent_annual_income <= 0:
                    return jsonify({"error": "Parent annual income must be greater than zero."}), 400
            except ValueError:
                return jsonify({"error": "Parent annual income must be a valid number."}), 400
        else:
            parent_annual_income = None

        # Format validation for sensitive fields
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan_number):
            return jsonify({"error": "PAN must be in format ABCDE1234F."}), 400
        if not re.match(r"^\d{12}$", aadhaar_number):
            return jsonify({"error": "Aadhaar must be exactly 12 digits."}), 400
        if not re.match(r"^[6-9]\d{9}$", primary_mobile):
            return jsonify({"error": "Primary mobile must be a valid 10-digit Indian number."}), 400
        if alternate_mobile and not re.match(r"^[6-9]\d{9}$", alternate_mobile):
            return jsonify({"error": "Alternate mobile must be a valid 10-digit number."}), 400
        if not re.match(r"^\d{6}$", postal_code):
            return jsonify({"error": "Postal code must be exactly 6 digits."}), 400

        try:
            loan_amount = float(loan_amount_raw)
            tenure = int(tenure_raw)
            monthly_income = float(monthly_income_raw)
        except ValueError:
            return (
                jsonify(
                    {
                        "error": "Loan amount/monthly income must be numbers and tenure must be an integer."
                    }
                ),
                400,
            )

        interest_rate_raw = _get("interest_rate")
        try:
            interest_rate = float(interest_rate_raw)
        except ValueError:
            return jsonify({"error": "Interest rate must be a valid number."}), 400

        if loan_amount <= 0 or tenure <= 0 or monthly_income <= 0 or interest_rate <= 0:
            return (
                jsonify(
                    {
                        "error": "Loan amount, monthly income, interest rate and tenure must be greater than zero."
                    }
                ),
                400,
            )

        required_file_keys = [
            "pan_file",
            "aadhaar_file",
        ]
        missing_core_files = [
            key for key in required_file_keys
            if not request.files.get(key) or not getattr(request.files.get(key), "filename", "")
        ]
        if missing_core_files:
            return jsonify({"error": "All upload files are mandatory for final submission."}), 400

        expected_loan_docs = LOAN_PURPOSE_DOCS.get(loan_purpose, [])
        expected_employment_docs = EMPLOYMENT_DOCS.get(employment_type, [])
        expected_coapplicant_kyc_docs = _related_kyc_document_labels(coapplicants, "Co-applicant")
        expected_guarantor_kyc_docs = _related_kyc_document_labels(guarantors, "Guarantor")
        expected_coapplicant_income_docs = _related_income_document_labels(coapplicants, "Co-applicant")
        expected_guarantor_income_docs = _related_income_document_labels(guarantors, "Guarantor")
        expected_dynamic_labels = set(
            expected_loan_docs
            + [f"Income - {d}" for d in expected_employment_docs]
            + expected_coapplicant_kyc_docs
            + expected_guarantor_kyc_docs
            + expected_coapplicant_income_docs
            + expected_guarantor_income_docs
        )
        submitted_labels = form_data.getlist("document_types[]") if hasattr(form_data, "getlist") else []
        submitted_files = request.files.getlist("document_files[]") if hasattr(request.files, "getlist") else []
        valid_submitted_labels = {
            label for index, label in enumerate(submitted_labels)
            if index < len(submitted_files) and submitted_files[index] and getattr(submitted_files[index], "filename", "")
        }
        missing_dynamic = expected_dynamic_labels - valid_submitted_labels
        if missing_dynamic:
            return jsonify({"error": "Please upload all mandatory loan and employment documents for applicant, co-applicant, and guarantor."}), 400
    else:
        # Draft path — relax validation, parse whatever is available
        try:
            loan_amount = float(loan_amount_raw) if loan_amount_raw else 0
        except ValueError:
            loan_amount = 0
        try:
            tenure = int(tenure_raw) if tenure_raw else 0
        except ValueError:
            tenure = 0

        monthly_income = None
        if monthly_income_raw:
            try:
                monthly_income = float(monthly_income_raw)
            except ValueError:
                monthly_income = None

        interest_rate_raw = _get("interest_rate")
        try:
            interest_rate = float(interest_rate_raw) if interest_rate_raw else 10.0
        except ValueError:
            interest_rate = 10.0

        parent_annual_income = None
        if parent_annual_income_raw:
            try:
                parent_annual_income = float(parent_annual_income_raw)
            except ValueError:
                parent_annual_income = None

        cibil_score = None

    # Compute EMI (skip if missing data)
    emi = 0
    if loan_amount > 0 and tenure > 0 and interest_rate > 0:
        monthly_rate = interest_rate / 12 / 100.0
        if monthly_rate == 0:
            emi = loan_amount / tenure
        else:
            try:
                if tenure > 1200:
                    return jsonify({"error": "Tenure exceeds maximum allowable value (1200 months)."}), 400
                if interest_rate > 100:
                    return jsonify({"error": "Interest rate cannot exceed 100%."}), 400
                emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** tenure) / (
                    (1 + monthly_rate) ** tenure - 1
                )
            except OverflowError:
                return jsonify({"error": "Interest calculation resulted in a math overflow. Please verify tenure and interest rate inputs."}), 400

    status_label = "Draft" if is_draft else "Pending"

    # Sanitize free-text fields to prevent stored XSS
    full_name = str(escape(full_name)) if full_name else full_name
    address_line1 = str(escape(address_line1)) if address_line1 else address_line1
    address_line2 = str(escape(address_line2)) if address_line2 else address_line2
    employer_name = str(escape(employer_name)) if employer_name else employer_name
    parent_name = str(escape(parent_name)) if parent_name else parent_name
    parent_occupation = str(escape(parent_occupation)) if parent_occupation else parent_occupation

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
        cibil_score = _calculate_cibil_score(cursor, user_id)

        # Once user submits a final application, older server drafts should not reload.
        cursor.execute(
            "UPDATE loans SET status = 'Archived' WHERE user_id = %s AND status = 'Draft'",
            (user_id,),
        )

        cursor.execute(
            """
            INSERT INTO loans (user_id, loan_amount, tenure, interest_rate, emi, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, loan_amount, tenure, interest_rate, emi, status_label),
        )
        loan_id = cursor.lastrowid

        # Insert detailed application information
        details_columns = _table_columns(cursor, "loan_application_details")
        first_coapplicant = coapplicants[0] if coapplicants else {}
        first_guarantor = guarantors[0] if guarantors else {}

        details_payload = {
            "loan_id": loan_id,
            "full_name": full_name,
            "contact_email": contact_email,
            "primary_mobile": primary_mobile,
            "alternate_mobile": alternate_mobile or None,
            "dob": dob or None,
            "address_line1": address_line1 or None,
            "address_line2": address_line2 or None,
            "city": city or None,
            "state": state or None,
            "postal_code": postal_code or None,
            "pan_number": pan_number,
            "aadhaar_number": aadhaar_number,
            "monthly_income": monthly_income,
            "employer_name": employer_name or None,
            "employment_type": employment_type or None,
            "loan_purpose": loan_purpose,
            "parent_name": parent_name or None,
            "parent_occupation": parent_occupation or None,
            "parent_annual_income": parent_annual_income,
            "cibil_score": cibil_score,
            "coapplicant_name": first_coapplicant.get("full_name"),
            "coapplicant_relationship": first_coapplicant.get("relationship"),
            "coapplicant_mobile": first_coapplicant.get("primary_mobile"),
            "coapplicant_pan_number": first_coapplicant.get("pan_number"),
            "coapplicant_aadhaar_number": first_coapplicant.get("aadhaar_number"),
            "coapplicant_annual_income": round(first_coapplicant.get("monthly_income", 0) * 12, 2)
            if first_coapplicant.get("monthly_income") is not None
            else None,
            "guarantor_name": first_guarantor.get("full_name"),
            "guarantor_relationship": first_guarantor.get("relationship"),
            "guarantor_mobile": first_guarantor.get("primary_mobile"),
            "guarantor_pan_number": first_guarantor.get("pan_number"),
            "guarantor_aadhaar_number": first_guarantor.get("aadhaar_number"),
            "guarantor_annual_income": round(first_guarantor.get("monthly_income", 0) * 12, 2)
            if first_guarantor.get("monthly_income") is not None
            else None,
            "coapplicants_json": json.dumps(coapplicants) if coapplicants else None,
            "guarantors_json": json.dumps(guarantors) if guarantors else None,
        }

        ordered_columns = [
            "loan_id",
            "full_name",
            "contact_email",
            "primary_mobile",
            "alternate_mobile",
            "dob",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "pan_number",
            "aadhaar_number",
            "monthly_income",
            "employer_name",
            "employment_type",
            "loan_purpose",
            "parent_name",
            "parent_occupation",
            "parent_annual_income",
            "cibil_score",
            "coapplicant_name",
            "coapplicant_relationship",
            "coapplicant_mobile",
            "coapplicant_pan_number",
            "coapplicant_aadhaar_number",
            "coapplicant_annual_income",
            "guarantor_name",
            "guarantor_relationship",
            "guarantor_mobile",
            "guarantor_pan_number",
            "guarantor_aadhaar_number",
            "guarantor_annual_income",
            "coapplicants_json",
            "guarantors_json",
        ]
        insert_columns = [c for c in ordered_columns if c in details_columns]
        insert_values = [details_payload[c] for c in insert_columns]
        placeholders = ", ".join(["%s"] * len(insert_columns))
        cursor.execute(
            f"INSERT INTO loan_application_details ({', '.join(insert_columns)}) VALUES ({placeholders})",
            tuple(insert_values),
        )

        def _insert_related_parties(table_name, related_items):
            inserted_rows = []
            if not related_items or not _table_exists(cursor, table_name):
                return inserted_rows

            related_columns = _table_columns(cursor, table_name)
            ordered_related_columns = [
                "loan_id",
                "full_name",
                "contact_email",
                "primary_mobile",
                "dob",
                "address_line1",
                "address_line2",
                "city",
                "state",
                "postal_code",
                "pan_number",
                "aadhaar_number",
                "monthly_income",
                "employer_name",
                "employment_type",
                "relationship",
            ]
            insert_related_columns = [c for c in ordered_related_columns if c in related_columns]
            if not insert_related_columns:
                return inserted_rows

            placeholders_related = ", ".join(["%s"] * len(insert_related_columns))
            for related in related_items:
                row_values = []
                for col in insert_related_columns:
                    if col == "loan_id":
                        row_values.append(loan_id)
                    else:
                        row_values.append(related.get(col))
                cursor.execute(
                    f"INSERT INTO {table_name} ({', '.join(insert_related_columns)}) VALUES ({placeholders_related})",
                    tuple(row_values),
                )
                row_payload = {"loan_id": loan_id, "row_id": cursor.lastrowid}
                for col in insert_related_columns:
                    if col != "loan_id":
                        row_payload[col] = related.get(col)
                inserted_rows.append(row_payload)

            return inserted_rows

        coapplicants_inserted = _insert_related_parties("coapplicants", coapplicants)
        guarantors_inserted = _insert_related_parties("guarantors", guarantors)

        # Handle document uploads if present
        upload_root = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(upload_root, exist_ok=True)
        loan_folder = os.path.join(upload_root, f"loan_{loan_id}")
        os.makedirs(loan_folder, exist_ok=True)

        document_columns = _table_columns(cursor, "loan_documents") if _table_exists(cursor, "loan_documents") else set()

        def save_and_record(file_obj, document_type_label: str) -> None:
            if file_obj is None or not getattr(file_obj, "filename", ""):
                return

            original_filename = file_obj.filename
            _validate_upload_file(file_obj, document_type_label)

            safe_name = secure_filename(original_filename) or "file"
            unique_prefix = uuid4().hex
            stored_filename = f"{unique_prefix}_{safe_name}"
            file_path = os.path.join(loan_folder, stored_filename)
            file_obj.save(file_path)

            relative_path = os.path.relpath(
                file_path, os.path.dirname(__file__)
            )

            if "document_status" in document_columns and "updated_at" in document_columns:
                cursor.execute(
                    """
                    INSERT INTO loan_documents (
                        loan_id,
                        document_type,
                        original_filename,
                        stored_filename,
                        file_path,
                        document_status,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    """,
                    (
                        loan_id,
                        document_type_label,
                        original_filename,
                        stored_filename,
                        relative_path,
                        "under_review",
                    ),
                )
            elif "document_status" in document_columns:
                cursor.execute(
                    """
                    INSERT INTO loan_documents (
                        loan_id,
                        document_type,
                        original_filename,
                        stored_filename,
                        file_path,
                        document_status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        loan_id,
                        document_type_label,
                        original_filename,
                        stored_filename,
                        relative_path,
                        "under_review",
                    ),
                )
            else:
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

        # Create notification for user on submission
        if not is_draft:
            try:
                cursor2 = conn.cursor()
                cursor2.execute(
                    "INSERT INTO notifications (user_id, loan_id, title, message, type) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, loan_id, f"Loan #{loan_id} Submitted", f"Your loan application #{loan_id} for Rs {loan_amount:,.0f} has been submitted successfully.", "info"),
                )
                # Notify all admins about new loan application
                cursor2.execute("SELECT admin_id FROM admin")
                admin_rows = cursor2.fetchall()
                for arow in admin_rows:
                    cursor2.execute(
                        "INSERT INTO notifications (admin_id, loan_id, title, message, type) VALUES (%s, %s, %s, %s, %s)",
                        (arow[0], loan_id, f"New Loan Application #{loan_id}", f"A new loan application for Rs {loan_amount:,.0f} has been submitted by {full_name or email}.", "info"),
                    )
                conn.commit()
                cursor2.close()
            except Exception:
                pass  # Non-critical

            # Record status history for initial submission
            try:
                cursor3 = conn.cursor()
                cursor3.execute(
                    "INSERT INTO loan_status_history (loan_id, old_status, new_status, changed_by) VALUES (%s, %s, %s, %s)",
                    (loan_id, None, status_label, email),
                )
                conn.commit()
                cursor3.close()
            except Exception:
                pass

            # Send email notifications (non-critical)
            try:
                from emailService import send_loan_submitted_email, send_admin_new_application_email
                send_loan_submitted_email(email, full_name or email, loan_id, loan_amount)
                # Notify admin emails
                cursor_adm = conn.cursor()
                cursor_adm.execute("SELECT email FROM admin")
                for adm in cursor_adm.fetchall():
                    send_admin_new_application_email(adm[0], full_name or email, loan_id, loan_amount)
                cursor_adm.close()
            except Exception:
                pass

        response_payload = {
            "message": "Draft saved." if is_draft else "Loan application submitted.",
            "status": status_label,
            # Backward-compatible top-level id for clients/tests expecting `loan_id`.
            "loan_id": loan_id,
            "loan": {
                "loan_id": loan_id,
                "loan_amount": loan_amount,
                "tenure": tenure,
                "interest_rate": interest_rate,
                "emi": round(emi, 2),
                "status": status_label,
            },
            "coapplicants": coapplicants_inserted,
            "guarantors": guarantors_inserted,
            "saved_counts": {
                "coapplicants": len(coapplicants_inserted),
                "guarantors": len(guarantors_inserted),
            },
        }

        http_status = 201
        return jsonify(response_payload), http_status

    except ValueError as ve:
        if conn is not None:
            conn.rollback()
        return jsonify({"error": str(ve)}), 400

    except mysql.connector.Error as e:
        if conn is not None:
            conn.rollback()
        logger.exception("Apply loan database error")
        err_msg = str(e).strip() if e else "Database error occurred."
        return jsonify({"error": err_msg}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/user/loans", methods=["GET"])
def get_user_loans():
    email = (request.args.get("email") or "").strip()
    status_filter = (request.args.get("status") or "all").strip().lower()

    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1

    try:
        limit = min(50, max(1, int(request.args.get("limit", 10))))
    except ValueError:
        limit = 10

    if not email:
        return jsonify({"message": "Email is required."}), 400

    if status_filter not in {"all", "draft", "pending", "accepted", "rejected", "rework"}:
        status_filter = "all"

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        status_sql = ""
        status_params = []
        if status_filter == "draft":
            status_sql = " AND TRIM(LOWER(l.status)) = 'draft' "
        elif status_filter == "accepted":
            status_sql = " AND TRIM(LOWER(l.status)) IN ('approved', 'accepted') "
        elif status_filter == "rejected":
            status_sql = " AND TRIM(LOWER(l.status)) = 'rejected' "
        elif status_filter == "rework":
            status_sql = " AND TRIM(LOWER(l.status)) = 'rework' "
        elif status_filter == "pending":
            status_sql = " AND TRIM(LOWER(l.status)) NOT IN ('draft', 'archived', 'approved', 'accepted', 'rejected', 'rework') "

        # OPTIMIZED: Single query to get summary + total count (replaces two separate queries)
        cursor.execute(
            f"""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN TRIM(LOWER(l.status)) = 'draft' THEN 1 ELSE 0 END) AS draft_count,
                SUM(CASE WHEN TRIM(LOWER(l.status)) IN ('approved', 'accepted') THEN 1 ELSE 0 END) AS accepted_count,
                SUM(CASE WHEN TRIM(LOWER(l.status)) = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
                SUM(CASE WHEN TRIM(LOWER(l.status)) = 'rework' THEN 1 ELSE 0 END) AS rework_count,
                SUM(CASE WHEN TRIM(LOWER(l.status)) NOT IN ('draft', 'archived', 'approved', 'accepted', 'rejected', 'rework') THEN 1 ELSE 0 END) AS pending_count
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE u.email = %s AND l.status != 'Archived'
            """,
            (email,),
        )
        summary_row = cursor.fetchone() or (0, 0, 0, 0, 0, 0)
        total_items = int(summary_row[0] or 0)

        offset = (page - 1) * limit
        total_pages = max(1, (total_items + limit - 1) // limit)

        # Get paginated loans (filtered by status if needed)
        cursor.execute(
            f"""
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
            WHERE u.email = %s AND l.status != 'Archived'
            {status_sql}
            ORDER BY l.loan_id DESC
            LIMIT %s OFFSET %s
            """,
            tuple([email] + status_params + [limit, offset]),
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

        return jsonify(
            {
                "loans": loans,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total_items": total_items,
                    "total_pages": total_pages,
                    "has_prev": page > 1,
                    "has_next": page < total_pages,
                },
                "summary": {
                    "total": int(summary_row[0] or 0),
                    "draft": int(summary_row[1] or 0),
                    "accepted": int(summary_row[2] or 0),
                    "rejected": int(summary_row[3] or 0),
                    "rework": int(summary_row[4] or 0),
                    "pending": int(summary_row[5] or 0),
                },
            }
        ), 200

    except mysql.connector.Error:
        return jsonify({"message": "Database error occurred."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/loan/draft", methods=["GET"])
def get_latest_draft():
    return jsonify({"draft": None}), 200


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
            "loan_amount": _safe_float(loan_row[2], 0.0),
            "tenure": _safe_int(loan_row[3], 0),
            "interest_rate": _safe_float(loan_row[4], 0.0),
            "emi": _safe_float(loan_row[5], 0.0),
            "status": loan_row[6],
            "applied_date": _safe_iso(loan_row[7]),
            "user_email": loan_row[8],
            "user_name": loan_row[9],
        }

        applicant = None
        if _table_exists(cursor, "loan_application_details"):
            cursor.execute(
                "SELECT * FROM loan_application_details WHERE loan_id = %s",
                (loan_id,),
            )
            detail_row = cursor.fetchone()
            if detail_row:
                cols = [col[0] for col in (cursor.description or [])]
                detail = {cols[i]: detail_row[i] for i in range(min(len(cols), len(detail_row)))}
                applicant = {
                    "id": detail.get("id"),
                    "full_name": detail.get("full_name"),
                    "contact_email": detail.get("contact_email"),
                    "primary_mobile": detail.get("primary_mobile"),
                    "alternate_mobile": detail.get("alternate_mobile"),
                    "dob": str(detail.get("dob")) if detail.get("dob") else None,
                    "address_line1": detail.get("address_line1"),
                    "address_line2": detail.get("address_line2"),
                    "city": detail.get("city"),
                    "state": detail.get("state"),
                    "postal_code": detail.get("postal_code"),
                    "pan_number": detail.get("pan_number"),
                    "aadhaar_number": detail.get("aadhaar_number"),
                    "monthly_income": _safe_float(detail.get("monthly_income")),
                    "employer_name": detail.get("employer_name"),
                    "employment_type": detail.get("employment_type"),
                    "loan_purpose": detail.get("loan_purpose"),
                    "created_at": _safe_iso(detail.get("created_at")),
                    "parent_name": detail.get("parent_name"),
                    "parent_occupation": detail.get("parent_occupation"),
                    "parent_annual_income": _safe_float(detail.get("parent_annual_income")),
                    "cibil_score": detail.get("cibil_score"),
                }

        documents = []
        if _table_exists(cursor, "loan_documents"):
            doc_columns = _table_columns(cursor, "loan_documents")
            has_doc_status = "document_status" in doc_columns
            has_updated_at = "updated_at" in doc_columns
            has_front_verified = "front_verified" in doc_columns
            has_back_verified = "back_verified" in doc_columns
            has_full_verified = "is_fully_verified" in doc_columns

            cursor.execute(
                f"""
                SELECT
                    document_id,
                    document_type,
                    original_filename,
                    stored_filename,
                    file_path,
                    uploaded_at,
                    {"document_status" if has_doc_status else "'under_review' AS document_status"},
                    {"updated_at" if has_updated_at else "uploaded_at AS updated_at"},
                    {"front_verified" if has_front_verified else "0 AS front_verified"},
                    {"back_verified" if has_back_verified else "0 AS back_verified"},
                    {"is_fully_verified" if has_full_verified else "0 AS is_fully_verified"}
                FROM loan_documents
                WHERE loan_id = %s
                ORDER BY document_id
                """,
                (loan_id,),
            )
            doc_rows = cursor.fetchall()
            documents = [_build_document_payload(row) for row in doc_rows]

        coapplicants = _fetch_related_rows(cursor, "coapplicants", "coapplicant_id", loan_id)
        guarantors = _fetch_related_rows(cursor, "guarantors", "guarantor_id", loan_id)

        return jsonify({"loan": loan, "applicant": applicant, "documents": documents, "coapplicants": coapplicants, "guarantors": guarantors}), 200

    except mysql.connector.Error as e:
        logger.exception("User loan detail database error")
        return jsonify({"message": "Database error occurred.", "error": str(e)}), 500

    except Exception:
        logger.exception("User loan detail unexpected error")
        return jsonify({"message": "Failed to load loan details."}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/user/loans/<int:loan_id>/documents/required", methods=["POST"])
def upload_required_documents(loan_id):
    is_multipart_request = bool(request.content_type and request.content_type.startswith("multipart/form-data"))
    if not is_multipart_request:
        return jsonify({"error": "Use multipart/form-data for required document upload."}), 400

    form_data = request.form

    email = form_data.get("email")
    email = (email or "").strip()
    if not email:
        return jsonify({"error": "Email is required."}), 400

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
        if not cursor.fetchone():
            return jsonify({"error": "Loan not found for this user."}), 404

        if not _table_exists(cursor, "loan_documents"):
            return jsonify({"error": "loan_documents table is not available. Run schema migration."}), 500

        if not _table_exists(cursor, "loan_application_details"):
            return jsonify({"error": "loan_application_details not found for required-document calculation."}), 500

        cursor.execute(
            """
            SELECT loan_purpose, employment_type
            FROM loan_application_details
            WHERE loan_id = %s
            LIMIT 1
            """,
            (loan_id,),
        )
        detail_row = cursor.fetchone()
        if not detail_row:
            return jsonify({"error": "Loan application details not found."}), 404

        loan_purpose = (detail_row[0] or "").strip()
        employment_type = (detail_row[1] or "").strip()
        coapplicants = _fetch_related_rows(cursor, "coapplicants", "coapplicant_id", loan_id)
        guarantors = _fetch_related_rows(cursor, "guarantors", "guarantor_id", loan_id)

        required_labels = _loan_required_document_labels(
            loan_purpose,
            employment_type,
            coapplicants,
            guarantors,
        )

        document_columns = _table_columns(cursor, "loan_documents")

        cursor.execute(
            "SELECT document_type FROM loan_documents WHERE loan_id = %s",
            (loan_id,),
        )
        existing_labels = {str((row[0] or "")).strip() for row in cursor.fetchall() if row and row[0]}

        has_uploads = False
        upload_root = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(upload_root, exist_ok=True)
        loan_folder = os.path.join(upload_root, f"loan_{loan_id}")
        os.makedirs(loan_folder, exist_ok=True)

        uploaded_labels = []

        pan_file = request.files.get("pan_file")
        aadhaar_file = request.files.get("aadhaar_file")
        if pan_file and getattr(pan_file, "filename", ""):
            has_uploads = True
            label = _save_uploaded_document(cursor, loan_id, loan_folder, document_columns, pan_file, "PAN")
            if label:
                uploaded_labels.append(label)

        if aadhaar_file and getattr(aadhaar_file, "filename", ""):
            has_uploads = True
            label = _save_uploaded_document(cursor, loan_id, loan_folder, document_columns, aadhaar_file, "Aadhaar")
            if label:
                uploaded_labels.append(label)

        doc_types = form_data.getlist("document_types[]") if hasattr(form_data, "getlist") else []
        doc_files = request.files.getlist("document_files[]") if hasattr(request.files, "getlist") else []

        if isinstance(doc_types, str):
            doc_types = [doc_types]

        for idx, file_obj in enumerate(doc_files):
            if not file_obj or not getattr(file_obj, "filename", ""):
                continue
            has_uploads = True
            doc_label = doc_types[idx] if idx < len(doc_types) else "Supporting Document"
            doc_label = (doc_label or "Supporting Document").strip()
            label = _save_uploaded_document(cursor, loan_id, loan_folder, document_columns, file_obj, doc_label)
            if label:
                uploaded_labels.append(label)

        if not has_uploads:
            return jsonify({"error": "No files uploaded. Send pan_file/aadhaar_file or document_types[] + document_files[]."}), 400

        conn.commit()

        all_uploaded_labels = existing_labels.union(set(uploaded_labels))
        missing_required = sorted(required_labels - all_uploaded_labels)
        moved_to_pending = False

        if not missing_required:
            cursor.execute("SELECT status FROM loans WHERE loan_id = %s", (loan_id,))
            loan_row = cursor.fetchone()
            current_status = (loan_row[0] or "").strip() if loan_row else ""
            if current_status.lower() == "draft":
                cursor.execute("UPDATE loans SET status = 'Pending' WHERE loan_id = %s", (loan_id,))
                moved_to_pending = True
                conn.commit()

        return jsonify(
            {
                "message": "Documents uploaded successfully.",
                "loan_id": loan_id,
                "uploaded_count": len(uploaded_labels),
                "uploaded_labels": uploaded_labels,
                "required_document_count": len(required_labels),
                "all_required_uploaded": len(missing_required) == 0,
                "missing_required_documents": missing_required,
                "loan_submitted": len(missing_required) == 0,
                "moved_to_pending": moved_to_pending,
            }
        ), 200

    except ValueError as ve:
        if conn is not None:
            conn.rollback()
        return jsonify({"error": str(ve)}), 400
    except mysql.connector.Error:
        if conn is not None:
            conn.rollback()
        logger.exception("Required document upload database error")
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


@loan_bp.route("/api/loans/<int:loan_id>/coapplicants", methods=["GET"])
def get_loan_coapplicants(loan_id):
    email = (request.args.get("email") or "").strip() or None
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _loan_exists_for_party_api(cursor, loan_id, email):
            return jsonify({"error": "Loan not found."}), 404

        rows = _fetch_related_rows(cursor, "coapplicants", "coapplicant_id", loan_id)
        return jsonify({"loan_id": loan_id, "coapplicants": rows, "count": len(rows)}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/loans/<int:loan_id>/guarantors", methods=["GET"])
def get_loan_guarantors(loan_id):
    email = (request.args.get("email") or "").strip() or None
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _loan_exists_for_party_api(cursor, loan_id, email):
            return jsonify({"error": "Loan not found."}), 404

        rows = _fetch_related_rows(cursor, "guarantors", "guarantor_id", loan_id)
        return jsonify({"loan_id": loan_id, "guarantors": rows, "count": len(rows)}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/loans/<int:loan_id>/related-parties", methods=["GET"])
def get_loan_related_parties(loan_id):
    email = (request.args.get("email") or "").strip() or None
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _loan_exists_for_party_api(cursor, loan_id, email):
            return jsonify({"error": "Loan not found."}), 404

        co_rows = _fetch_related_rows(cursor, "coapplicants", "coapplicant_id", loan_id)
        gu_rows = _fetch_related_rows(cursor, "guarantors", "guarantor_id", loan_id)
        return jsonify(
            {
                "loan_id": loan_id,
                "coapplicants": co_rows,
                "guarantors": gu_rows,
                "saved_counts": {
                    "coapplicants": len(co_rows),
                    "guarantors": len(gu_rows),
                },
            }
        ), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/loans/<int:loan_id>/coapplicants", methods=["POST"])
def add_loan_coapplicant(loan_id):
    payload = request.get_json() or {}
    party = _normalize_related_party(payload)
    if not party:
        return jsonify({"error": "Invalid payload."}), 400

    validation_error = _validate_related_party_for_api(party, "Co-applicant")
    if validation_error:
        return jsonify({"error": validation_error}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _loan_exists_for_party_api(cursor, loan_id):
            return jsonify({"error": "Loan not found."}), 404

        if not _table_exists(cursor, "coapplicants"):
            return jsonify({"error": "coapplicants table is not available. Run schema migration."}), 500

        row_id = _insert_related_row(cursor, "coapplicants", loan_id, party)
        conn.commit()

        created_row = {"coapplicant_id": row_id, "loan_id": loan_id, **party}
        return jsonify({"message": "Co-applicant added successfully.", "coapplicant": created_row}), 201

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/loans/<int:loan_id>/guarantors", methods=["POST"])
def add_loan_guarantor(loan_id):
    payload = request.get_json() or {}
    party = _normalize_related_party(payload)
    if not party:
        return jsonify({"error": "Invalid payload."}), 400

    validation_error = _validate_related_party_for_api(party, "Guarantor")
    if validation_error:
        return jsonify({"error": validation_error}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if not _loan_exists_for_party_api(cursor, loan_id):
            return jsonify({"error": "Loan not found."}), 404

        if not _table_exists(cursor, "guarantors"):
            return jsonify({"error": "guarantors table is not available. Run schema migration."}), 500

        row_id = _insert_related_row(cursor, "guarantors", loan_id, party)
        conn.commit()

        created_row = {"guarantor_id": row_id, "loan_id": loan_id, **party}
        return jsonify({"message": "Guarantor added successfully.", "guarantor": created_row}), 201

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
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

        try:
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
                u.name AS user_name,
                l.viewed_by_admin
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.status NOT IN ('Draft', 'Archived')
            ORDER BY l.applied_date DESC
            """,
            )
        except mysql.connector.Error:
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
                u.name AS user_name,
                0 AS viewed_by_admin
            FROM loans l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.status NOT IN ('Draft', 'Archived')
            ORDER BY l.applied_date DESC
            """,
            )
        rows = cursor.fetchall()

        loans = []
        for row in rows:
            loans.append(
                {
                    "loan_id": row[0] if len(row) > 0 else None,
                    "loan_amount": float(row[1]) if len(row) > 1 and row[1] is not None else 0.0,
                    "tenure": int(row[2]) if len(row) > 2 and row[2] is not None else 0,
                    "interest_rate": float(row[3]) if len(row) > 3 and row[3] is not None else 0.0,
                    "emi": float(row[4]) if len(row) > 4 and row[4] is not None else 0.0,
                    "status": row[5] if len(row) > 5 else "Pending",
                    "applied_date": row[6].isoformat() if len(row) > 6 and row[6] else None,
                    "user_id": row[7] if len(row) > 7 else None,
                    "user_email": row[8] if len(row) > 8 else None,
                    "user_name": row[9] if len(row) > 9 else None,
                    "viewed_by_admin": bool(row[10]) if len(row) > 10 else False,
                }
            )

        return jsonify({"loans": loans}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/users-loans", methods=["GET"])
def admin_get_users_and_loans():
    """List users with their loan rows, supporting search, status filter, and pagination."""
    query = (request.args.get("q") or "").strip()
    status = (request.args.get("status") or "all").strip().lower()
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        page_size = min(100, max(1, int(request.args.get("page_size", 10))))
    except ValueError:
        page_size = 10

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        base_sql = """
            FROM users u
            LEFT JOIN loans l
              ON l.user_id = u.user_id
              AND l.status NOT IN ('Draft', 'Archived')
            LEFT JOIN loan_application_details lad
              ON lad.loan_id = l.loan_id
            WHERE (
                %s = ''
                OR u.name LIKE %s
                OR u.email LIKE %s
                OR CAST(l.loan_id AS CHAR) LIKE %s
            )
        """
        params = [query, f"%{query}%", f"%{query}%", f"%{query}%"]

        if status == "accepted":
            base_sql += " AND (LOWER(l.status) IN ('approved', 'accepted')) "
        elif status == "no-loan":
            base_sql += " AND l.loan_id IS NULL "
        elif status in ("pending", "under review", "rejected"):
            base_sql += " AND LOWER(COALESCE(l.status, '')) = %s "
            params.append(status)

        cursor.execute(f"SELECT COUNT(*) {base_sql}", tuple(params))
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT
                u.user_id,
                u.name,
                u.email,
                l.loan_id,
                l.loan_amount,
                l.status,
                lad.cibil_score,
                l.applied_date
            {base_sql}
            ORDER BY u.user_id ASC, l.applied_date DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [page_size, offset]),
        )

        rows = cursor.fetchall()
        items = [
            {
                "user_id": row[0],
                "user_name": row[1],
                "email": row[2],
                "loan_id": row[3],
                "loan_amount": float(row[4]) if row[4] is not None else None,
                "loan_status": row[5],
                "cibil_score": row[6],
                "applied_date": row[7].isoformat() if row[7] else None,
            }
            for row in rows
        ]

        total_pages = max(1, (total + page_size - 1) // page_size)
        return jsonify(
            {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
            }
        ), 200

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

        loan_columns = _table_columns(cursor, "loans")
        details_columns = _table_columns(cursor, "loan_application_details")
        document_columns = _table_columns(cursor, "loan_documents") if _table_exists(cursor, "loan_documents") else set()
        has_viewed_by_admin = "viewed_by_admin" in loan_columns
        has_document_status = "document_status" in document_columns
        has_document_updated_at = "updated_at" in document_columns
        has_document_front_verified = "front_verified" in document_columns
        has_document_back_verified = "back_verified" in document_columns
        has_document_full_verified = "is_fully_verified" in document_columns

        parent_name_sql = "parent_name" if "parent_name" in details_columns else "NULL AS parent_name"
        parent_occupation_sql = "parent_occupation" if "parent_occupation" in details_columns else "NULL AS parent_occupation"
        parent_income_sql = "parent_annual_income" if "parent_annual_income" in details_columns else "NULL AS parent_annual_income"
        cibil_sql = "cibil_score" if "cibil_score" in details_columns else "NULL AS cibil_score"

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

        # Auto-transition Pending → Under Review when admin opens it, mark as viewed
        if loan["status"] == "Pending":
            if has_viewed_by_admin:
                cursor.execute(
                    "UPDATE loans SET status = 'Under Review', viewed_by_admin = 1 WHERE loan_id = %s",
                    (loan_id,),
                )
            else:
                cursor.execute(
                    "UPDATE loans SET status = 'Under Review' WHERE loan_id = %s",
                    (loan_id,),
                )

            # Non-critical side effects should not break detail rendering.
            try:
                cursor.execute(
                    "INSERT INTO loan_status_history (loan_id, old_status, new_status, changed_by) VALUES (%s, %s, %s, %s)",
                    (loan_id, "Pending", "Under Review", "admin"),
                )
            except mysql.connector.Error:
                pass

            try:
                cursor.execute(
                    "INSERT INTO notifications (user_id, loan_id, title, message, type) VALUES (%s, %s, %s, %s, %s)",
                    (loan_row[1], loan_id, f"Loan #{loan_id} Under Review",
                     f"Your loan application #{loan_id} is now under review by our team.", "info"),
                )
            except mysql.connector.Error:
                pass

            conn.commit()
            loan["status"] = "Under Review"
        elif not loan_row[6].lower().startswith("pending"):
            # Mark as viewed for non-pending statuses too
            if has_viewed_by_admin:
                cursor.execute("UPDATE loans SET viewed_by_admin = 1 WHERE loan_id = %s", (loan_id,))
                conn.commit()

                if has_document_status:
                        if has_document_updated_at:
                                cursor.execute(
                                        """
                                        UPDATE loan_documents
                                        SET document_status = 'under_review', updated_at = NOW()
                                        WHERE loan_id = %s
                                            AND (
                                                document_status IS NULL
                                                OR LOWER(document_status) IN ('pending', 'under review', 'under_review', '')
                                            )
                                        """,
                                        (loan_id,),
                                )
                        else:
                                cursor.execute(
                                        """
                                        UPDATE loan_documents
                                        SET document_status = 'under_review'
                                        WHERE loan_id = %s
                                            AND (
                                                document_status IS NULL
                                                OR LOWER(document_status) IN ('pending', 'under review', 'under_review', '')
                                            )
                                        """,
                                        (loan_id,),
                                )
                        conn.commit()

        cursor.execute(
            f"""
            SELECT
                id, full_name, contact_email, primary_mobile, alternate_mobile,
                dob, address_line1, address_line2, city, state, postal_code,
                pan_number, aadhaar_number, monthly_income, employer_name,
                employment_type, loan_purpose, created_at,
                {parent_name_sql}, {parent_occupation_sql}, {parent_income_sql}, {cibil_sql}
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
                "created_at": detail_row[17].isoformat() if detail_row[17] else None,
                "parent_name": detail_row[18],
                "parent_occupation": detail_row[19],
                "parent_annual_income": float(detail_row[20]) if detail_row[20] else None,
                "cibil_score": detail_row[21],
            }

        cursor.execute(
            f"""
            SELECT
                document_id,
                document_type,
                original_filename,
                stored_filename,
                file_path,
                uploaded_at,
                {"document_status" if has_document_status else "'under_review' AS document_status"},
                {"updated_at" if has_document_updated_at else "uploaded_at AS updated_at"},
                {"front_verified" if has_document_front_verified else "0 AS front_verified"},
                {"back_verified" if has_document_back_verified else "0 AS back_verified"},
                {"is_fully_verified" if has_document_full_verified else "0 AS is_fully_verified"}
            FROM loan_documents
            WHERE loan_id = %s
            ORDER BY document_id
            """,
            (loan_id,),
        )
        doc_rows = cursor.fetchall()
        documents = [_build_document_payload(row) for row in doc_rows]

        coapplicants = _fetch_related_rows(cursor, "coapplicants", "coapplicant_id", loan_id)
        guarantors = _fetch_related_rows(cursor, "guarantors", "guarantor_id", loan_id)

        response_payload = {
            "loan": loan,
            "applicant": applicant,
            "documents": documents,
        }
        if coapplicants:
            response_payload["coapplicants"] = coapplicants
        if guarantors:
            response_payload["guarantors"] = guarantors

        return jsonify(response_payload), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/loans/<int:loan_id>/status", methods=["PATCH", "POST"])
def admin_update_loan_status(loan_id):
    """Update loan status. Body: { "status": "Approved" | "Rejected" | "Rework" }"""
    data = request.get_json() or {}
    status_input = (data.get("status") or "").strip().lower()
    status_map = {
        "approved": "Approved",
        "accepted": "Approved",
        "rejected": "Rejected",
        "rework": "Rework",
    }
    new_status = status_map.get(status_input)
    if not new_status:
        return jsonify({"error": "Invalid status. Use 'Approved', 'Rejected', or 'Rework'."}), 400

    admin_email = (data.get("admin_email") or "").strip()
    remarks = (data.get("remarks") or "").strip()

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Only allow status change on Pending loans
        cursor.execute(
            "SELECT status FROM loans WHERE loan_id = %s",
            (loan_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Loan not found."}), 404

        current_status = row[0]
        if current_status not in ("Pending", "Under Review", "Rework"):
            return jsonify({"error": f"Cannot change status of a loan that is '{current_status}'."}), 400

        cursor.execute(
            "UPDATE loans SET status = %s WHERE loan_id = %s",
            (new_status, loan_id),
        )

        # Record status history
        cursor.execute(
            """
            INSERT INTO loan_status_history (loan_id, old_status, new_status, changed_by)
            VALUES (%s, %s, %s, %s)
            """,
            (loan_id, current_status, new_status, admin_email or "admin"),
        )

        # Create notification for the loan owner
        cursor.execute("SELECT user_id FROM loans WHERE loan_id = %s", (loan_id,))
        user_row = cursor.fetchone()
        if user_row:
            notif_title = f"Loan #{loan_id} {new_status}"
            notif_msg = f"Your loan application #{loan_id} has been {new_status.lower()}."
            if remarks:
                notif_msg += f" Remarks: {str(escape(remarks))}"
            cursor.execute(
                "INSERT INTO notifications (user_id, loan_id, title, message, type) VALUES (%s, %s, %s, %s, %s)",
                (
                    user_row[0],
                    loan_id,
                    notif_title,
                    notif_msg,
                    "success" if new_status == "Approved" else "warning",
                ),
            )

        # Add remarks if provided
        if remarks and admin_email:
            cursor.execute("SELECT admin_id FROM admin WHERE email = %s", (admin_email,))
            admin_row = cursor.fetchone()
            if admin_row:
                cursor.execute(
                    "INSERT INTO admin_remarks (loan_id, admin_id, remark) VALUES (%s, %s, %s)",
                    (loan_id, admin_row[0], str(escape(remarks))),
                )

        conn.commit()

        # Send status change email (non-critical)
        try:
            from emailService import send_loan_status_email
            cursor_email = conn.cursor()
            cursor_email.execute("SELECT u.email, u.name FROM users u JOIN loans l ON u.user_id = l.user_id WHERE l.loan_id = %s", (loan_id,))
            email_row = cursor_email.fetchone()
            cursor_email.close()
            if email_row:
                send_loan_status_email(email_row[0], email_row[1] or email_row[0], loan_id, new_status, remarks or "")
        except Exception:
            pass

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


@loan_bp.route("/api/admin/documents/<int:document_id>/status", methods=["PATCH"])
def admin_update_document_status(document_id):
    data = request.get_json() or {}
    new_status = _normalize_document_status(data.get("status"), default="")
    admin_email = (data.get("admin_email") or "").strip()
    admin_message = (data.get("message") or "").strip()
    send_notification = _coerce_bool(data.get("send_notification"), default=False)
    front_verified_input = _coerce_bool(data.get("front_verified"), default=False)
    back_verified_input = _coerce_bool(data.get("back_verified"), default=False)
    full_verified_input = _coerce_bool(data.get("is_fully_verified"), default=False)

    if new_status not in {"accepted", "rejected", "under_review"}:
        return jsonify({"error": "Invalid status. Use 'accepted', 'rejected', or 'under_review'."}), 400

    if not admin_email:
        return jsonify({"error": "admin_email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT admin_id FROM admin WHERE email = %s", (admin_email,))
        admin_row = cursor.fetchone()
        if not admin_row:
            return jsonify({"error": "Unauthorized admin."}), 403

        document_columns = _table_columns(cursor, "loan_documents")
        has_doc_status = "document_status" in document_columns
        has_updated_at = "updated_at" in document_columns
        has_front_verified = "front_verified" in document_columns
        has_back_verified = "back_verified" in document_columns
        has_full_verified = "is_fully_verified" in document_columns
        if not has_doc_status:
            return jsonify({"error": "Document status workflow is not available. Run schema migration."}), 500
        if not (has_front_verified and has_back_verified and has_full_verified):
            return jsonify({"error": "Verification workflow columns are missing. Run schema migration."}), 500

        cursor.execute(
            """
            SELECT d.loan_id, d.document_type, d.document_status, l.user_id,
                   d.front_verified, d.back_verified, d.is_fully_verified
            FROM loan_documents d
            JOIN loans l ON l.loan_id = d.loan_id
            WHERE d.document_id = %s
            """,
            (document_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Document not found."}), 404

        loan_id, document_type, current_status_raw, user_id, current_front, current_back, current_full = row
        current_status = _normalize_document_status(current_status_raw)
        if current_status == new_status:
            status_payload = _document_status_payload(current_status)
            return jsonify(
                {
                    "message": f"Document already marked as {status_payload['label']}.",
                    "document": {
                        "document_id": document_id,
                        "loan_id": loan_id,
                        "document_type": document_type,
                        "document_status": status_payload["key"],
                        "document_status_label": status_payload["label"],
                        "document_status_color": status_payload["color"],
                        "front_verified": _coerce_bool(current_front),
                        "back_verified": _coerce_bool(current_back),
                        "is_fully_verified": _coerce_bool(current_full),
                    },
                }
            ), 200

        if current_status != "under_review" and new_status != "under_review":
            status_payload = _document_status_payload(current_status)
            return jsonify(
                {
                    "error": (
                        f"Document is already {status_payload['label'].lower()}. "
                        "Only documents in Under Review can be updated."
                    )
                }
            ), 400

        if new_status == "under_review":
            front_verified = False
            back_verified = False
            is_fully_verified = False
        elif full_verified_input:
            front_verified = True
            back_verified = True
            is_fully_verified = True
        else:
            front_verified = bool(front_verified_input)
            back_verified = bool(back_verified_input)
            is_fully_verified = bool(front_verified and back_verified)

        if new_status == "accepted" and not (front_verified and back_verified and is_fully_verified):
            return jsonify({"error": "Cannot accept document without full verification."}), 400

        if has_updated_at:
            cursor.execute(
                """
                UPDATE loan_documents
                SET document_status = %s,
                    front_verified = %s,
                    back_verified = %s,
                    is_fully_verified = %s,
                    updated_at = NOW()
                WHERE document_id = %s
                """,
                (new_status, front_verified, back_verified, is_fully_verified, document_id),
            )
        else:
            cursor.execute(
                """
                UPDATE loan_documents
                SET document_status = %s,
                    front_verified = %s,
                    back_verified = %s,
                    is_fully_verified = %s
                WHERE document_id = %s
                """,
                (new_status, front_verified, back_verified, is_fully_verified, document_id),
            )

        status_payload = _document_status_payload(new_status)
        if send_notification:
            notif_message = (
                f"Document '{document_type}' for loan #{loan_id} was marked as {status_payload['label'].lower()}."
            )
            if admin_message:
                notif_message += f" Note: {str(escape(admin_message))}"

            cursor.execute(
                """
                INSERT INTO notifications (user_id, loan_id, title, message, type)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    loan_id,
                    f"Loan #{loan_id} Document {status_payload['label']}",
                    notif_message,
                    "info" if new_status == "under_review" else ("warning" if new_status == "rejected" else "success"),
                ),
            )

        conn.commit()

        return jsonify(
            {
                "message": f"Document marked as {status_payload['label']}.",
                "document": {
                    "document_id": document_id,
                    "loan_id": loan_id,
                    "document_type": document_type,
                    "document_status": status_payload["key"],
                    "document_status_label": status_payload["label"],
                    "document_status_color": status_payload["color"],
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                    "front_verified": front_verified,
                    "back_verified": back_verified,
                    "is_fully_verified": is_fully_verified,
                },
            }
        ), 200

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/user/documents/<int:document_id>/reupload", methods=["POST"])
def user_reupload_rejected_document(document_id):
    email = (request.form.get("email") or "").strip()
    file_obj = request.files.get("file")

    if not email:
        return jsonify({"error": "Email is required."}), 400
    if file_obj is None or not getattr(file_obj, "filename", ""):
        return jsonify({"error": "File is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        document_columns = _table_columns(cursor, "loan_documents")
        has_doc_status = "document_status" in document_columns
        has_updated_at = "updated_at" in document_columns
        has_front_verified = "front_verified" in document_columns
        has_back_verified = "back_verified" in document_columns
        has_full_verified = "is_fully_verified" in document_columns
        if not has_doc_status:
            return jsonify({"error": "Document status workflow is not available. Run schema migration."}), 500

        cursor.execute(
            """
            SELECT d.loan_id, d.document_type, d.document_status, d.file_path
            FROM loan_documents d
            JOIN loans l ON l.loan_id = d.loan_id
            JOIN users u ON u.user_id = l.user_id
            WHERE d.document_id = %s AND u.email = %s
            """,
            (document_id, email),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Document not found."}), 404

        loan_id, document_type, current_status_raw, old_relative_path = row
        current_status = _normalize_document_status(current_status_raw)
        if current_status != "rejected":
            return jsonify({"error": "Only rejected documents can be re-uploaded."}), 400

        _validate_upload_file(file_obj, document_type or "Document")

        upload_root = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(upload_root, exist_ok=True)
        loan_folder = os.path.join(upload_root, f"loan_{loan_id}")
        os.makedirs(loan_folder, exist_ok=True)

        safe_name = secure_filename(file_obj.filename) or "file"
        unique_prefix = uuid4().hex
        stored_filename = f"{unique_prefix}_{safe_name}"
        full_path = os.path.join(loan_folder, stored_filename)
        file_obj.save(full_path)
        relative_path = os.path.relpath(full_path, os.path.dirname(__file__))

        set_parts = [
            "original_filename = %s",
            "stored_filename = %s",
            "file_path = %s",
            "document_status = 'under_review'",
            "uploaded_at = NOW()",
        ]
        params = [file_obj.filename, stored_filename, relative_path]

        if has_front_verified:
            set_parts.append("front_verified = %s")
            params.append(0)
        if has_back_verified:
            set_parts.append("back_verified = %s")
            params.append(0)
        if has_full_verified:
            set_parts.append("is_fully_verified = %s")
            params.append(0)
        if has_updated_at:
            set_parts.append("updated_at = NOW()")

        params.append(document_id)
        cursor.execute(
            f"UPDATE loan_documents SET {', '.join(set_parts)} WHERE document_id = %s",
            tuple(params),
        )

        cursor.execute("SELECT admin_id FROM admin")
        admin_rows = cursor.fetchall() or []
        for admin_row in admin_rows:
            cursor.execute(
                """
                INSERT INTO notifications (admin_id, loan_id, title, message, type)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    admin_row[0],
                    loan_id,
                    f"Document Re-uploaded for Loan #{loan_id}",
                    f"User has re-uploaded rejected document '{document_type}' for loan #{loan_id}.",
                    "info",
                ),
            )

        conn.commit()

        old_path = None
        if old_relative_path:
            old_path = os.path.normpath(
                os.path.join(os.path.dirname(os.path.abspath(__file__)), old_relative_path)
            )
        if old_path and os.path.isfile(old_path) and os.path.normpath(old_path) != os.path.normpath(full_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

        status_payload = _document_status_payload("under_review")
        return jsonify(
            {
                "message": "Document re-uploaded successfully and moved to Under Review.",
                "document": {
                    "document_id": document_id,
                    "loan_id": loan_id,
                    "document_type": document_type,
                    "original_filename": file_obj.filename,
                    "stored_filename": stored_filename,
                    "file_path": relative_path,
                    "uploaded_at": datetime.utcnow().isoformat() + "Z",
                    "updated_at": datetime.utcnow().isoformat() + "Z",
                    "document_status": status_payload["key"],
                    "document_status_label": status_payload["label"],
                    "document_status_color": status_payload["color"],
                    "front_verified": False,
                    "back_verified": False,
                    "is_fully_verified": False,
                },
            }
        ), 200

    except ValueError as ve:
        if conn:
            conn.rollback()
        return jsonify({"error": str(ve)}), 400

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error occurred."}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/loans/<int:loan_id>/send-email", methods=["POST"])
def admin_send_email_to_user(loan_id):
    """Manually trigger email to user for a loan (Approved / Rejected / custom)."""
    data = request.get_json() or {}
    admin_email = (data.get("admin_email") or "").strip()
    message_text = (data.get("message") or "").strip()

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT u.email, u.name, l.status, l.loan_amount
            FROM users u
            JOIN loans l ON u.user_id = l.user_id
            WHERE l.loan_id = %s
            """,
            (loan_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Loan not found."}), 404

        user_email, user_name, loan_status, loan_amount = row[0], row[1], row[2], float(row[3])

        from emailService import _send_email, _BASE_STYLE
        if message_text:
            subject = f"Update on Your Loan Application #{loan_id}"
            content = f"""
            <h2 style="color:#1e293b;margin:0 0 12px;">Loan #{loan_id} — Message from Admin</h2>
            <p style="color:#475569;line-height:1.6;">Dear {user_name or user_email},</p>
            <div style="background:#eef2ff;border-radius:10px;padding:16px;margin:20px 0;border-left:3px solid #6366f1;">
                <p style="color:#334155;line-height:1.6;margin:0;">{message_text}</p>
            </div>
            <p style="color:#64748b;font-size:13px;margin-top:20px;">
                Current Status: <strong>{loan_status}</strong> | Loan Amount: ₹{loan_amount:,.0f}
            </p>
            """
            _send_email(user_email, subject, _BASE_STYLE.replace("{content}", content))
        else:
            normalized_status = (loan_status or "").strip().lower()
            if normalized_status == "approved":
                default_text = "Dear User, your loan application has been approved."
            elif normalized_status == "rejected":
                default_text = "Dear User, your loan application has been rejected."
            else:
                default_text = f"Dear User, your loan application status is now {loan_status}."

            subject = f"Loan Application #{loan_id} Update"
            content = f"""
            <h2 style="color:#1e293b;margin:0 0 12px;">Loan Application Update</h2>
            <p style="color:#475569;line-height:1.6;">{default_text}</p>
            """
            _send_email(user_email, subject, _BASE_STYLE.replace("{content}", content))

        return jsonify({"message": f"Email sent to {user_email}."}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error occurred."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@loan_bp.route("/api/admin/loans/<int:loan_id>/notify", methods=["POST"])
def admin_notify_user(loan_id):
    """Create a direct in-app notification for the user for a specific loan."""
    data = request.get_json() or {}
    admin_email = (data.get("admin_email") or "").strip()
    message_text = (data.get("message") or "").strip()

    if not message_text:
        return jsonify({"error": "Message is required."}), 400
    if len(message_text) > 1000:
        return jsonify({"error": "Message must be at most 1000 characters."}), 400

    safe_message = str(escape(message_text))
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT user_id FROM loans WHERE loan_id = %s",
            (loan_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Loan not found."}), 404

        title = f"Message on Loan #{loan_id}"
        if admin_email:
            title = f"Admin Message on Loan #{loan_id}"

        cursor.execute(
            """
            INSERT INTO notifications (user_id, loan_id, title, message, type, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (row[0], loan_id, title, safe_message, "admin_message"),
        )
        conn.commit()

        return jsonify(
            {
                "message": "Notification sent successfully.",
                "notification": {
                    "id": cursor.lastrowid,
                    "loan_id": loan_id,
                    "user_id": row[0],
                    "message": safe_message,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        ), 201

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
        full_path = os.path.normpath(os.path.join(base_dir, rel_path))

        # Prevent path traversal — ensure resolved path stays within uploads/
        uploads_dir = os.path.normpath(os.path.join(base_dir, "uploads"))
        if not full_path.startswith(uploads_dir):
            return jsonify({"error": "Access denied."}), 403

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


@loan_bp.route("/api/user/document/<int:document_id>", methods=["GET"])
def user_serve_document(document_id):
    """Serve uploaded document file for user viewing (ownership verified)."""
    email = (request.args.get("email") or "").strip()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Verify document belongs to the requesting user
        cursor.execute(
            """
            SELECT d.file_path, d.original_filename
            FROM loan_documents d
            JOIN loans l ON d.loan_id = l.loan_id
            JOIN users u ON l.user_id = u.user_id
            WHERE d.document_id = %s AND u.email = %s
            """,
            (document_id, email),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Document not found."}), 404

        rel_path, original_filename = row[0], row[1]
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.normpath(os.path.join(base_dir, rel_path))

        # Prevent path traversal
        uploads_dir = os.path.normpath(os.path.join(base_dir, "uploads"))
        if not full_path.startswith(uploads_dir):
            return jsonify({"error": "Access denied."}), 403

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

