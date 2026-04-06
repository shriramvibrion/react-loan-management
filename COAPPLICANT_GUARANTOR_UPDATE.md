# Co-applicant & Guarantor Information Update

## Overview
Updated the loan application form to include mandatory fields for co-applicant and guarantor information, along with required document uploads for both parties.

## Changes Made

### 1. Frontend Form Hook (`my-app/src/hooks/useLoanForm.js`)

#### Added Form Fields
The `INITIAL_FORM` structure now includes:
- **Co-applicant Information:**
  - `coapplicant_name` - Full name as per official ID
  - `coapplicant_relationship` - Relationship to applicant (e.g., Parent, Spouse, Sibling)
  - `coapplicant_mobile` - 10-digit mobile number
  - `coapplicant_annual_income` - Annual income in rupees

- **Guarantor Information:**
  - `guarantor_name` - Full name as per official ID
  - `guarantor_relationship` - Relationship to applicant (e.g., Relative, Family Friend)
  - `guarantor_mobile` - 10-digit mobile number
  - `guarantor_annual_income` - Annual income in rupees

#### Updated Validation Logic
The `validate()` function now:
1. Marks all co-applicant and guarantor fields as required
2. Validates that both mobile numbers follow the 10-digit Indian phone format
3. Validates that both annual incomes are positive numbers
4. Requires all four mandatory documents before submission:
   - Co-applicant KYC
   - Co-applicant Income Proof
   - Guarantor KYC
   - Guarantor Income Proof

#### Updated Form Data Builder
The `buildFormData()` function now:
1. Appends all co-applicant and guarantor text fields to the FormData payload
2. Includes the four required co-applicant/guarantor documents in the multipart submission using the same dynamic document handling as loan-specific and employment-specific documents

#### Updated Draft Loading
The `loadFromServer()` function restores co-applicant and guarantor fields when loading a saved draft.

### 2. Frontend UI (`my-app/src/pages/ApplyLoan.jsx`)

#### New Section: Co-applicant & Guarantor Details
A new collapsible section appears after "Income Details & Documents" with:

**Co-applicant Information Subsection:**
- Text input: Co-applicant Full Name
- Text input: Co-applicant Relationship
- Text input: Co-applicant Mobile (10 digits, auto-filtered)
- Number input: Co-applicant Annual Income

**Guarantor Information Subsection:**
- Text input: Guarantor Full Name
- Text input: Guarantor Relationship
- Text input: Guarantor Mobile (10 digits, auto-filtered)
- Number input: Guarantor Annual Income

**Document Upload Subsection:**
- File input: Co-applicant KYC Document (PAN/Aadhaar/ID)
- File input: Co-applicant Income Proof (Salary slip, ITR, Bank statement)
- File input: Guarantor KYC Document (PAN/Aadhaar/ID)
- File input: Guarantor Income Proof (Salary slip, ITR, Bank statement)

All fields and documents are marked as mandatory with red asterisks.

### 3. Test Updates (`my-app/src/pages/__tests__/ApplyLoan.test.jsx`)

Updated the test suite to fill in all new required co-applicant and guarantor fields during form submission tests, ensuring test coverage remains valid with the newly required fields.

## Backend Compatibility

The new fields are submitted as part of the existing FormData multipart submission to the `/api/loan/apply` endpoint:

**Text fields** (appended as form fields):
- `coapplicant_name`, `coapplicant_relationship`, `coapplicant_mobile`, `coapplicant_annual_income`
- `guarantor_name`, `guarantor_relationship`, `guarantor_mobile`, `guarantor_annual_income`

**Document uploads** (appended as dynamic documents):
- Added to `document_types[]` and `document_files[]` arrays alongside existing loan-specific and employment-specific documents

The backend gracefully handles fields that may not exist in the current database schema by:
1. Checking `_table_columns()` before attempting to insert into `loan_application_details`
2. Skipping columns that don't exist in the schema
3. Allowing future database migrations to store these fields when table columns are added

## Form Flow

1. **User fills form sections in order:**
   - Personal Information
   - Loan Details
   - KYC Documents
   - Income Details & Documents
   - **→ Co-applicant & Guarantor Details** (NEW)
   - Parent/Guardian Details (if Education Loan)
   - Additional Documents (loan-specific)
   - Agreement Confirmation

2. **Validation occurs before submission:**
   - All required text fields must be filled
   - Mobile numbers must be valid
   - Income values must be positive
   - All mandatory documents must be uploaded

3. **Submission includes:**
   - Co-applicant/Guarantor information in payload
   - 4 co-applicant/guarantor documents in multipart upload
   - Continues to work with existing loan/employment-specific documents

## Database Schema (Future Enhancement)

When ready to persist these fields, add to `loan_application_details` table:

```sql
ALTER TABLE loan_application_details ADD COLUMN coapplicant_name VARCHAR(255) NULL;
ALTER TABLE loan_application_details ADD COLUMN coapplicant_relationship VARCHAR(255) NULL;
ALTER TABLE loan_application_details ADD COLUMN coapplicant_mobile VARCHAR(50) NULL;
ALTER TABLE loan_application_details ADD COLUMN coapplicant_annual_income DECIMAL(15, 2) NULL;
ALTER TABLE loan_application_details ADD COLUMN guarantor_name VARCHAR(255) NULL;
ALTER TABLE loan_application_details ADD COLUMN guarantor_relationship VARCHAR(255) NULL;
ALTER TABLE loan_application_details ADD COLUMN guarantor_mobile VARCHAR(50) NULL;
ALTER TABLE loan_application_details ADD COLUMN guarantor_annual_income DECIMAL(15, 2) NULL;
```

## Testing

- ✅ Form updates correctly added
- ✅ Validation logic includes new required fields
- ✅ Document uploads integrated into existing multipart flow
- ✅ Test suite updated for new required fields
- ✅ No breaking changes to existing form submission flow
- ✅ Documents stored with descriptive labels for admin review

## Next Steps

1. **Database Schema:** When ready, run the schema migration to add co-applicant/guarantor columns to persist data
2. **Admin Dashboard:** Update loan detail views to display co-applicant and guarantor information
3. **Notification Emails:** Include co-applicant/guarantor contact info in email communications
4. **Document Verification:** Add admin workflow to review co-applicant and guarantor documents separately
