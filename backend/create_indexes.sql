-- Performance Indexes for Loan Management System
-- Run this script once to add indexes for faster user loan queries
-- This will speed up the /api/user/loans endpoint significantly

-- Index for users.email (used in JOIN to find user and filter by email)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on loans.user_id (foreign key lookups in JOIN)
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

-- Index on loans.status (filtering loans by status)
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- Composite index for common loan queries (user_id + status filtering)
CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);

-- Index on loans.applied_date (for ordering by loan_id DESC which is recent first)
CREATE INDEX IF NOT EXISTS idx_loans_applied_date ON loans(applied_date DESC);

-- Index on loan_application_details.loan_id (for lookups)
CREATE INDEX IF NOT EXISTS idx_loan_app_det_loan_id ON loan_application_details(loan_id);

-- Index on documents.loan_id (for lookups)
CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON documents(loan_id);

-- Run ANALYZE to update table statistics for query optimizer
ANALYZE TABLE users;
ANALYZE TABLE loans;
ANALYZE TABLE loan_application_details;
ANALYZE TABLE documents;
