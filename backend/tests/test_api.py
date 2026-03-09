import os
import sys
import unittest
import io
from datetime import datetime
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import app as backend_app


class FakeCursor:
    def __init__(self, fetchone_results=None, fetchall_results=None, rowcount=1, lastrowid=1):
        self._fetchone_results = list(fetchone_results or [])
        self._fetchall_results = list(fetchall_results or [])
        self.rowcount = rowcount
        self.lastrowid = lastrowid
        self.executed = []
        self.closed = False

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchone(self):
        if self._fetchone_results:
            return self._fetchone_results.pop(0)
        return None

    def fetchall(self):
        if self._fetchall_results:
            return self._fetchall_results.pop(0)
        return []

    def close(self):
        self.closed = True


class FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch_connection(self, module_path, cursor):
        conn = FakeConn(cursor)
        return patch(module_path, return_value=conn), conn

    def test_admin_register_missing_fields(self):
        res = self.client.post("/api/admin/register", json={"email": "x@test.com"})
        self.assertEqual(res.status_code, 400)

    def test_admin_register_success(self):
        cursor = FakeCursor(fetchone_results=[None])
        p, conn = self._patch_connection("adminRegister.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/admin/register",
                json={"username": "Admin", "email": "admin@test.com", "password": "Admin1234"},
            )

        self.assertEqual(res.status_code, 201)
        self.assertTrue(conn.committed)

    def test_admin_login_invalid_credentials(self):
        cursor = FakeCursor(fetchone_results=[None])
        p, _ = self._patch_connection("adminLogin.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/admin/login", json={"email": "missing@test.com", "password": "x"}
            )

        self.assertEqual(res.status_code, 401)

    def test_admin_login_success(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"secret", bcrypt.gensalt()).decode("utf-8")
        cursor = FakeCursor(fetchone_results=[("admin@test.com", hashed)])
        p, _ = self._patch_connection("adminLogin.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/admin/login", json={"email": "admin@test.com", "password": "secret"}
            )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["admin"], "admin@test.com")

    def test_user_register_success(self):
        cursor = FakeCursor(fetchone_results=[None])
        p, conn = self._patch_connection("userRegister.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/register",
                json={
                    "name": "User",
                    "email": "user@test.com",
                    "password": "Secure1234",
                    "phone": "9999999999",
                    "city": "Chennai",
                },
            )

        self.assertEqual(res.status_code, 201)
        self.assertTrue(conn.committed)

    def test_user_register_short_password(self):
        res = self.client.post(
            "/api/user/register",
            json={
                "name": "User",
                "email": "user@test.com",
                "password": "abc",
                "phone": "9999999999",
                "city": "Chennai",
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("8 characters", res.get_json()["error"])

    def test_user_register_password_no_digit(self):
        res = self.client.post(
            "/api/user/register",
            json={
                "name": "User",
                "email": "user@test.com",
                "password": "abcdefgh",
                "phone": "9999999999",
                "city": "Chennai",
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("letter and one number", res.get_json()["error"])

    def test_admin_register_short_password(self):
        res = self.client.post(
            "/api/admin/register",
            json={"username": "Admin", "email": "admin@test.com", "password": "short1"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("8 characters", res.get_json()["error"])

    def test_user_login_success(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"secret", bcrypt.gensalt()).decode("utf-8")
        cursor = FakeCursor(fetchone_results=[("user@test.com", hashed, "User", "99999", "Chennai")])
        p, _ = self._patch_connection("userLogin.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/login", json={"email": "user@test.com", "password": "secret"}
            )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["user"]["name"], "User")

    def test_apply_loan_requires_acceptance(self):
        res = self.client.post(
            "/api/loan/apply",
            json={
                "email": "user@test.com",
                "agreement_decision": "denied",
                "loan_amount": "100000",
                "tenure": "12",
                "full_name": "User",
                "contact_email": "user@test.com",
                "primary_mobile": "9999999999",
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123412341234",
                "loan_purpose": "Home Loan",
            },
        )
        self.assertEqual(res.status_code, 400)

    def test_apply_loan_success(self):
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=42)
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.post(
                "/api/loan/apply",
                data={
                    "email": "user@test.com",
                    "agreement_decision": "accepted",
                    "loan_amount": "100000",
                    "tenure": "12",
                    "interest_rate": "10",
                    "full_name": "User",
                    "contact_email": "user@test.com",
                    "primary_mobile": "9999999999",
                    "dob": "1995-01-01",
                    "address_line1": "A1",
                    "address_line2": "A2",
                    "city": "Chennai",
                    "state": "TN",
                    "postal_code": "600001",
                    "pan_number": "ABCDE1234F",
                    "aadhaar_number": "123412341234",
                    "monthly_income": "50000",
                    "employer_name": "Org",
                    "employment_type": "Other",
                    "loan_purpose": "Home Loan",
                    "notes": "note",
                    "pan_file": (io.BytesIO(b"pan"), "pan.pdf"),
                    "aadhaar_file": (io.BytesIO(b"aadhaar"), "aadhaar.pdf"),
                    "income_tax_certificate": (io.BytesIO(b"it"), "it.pdf"),
                    "tax_document": (io.BytesIO(b"tax"), "tax.pdf"),
                    "employment_proof": (io.BytesIO(b"emp"), "emp.pdf"),
                    "document_types[]": [
                        "Land Document",
                        "Approved Building Plan",
                        "Property Registration",
                        "Income - Income Source Proof",
                        "Income - Recent Bank Statement",
                    ],
                    "document_files[]": [
                        (io.BytesIO(b"ld"), "land.pdf"),
                        (io.BytesIO(b"abp"), "plan.pdf"),
                        (io.BytesIO(b"pr"), "reg.pdf"),
                        (io.BytesIO(b"isp"), "incomeproof.pdf"),
                        (io.BytesIO(b"rbs"), "bank.pdf"),
                    ],
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(res.status_code, 201)
        self.assertTrue(conn.committed)
        self.assertEqual(res.get_json()["loan"]["loan_id"], 42)

    def test_user_loans_requires_email(self):
        res = self.client.get("/api/user/loans")
        self.assertEqual(res.status_code, 400)

    def test_user_loans_success(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (1, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), 5, "User", "user@test.com")
            ]]
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/user/loans?email=user@test.com")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()["loans"]), 1)

    def test_user_loan_detail_success(self):
        cursor = FakeCursor(
            fetchone_results=[
                (1, 5, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), "user@test.com", "User"),
                (10, "User", "user@test.com", "99999", "88888", None, "a1", "a2", "City", "State", "600001", "ABCDE1234F", "1234", 50000, "Org", "Salaried", "Home Loan", "note", datetime(2026, 1, 1)),
            ],
            fetchall_results=[[(7, "PAN", "pan.pdf", "x_pan.pdf", "uploads/loan_1/x_pan.pdf", datetime(2026, 1, 1))]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/user/loans/1?email=user@test.com")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["loan"]["loan_id"], 1)

    def test_update_contact_validation(self):
        res = self.client.patch(
            "/api/user/loans/1/contact", json={"email": "user@test.com", "contact_email": "", "primary_mobile": ""}
        )
        self.assertEqual(res.status_code, 400)

    def test_update_contact_success(self):
        cursor = FakeCursor(fetchone_results=[(1,)])
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch(
                "/api/user/loans/1/contact",
                json={
                    "email": "user@test.com",
                    "contact_email": "new@test.com",
                    "primary_mobile": "99999",
                    "alternate_mobile": "88888",
                },
            )

        self.assertEqual(res.status_code, 200)
        self.assertTrue(conn.committed)

    def test_admin_loans_success(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (1, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), 5, "user@test.com", "User")
            ]]
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/admin/loans")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["loans"][0]["status"], "Pending")

    def test_admin_update_status_invalid(self):
        res = self.client.patch("/api/admin/loans/1/status", json={"status": "hold"})
        self.assertEqual(res.status_code, 400)

    def test_admin_update_status_not_found(self):
        cursor = FakeCursor(fetchone_results=[None])
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch("/api/admin/loans/999/status", json={"status": "approved"})

        self.assertEqual(res.status_code, 404)

    def test_admin_update_status_wrong_current(self):
        """Cannot approve/reject a Draft or already Approved loan."""
        cursor = FakeCursor(fetchone_results=[("Draft",)])
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch("/api/admin/loans/1/status", json={"status": "approved"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot change", res.get_json()["error"])

    def test_apply_loan_invalid_pan(self):
        """Backend rejects malformed PAN."""
        res = self.client.post(
            "/api/loan/apply",
            data={
                "email": "user@test.com",
                "agreement_decision": "accepted",
                "loan_amount": "100000",
                "tenure": "12",
                "interest_rate": "10",
                "full_name": "User",
                "contact_email": "user@test.com",
                "primary_mobile": "9999999999",
                "dob": "1995-01-01",
                "address_line1": "A1",
                "address_line2": "A2",
                "city": "Chennai",
                "state": "TN",
                "postal_code": "600001",
                "pan_number": "INVALID",
                "aadhaar_number": "123412341234",
                "monthly_income": "50000",
                "employer_name": "Org",
                "employment_type": "Other",
                "loan_purpose": "Other",
                "notes": "test",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("PAN", res.get_json()["error"])

    def test_apply_loan_invalid_phone(self):
        """Backend rejects invalid mobile number."""
        res = self.client.post(
            "/api/loan/apply",
            data={
                "email": "user@test.com",
                "agreement_decision": "accepted",
                "loan_amount": "100000",
                "tenure": "12",
                "interest_rate": "10",
                "full_name": "User",
                "contact_email": "user@test.com",
                "primary_mobile": "1234",
                "dob": "1995-01-01",
                "address_line1": "A1",
                "address_line2": "A2",
                "city": "Chennai",
                "state": "TN",
                "postal_code": "600001",
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123412341234",
                "monthly_income": "50000",
                "employer_name": "Org",
                "employment_type": "Other",
                "loan_purpose": "Other",
                "notes": "test",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("mobile", res.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
