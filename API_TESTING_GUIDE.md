# Loan Management System - API Testing Guide

Complete API endpoint testing procedures for manual and automated testing.

---

## API URL Configuration

**Backend Base URL:** `http://localhost:5000`
**Frontend Base URL:** `http://localhost:3001`

---

## Authentication Endpoints

### 1. User Registration
**Endpoint:** `POST /api/user/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "9876543210",
    "city": "Mumbai"
  }'
```

**Expected Success Response (201):**
```json
{
  "message": "User registered successfully.",
  "user": {
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "9876543210",
    "city": "Mumbai"
  }
}
```

**Test Cases:**
```
✓ Valid registration with all fields
✓ Reject duplicate email (400)
✓ Reject short password < 8 chars (400)
✓ Reject password without uppercase (400)
✓ Reject password without lowercase (400)
✓ Reject password without digit (400)
✓ Reject invalid email format (400)
✓ Reject email field empty (400)
```

### 2. User Login
**Endpoint:** `POST /api/user/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Login successful.",
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "city": "Mumbai"
  }
}
```

**Test Cases:**
```
✓ Valid login returns user object
✓ Invalid email returns 401
✓ Invalid password returns 401
✓ Correct case sensitivity
✓ Rate limiting after 10 attempts
✓ Empty email/password returns 400
```

### 3. Admin Registration
**Endpoint:** `POST /api/admin/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_user",
    "email": "admin@example.com",
    "password": "AdminPass123!",
    "registration_token": "your-secret-token"
  }'
```

**Expected Success Response (201):**
```json
{
  "message": "Admin registered successfully."
}
```

**Test Cases:**
```
✓ Valid registration with token
✓ Reject without registration token (403)
✓ Reject with invalid token (403)
✓ Reject duplicate admin email (400)
✓ Password validation same as user
✓ Username length validation
```

### 4. Admin Login
**Endpoint:** `POST /api/admin/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123!"
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Admin login successful.",
  "user": {
    "email": "admin@example.com",
    "username": "admin_user"
  }
}
```

**Test Cases:**
```
✓ Valid login
✓ Invalid credentials return 401
✓ Rate limiting active
```

---

## Loan Management Endpoints

### 5. Apply for Loan
**Endpoint:** `POST /api/loan/apply`
**Content-Type:** `multipart/form-data`

**Request (with file upload):**
```bash
curl -X POST http://localhost:5000/api/loan/apply \
  -F "email=john@example.com" \
  -F "submission_type=submit" \
  -F "agreement_decision=yes" \
  -F "loan_amount=500000" \
  -F "tenure=60" \
  -F "interest_rate=10" \
  -F "loan_purpose=Home Loan" \
  -F "full_name=John Doe" \
  -F "contact_email=john@example.com" \
  -F "primary_mobile=9876543210" \
  -F "dob=1990-01-15" \
  -F "pan_number=ABCDE1234F" \
  -F "aadhaar_number=123456789012" \
  -F "monthly_income=50000" \
  -F "cibil_score=750" \
  -F "employment_type=Salaried" \
  -F "pan_file=@/path/to/pan.pdf" \
  -F "aadhaar_file=@/path/to/aadhaar.pdf"
```

**Expected Success Response (201):**
```json
{
  "message": "Loan application submitted successfully.",
  "loan_id": 1,
  "status": "Pending"
}
```

**Test Cases:**
```
VALIDATION:
✓ Loan amount > 0
✓ Tenure 1-1200 months
✓ PAN format validation (10 chars, ABCDE1234F pattern)
✓ Aadhaar format validation (12 digits)
✓ Mobile phone validation (10 digits, starts with 6-9)
✓ Email format validation
✓ CIBIL score 300-900
✓ Agreement acceptance required

FILE UPLOAD:
✓ Accept .pdf, .jpg, .png, .doc, .docx
✓ Reject .exe, .bat, .sh, other extensions
✓ File size max 10MB
✓ Reject files > 10MB
✓ Multiple file upload

DRAFT VS SUBMIT:
✓ draft type allows partial data
✓ submit type requires all fields
✓ draft type doesn't require CIBIL
✓ submit type requires CIBIL 300-900
```

