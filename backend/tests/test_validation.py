"""
Input-validation boundary tests for the Loan Management System.

Covers (in the order they fire in apply_loan):
  - CIBIL score: 299, 300 (boundary pass), 900 (boundary pass), 901, empty, non-numeric
  - PAN format: lowercase, wrong pattern, short
  - Aadhaar: 11-digit, 13-digit, with letters
  - Mobile: starts with 5, 9-digit, 11-digit
  - Postal code: 5 digits, 7 digits, with letters
  - Loan amount / monthly income / tenure / interest rate edge cases
  - Education Loan: missing / negative parent income
  - File extension not allowed
  - File size exceeds limit
  - Missing mandatory file
  - XSS payload does not appear raw in response body
  - Agreement decision = 'denied' rejected
"""
import io
import os
import sys
import unittest
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TESTS_DIR   = os.path.abspath(os.path.dirname(__file__))
for _d in (BACKEND_DIR, TESTS_DIR):
    if _d not in sys.path:
        sys.path.insert(0, _d)

import app as backend_app
from test_api import FakeConn, FakeCursor


# ---------------------------------------------------------------------------
# Shared form data helpers
# ---------------------------------------------------------------------------

# Document labels for employment_type="Other" + loan_purpose="Home Loan"
_LOAN_DOCS = ["Land Document", "Approved Building Plan", "Property Registration"]
_EMP_DOCS  = ["Income Source Proof", "Recent Bank Statement"]

# Full valid non-draft form (text fields only; no files)
_FULL_VALID_FORM = dict(
    email="user@test.com",
    agreement_decision="accepted",
    loan_amount="100000",
    tenure="12",
    interest_rate="10",
    full_name="Test User",
    contact_email="user@test.com",
    primary_mobile="9999999999",
    dob="1995-01-01",
    address_line1="A1",
    address_line2="A2",
    city="Chennai",
    state="TN",
    postal_code="600001",
    pan_number="ABCDE1234F",
    aadhaar_number="123412341234",
    monthly_income="50000",
    cibil_score="720",
    employer_name="Org",
    employment_type="Other",
    loan_purpose="Home Loan",
    notes="note",
)


def _make_files():
    """Returns a dict of file uploads for a valid Home Loan / Other employment form."""
    return {
        "pan_file":    (io.BytesIO(b"pan"),    "pan.pdf"),
        "aadhaar_file":(io.BytesIO(b"aadhaar"),"aadhaar.pdf"),
        "document_types[]": _LOAN_DOCS + [f"Income - {d}" for d in _EMP_DOCS],
        "document_files[]": [
            (io.BytesIO(b"ld"),  "land.pdf"),
            (io.BytesIO(b"abp"), "plan.pdf"),
            (io.BytesIO(b"pr"),  "reg.pdf"),
            (io.BytesIO(b"isp"), "isp.pdf"),
            (io.BytesIO(b"rbs"), "bank.pdf"),
        ],
    }


def _patch_db(cursor):
    """Patch loanRoutes.get_connection with a FakeConn wrapping *cursor*."""
    conn = FakeConn(cursor)
    return patch("loanRoutes.get_connection", return_value=conn)


# ---------------------------------------------------------------------------
class CibilScoreValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _post(self, cibil):
        """Minimal form that reaches the CIBIL check (agreement, amount, tenure are set)."""
        return self.client.post(
            "/api/loan/apply",
            data=dict(
                email="user@test.com",
                agreement_decision="accepted",
                loan_amount="100000",
                tenure="12",
                cibil_score="" if cibil is None else str(cibil),
            ),
            content_type="multipart/form-data",
        )

    def test_cibil_299_rejected(self):
        res = self._post(299)
        self.assertEqual(res.status_code, 400)
        self.assertIn("CIBIL", res.get_json()["error"])

    def test_cibil_901_rejected(self):
        res = self._post(901)
        self.assertEqual(res.status_code, 400)
        self.assertIn("CIBIL", res.get_json()["error"])

    def test_cibil_empty_rejected(self):
        res = self._post(None)
        self.assertEqual(res.status_code, 400)
        self.assertIn("CIBIL", res.get_json()["error"])

    def test_cibil_non_numeric_rejected(self):
        res = self._post("abc")
        self.assertEqual(res.status_code, 400)
        self.assertIn("CIBIL", res.get_json()["error"])

    def test_cibil_300_passes_cibil_check(self):
        """300 is the minimum valid score; error must come from a later check."""
        res = self._post(300)
        self.assertEqual(res.status_code, 400)
        self.assertNotIn("CIBIL", res.get_json()["error"])

    def test_cibil_900_passes_cibil_check(self):
        """900 is the maximum valid score; error must come from a later check."""
        res = self._post(900)
        self.assertEqual(res.status_code, 400)
        self.assertNotIn("CIBIL", res.get_json()["error"])

    def test_cibil_750_valid_mid_range_passes(self):
        res = self._post(750)
        self.assertEqual(res.status_code, 400)     # fails on missing text fields
        self.assertNotIn("CIBIL", res.get_json()["error"])


