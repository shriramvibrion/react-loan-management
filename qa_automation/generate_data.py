import requests
import random
import time
import uuid

BASE_URL = "http://127.0.0.1:5000/api"

# Generate 50 Users
def generate_users(count=50):
    users = []
    print(f"Generating {count} users...")
    for i in range(count):
        user_data = {
            "name": f"Test User {str(uuid.uuid4())[:6]}",
            "email": f"user{str(uuid.uuid4())[:8]}@example.com",
            "password": "Password123!",
            "phone": f"98765{random.randint(10000, 99999)}",
            "city": random.choice(["Chennai", "Mumbai", "Delhi", "Bangalore"])
        }
        res = requests.post(f"{BASE_URL}/user/register", json=user_data)
        if res.status_code == 201:
            users.append(user_data)
        else:
            print(f"Failed to register user: {res.text}")
    print(f"Successfully generated {len(users)} users.")
    return users

# Generate 100 Loans
def generate_loans(users, count=100):
    print(f"Generating {count} loan applications...")
    purposes = ["Home Loan", "Education Loan", "Vehicle Loan", "Business Loan"]
    emp_types = ["Salaried", "Self-Employed", "Student", "Retired", "Other"]
    
    success = 0
    for i in range(count):
        user = random.choice(users)
        
        # We need to send multipart/form-data for files to /loan/apply
        loan_data = {
            "email": user["email"],
            "submission_type": "submit",
            "agreement_decision": "accepted",
            "loan_amount": str(random.randint(50000, 5000000)),
            "tenure": str(random.choice([12, 24, 36, 48, 60, 120, 240])),
            "loan_purpose": random.choice(purposes),
            "full_name": user["name"],
            "contact_email": user["email"],
            "primary_mobile": user["phone"],
            "alternate_mobile": "",
            "dob": f"{random.randint(1970, 2000)}-01-01",
            "address_line1": f"{random.randint(1, 999)} Test Street",
            "address_line2": "",
            "city": user["city"],
            "state": "TestState",
            "postal_code": "600001",
            "pan_number": f"ABCDE{random.randint(1000, 9999)}F",
            "aadhaar_number": f"12345678{random.randint(1000, 9999)}",
            "monthly_income": str(random.randint(20000, 200000)),
            "employer_name": "Test Company",
            "employment_type": random.choice(emp_types),
            "interest_rate": f"{random.uniform(7.5, 15.0):.2f}",
            "notes": "Automated Test Loan"
        }
        
        # dummy files
        files = {
            "pan_file": ("pan.pdf", b"dummy pdf content", "application/pdf"),
            "aadhaar_file": ("aadhaar.pdf", b"dummy pdf content", "application/pdf"),
            "income_tax_certificate": ("itc.pdf", b"dummy pdf content", "application/pdf"),
            "tax_document": ("tax.pdf", b"dummy pdf content", "application/pdf"),
            "employment_proof": ("emp.pdf", b"dummy pdf content", "application/pdf"),
        }
        
        # Adding dynamic docs is tricky, we'll bypass missing dynamic docs check by appending empty list? 
        # Actually /loan/apply checks dynamic docs based on loan_purpose. Let's just pass some dummy dynamic docs
        loan_docs = {
            "Home Loan": ["Land Document", "Approved Building Plan", "Property Registration"],
            "Education Loan": ["Bonafide Certificate", "Fee Structure", "Academic Records"],
            "Vehicle Loan": ["Proforma Invoice", "RC Copy"],
            "Business Loan": ["Business Registration Proof", "Bank Statements", "GST Certificate"],
        }
        emp_docs = {
            "Salaried": ["Latest 3 Salary Slips", "Form 16", "Bank Statement (6 Months)"],
            "Self-Employed": ["ITR (Last 2 Years)", "Business Bank Statement", "Profit & Loss Statement", "GST Returns"],
            "Student": ["Co-applicant Income Proof", "Sponsor Bank Statement"],
            "Retired": ["Pension Statement", "Bank Statement (6 Months)"],
            "Other": ["Income Source Proof", "Recent Bank Statement"],
        }
        
        expected_loan = loan_docs.get(loan_data['loan_purpose'], [])
        expected_emp = emp_docs.get(loan_data['employment_type'], [])
        expected_combined = expected_loan + [f"Income - {d}" for d in expected_emp]
        multipart_data = []
        for doc_name in expected_combined:
            multipart_data.append(("document_types[]", (None, doc_name)))
            multipart_data.append(("document_files[]", (f"{doc_name}.pdf", b"dummy content", "application/pdf")))
            
        res = requests.post(f"{BASE_URL}/loan/apply", data=loan_data, files=multipart_data)
        if res.status_code == 201:
            success += 1
        else:
            print(f"Failed to generate loan: {res.text}")
            
    print(f"Successfully created {success} loan applications.")

def generate_edge_cases():
    print("Generating edge cases...")
    # Empty fields
    res = requests.post(f"{BASE_URL}/user/register", json={"name": "", "email": "empty@test.com"})
    print("Empty user reg attempt:", res.status_code)
    
    # Missing files for loan app
    loan_data = {
            "email": "doesntexist@test.com",
            "submission_type": "submit",
            "agreement_decision": "accepted"
    }
    res = requests.post(f"{BASE_URL}/loan/apply", data=loan_data)
    print("Missing files loan attempt:", res.status_code)

if __name__ == "__main__":
    users = generate_users(50)
    if users:
        generate_loans(users, 200)
    generate_edge_cases()
    print("Data generation complete!")
