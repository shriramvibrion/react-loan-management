"""
Integration tests: multi-step flows simulating real API usage patterns.

Scenarios:
  1. Full pipeline (7 steps): Register → Login → Apply → Admin list →
     Admin detail (auto Under Review) → Admin approve → User notification
  2. Draft save and retrieval flow
  3. Duplicate email registration rejected
  4. Apply with unknown user email → 404
"""
import io
import os
import sys
import unittest
from datetime import datetime
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR   = os.path.abspath(os.path.dirname(__file__))
for _d in (BACKEND_DIR, TESTS_DIR):
    if _d not in sys.path:
        sys.path.insert(0, _d)

import app as backend_app
from test_api import FakeConn, FakeCursor


def _p(module_path, cursor):
    conn = FakeConn(cursor)
    return patch(module_path, return_value=conn), conn


# ── Helper: full valid Vehicle Loan / Salaried form data + files ──────────
def _vehicle_loan_form():
    return dict(
        email="alice@test.com",
        agreement_decision="accepted",
        loan_amount="200000",
        tenure="24",
        interest_rate="8.5",
        full_name="Alice",
        contact_email="alice@test.com",
        primary_mobile="9876543210",
        dob="1992-06-15",
        address_line1="12 Main",
        address_line2="Apt 5",
        city="Mumbai",
        state="MH",
        postal_code="400001",
        pan_number="ALICX9876Z",
        aadhaar_number="987654321098",
        monthly_income="80000",
        cibil_score="750",
        employer_name="TechCorp",
        employment_type="Salaried",
        loan_purpose="Vehicle Loan",
        notes="buying car",
        pan_file=(io.BytesIO(b"pan"), "pan.pdf"),
        aadhaar_file=(io.BytesIO(b"aadh"), "aadhaar.pdf"),
        **{
            "document_types[]": [
                "Proforma Invoice", "RC Copy",
                "Income - Latest 3 Salary Slips",
                "Income - Form 16",
                "Income - Bank Statement (6 Months)",
            ],
            "document_files[]": [
                (io.BytesIO(b"pi"),  "pi.pdf"),
                (io.BytesIO(b"rc"),  "rc.pdf"),
                (io.BytesIO(b"ss"),  "ss.pdf"),
                (io.BytesIO(b"f16"), "f16.pdf"),
                (io.BytesIO(b"bs"),  "bs.pdf"),
            ],
        },
    )


# ---------------------------------------------------------------------------
class FullPipelineTests(unittest.TestCase):
    """Seven steps each as an isolated test – the order mirrors real usage."""

    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()
        # Reset the in-memory rate limiter so repeated test calls don't hit 429
        import app as _app
        _app._rate_store.clear()

    # Step 1 ──────────────────────────────────────────────────────────────
    def test_step1_user_registration_returns_201(self):
        cursor = FakeCursor(fetchone_results=[None])   # email not taken
        p, conn = _p("userRegister.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/register",
                json={"name": "Alice", "email": "alice@test.com",
                      "password": "Alice1234", "phone": "9876543210", "city": "Mumbai"},
            )
        self.assertEqual(res.status_code, 201)
        self.assertIn("registered", res.get_json()["message"].lower())
        self.assertTrue(conn.committed)

    # Step 2 ──────────────────────────────────────────────────────────────
    def test_step2_user_login_returns_user_object(self):
        import bcrypt
        hashed = bcrypt.hashpw(b"Alice1234", bcrypt.gensalt()).decode()
        cursor = FakeCursor(
            fetchone_results=[("alice@test.com", hashed, "Alice", "9876543210", "Mumbai")]
        )
        p, _ = _p("userLogin.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/login",
                json={"email": "alice@test.com", "password": "Alice1234"},
            )
        self.assertEqual(res.status_code, 200)
        user = res.get_json()["user"]
        self.assertEqual(user["name"], "Alice")
        self.assertEqual(user["city"], "Mumbai")

    # Step 3 ──────────────────────────────────────────────────────────────
    def test_step3_apply_loan_returns_201_with_loan_id(self):
        cursor = FakeCursor(fetchone_results=[(7,)], lastrowid=50)
        p, conn = _p("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/loan/apply",
                data=_vehicle_loan_form(),
                content_type="multipart/form-data",
            )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["loan"]["loan_id"], 50)
        self.assertEqual(data["status"], "Pending")
        self.assertTrue(conn.committed)

    # Step 4 ──────────────────────────────────────────────────────────────
    def test_step4_admin_lists_loans_shows_new_loan(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (50, 200000, 24, 8.5, 9138.21, "Pending",
                 datetime(2026, 3, 1), 7, "alice@test.com", "Alice", 0)
            ]]
        )
        p, _ = _p("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/admin/loans")
        self.assertEqual(res.status_code, 200)
        loans = res.get_json()["loans"]
        self.assertEqual(len(loans), 1)
        self.assertEqual(loans[0]["loan_id"], 50)
        self.assertFalse(loans[0]["viewed_by_admin"])

    # Step 5 ──────────────────────────────────────────────────────────────
    def test_step5_admin_opens_pending_loan_becomes_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (50, 7, 200000, 24, 8.5, 9138.21, "Pending",
                 datetime(2026, 3, 1), "alice@test.com", "Alice"),
                None,   # applicant details (none stored yet)
            ],
            fetchall_results=[[]],   # documents list
        )
        p, conn = _p("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/admin/loans/50")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["loan"]["status"], "Under Review")
        self.assertTrue(conn.committed)

    # Step 6 ──────────────────────────────────────────────────────────────
    def test_step6_admin_approves_loan(self):
        cursor = FakeCursor(fetchone_results=[("Under Review",), (7,)])
        p, conn = _p("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch(
                "/api/admin/loans/50/status",
                json={"status": "approved"},
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "Approved")
        self.assertTrue(conn.committed)

    # Step 7 ──────────────────────────────────────────────────────────────
    def test_step7_user_receives_approved_notification(self):
        cursor = FakeCursor(
            fetchone_results=[(7,)],
            fetchall_results=[[
                (10, "Loan #50 Approved",
                 "Your loan application #50 has been approved.",
                 "success", 0, datetime(2026, 3, 4)),
            ]],
        )
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/notifications?email=alice@test.com&role=user")
        self.assertEqual(res.status_code, 200)
        notifs = res.get_json()["notifications"]
        self.assertTrue(len(notifs) >= 1)
        self.assertIn("Approved", notifs[0]["title"])