# ---------------------------------------------------------------------------
class PanAadhaarMobilePostalTests(unittest.TestCase):
    """
    These validations fire AFTER required_text_fields check and BEFORE
    the file-upload check, so no files are needed in the request.
    """
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _post(self, **override):
        form = {**_FULL_VALID_FORM, **override}
        return self.client.post(
            "/api/loan/apply", data=form, content_type="multipart/form-data"
        )

    # PAN
    def test_pan_lowercase_rejected(self):
        res = self._post(pan_number="abcde1234f")
        self.assertEqual(res.status_code, 400)
        self.assertIn("PAN", res.get_json()["error"])

    def test_pan_wrong_pattern_rejected(self):
        res = self._post(pan_number="ABC12345XY")
        self.assertEqual(res.status_code, 400)
        self.assertIn("PAN", res.get_json()["error"])

    def test_pan_too_short_rejected(self):
        res = self._post(pan_number="ABCDE123")
        self.assertEqual(res.status_code, 400)
        self.assertIn("PAN", res.get_json()["error"])

    # Aadhaar
    def test_aadhaar_11_digits_rejected(self):
        res = self._post(aadhaar_number="12312312312")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Aadhaar", res.get_json()["error"])

    def test_aadhaar_13_digits_rejected(self):
        res = self._post(aadhaar_number="1231231231234")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Aadhaar", res.get_json()["error"])

    def test_aadhaar_with_letters_rejected(self):
        res = self._post(aadhaar_number="12312312112X")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Aadhaar", res.get_json()["error"])

    # Mobile
    def test_mobile_starts_with_5_rejected(self):
        res = self._post(primary_mobile="5999999999")
        self.assertEqual(res.status_code, 400)
        self.assertIn("mobile", res.get_json()["error"].lower())

    def test_mobile_9_digits_rejected(self):
        res = self._post(primary_mobile="999999999")
        self.assertEqual(res.status_code, 400)
        self.assertIn("mobile", res.get_json()["error"].lower())

    def test_mobile_11_digits_rejected(self):
        res = self._post(primary_mobile="99999999990")
        self.assertEqual(res.status_code, 400)
        self.assertIn("mobile", res.get_json()["error"].lower())

    # Postal
    def test_postal_5_digits_rejected(self):
        res = self._post(postal_code="60000")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Postal", res.get_json()["error"])

    def test_postal_7_digits_rejected(self):
        res = self._post(postal_code="6000011")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Postal", res.get_json()["error"])

    def test_postal_with_letters_rejected(self):
        res = self._post(postal_code="6000A1")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Postal", res.get_json()["error"])


# ---------------------------------------------------------------------------
class NumericEdgeCaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _post(self, **override):
        form = {**_FULL_VALID_FORM, **override}
        return self.client.post(
            "/api/loan/apply", data=form, content_type="multipart/form-data"
        )

    def _draft_post(self, **data):
        return self.client.post(
            "/api/loan/apply",
            data={"email": "u@t.com", "submission_type": "draft", **data},
            content_type="multipart/form-data",
        )

    # Amounts must be > 0 (fires BEFORE file check)
    def test_loan_amount_zero_rejected(self):
        res = self._post(loan_amount="0")
        self.assertEqual(res.status_code, 400)
        self.assertIn("greater than zero", res.get_json()["error"])

    def test_loan_amount_negative_rejected(self):
        res = self._post(loan_amount="-5000")
        self.assertEqual(res.status_code, 400)

    def test_monthly_income_zero_rejected(self):
        res = self._post(monthly_income="0")
        self.assertEqual(res.status_code, 400)

    def test_non_numeric_loan_amount_rejected(self):
        res = self._post(loan_amount="one_lakh")
        self.assertEqual(res.status_code, 400)
        self.assertIn("numbers", res.get_json()["error"].lower())

    # EMI overflow guard runs before DB on draft path
    def test_tenure_1201_draft_rejected(self):
        res = self._draft_post(loan_amount="100000", tenure="1201", interest_rate="10")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Tenure", res.get_json()["error"])

    def test_tenure_1200_draft_allowed(self):
        """1200 months is the exact maximum; request fails later (DB user lookup) not on tenure."""
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=77)
        with _patch_db(cursor):
            res = self._draft_post(loan_amount="100000", tenure="1200", interest_rate="10")
        # Either 201 (draft saved) – not a tenure error
        self.assertNotIn("Tenure", res.get_json().get("error", ""))

    def test_interest_rate_101_draft_rejected(self):
        res = self._draft_post(loan_amount="100000", tenure="12", interest_rate="101")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Interest rate", res.get_json()["error"])

    def test_interest_rate_100_draft_allowed(self):
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=77)
        with _patch_db(cursor):
            res = self._draft_post(loan_amount="100000", tenure="12", interest_rate="100")
        self.assertNotIn("Interest rate", res.get_json().get("error", ""))