### 6. Get User Loans
**Endpoint:** `GET /api/user/loans?email=john@example.com&status=&page=1`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/user/loans?email=john@example.com" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "loans": [
    {
      "loan_id": 1,
      "status": "Pending",
      "loan_amount": 500000,
      "tenure": 60,
      "interest_rate": 10,
      "emi": 10600,
      "applied_date": "2024-03-20 10:30:45"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

**Test Cases:**
```
✓ Return loans for valid email
✓ Return empty array for non-existent user
✓ Filter by status (Pending, Approved, Rejected, Under Review)
✓ Pagination working (page, pageSize parameters)
✓ Email parameter is required (400 if missing)
✓ Sort by applied_date descending
```

### 7. Get User Loan Detail
**Endpoint:** `GET /api/user/loans/{loanId}?email=john@example.com`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/user/loans/1?email=john@example.com" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "loan": {
    "loan_id": 1,
    "status": "Pending",
    "loan_amount": 500000,
    "tenure": 60,
    "interest_rate": 10,
    "emi": 10600,
    "applied_date": "2024-03-20 10:30:45"
  },
  "applicant": {
    "full_name": "John Doe",
    "contact_email": "john@example.com",
    "primary_mobile": "9876543210",
    "dob": "1990-01-15",
    "pan_number": "ABCDE1234F",
    "aadhaar_number": "123456789012",
    "monthly_income": 50000,
    "employment_type": "Salaried",
    "cibil_score": 750,
    "created_at": "2024-03-20T10:30:45"
  },
  "documents": [
    {
      "document_id": 1,
      "document_type": "PAN",
      "original_filename": "pan.pdf",
      "view_url": "/api/admin/document/1"
    }
  ]
}
```

**Test Cases:**
```
✓ Return loan details for valid loan_id and email
✓ Return 404 for non-existent loan
✓ Return 404 if email doesn't match loan owner
✓ DateTime serialization correct (ISO format)
✓ Applicant details populated
✓ Documents list populated
✓ Email parameter required
```

### 8. Update Loan Contact Information
**Endpoint:** `PATCH /api/user/loans/{loanId}/contact`

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/user/loans/1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "contact_email": "john.updated@example.com",
    "primary_mobile": "9876543210",
    "alternate_mobile": "9876543211"
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Contact information updated successfully."
}
```

**Test Cases:**
```
✓ Update all contact fields
✓ Validate email format
✓ Validate phone format (10 digits, 6-9 start)
✓ Return 404 for non-existent loan
✓ Return error if email doesn't match loan owner
✓ Partial updates accepted (not all fields required)
```

---

## Admin Endpoints

### 9. Get All Loans (Admin View)
**Endpoint:** `GET /api/admin/loans?page=1&pageSize=10&status=Pending`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/admin/loans" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "loans": [
    {
      "loan_id": 1,
      "email": "john@example.com",
      "name": "John Doe",
      "status": "Pending",
      "loan_amount": 500000,
      "applied_date": "2024-03-20 10:30:45",
      "viewed_by_admin": false
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

**Test Cases:**
```
✓ Return all loans with status
✓ Filter by status (Pending, Under Review, Approved, Rejected)
✓ Pagination working
✓ Filter by date range
✓ Sort by applied_date descending
✓ Show viewed_by_admin flag
✓ Return empty array if no loans
```

### 10. Get Loan Detail (Admin View)
**Endpoint:** `GET /api/admin/loans/{loanId}`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/admin/loans/1" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
- Same as User Loan Detail plus admin-specific fields

**Test Cases:**
```
✓ Admin can view any loan detail
✓ Return 404 for non-existent loan
✓ Update viewed_by_admin flag when opened
✓ Return applicant full details
✓ Return all documents with view URLs
✓ Return status history
✓ Return remarks/comments
```

### 11. Update Loan Status
**Endpoint:** `PATCH /api/admin/update-status`

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/admin/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": 1,
    "current_status": "Pending",
    "new_status": "Approved",
    "admin_email": "admin@example.com",
    "admin_remarks": "Documents verified. Loan approved."
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Loan status updated successfully.",
  "loan_id": 1,
  "new_status": "Approved"
}
```

**Test Cases:**
```
VALIDATION:
✓ Status transitions: Pending → Under Review
✓ Status transitions: Under Review → Approved
✓ Status transitions: Under Review → Rejected
✓ Prevent double approval
✓ Prevent approval of rejected loan
✓ Current status must match (prevent race conditions)
✓ Return 404 if loan not found

NOTIFICATIONS:
✓ User receives notification on approval
✓ User receives notification on rejection
✓ Email sent to user
✓ Status history entry created

