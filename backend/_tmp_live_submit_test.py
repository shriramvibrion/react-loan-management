import io
import time
import requests

BASE = "http://127.0.0.1:5000"


def main():
    email = f"live_submit_{int(time.time())}@test.com"
    password = "TestPass123"

    # 1) Register user
    reg = requests.post(
        f"{BASE}/api/user/register",
        json={
            "name": "Live Submit User",
            "email": email,
            "password": password,
            "phone": "9876543210",
            "city": "Chennai",
        },
        timeout=20,
    )

    # 2) Login user
    login = requests.post(
        f"{BASE}/api/user/login",
        json={"email": email, "password": password},
        timeout=20,
    )

    # 3) Final submit with all mandatory applicant docs for Home Loan + Salaried
    data = [
        ("email", email),
        ("submission_type", "submit"),
        ("agreement_decision", "accepted"),
        ("full_name", "Live Submit User"),
        ("contact_email", email),
        ("primary_mobile", "9876543210"),
        ("alternate_mobile", "9876543211"),
        ("dob", "1993-08-10"),
        ("address_line1", "12 Test Street"),
        ("address_line2", "Nagar"),
        ("city", "Chennai"),
        ("state", "Tamil Nadu"),
        ("postal_code", "600001"),
        ("pan_number", "ABCDE1234F"),
        ("aadhaar_number", "123456789012"),
        ("monthly_income", "60000"),
        ("cibil_score", "700"),
        ("employer_name", "Acme Corp"),
        ("employment_type", "Salaried"),
        ("loan_purpose", "Home Loan"),
        ("loan_amount", "500000"),
        ("tenure", "24"),
        ("interest_rate", "8.50"),
    ]

    # Dynamic required docs for Home Loan + Salaried
    dynamic_labels = [
        "Land Document",
        "Approved Building Plan",
        "Property Registration",
        "Income - Latest 3 Salary Slips",
        "Income - Form 16",
        "Income - Bank Statement (6 Months)",
    ]

    files = [
        ("pan_file", ("pan.pdf", io.BytesIO(b"%PDF-1.4 pan").getvalue(), "application/pdf")),
        ("aadhaar_file", ("aadhaar.pdf", io.BytesIO(b"%PDF-1.4 aadhaar").getvalue(), "application/pdf")),
    ]

    for i, label in enumerate(dynamic_labels, start=1):
        data.append(("document_types[]", label))
        files.append(
            (
                "document_files[]",
                (f"doc_{i}.pdf", io.BytesIO(f"%PDF-1.4 {label}".encode("utf-8")).getvalue(), "application/pdf"),
            )
        )

    submit = requests.post(
        f"{BASE}/api/loan/apply",
        data=data,
        files=files,
        timeout=60,
    )

    print("REGISTER_STATUS", reg.status_code)
    print("LOGIN_STATUS", login.status_code)
    print("SUBMIT_STATUS", submit.status_code)
    try:
        print("SUBMIT_JSON", submit.json())
    except Exception:
        print("SUBMIT_TEXT", submit.text[:500])


if __name__ == "__main__":
    main()