# ---------------------------------------------------------------------------
class EducationLoanValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_education_loan_requires_parent_income(self):
        form = {
            **_FULL_VALID_FORM,
            "loan_purpose": "Education Loan",
            "employment_type": "Student",
            # parent_name / parent_occupation / parent_annual_income NOT provided
        }
        res = self.client.post(
            "/api/loan/apply", data=form, content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Parent", res.get_json()["error"])

    def test_education_loan_negative_parent_income_rejected(self):
        form = {
            **_FULL_VALID_FORM,
            "loan_purpose": "Education Loan",
            "employment_type": "Student",
            "parent_name": "Parent",
            "parent_occupation": "Teacher",
            "parent_annual_income": "-10000",
        }
        res = self.client.post(
            "/api/loan/apply", data=form, content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)


# ---------------------------------------------------------------------------
class FileValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def _post_with_files(self, pan_file_tuple, aadhaar_bytes=b"aadhaar"):
        data = dict(**_FULL_VALID_FORM)
        data["pan_file"]    = pan_file_tuple
        data["aadhaar_file"]= (io.BytesIO(aadhaar_bytes), "aadhaar.pdf")
        data["document_types[]"] = _LOAN_DOCS + [f"Income - {d}" for d in _EMP_DOCS]
        data["document_files[]"] = [
            (io.BytesIO(b"ld"),  "land.pdf"),
            (io.BytesIO(b"abp"), "plan.pdf"),
            (io.BytesIO(b"pr"),  "reg.pdf"),
            (io.BytesIO(b"isp"), "isp.pdf"),
            (io.BytesIO(b"rbs"), "bank.pdf"),
        ]
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=42)
        with _patch_db(cursor):
            return self.client.post(
                "/api/loan/apply", data=data, content_type="multipart/form-data"
            )

    def test_disallowed_extension_rejected(self):
        res = self._post_with_files((io.BytesIO(b"evil"), "virus.exe"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("not allowed", res.get_json()["error"])

    def test_oversized_pan_file_rejected(self):
        large = b"x" * (10 * 1024 * 1024 + 1)   # 10 MB + 1 byte
        res = self._post_with_files((io.BytesIO(large), "big.pdf"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceeds", res.get_json()["error"])

    def test_missing_pan_file_rejected(self):
        data = dict(**_FULL_VALID_FORM)
        # aadhaar_file present, pan_file absent
        data["aadhaar_file"]     = (io.BytesIO(b"aadh"), "aadhaar.pdf")
        data["document_types[]"] = _LOAN_DOCS + [f"Income - {d}" for d in _EMP_DOCS]
        data["document_files[]"] = [
            (io.BytesIO(b"ld"),  "land.pdf"),
            (io.BytesIO(b"abp"), "plan.pdf"),
            (io.BytesIO(b"pr"),  "reg.pdf"),
            (io.BytesIO(b"isp"), "isp.pdf"),
            (io.BytesIO(b"rbs"), "bank.pdf"),
        ]
        res = self.client.post(
            "/api/loan/apply", data=data, content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("mandatory", res.get_json()["error"].lower())


# ---------------------------------------------------------------------------
class AgreementAndXssTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True

    def setUp(self):
        self.client = backend_app.app.test_client()

    def test_agreement_denied_rejected(self):
        res = self.client.post(
            "/api/loan/apply",
            data={"email": "u@t.com", "agreement_decision": "denied",
                  "loan_amount": "100000", "tenure": "12"},
            content_type="multipart/form-data",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("accept", res.get_json()["error"].lower())

    def test_xss_payload_not_reflected_raw(self):
        """A <script> payload in full_name must never appear literally in the response."""
        data = dict(**_FULL_VALID_FORM)
        data["full_name"] = "<script>alert('xss')</script>"
        data.update(_make_files())
        cursor = FakeCursor(fetchone_results=[(5,)], lastrowid=99)
        with _patch_db(cursor):
            res = self.client.post(
                "/api/loan/apply", data=data, content_type="multipart/form-data"
            )
        self.assertNotIn("<script>", res.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