DATA VALIDATION:
✓ Remarks saved if provided
✓ Admin email recorded
✓ Timestamp created
```

### 12. Add Remark to Loan
**Endpoint:** `POST /api/admin/loans/{loanId}/remarks`

**Request:**
```bash
curl -X POST http://localhost:5000/api/admin/loans/1/remarks \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 1,
    "admin_email": "admin@example.com",
    "remark": "Documents look good. Verifying income information."
  }'
```

**Expected Success Response (201):**
```json
{
  "message": "Remark added successfully.",
  "remark_id": 5
}
```

**Test Cases:**
```
✓ Add remark successfully
✓ Remark length limits (max 1000 chars)
✓ Remark cannot be empty (400)
✓ Return 404 if loan not found
✓ Return 404 if admin not found
✓ Empty remarks rejected
✓ HTML/script tags sanitized
✓ Timestamp auto-generated
```

### 13. Get Remarks for Loan
**Endpoint:** `GET /api/admin/loans/{loanId}/remarks`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/admin/loans/1/remarks" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "remarks": [
    {
      "id": 1,
      "admin_email": "admin@example.com",
      "remark": "Verified documents.",
      "created_at": "2024-03-20T11:00:00"
    }
  ]
}
```

**Test Cases:**
```
✓ Return all remarks for loan
✓ Sort by created_at descending
✓ Return empty array if no remarks
✓ Include admin email/name
✓ DateTime format correct
```

### 14. Send Email to User
**Endpoint:** `POST /api/admin/send-email`

**Request:**
```bash
curl -X POST http://localhost:5000/api/admin/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "loan_id": 1,
    "admin_id": 1,
    "admin_email": "admin@example.com",
    "template": "approval"
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Email sent successfully."
}
```

**Test Cases:**
```
FUNCTIONALITY:
✓ Send approval email
✓ Send rejection email
✓ Send custom email
✓ Include loan details in email
✓ Include user details in email
✓ Subject line correct
✓ Email body formatted properly

VALIDATION:
✓ Return 404 if loan not found
✓ Return 404 if admin not found
✓ Verify admin_email matches admin_id
✓ Return error if email sending fails

SCHEDULING:
✓ Email sent immediately on submit
✓ Email log created
✓ Timestamp recorded
```

---

## Notification Endpoints

### 15. Get Notifications
**Endpoint:** `GET /api/notifications?email=john@example.com&role=user`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/notifications?email=john@example.com&role=user" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "notifications": [
    {
      "id": 1,
      "loan_id": 1,
      "title": "Loan Approved",
      "message": "Your loan application has been approved.",
      "type": "success",
      "is_read": false,
      "created_at": "2024-03-20T12:00:00"
    }
  ]
}
```

**Test Cases:**
```
✓ Return user notifications with role=user
✓ Return admin notifications with role=admin
✓ Return empty array if no notifications
✓ Return empty array if user/admin not found
✓ Limit to 50 notifications
✓ Sort by created_at descending
✓ Email parameter required (400 if missing)
✓ DateTime serialization correct
```

### 16. Mark Notification as Read
**Endpoint:** `PATCH /api/notifications/mark-read`

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/notifications/mark-read \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "notification_id": 1
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "Notification marked as read."
}
```

**Test Cases:**
```
✓ Mark single notification as read
✓ is_read flag changes to true
✓ Return 404 if notification not found
✓ Verify email ownership of notification
✓ Timestamp updated
```

### 17. Mark All Notifications as Read
**Endpoint:** `PATCH /api/notifications/mark-all-read`

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/notifications/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "role": "user"
  }'
```

**Expected Success Response (200):**
```json
{
  "message": "All notifications marked as read."
}
```

**Test Cases:**
```
✓ Mark all user notifications as read
✓ Mark all admin notifications as read
✓ Return success if no notifications
✓ Count of updated rows returned
```

---

## Analytics & Reports Endpoints

### 18. Get User Analytics
**Endpoint:** `GET /api/analytics?email=john@example.com&role=user`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/analytics?email=john@example.com&role=user" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "total_applications": 5,
  "approved_count": 2,
  "rejected_count": 1,
  "pending_count": 2,
  "total_borrowed": 1500000,
  "total_emi": 85000,
  "average_rating": 4.5
}
```

**Test Cases:**
```
✓ Return correct totals
✓ Accurate count for each status
✓ Calculate total borrowed correctly
✓ Calculate total EMI correctly
✓ Include approval rate
✓ Return empty stats if no loans
```

