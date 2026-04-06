"""
Feature tests for all secondary routes not covered in test_api.py:
  - Notifications (GET, PATCH mark-read)
  - Admin Remarks (GET, POST)
  - Loan Status History (GET)
  - Admin Analytics (GET)
  - Loan Report (GET user + admin)
  - Draft endpoint (GET)
  - Admin update status (Approved / Rejected)
"""
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


# ---------------------------------------------------------------------------
class NotificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch(self, cursor):
        return patch("notificationRoutes.get_connection", return_value=FakeConn(cursor))

    def test_get_user_notifications_success(self):
        cursor = FakeCursor(
            fetchone_results=[(3,)],
            fetchall_results=[[
                (1, "Loan #1 Submitted", "Submitted ok.", "info", 0, datetime(2026, 3, 1))
            ]],
        )
        with self._patch(cursor):
            res = self.client.get("/api/notifications?email=user@test.com&role=user")
        self.assertEqual(res.status_code, 200)
        notifs = res.get_json()["notifications"]
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0]["title"], "Loan #1 Submitted")
        self.assertFalse(notifs[0]["is_read"])

    def test_get_admin_notifications_success(self):
        cursor = FakeCursor(
            fetchone_results=[(1,)],
            fetchall_results=[[
                (2, "New Application #5", "New loan received.", "info", 0, datetime(2026, 3, 2))
            ]],
        )
        with self._patch(cursor):
            res = self.client.get("/api/notifications?email=admin@test.com&role=admin")
        self.assertEqual(res.status_code, 200)
        notif = res.get_json()["notifications"][0]
        self.assertEqual(notif["title"], "New Application #5")

    def test_get_notifications_requires_email(self):
        res = self.client.get("/api/notifications")
        self.assertEqual(res.status_code, 400)

    def test_get_notifications_user_not_found(self):
        cursor = FakeCursor(fetchone_results=[None])
        with self._patch(cursor):
            res = self.client.get("/api/notifications?email=ghost@test.com&role=user")
        self.assertEqual(res.status_code, 404)

    def test_get_notifications_empty_list(self):
        cursor = FakeCursor(fetchone_results=[(3,)], fetchall_results=[[]])
        with self._patch(cursor):
            res = self.client.get("/api/notifications?email=user@test.com&role=user")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["notifications"], [])

    def test_mark_all_notifications_read(self):
        cursor = FakeCursor(fetchone_results=[(3,)])
        conn = FakeConn(cursor)
        with patch("notificationRoutes.get_connection", return_value=conn):
            res = self.client.patch(
                "/api/notifications/read",
                json={"email": "user@test.com", "role": "user"},
            )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(conn.committed)

    def test_mark_specific_notification_read(self):
        cursor = FakeCursor(fetchone_results=[(3,)])
        conn = FakeConn(cursor)
        with patch("notificationRoutes.get_connection", return_value=conn):
            res = self.client.patch(
                "/api/notifications/read",
                json={"email": "user@test.com", "role": "user", "id": 7},
            )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(conn.committed)

    def test_mark_read_requires_email(self):
        res = self.client.patch("/api/notifications/read", json={"role": "user"})
        self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
class RemarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch(self, cursor):
        return patch("notificationRoutes.get_connection", return_value=FakeConn(cursor))

    def test_get_remarks_empty(self):
        cursor = FakeCursor(fetchall_results=[[]])
        with self._patch(cursor):
            res = self.client.get("/api/admin/loans/10/remarks")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["remarks"], [])

    def test_get_remarks_with_data(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (1, "Verified documents.", datetime(2026, 3, 1), "SuperAdmin")
            ]]
        )
        with self._patch(cursor):
            res = self.client.get("/api/admin/loans/10/remarks")
        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(data["remarks"][0]["remark"], "Verified documents.")
        self.assertEqual(data["remarks"][0]["admin_name"], "SuperAdmin")

    def test_add_remark_success(self):
        cursor = FakeCursor(fetchone_results=[(1,), (10,)], lastrowid=99)
        conn = FakeConn(cursor)
        with patch("notificationRoutes.get_connection", return_value=conn):
            res = self.client.post(
                "/api/admin/loans/10/remarks",
                json={"admin_email": "admin@test.com", "remark": "Income looks good."},
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["id"], 99)
        self.assertTrue(conn.committed)

    def test_add_remark_missing_fields(self):
        res = self.client.post("/api/admin/loans/10/remarks", json={"remark": "hello"})
        self.assertEqual(res.status_code, 400)

    def test_add_remark_too_long(self):
        res = self.client.post(
            "/api/admin/loans/10/remarks",
            json={"admin_email": "a@t.com", "remark": "x" * 2001},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("2000", res.get_json()["error"])

    def test_add_remark_admin_not_found(self):
        cursor = FakeCursor(fetchone_results=[None])
        with self._patch(cursor):
            res = self.client.post(
                "/api/admin/loans/10/remarks",
                json={"admin_email": "nobody@test.com", "remark": "test"},
            )
        self.assertEqual(res.status_code, 404)

    def test_add_remark_loan_not_found(self):
        cursor = FakeCursor(fetchone_results=[(1,), None])  # admin found, loan not found
        with self._patch(cursor):
            res = self.client.post(
                "/api/admin/loans/999/remarks",
                json={"admin_email": "admin@test.com", "remark": "test"},
            )
        self.assertEqual(res.status_code, 404)


# ---------------------------------------------------------------------------
class StatusHistoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch(self, cursor):
        return patch("notificationRoutes.get_connection", return_value=FakeConn(cursor))

    def test_get_status_history_three_entries(self):
        cursor = FakeCursor(
            fetchall_results=[[
                (1, None, "Pending", datetime(2026, 3, 1), "user@test.com"),
                (2, "Pending", "Under Review", datetime(2026, 3, 2), "admin"),
                (3, "Under Review", "Approved", datetime(2026, 3, 3), "admin@admin.com"),
            ]]
        )
        with self._patch(cursor):
            res = self.client.get("/api/loans/15/history")
        self.assertEqual(res.status_code, 200)
        history = res.get_json()["history"]
        self.assertEqual(len(history), 3)
        self.assertIsNone(history[0]["old_status"])
        self.assertEqual(history[1]["new_status"], "Under Review")
        self.assertEqual(history[2]["old_status"], "Under Review")
        self.assertEqual(history[2]["new_status"], "Approved")

    def test_get_status_history_empty(self):
        cursor = FakeCursor(fetchall_results=[[]])
        with self._patch(cursor):
            res = self.client.get("/api/loans/99/history")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["history"], [])


# ---------------------------------------------------------------------------
class AnalyticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_analytics_full_shape(self):
        # Analytics fetches 3 fetchall + 1 fetchone
        cursor = FakeCursor(
            fetchall_results=[
                [("Pending", 5, 500000), ("Approved", 3, 400000)],      # status dist
                [("2026-01", 3, 200000), ("2026-02", 5, 350000)],        # monthly
                [("Home Loan", 4, 380000), ("Education Loan", 2, 160000)],  # purpose
            ],
            fetchone_results=[(8, 700000, 87500.0, 24.0)],               # stats
        )
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/admin/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("status_distribution", data)
        self.assertIn("monthly_data", data)
        self.assertIn("purpose_distribution", data)
        self.assertIn("total_stats", data)
        self.assertEqual(data["total_stats"]["total_loans"], 8)
        self.assertAlmostEqual(data["total_stats"]["total_amount"], 700000.0)
        self.assertEqual(len(data["status_distribution"]), 2)
        self.assertEqual(data["status_distribution"][0]["status"], "Pending")
        self.assertEqual(data["purpose_distribution"][0]["purpose"], "Home Loan")

    def test_analytics_empty_database(self):
        cursor = FakeCursor(
            fetchall_results=[[], [], []],
            fetchone_results=[(0, None, None, None)],
        )
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/admin/analytics")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["total_stats"]["total_loans"], 0)
        self.assertEqual(data["total_stats"]["total_amount"], 0.0)
        self.assertEqual(data["status_distribution"], [])


