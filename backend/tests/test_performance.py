"""
Performance benchmark tests.

Uses the in-process Flask test client (no real network / DB).
Thresholds are conservative to pass on slow CI machines.

Suites:
  - Login (user + admin)  –  bcrypt verify is the bottleneck
  - Loan list (user + admin)  –  pure serialisation
  - User registration  –  bcrypt hash
  - Pre-DB validation fast path  –  should be sub-20 ms
"""
import os
import sys
import time
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


# Thresholds (milliseconds)
_MAX_LOGIN_MS      = 500   # bcrypt verify ~250 ms each on default cost
_MAX_LIST_MS       = 100   # pure list serialisation, no hashing
_MAX_REGISTER_MS   = 3000  # bcrypt hash is slower than verify
_MAX_VALIDATE_MS   = 20    # pre-DB validation path only

_N_BCRYPT = 15   # iterations for tests involving bcrypt
_N_FAST   = 50   # iterations for non-bcrypt tests


def _avg(durations):
    return sum(durations) / len(durations)


# ---------------------------------------------------------------------------
class LoginPerformanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import bcrypt
        backend_app.app.config["TESTING"] = True
        cls.client = backend_app.app.test_client()
        cls.user_hash  = bcrypt.hashpw(b"Bench1234", bcrypt.gensalt()).decode()
        cls.admin_hash = bcrypt.hashpw(b"Admin1234", bcrypt.gensalt()).decode()

    def test_user_login_avg_response_time(self):
        durations = []
        for _ in range(_N_BCRYPT):
            cursor = FakeCursor(
                fetchone_results=[("bench@test.com", self.user_hash, "BenchUser", "9999999999", "Chennai")]
            )
            with patch("userLogin.get_connection", return_value=FakeConn(cursor)):
                t = time.perf_counter()
                self.client.post(
                    "/api/user/login",
                    json={"email": "bench@test.com", "password": "Bench1234"},
                )
                durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] User login avg={avg:.1f}ms max={max(durations):.1f}ms ({_N_BCRYPT} reqs)")
        self.assertLess(avg, _MAX_LOGIN_MS,
                        f"User login avg {avg:.0f}ms > {_MAX_LOGIN_MS}ms threshold")

    def test_admin_login_avg_response_time(self):
        durations = []
        for _ in range(_N_BCRYPT):
            cursor = FakeCursor(
                fetchone_results=[("admin@test.com", self.admin_hash)]
            )
            with patch("adminLogin.get_connection", return_value=FakeConn(cursor)):
                t = time.perf_counter()
                self.client.post(
                    "/api/admin/login",
                    json={"email": "admin@test.com", "password": "Admin1234"},
                )
                durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] Admin login avg={avg:.1f}ms ({_N_BCRYPT} reqs)")
        self.assertLess(avg, _MAX_LOGIN_MS)


# ---------------------------------------------------------------------------
class LoanListPerformanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True
        cls.client = backend_app.app.test_client()
        cls.user_rows = [
            (i, 100000, 12, 8.5, 8792.12, "Pending", datetime(2026, 1, 1),
             i, f"u{i}@t.com", f"User{i}")
            for i in range(1, 51)
        ]
        cls.admin_rows = [
            (i, 100000, 12, 8.5, 8792.12, "Pending", datetime(2026, 1, 1),
             i, f"u{i}@t.com", f"User{i}", 0)
            for i in range(1, 51)
        ]

    def test_user_loan_list_avg_response_time(self):
        durations = []
        for _ in range(_N_FAST):
            cursor = FakeCursor(fetchall_results=[list(self.user_rows)])
            with patch("loanRoutes.get_connection", return_value=FakeConn(cursor)):
                t = time.perf_counter()
                self.client.get("/api/user/loans?email=bench@test.com")
                durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] User loan list (50 rows) avg={avg:.1f}ms ({_N_FAST} reqs)")
        self.assertLess(avg, _MAX_LIST_MS)

    def test_admin_loan_list_avg_response_time(self):
        durations = []
        for _ in range(_N_FAST):
            cursor = FakeCursor(fetchall_results=[list(self.admin_rows)])
            with patch("loanRoutes.get_connection", return_value=FakeConn(cursor)):
                t = time.perf_counter()
                self.client.get("/api/admin/loans")
                durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] Admin loan list (50 rows) avg={avg:.1f}ms ({_N_FAST} reqs)")
        self.assertLess(avg, _MAX_LIST_MS)


# ---------------------------------------------------------------------------
class RegistrationPerformanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True
        cls.client = backend_app.app.test_client()

    def test_user_registration_avg_response_time(self):
        """bcrypt hashing is the bottleneck; keep to 10 iterations."""
        durations = []
        for _ in range(10):
            cursor = FakeCursor(fetchone_results=[None])
            with patch("userRegister.get_connection", return_value=FakeConn(cursor)):
                t = time.perf_counter()
                self.client.post(
                    "/api/user/register",
                    json={"name": "Bench", "email": "bench@test.com",
                          "password": "Bench1234", "phone": "9876543210", "city": "Chennai"},
                )
                durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] Registration avg={avg:.1f}ms (10 reqs, bcrypt)")
        self.assertLess(avg, _MAX_REGISTER_MS,
                        f"Registration avg {avg:.0f}ms > {_MAX_REGISTER_MS}ms threshold")


# ---------------------------------------------------------------------------
class ValidationFastPathTests(unittest.TestCase):
    """Early-exit validation (no DB, no bcrypt) should be extremely quick."""

    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True
        cls.client = backend_app.app.test_client()

    def test_missing_login_fields_fast(self):
        durations = []
        for _ in range(_N_FAST):
            t = time.perf_counter()
            self.client.post("/api/user/login", json={})
            durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] Login validation fast-path avg={avg:.2f}ms ({_N_FAST} reqs)")
        self.assertLess(avg, _MAX_VALIDATE_MS,
                        f"Pre-DB validation avg {avg:.1f}ms > {_MAX_VALIDATE_MS}ms")

    def test_missing_register_fields_fast(self):
        durations = []
        for _ in range(_N_FAST):
            t = time.perf_counter()
            self.client.post("/api/user/register", json={"email": "x"})
            durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] Register validation fast-path avg={avg:.2f}ms ({_N_FAST} reqs)")
        self.assertLess(avg, _MAX_VALIDATE_MS)

    def test_cibil_validation_no_db_fast(self):
        durations = []
        for _ in range(_N_FAST):
            t = time.perf_counter()
            self.client.post(
                "/api/loan/apply",
                data={"email": "u@t.com", "agreement_decision": "accepted",
                      "loan_amount": "100000", "tenure": "12", "cibil_score": "0"},
                content_type="multipart/form-data",
            )
            durations.append((time.perf_counter() - t) * 1000)

        avg = _avg(durations)
        print(f"\n[PERF] CIBIL pre-DB validation avg={avg:.2f}ms ({_N_FAST} reqs)")
        self.assertLess(avg, _MAX_VALIDATE_MS)


if __name__ == "__main__":
    unittest.main()
