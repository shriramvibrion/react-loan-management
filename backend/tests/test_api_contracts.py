import os
import sys
import unittest
import io
from datetime import datetime
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR   = os.path.abspath(os.path.dirname(__file__))
for _d in (BACKEND_DIR, TESTS_DIR):
    if _d not in sys.path:
        sys.path.insert(0, _d)

import app as backend_app
from test_api import FakeConn, FakeCursor


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch_connection(self, module_path, cursor):
        conn = FakeConn(cursor)
        return patch(module_path, return_value=conn), conn

    def test_contract_user_login_success_shape(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"secret", bcrypt.gensalt()).decode("utf-8")
        cursor = FakeCursor(fetchone_results=[("user@test.com", hashed, "User", "99999", "Chennai")])
        p, _ = self._patch_connection("userLogin.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/login", json={"email": "user@test.com", "password": "secret"}
            )

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", data)
        self.assertIn("user", data)
        self.assertEqual(sorted(data["user"].keys()), ["city", "email", "name", "phone"])
        self.assertIsInstance(data["user"]["email"], str)

    def test_contract_apply_loan_error_shape(self):
        res = self.client.post("/api/loan/apply", json={"email": "user@test.com"})
        data = res.get_json()

        self.assertEqual(res.status_code, 400)
        self.assertIn("error", data)
        self.assertIsInstance(data["error"], str)

    def test_contract_user_loans_shape(self):
        cursor = FakeCursor(
            fetchone_results=[
                (1, 0, 0, 0, 1),
                (1, 0, 0, 0, 1),
            ],
            fetchall_results=[[
                (1, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), 5, "User", "user@test.com")
            ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.get("/api/user/loans?email=user@test.com")

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertIn("loans", data)
        self.assertIsInstance(data["loans"], list)
        loan = data["loans"][0]
        expected_keys = {
            "loan_id",
            "loan_amount",
            "tenure",
            "interest_rate",
            "emi",
            "status",
            "applied_date",
            "user_id",
            "user_name",
            "user_email",
        }
        self.assertEqual(set(loan.keys()), expected_keys)

    def test_contract_admin_update_status_shape(self):
        cursor = FakeCursor(fetchone_results=[("Pending",)], rowcount=1)
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch("/api/admin/loans/101/status", json={"status": "approved"})

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(data.keys()), {"loan_id", "message", "status"})
        self.assertEqual(data["status"], "Approved")

    def test_contract_admin_loans_shape(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (101, 50000, 12, 8.5, 4347.23, "Pending", datetime(2026, 3, 1), 5, "alice@test.com", "Alice", 0)
            ]]
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p, patch("loanRoutes._table_columns", return_value={"viewed_by_admin"}):
            res = self.client.get("/api/admin/loans")

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertIn("loans", data)
        loan = data["loans"][0]
        expected_keys = {
            "loan_id", "loan_amount", "tenure", "interest_rate", "emi",
            "status", "applied_date", "user_id", "user_email", "user_name", "viewed_by_admin",
        }
        self.assertEqual(set(loan.keys()), expected_keys)
        self.assertIsInstance(loan["viewed_by_admin"], bool)

    def test_contract_send_email_shape(self):
        cursor = FakeCursor(
            fetchone_results=[("user@test.com", "Test User", "Approved", 50000)]
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p, patch("emailService._send_email", return_value=True):
            res = self.client.post(
                "/api/admin/loans/101/send-email",
                json={"admin_email": "admin@test.com", "message": "Your loan is under review."},
            )

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", data)
        self.assertIsInstance(data["message"], str)

    def test_contract_admin_document_status_update_shape(self):
        cursor = FakeCursor(
            fetchone_results=[
                (5,),
                (101, "PAN", "under_review", 7, 0, 0, 0),
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch(
                "/api/admin/documents/77/status",
                json={
                    "status": "accepted",
                    "admin_email": "admin@test.com",
                    "message": "verified",
                    "front_verified": True,
                    "back_verified": True,
                    "is_fully_verified": True,
                },
            )

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(data.keys()), {"message", "document"})
        self.assertIn("message", data)
        self.assertIsInstance(data["message"], str)
        document = data["document"]
        expected_document_keys = {
            "document_id",
            "loan_id",
            "document_type",
            "document_status",
            "document_status_label",
            "document_status_color",
            "updated_at",
            "front_verified",
            "back_verified",
            "is_fully_verified",
        }
        self.assertEqual(set(document.keys()), expected_document_keys)
        self.assertEqual(document["document_status"], "accepted")

    def test_contract_reupload_rejected_guard_error_shape(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101, "PAN", "accepted", "uploads/loan_101/old_pan.pdf"),
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.post(
                "/api/user/documents/88/reupload",
                data={
                    "email": "user@test.com",
                    "file": (io.BytesIO(b"new-file"), "new_pan.pdf"),
                },
                content_type="multipart/form-data",
            )

        data = res.get_json()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(data.keys()), {"error"})
        self.assertIsInstance(data["error"], str)

    def test_contract_admin_open_pending_converts_to_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101, 7, 50000, 12, 8.5, 4347.23, "Pending", datetime(2026, 3, 1), "alice@test.com", "Alice"),
                None,
            ],
            fetchall_results=[[
                (
                    9,
                    "PAN",
                    "pan.pdf",
                    "stored_pan.pdf",
                    "uploads/loan_101/stored_pan.pdf",
                    datetime(2026, 3, 1),
                    "pending",
                    datetime(2026, 3, 2),
                )
            ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)

        def _columns(_, table_name):
            if table_name == "loans":
                return {"viewed_by_admin"}
            if table_name == "loan_application_details":
                return {
                    "parent_name",
                    "parent_occupation",
                    "parent_annual_income",
                    "cibil_score",
                }
            if table_name == "loan_documents":
                return {"document_status", "updated_at", "front_verified", "back_verified", "is_fully_verified"}
            return set()

        with p, patch("loanRoutes._table_columns", side_effect=_columns), patch("loanRoutes._table_exists", return_value=True):
            res = self.client.get("/api/admin/loans/101")

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(data.keys()), {"loan", "applicant", "documents"})
        self.assertEqual(data["loan"]["status"], "Under Review")
        self.assertIsInstance(data["documents"], list)
        self.assertEqual(data["documents"][0]["document_status"], "under_review")
        self.assertEqual(data["documents"][0]["document_status_label"], "Under Review")


if __name__ == "__main__":
    unittest.main()