import requests

BASE_URL = "http://127.0.0.1:5000/api"

def test_math_overflow():
    print("Testing Math Overflow in EMI Calculation...")
    loan_data = {
        "email": "user458150a0@example.com", # Needs a real email from the DB
        "submission_type": "submit",
        "agreement_decision": "accepted",
        "loan_amount": "500000",
        "tenure": "99999999999", # Extremely large tenure to cause overflow
        "loan_purpose": "Home Loan",
        "full_name": "Overflow Tester",
        "contact_email": "user458150a0@example.com",
        "primary_mobile": "1234567890",
        "dob": "1990-01-01",
        "address_line1": "Test Addr",
        "city": "City",
        "state": "State",
        "postal_code": "123456",
        "pan_number": "ABCDE1234F",
        "aadhaar_number": "123456789012",
        "monthly_income": "50000",
        "employer_name": "Test Co",
        "employment_type": "Salaried",
        "interest_rate": "10.0",
        "notes": "Testing OverflowError"
    }

    files = {
        "pan_file": ("pan.pdf", b"dummy pdf content", "application/pdf"),
        "aadhaar_file": ("aadhaar.pdf", b"dummy pdf content", "application/pdf"),
        "income_tax_certificate": ("itc.pdf", b"dummy pdf content", "application/pdf"),
        "tax_document": ("tax.pdf", b"dummy pdf content", "application/pdf"),
        "employment_proof": ("emp.pdf", b"dummy pdf content", "application/pdf"),
    }
    
    docs = ["Land Document", "Approved Building Plan", "Property Registration", "Income - Latest 3 Salary Slips", "Income - Form 16", "Income - Bank Statement (6 Months)"]
    
    multipart_data = []
    for k, v in loan_data.items():
        multipart_data.append((k, (None, str(v))))
    for k, v in files.items():
        multipart_data.append((k, v))
    for doc_name in docs:
        multipart_data.append(("document_types[]", (None, doc_name)))
        multipart_data.append(("document_files[]", (f"{doc_name}.pdf", b"dummy content", "application/pdf")))
        
    try:
        res = requests.post(f"{BASE_URL}/loan/apply", files=multipart_data)
        print("Status Code:", res.status_code)
        if res.status_code == 500:
            print("Vulnerability Confirmed: 500 Internal Server Error returned (likely OverflowError).")
        else:
            print("Response:", res.text)
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test_math_overflow()