### 19. Get Admin Analytics
**Endpoint:** `GET /api/analytics?role=admin`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/analytics?role=admin" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "total_loans": 150,
  "pending_loans": 20,
  "approved_loans": 100,
  "rejected_loans": 30,
  "total_amount_approved": 50000000,
  "average_processing_days": 5
}
```

**Test Cases:**
```
✓ Return system-wide stats
✓ Dashboard metrics accurate
✓ Status distribution correct
✓ Average processing time calculated
✓ Total amounts calculated
```

### 20. Get Loan Report (PDF)
**Endpoint:** `GET /api/loan/{loanId}/report?email=john@example.com&role=user`

**Request:**
```bash
curl -X GET "http://localhost:5000/api/loan/1/report?email=john@example.com&role=user" \
  -H "Accept: application/json"
```

**Expected Success Response (200):**
```json
{
  "loan_id": 1,
  "applicant_name": "John Doe",
  "loan_amount": 500000,
  "tenure": 60,
  "emi": 10600,
  "total_payment": 636000,
  "total_interest": 136000,
  "contact_email": "john@example.com",
  "status": "Approved",
  "documents": [...]
}
```

**Test Cases:**
```
✓ Return all loan details
✓ Calculate total interest
✓ Calculate total payment
✓ Include applicant details
✓ Include document list
✓ Verify user authorization
✓ Generate PDF successfully
✓ PDF download works
```

---

## Performance Benchmarks (Target Metrics)

```
Endpoint                          Target      Acceptable Range
─────────────────────────────────────────────────────────────
/api/user/login                   <50ms      <100ms
/api/admin/login                  <50ms      <100ms
/api/user/loans (list)            <100ms     <200ms
/api/admin/loans (list)           <100ms     <200ms
/api/loan/apply (submit)          <300ms     <500ms
/api/loan/apply (draft)           <200ms     <300ms
/api/user/loans/{id} (detail)     <100ms     <200ms
/api/admin/loans/{id} (detail)    <100ms     <200ms
/api/loan/{id}/report             <500ms     <1000ms
/api/notifications                <100ms     <200ms
```

---

## Security Testing Checklist

```
Authentication:
[ ] Invalid credentials rejected correctly
[ ] Rate limiting enforced (10 attempts/60 sec)
[ ] Rate limiting returns 429 status
[ ] Rate limiting message clear

Authorization:
[ ] Users can only see own loans
[ ] Users cannot access admin endpoints
[ ] Admins cannot access user-only endpoints
[ ] Loan details require email ownership verification

Input Validation:
[ ] SQL injection attempts blocked
[ ] XSS payloads sanitized
[ ] File upload extensions validated
[ ] File size limits enforced
[ ] Email validation strict
[ ] Phone number format enforced
[ ] PAN/Aadhaar format enforced

Data Protection:
[ ] Passwords hashed with bcrypt
[ ] No sensitive data in error messages
[ ] API responses don't leak user data
[ ] CORS headers properly configured
[ ] HTTPS enforced (in production)
[ ] Sensitive fields masked in logs
```

---

## Error Response Codes Expected

```
200 OK                           - Request successful
201 Created                      - Resource created successfully
204 No Content                   - Successful, no response body
400 Bad Request                  - Invalid input validation failed
401 Unauthorized                 - Missing or invalid credentials
403 Forbidden                    - User doesn't have permission
404 Not Found                    - Resource not found
429 Too Many Requests            - Rate limiting triggered
500 Internal Server Error        - Server-side error
502 Bad Gateway                  - Database connection failed
503 Service Unavailable          - Server temporarily down
```

---

## Testing Workflow

1. **Setup Phase**
   - Start backend server
   - Start frontend dev server
   - Prepare test database with seed data

2. **Authentication Phase**
   - Test user registration
   - Test user login
   - Test admin registration
   - Test admin login

3. **Core Functionality Phase**
   - Test loan application (draft)
   - Test loan application (submit)
   - Test file uploads
   - Test loan list retrieval

4. **Admin Phase**
   - Test admin viewing loans
   - Test status updates
   - Test remarks
   - Test email sending

5. **Integration Phase**
   - Complete user journey (register → apply → track → approve)
   - Complete admin journey (login → view → approve → notify)

6. **Performance Phase**
   - Load testing with 100+ concurrent users
   - Database query optimization check
   - Response time analysis

7. **Security Phase**
   - SQL injection tests
   - XSS payload tests
   - Authorization boundary tests
   - Rate limiting tests

---

**End of API Testing Guide**
