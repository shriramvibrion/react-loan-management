"""
Email notification utility for EZLoan.

Sends transactional emails for loan lifecycle events.
Configure via environment variables:
  MAIL_ENABLED=true
  MAIL_SERVER=smtp.gmail.com
  MAIL_PORT=587
  MAIL_USERNAME=your_email@gmail.com
  MAIL_PASSWORD=your_app_password
  MAIL_SENDER=EZLoan <noreply@ezloan.com>

If MAIL_ENABLED is not 'true', all send operations silently no-op.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

MAIL_ENABLED = os.environ.get("MAIL_ENABLED", "false").lower() == "true"
MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
MAIL_SENDER = os.environ.get("MAIL_SENDER", "EZLoan <noreply@ezloan.com>")


def _send_email(to_email, subject, html_body):
    """Internal: send a single email via SMTP. Returns True on success."""
    if not MAIL_ENABLED:
        logger.debug("Mail disabled — skipping email to %s", to_email)
        return False
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.warning("Mail credentials not configured.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = MAIL_SENDER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_USERNAME, to_email, msg.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


# ─────────────────────────────────────────────────────────────────
# Email Templates
# ─────────────────────────────────────────────────────────────────

_BASE_STYLE = """
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, #6366f1, #4338ca); padding: 28px 32px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">EZLoan</h1>
    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Smart Loan Management System</p>
  </div>
  <div style="padding: 32px;">
    {content}
  </div>
  <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is an automated message from EZLoan. Please do not reply.</p>
  </div>
</div>
"""


def send_welcome_email(to_email, name):
    """Send welcome email after user registration."""
    content = f"""
    <h2 style="color: #1e293b; margin: 0 0 12px;">Welcome, {name}! 🎉</h2>
    <p style="color: #475569; line-height: 1.6;">
      Your EZLoan account has been created successfully. You can now apply for loans,
      track your applications, and manage your financial portfolio.
    </p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4338ca); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px;">
        Get Started
      </a>
    </div>
    """
    return _send_email(to_email, "Welcome to EZLoan!", _BASE_STYLE.replace("{content}", content))


def send_loan_submitted_email(to_email, name, loan_id, loan_amount):
    """Send confirmation after loan application submission."""
    content = f"""
    <h2 style="color: #1e293b; margin: 0 0 12px;">Application Submitted 📋</h2>
    <p style="color: #475569; line-height: 1.6;">
      Hi {name}, your loan application has been successfully submitted and is now under review.
    </p>
    <div style="background: #eef2ff; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Loan ID</td><td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: 700;">#{loan_id}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount</td><td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: 700;">₹{loan_amount:,.0f}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Status</td><td style="padding: 6px 0; text-align: right; color: #f59e0b; font-weight: 700;">Under Review</td></tr>
      </table>
    </div>
    <p style="color: #64748b; font-size: 13px;">You will be notified once the admin reviews your application.</p>
    """
    return _send_email(to_email, f"Loan #{loan_id} Submitted Successfully", _BASE_STYLE.replace("{content}", content))


def send_loan_status_email(to_email, name, loan_id, new_status, remarks=""):
    """Send email when loan status changes (under review/approved/rejected)."""
    status_map = {
        "under review": {"color": "#3b82f6", "emoji": "🔍", "text": "Under Review"},
        "pending": {"color": "#f59e0b", "emoji": "⏳", "text": "Pending"},
        "approved": {"color": "#16a34a", "emoji": "✅", "text": "Approved"},
        "accepted": {"color": "#16a34a", "emoji": "✅", "text": "Approved"},
        "rejected": {"color": "#ef4444", "emoji": "❌", "text": "Rejected"},
    }
    
    status_lower = new_status.lower()
    status_info = status_map.get(status_lower, {"color": "#6b7280", "emoji": "📋", "text": new_status})
    status_color = status_info["color"]
    status_emoji = status_info["emoji"]
    status_text = status_info["text"]

    remarks_html = ""
    if remarks:
        remarks_html = f"""
        <div style="background: #fef3c7; border-radius: 10px; padding: 14px; margin: 16px 0; border-left: 3px solid #f59e0b;">
          <div style="font-size: 12px; color: #92400e; font-weight: 700; margin-bottom: 4px;">Admin Notes</div>
          <div style="color: #78350f; font-size: 13px; line-height: 1.5;">{remarks}</div>
        </div>
        """

    content = f"""
    <h2 style="color: #1e293b; margin: 0 0 12px;">Loan {status_text} {status_emoji}</h2>
    <p style="color: #475569; line-height: 1.6;">
      Hi {name}, your loan application <strong>#{loan_id}</strong> has been <span style="color: {status_color}; font-weight: 700;">{status_text}</span>.
    </p>
    {remarks_html}
    <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
      Log in to your EZLoan dashboard for more details.
    </p>
    """
    return _send_email(
        to_email,
        f"Loan #{loan_id} — {status_text}",
        _BASE_STYLE.replace("{content}", content),
    )


def send_loan_under_review_email(to_email, name, loan_id):
    """Send email when loan is moved to under review status."""
    content = f"""
    <h2 style="color: #1e293b; margin: 0 0 12px;">Loan Under Review 🔍</h2>
    <p style="color: #475569; line-height: 1.6;">
      Hi {name}, your loan application <strong>#{loan_id}</strong> is now under review by our team.
    </p>
    <div style="background: #dbeafe; border-radius: 10px; padding: 16px; margin: 20px 0; border-left: 3px solid #3b82f6;">
      <p style="margin: 0; color: #1e40af; font-size: 13px;">We will notify you as soon as a decision is made on your application.</p>
    </div>
    <p style="color: #64748b; font-size: 13px;">
      In the meantime, you can log in to your EZLoan dashboard to view your application status and upload any additional documents if needed.
    </p>
    """
    return _send_email(
        to_email,
        f"Loan #{loan_id} — Under Review",
        _BASE_STYLE.replace("{content}", content),
    )


def send_admin_new_application_email(to_email, user_name, loan_id, loan_amount):
    """Notify admin about a new loan application."""
    content = f"""
    <h2 style="color: #1e293b; margin: 0 0 12px;">New Loan Application 📬</h2>
    <p style="color: #475569; line-height: 1.6;">
      A new loan application has been submitted and requires your review.
    </p>
    <div style="background: #fff7ed; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Applicant</td><td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: 700;">{user_name}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Loan ID</td><td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: 700;">#{loan_id}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount</td><td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: 700;">₹{loan_amount:,.0f}</td></tr>
      </table>
    </div>
    <div style="margin: 24px 0; text-align: center;">
      <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px;">
        Review Application
      </a>
    </div>
    """
    return _send_email(to_email, f"New Loan Application #{loan_id}", _BASE_STYLE.replace("{content}", content))
