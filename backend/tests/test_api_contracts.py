import unittest
from datetime import datetime
from unittest.mock import patch

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
            fetchall_results=[[
                (1, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), 5, "User", "user@test.com")
            ]]
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
        cursor = FakeCursor(rowcount=1)
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)
        with p:
            res = self.client.patch("/api/admin/loans/101/status", json={"status": "approved"})

        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(data.keys()), {"loan_id", "message", "status"})
        self.assertEqual(data["status"], "Approved")


if __name__ == "__main__":
    unittest.main()