# ---------------------------------------------------------------------------
class LoanReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_user_loan_report_success(self):
        cursor = FakeCursor(
            fetchone_results=[
                (5, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), "Test User", "user@test.com"),
                ("Test User", "user@test.com", "9999999999", "1990-01-01", "123 St",
                 "Chennai", "TN", "600001", "ABCDE1234F", 50000, "Corp", "Salaried", "Home Loan"),
            ]
        )
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/loans/5/report?email=user@test.com")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["loan"]["loan_id"], 5)
        self.assertIsNotNone(data["applicant"])
        self.assertEqual(data["applicant"]["full_name"], "Test User")
        self.assertEqual(data["applicant"]["loan_purpose"], "Home Loan")

    def test_admin_loan_report_no_applicant(self):
        cursor = FakeCursor(
            fetchone_results=[
                (5, 100000, 12, 10, 8792.12, "Approved", datetime(2026, 1, 1), "Test User", "user@test.com"),
                None,
            ]
        )
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/loans/5/report?role=admin")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["applicant"])

    def test_loan_report_not_found(self):
        cursor = FakeCursor(fetchone_results=[None])
        with patch("notificationRoutes.get_connection", return_value=FakeConn(cursor)):
            res = self.client.get("/api/loans/999/report?email=user@test.com")
        self.assertEqual(res.status_code, 404)

    def test_user_report_requires_email(self):
        res = self.client.get("/api/loans/5/report")
        self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
class DraftEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_latest_draft_returns_none(self):
        res = self.client.get("/api/loan/draft")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.get_json()["draft"])


# ---------------------------------------------------------------------------
class AdminUpdateStatusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _patch(self, cursor):
        conn = FakeConn(cursor)
        return patch("loanRoutes.get_connection", return_value=conn), conn

    def test_approve_loan_from_under_review(self):
        cursor = FakeCursor(fetchone_results=[("Under Review",), (5,)])
        p, conn = self._patch(cursor)
        with p:
            res = self.client.patch("/api/admin/loans/10/status", json={"status": "approved"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "Approved")
        self.assertEqual(res.get_json()["loan_id"], 10)
        self.assertTrue(conn.committed)

    def test_reject_loan_from_under_review(self):
        cursor = FakeCursor(fetchone_results=[("Under Review",), (5,)])
        p, conn = self._patch(cursor)
        with p:
            res = self.client.patch("/api/admin/loans/10/status", json={"status": "rejected"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "Rejected")
        self.assertTrue(conn.committed)

    def test_accepted_is_alias_for_approved(self):
        cursor = FakeCursor(fetchone_results=[("Pending",), (5,)])
        p, _ = self._patch(cursor)
        with p:
            res = self.client.patch("/api/admin/loans/10/status", json={"status": "accepted"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "Approved")

    def test_approve_with_remarks_inserts_remark(self):
        # Extra fetchone for admin_id lookup when both remarks + admin_email present
        cursor = FakeCursor(fetchone_results=[("Under Review",), (5,), (1,)])
        p, conn = self._patch(cursor)
        with p:
            res = self.client.patch(
                "/api/admin/loans/10/status",
                json={"status": "approved", "admin_email": "admin@test.com", "remarks": "Docs verified."},
            )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(conn.committed)
        self.assertTrue(any("admin_remarks" in q for q, _ in cursor.executed))

    def test_update_status_loan_not_found(self):
        cursor = FakeCursor(fetchone_results=[None])
        p, _ = self._patch(cursor)
        with p:
            res = self.client.patch("/api/admin/loans/9999/status", json={"status": "approved"})
        self.assertEqual(res.status_code, 404)

    def test_update_already_approved_blocked(self):
        cursor = FakeCursor(fetchone_results=[("Approved",)])
        p, _ = self._patch(cursor)
        with p:
            res = self.client.patch("/api/admin/loans/10/status", json={"status": "rejected"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot change", res.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
