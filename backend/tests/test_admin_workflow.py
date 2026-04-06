import os
import sys
import unittest
import io
from datetime import datetime
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR = os.path.abspath(os.path.dirname(__file__))
for _dir in (BACKEND_DIR, TESTS_DIR):
    if _dir not in sys.path:
        sys.path.insert(0, _dir)

import app as backend_app
from test_api import FakeConn, FakeCursor


class AdminWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()
        import app as _app
        _app._rate_store.clear()

    def _patch_connection(self, module_path, cursor):
        conn = FakeConn(cursor)
        return patch(module_path, return_value=conn), conn

    def test_opening_pending_loan_sets_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (12, 7, 100000, 12, 10, 8792.12, "Pending", datetime(2026, 1, 1), "user@test.com", "User"),
                None,
            ],
            fetchall_results=[[]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)
        with p, patch("loanRoutes._table_columns", return_value={"viewed_by_admin", "document_status", "updated_at", "front_verified", "back_verified", "is_fully_verified"}), patch("loanRoutes._table_exists", return_value=True):
            res = self.client.get("/api/admin/loans/12")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["loan"]["status"], "Under Review")
        self.assertTrue(conn.committed)
        self.assertTrue(any("under review" in q.lower() for q, _ in cursor.executed))

    def test_send_email_endpoint_uses_default_template(self):
        cursor = FakeCursor(
            fetchone_results=[("user@test.com", "User", "Approved", 100000)],
        )
        p_conn, _ = self._patch_connection("loanRoutes.get_connection", cursor)

        with p_conn, patch("emailService._send_email", return_value=True) as mail_mock:
            res = self.client.post(
                "/api/admin/loans/12/send-email",
                json={"admin_email": "admin@test.com", "message": ""},
            )

        self.assertEqual(res.status_code, 200)
        self.assertTrue(mail_mock.called)

    def test_admin_document_status_requires_valid_admin(self):
        cursor = FakeCursor(
            fetchone_results=[None],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "accepted",
                    "admin_email": "not-admin@test.com",
                },
            )

        self.assertEqual(res.status_code, 403)
        self.assertIn("Unauthorized admin", res.get_json()["error"])

    def test_admin_document_status_accept_transition(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101,),  # admin exists
                (55, "PAN", "under_review", 7, 0, 0, 0),  # document row
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "accepted",
                    "admin_email": "admin@test.com",
                    "message": "Looks good",
                    "front_verified": True,
                    "back_verified": True,
                    "is_fully_verified": True,
                },
            )

        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertEqual(payload["document"]["document_status"], "accepted")
        self.assertTrue(conn.committed)
        self.assertTrue(
            any(
                "UPDATE loan_documents" in query and params and params[0] == "accepted"
                for query, params in cursor.executed
            )
        )

    def test_admin_document_status_reject_transition(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101,),  # admin exists
                (55, "PAN", "under_review", 7, 0, 0, 0),  # document row
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "rejected",
                    "admin_email": "admin@test.com",
                    "message": "Needs rework",
                    "front_verified": False,
                    "back_verified": False,
                    "is_fully_verified": False,
                },
            )

        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertEqual(payload["document"]["document_status"], "rejected")
        self.assertTrue(conn.committed)
        self.assertTrue(
            any(
                "UPDATE loan_documents" in query and params and params[0] == "rejected"
                for query, params in cursor.executed
            )
        )

    def test_admin_document_status_restore_from_accepted_to_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101,),  # admin exists
                (55, "PAN", "accepted", 7, 1, 1, 1),  # currently accepted
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "under_review",
                    "admin_email": "admin@test.com",
                    "message": "Restore to review",
                },
            )

        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertEqual(payload["document"]["document_status"], "under_review")
        self.assertFalse(payload["document"]["front_verified"])
        self.assertFalse(payload["document"]["back_verified"])
        self.assertFalse(payload["document"]["is_fully_verified"])
        self.assertTrue(conn.committed)
        self.assertTrue(
            any(
                "UPDATE loan_documents" in query and params and params[0] == "under_review"
                for query, params in cursor.executed
            )
        )

    def test_admin_document_status_restore_from_rejected_to_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101,),  # admin exists
                (55, "PAN", "rejected", 7, 0, 0, 0),  # currently rejected
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "under_review",
                    "admin_email": "admin@test.com",
                    "message": "Second review",
                },
            )

        self.assertEqual(res.status_code, 200)
        payload = res.get_json()
        self.assertEqual(payload["document"]["document_status"], "under_review")
        self.assertTrue(conn.committed)
        self.assertTrue(
            any(
                "UPDATE loan_documents" in query and params and params[0] == "under_review"
                for query, params in cursor.executed
            )
        )

    def test_admin_document_status_rejects_updates_for_already_reviewed_docs(self):
        cursor = FakeCursor(
            fetchone_results=[
                (101,),  # admin exists
                (55, "PAN", "accepted", 7, 1, 1, 1),  # already reviewed
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, conn = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.patch(
                "/api/admin/documents/9/status",
                json={
                    "status": "rejected",
                    "admin_email": "admin@test.com",
                    "message": "trying to flip",
                },
            )

        self.assertEqual(res.status_code, 400)
        self.assertIn("Only documents in Under Review", res.get_json()["error"])
        self.assertFalse(
            any("UPDATE loan_documents" in query for query, _ in cursor.executed)
        )
        self.assertFalse(conn.committed)

    def test_reupload_guard_allows_only_rejected_documents(self):
        cursor = FakeCursor(
            fetchone_results=[
                (55, "PAN", "accepted", "uploads/loan_55/old_pan.pdf"),
            ],
            fetchall_results=[[ ("document_status",), ("updated_at",), ("front_verified",), ("back_verified",), ("is_fully_verified",) ]],
        )
        p, _ = self._patch_connection("loanRoutes.get_connection", cursor)

        with p:
            res = self.client.post(
                "/api/user/documents/12/reupload",
                data={
                    "email": "user@test.com",
                    "file": (io.BytesIO(b"new-pan"), "pan_new.pdf"),
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(res.status_code, 400)
        self.assertIn("Only rejected documents", res.get_json()["error"])

    def test_admin_open_converts_pending_and_document_statuses_to_under_review(self):
        cursor = FakeCursor(
            fetchone_results=[
                (50, 7, 200000, 24, 8.5, 9138.21, "Pending", datetime(2026, 3, 1), "alice@test.com", "Alice"),
                None,  # applicant details
            ],
            fetchall_results=[
                [
                    (
                        99,
                        "PAN",
                        "pan.pdf",
                        "stored_pan.pdf",
                        "uploads/loan_50/stored_pan.pdf",
                        datetime(2026, 3, 1),
                        "pending",
                        datetime(2026, 3, 2),
                    )
                ]
            ],
        )
        p_conn, conn = self._patch_connection("loanRoutes.get_connection", cursor)

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

        with p_conn, patch("loanRoutes._table_columns", side_effect=_columns), patch("loanRoutes._table_exists", return_value=True):
            res = self.client.get("/api/admin/loans/50")

        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertEqual(body["loan"]["status"], "Under Review")
        self.assertEqual(body["documents"][0]["document_status"], "under_review")
        self.assertTrue(conn.committed)
        self.assertTrue(any("UPDATE loans SET status = 'Under Review'" in q for q, _ in cursor.executed))


if __name__ == "__main__":
    unittest.main()