# ---------------------------------------------------------------------------
class DraftFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()
        import app as _app
        _app._rate_store.clear()

    def test_draft_save_without_all_fields_returns_201(self):
        """Draft path skips full validation; partial data is accepted."""
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=77)
        p, conn = _p("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/loan/apply",
                data={"email": "user@test.com", "submission_type": "draft",
                      "loan_amount": "50000", "tenure": "12"},
                content_type="multipart/form-data",
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["status"], "Draft")
        self.assertTrue(conn.committed)

    def test_get_latest_draft_endpoint_returns_null(self):
        res = self.client.get("/api/loan/draft")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["draft"])


# ---------------------------------------------------------------------------
class DuplicateRegistrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()
        import app as _app
        _app._rate_store.clear()

    def test_duplicate_user_email_rejected(self):
        cursor = FakeCursor(fetchone_results=[("user@test.com",)])   # email exists
        with patch("userRegister.get_connection", return_value=FakeConn(cursor)):
            res = self.client.post(
                "/api/user/register",
                json={"name": "Bob", "email": "user@test.com",
                      "password": "Bob12345", "phone": "9876543210", "city": "Delhi"},
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.get_json()["error"].lower())

    def test_duplicate_admin_email_rejected(self):
        cursor = FakeCursor(fetchone_results=[("admin@test.com",)])
        with patch("adminRegister.get_connection", return_value=FakeConn(cursor)):
            res = self.client.post(
                "/api/admin/register",
                json={"username": "Admin2", "email": "admin@test.com", "password": "Admin1234"},
            )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.get_json()["error"].lower())

    def test_apply_with_unknown_user_email_returns_404(self):
        cursor = FakeCursor(fetchone_results=[None])   # user not found in DB
        with patch("loanRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.post(
                "/api/loan/apply",
                data={
                    **{
                        "email": "ghost@test.com",
                        "agreement_decision": "accepted",
                        "loan_amount": "100000",
                        "tenure": "12",
                        "interest_rate": "10",
                        "full_name": "Ghost",
                        "contact_email": "ghost@test.com",
                        "primary_mobile": "9999999999",
                        "dob": "1995-01-01",
                        "address_line1": "A",
                        "address_line2": "B",
                        "city": "City",
                        "state": "ST",
                        "postal_code": "600001",
                        "pan_number": "ABCDE1234F",
                        "aadhaar_number": "123412341234",
                        "monthly_income": "50000",
                        "cibil_score": "720",
                        "employer_name": "Org",
                        "employment_type": "Other",
                        "loan_purpose": "Home Loan",
                        "pan_file":    (io.BytesIO(b"pan"),    "pan.pdf"),
                        "aadhaar_file":(io.BytesIO(b"aadhaar"),"aadhaar.pdf"),
                    },
                    **{
                        "document_types[]": [
                            "Land Document", "Approved Building Plan", "Property Registration",
                            "Income - Income Source Proof", "Income - Recent Bank Statement",
                        ],
                        "document_files[]": [
                            (io.BytesIO(b"a"), "a.pdf"),
                            (io.BytesIO(b"b"), "b.pdf"),
                            (io.BytesIO(b"c"), "c.pdf"),
                            (io.BytesIO(b"d"), "d.pdf"),
                            (io.BytesIO(b"e"), "e.pdf"),
                        ],
                    },
                },
                content_type="multipart/form-data",
            )
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found", res.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
