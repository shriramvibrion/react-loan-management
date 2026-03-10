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
    notes TEXT,
    parent_name VARCHAR(255),
    parent_occupation VARCHAR(255),
    parent_annual_income DECIMAL(15, 2),
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
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE
);
