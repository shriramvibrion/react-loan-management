-- Schema for react_loan_management (MySQL)
-- Run this if you see "Table '...' doesn't exist" when applying for a loan.
-- Create database first if needed: CREATE DATABASE IF NOT EXISTS reactloanmanagement; USE reactloanmanagement;

-- Users (required by loan apply)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    city VARCHAR(100)
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Manual admin seed (plaintext password as requested)
-- INSERT INTO admin (username, email, password)
-- VALUES ('Super Admin', 'admin@example.com', 'Admin@123');

-- Loans
CREATE TABLE IF NOT EXISTS loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    tenure INT NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    emi DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    viewed_by_admin TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Loan application details (one row per loan)
CREATE TABLE IF NOT EXISTS loan_application_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    alternate_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    loan_purpose VARCHAR(255),
    parent_name VARCHAR(255),
    parent_occupation VARCHAR(255),
    parent_annual_income DECIMAL(15, 2),
    cibil_score INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coapplicants (
    coapplicant_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guarantors (
    guarantor_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

-- Loan documents (uploads)
CREATE TABLE IF NOT EXISTS loan_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    document_type VARCHAR(255),
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500),
    file_path VARCHAR(1000),
    front_verified TINYINT(1) NOT NULL DEFAULT 0,
    back_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_fully_verified TINYINT(1) NOT NULL DEFAULT 0,
    document_status ENUM('under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'under_review',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    admin_id INT,
    loan_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
);

-- Admin remarks on loan applications
CREATE TABLE IF NOT EXISTS admin_remarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    admin_id INT NOT NULL,
    remark TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE
);

-- Loan status change history
CREATE TABLE IF NOT EXISTS loan_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255),
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);

-- ─── Migration helpers (safe to re-run on existing databases) ───────────────
ALTER TABLE loans ADD COLUMN IF NOT EXISTS viewed_by_admin TINYINT(1) DEFAULT 0;
ALTER TABLE loan_application_details ADD COLUMN IF NOT EXISTS cibil_score INT DEFAULT NULL;
ALTER TABLE loan_application_details DROP COLUMN IF EXISTS notes;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS loan_id INT DEFAULT NULL;
ALTER TABLE loan_documents ADD COLUMN IF NOT EXISTS document_status ENUM('under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'under_review';
ALTER TABLE loan_documents ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE loan_documents ADD COLUMN IF NOT EXISTS front_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE loan_documents ADD COLUMN IF NOT EXISTS back_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE loan_documents ADD COLUMN IF NOT EXISTS is_fully_verified TINYINT(1) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS coapplicants (
    coapplicant_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS guarantors (
    guarantor_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    full_name VARCHAR(255),
    contact_email VARCHAR(255),
    primary_mobile VARCHAR(50),
    dob DATE,
    address_line1 VARCHAR(500),
    address_line2 VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    pan_number VARCHAR(50),
    aadhaar_number VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    employer_name VARCHAR(255),
    employment_type VARCHAR(100),
    relationship VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);
UPDATE loan_documents
SET document_status = 'under_review'
WHERE LOWER(document_status) IN ('pending', 'under review');
ALTER TABLE loan_documents MODIFY COLUMN document_status ENUM('under_review', 'accepted', 'rejected') NOT NULL DEFAULT 'under_review';
UPDATE loan_documents
SET document_status = 'under_review'
WHERE document_status IS NULL OR LOWER(document_status) NOT IN ('under_review', 'accepted', 'rejected');
UPDATE loan_documents
SET is_fully_verified = CASE
    WHEN IFNULL(front_verified, 0) = 1 AND IFNULL(back_verified, 0) = 1 THEN 1
    ELSE 0
END;
