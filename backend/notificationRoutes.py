"""
Notification & Admin Remarks & Analytics & PDF Report API endpoints.
"""
from flask import Blueprint, jsonify, request, make_response
import logging
import os
from datetime import datetime, timedelta

import mysql.connector
from markupsafe import escape
from database import get_connection

notify_bp = Blueprint("notify", __name__)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Notifications API
# ─────────────────────────────────────────────────────────────────────────────

@notify_bp.route("/api/notifications", methods=["GET"])
def get_notifications():
    """Get notifications for a user (by email) or admin."""
    email = (request.args.get("email") or "").strip()
    role = (request.args.get("role") or "user").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if role == "admin":
            cursor.execute(
                "SELECT admin_id FROM admin WHERE email = %s", (email,)
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "Admin not found."}), 404
            cursor.execute(
                """
                SELECT id, loan_id, title, message, type, is_read, created_at
                FROM notifications
                WHERE admin_id = %s
                ORDER BY created_at DESC
                LIMIT 50
                """,
                (row[0],),
            )
        else:
            cursor.execute(
                "SELECT user_id FROM users WHERE email = %s", (email,)
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "User not found."}), 404
            cursor.execute(
                """
                SELECT id, loan_id, title, message, type, is_read, created_at
                FROM notifications
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 50
                """,
                (row[0],),
            )

        rows = cursor.fetchall()
        notifications = []
        for r in rows:
            # Legacy tests and older schemas may return 6 columns without loan_id.
            if len(r) >= 7:
                notification = {
                    "id": r[0],
                    "loan_id": r[1],
                    "title": r[2],
                    "message": r[3],
                    "type": r[4],
                    "is_read": bool(r[5]),
                    "created_at": r[6].isoformat() if r[6] else None,
                }
            else:
                notification = {
                    "id": r[0] if len(r) > 0 else None,
                    "loan_id": None,
                    "title": r[1] if len(r) > 1 else None,
                    "message": r[2] if len(r) > 2 else None,
                    "type": r[3] if len(r) > 3 else None,
                    "is_read": bool(r[4]) if len(r) > 4 else False,
                    "created_at": r[5].isoformat() if len(r) > 5 and r[5] else None,
                }
            notifications.append(notification)

        return jsonify({"notifications": notifications}), 200

    except mysql.connector.Error:
        logger.exception("Error fetching notifications")
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@notify_bp.route("/api/notifications/read", methods=["PATCH"])
def mark_notifications_read():
    """Mark one or all notifications as read."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    role = (data.get("role") or "user").strip().lower()
    notification_id = data.get("id")  # if None → mark all

    if not email:
        return jsonify({"error": "Email is required."}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if role == "admin":
            cursor.execute("SELECT admin_id FROM admin WHERE email = %s", (email,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "Admin not found."}), 404
            owner_id = row[0]
            id_col = "admin_id"
        else:
            cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "User not found."}), 404
            owner_id = row[0]
            id_col = "user_id"

        if notification_id:
            cursor.execute(
                f"UPDATE notifications SET is_read = 1 WHERE id = %s AND {id_col} = %s",
                (notification_id, owner_id),
            )
        else:
            cursor.execute(
                f"UPDATE notifications SET is_read = 1 WHERE {id_col} = %s AND is_read = 0",
                (owner_id,),
            )

        conn.commit()
        return jsonify({"message": "Notifications marked as read."}), 200

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Admin Remarks API
# ─────────────────────────────────────────────────────────────────────────────

@notify_bp.route("/api/admin/loans/<int:loan_id>/remarks", methods=["GET"])
def get_remarks(loan_id):
    """Get all admin remarks for a loan."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT r.id, r.remark, r.created_at, a.username
            FROM admin_remarks r
            JOIN admin a ON r.admin_id = a.admin_id
            WHERE r.loan_id = %s
            ORDER BY r.created_at DESC
            """,
            (loan_id,),
        )
        rows = cursor.fetchall()
        remarks = [
            {
                "id": r[0],
                "remark": r[1],
                "created_at": r[2].isoformat() if r[2] else None,
                "admin_name": r[3],
            }
            for r in rows
        ]

        return jsonify({"remarks": remarks}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@notify_bp.route("/api/admin/loans/<int:loan_id>/remarks", methods=["POST"])
def add_remark(loan_id):
    """Add a remark to a loan application."""
    data = request.get_json() or {}
    admin_email = (data.get("admin_email") or "").strip()
    remark_text = (data.get("remark") or "").strip()

    if not admin_email or not remark_text:
        return jsonify({"error": "Admin email and remark are required."}), 400

    if len(remark_text) > 2000:
        return jsonify({"error": "Remark must be less than 2000 characters."}), 400

    remark_text = str(escape(remark_text))

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT admin_id FROM admin WHERE email = %s", (admin_email,))
        admin_row = cursor.fetchone()
        if not admin_row:
            return jsonify({"error": "Admin not found."}), 404

        cursor.execute(
            "SELECT loan_id, user_id FROM loans WHERE loan_id = %s",
            (loan_id,),
        )
        loan_row = cursor.fetchone()
        if not loan_row:
            return jsonify({"error": "Loan not found."}), 404

        cursor.execute(
            "INSERT INTO admin_remarks (loan_id, admin_id, remark) VALUES (%s, %s, %s)",
            (loan_id, admin_row[0], remark_text),
        )

        user_id = loan_row[1] if len(loan_row) > 1 else None
        if user_id:
            cursor.execute(
                "INSERT INTO notifications (user_id, loan_id, title, message, type) VALUES (%s, %s, %s, %s, %s)",
                (
                    user_id,
                    loan_id,
                    f"Admin Update on Loan #{loan_id}",
                    f"Admin added a remark on your loan application #{loan_id}: {remark_text}",
                    "admin_remark",
                ),
            )
        conn.commit()

        return jsonify({"message": "Remark added successfully.", "id": cursor.lastrowid}), 201

    except mysql.connector.Error:
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Loan Status History API
# ─────────────────────────────────────────────────────────────────────────────

@notify_bp.route("/api/loans/<int:loan_id>/history", methods=["GET"])
def get_loan_status_history(loan_id):
    """Get status change history for a loan."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, old_status, new_status, changed_at, changed_by
            FROM loan_status_history
            WHERE loan_id = %s
            ORDER BY changed_at ASC
            """,
            (loan_id,),
        )
        rows = cursor.fetchall()
        history = [
            {
                "id": r[0],
                "old_status": r[1],
                "new_status": r[2],
                "changed_at": r[3].isoformat() if r[3] else None,
                "changed_by": r[4],
            }
            for r in rows
        ]

        return jsonify({"history": history}), 200

    except mysql.connector.Error:
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Analytics API
# ─────────────────────────────────────────────────────────────────────────────

@notify_bp.route("/api/admin/analytics", methods=["GET"])
def get_admin_analytics():
    """Get aggregated analytics data for admin dashboard."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Status distribution
        cursor.execute(
            """
            SELECT status, COUNT(*) as cnt, SUM(loan_amount) as total_amount
            FROM loans
            WHERE status NOT IN ('Draft', 'Archived')
            GROUP BY status
            """
        )
        status_rows = cursor.fetchall()

        def _normalized_status_label(raw_status):
            s = (raw_status or "").strip().lower()
            if s == "accepted":
                return "Approved"
            if s == "under review":
                return "Under Review"
            if s == "pending":
                return "Pending"
            if s == "rejected":
                return "Rejected"
            if s == "approved":
                return "Approved"
            return raw_status or "Unknown"

        status_distribution = [
            {"status": _normalized_status_label(r[0]), "count": r[1], "total_amount": float(r[2] or 0)}
            for r in status_rows
        ]

        # Monthly loan applications (last 12 months)
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(applied_date, '%%Y-%%m') as month,
                COUNT(*) as cnt,
                SUM(loan_amount) as total_amount
            FROM loans
            WHERE status NOT IN ('Draft', 'Archived')
              AND applied_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(applied_date, '%%Y-%%m')
            ORDER BY month ASC
            """
        )
        monthly_rows = cursor.fetchall()
        monthly_data = [
            {"month": r[0], "count": r[1], "total_amount": float(r[2] or 0)}
            for r in monthly_rows
        ]

        # Loan purpose distribution
        cursor.execute(
            """
            SELECT d.loan_purpose, COUNT(*) as cnt, SUM(l.loan_amount) as total_amount
            FROM loans l
            JOIN loan_application_details d ON l.loan_id = d.loan_id
            WHERE l.status NOT IN ('Draft', 'Archived')
            GROUP BY d.loan_purpose
            """
        )
        purpose_rows = cursor.fetchall()
        purpose_distribution = [
            {"purpose": r[0] or "Unknown", "count": r[1], "total_amount": float(r[2] or 0)}
            for r in purpose_rows
        ]

        # Total stats
        cursor.execute(
            """
            SELECT
                COUNT(*) as total,
                SUM(loan_amount) as total_amount,
                AVG(loan_amount) as avg_amount,
                AVG(tenure) as avg_tenure
            FROM loans
            WHERE status NOT IN ('Draft', 'Archived')
            """
        )
        stats_row = cursor.fetchone()
        total_stats = {
            "total_loans": stats_row[0] or 0,
            "total_amount": float(stats_row[1] or 0),
            "avg_amount": float(stats_row[2] or 0),
            "avg_tenure": float(stats_row[3] or 0),
        }

        return jsonify({
            "status_distribution": status_distribution,
            "monthly_data": monthly_data,
            "purpose_distribution": purpose_distribution,
            "total_stats": total_stats,
        }), 200

    except mysql.connector.Error:
        logger.exception("Analytics error")
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# PDF Report Generation
# ─────────────────────────────────────────────────────────────────────────────

@notify_bp.route("/api/loans/<int:loan_id>/report", methods=["GET"])
def generate_loan_report(loan_id):
    """Generate a PDF report for a given loan."""
    email = (request.args.get("email") or "").strip()
    role = (request.args.get("role") or "user").strip().lower()

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get loan data
        if role == "admin":
            cursor.execute(
                """
                SELECT l.loan_id, l.loan_amount, l.tenure, l.interest_rate, l.emi,
                       l.status, l.applied_date, u.name, u.email
                FROM loans l
                JOIN users u ON l.user_id = u.user_id
                WHERE l.loan_id = %s
                """,
                (loan_id,),
            )
        else:
            if not email:
                return jsonify({"error": "Email is required."}), 400
            cursor.execute(
                """
                SELECT l.loan_id, l.loan_amount, l.tenure, l.interest_rate, l.emi,
                       l.status, l.applied_date, u.name, u.email
                FROM loans l
                JOIN users u ON l.user_id = u.user_id
                WHERE l.loan_id = %s AND u.email = %s
                """,
                (loan_id, email),
            )

        loan_row = cursor.fetchone()
        if not loan_row:
            return jsonify({"error": "Loan not found."}), 404

        # Get applicant details
        cursor.execute(
            """
            SELECT full_name, contact_email, primary_mobile, dob,
                   address_line1, city, state, postal_code,
                   pan_number, monthly_income, employer_name,
                   employment_type, loan_purpose
            FROM loan_application_details
            WHERE loan_id = %s
            """,
            (loan_id,),
        )
        detail_row = cursor.fetchone()

        # Build simple text-based report (CSV-like format for frontend jsPDF to consume)
        report_data = {
            "loan": {
                "loan_id": loan_row[0],
                "loan_amount": float(loan_row[1]),
                "tenure": int(loan_row[2]),
                "interest_rate": float(loan_row[3]),
                "emi": float(loan_row[4]),
                "status": loan_row[5],
                "applied_date": loan_row[6].isoformat() if loan_row[6] else None,
                "user_name": loan_row[7],
                "user_email": loan_row[8],
            },
            "applicant": None,
        }

        if detail_row:
            report_data["applicant"] = {
                "full_name": detail_row[0],
                "contact_email": detail_row[1],
                "primary_mobile": detail_row[2],
                "dob": str(detail_row[3]) if detail_row[3] else None,
                "address": f"{detail_row[4] or ''}, {detail_row[5] or ''}, {detail_row[6] or ''} - {detail_row[7] or ''}",
                "pan_number": detail_row[8],
                "monthly_income": float(detail_row[9]) if detail_row[9] else None,
                "employer_name": detail_row[10],
                "employment_type": detail_row[11],
                "loan_purpose": detail_row[12],
            }

        return jsonify(report_data), 200

    except mysql.connector.Error:
        logger.exception("Report generation error")
        return jsonify({"error": "Database error."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helper: Create notification (used internally)
# ─────────────────────────────────────────────────────────────────────────────

def create_notification(user_id=None, admin_id=None, title="", message="", ntype="info"):
    """Insert a notification record. Call from other routes."""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO notifications (user_id, admin_id, title, message, type)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, admin_id, str(escape(title)), str(escape(message)), ntype),
        )
        conn.commit()
    except mysql.connector.Error:
        logger.exception("Failed to create notification")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
