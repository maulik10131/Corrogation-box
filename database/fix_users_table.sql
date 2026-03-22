-- Add missing columns to users table
-- Run this in phpMyAdmin or MySQL command line

USE corrugation_pms;

-- Add access_token column for API authentication
ALTER TABLE users 
ADD COLUMN access_token VARCHAR(100) NULL AFTER password_hash;

-- Add role column (if not exists)
ALTER TABLE users 
ADD COLUMN role ENUM('admin', 'manager', 'supervisor', 'operator', 'staff') DEFAULT 'staff' AFTER password_hash;

-- Add full_name column (if not exists)
ALTER TABLE users 
ADD COLUMN full_name VARCHAR(255) NULL AFTER username;

-- Add department column (if not exists)
ALTER TABLE users 
ADD COLUMN department VARCHAR(100) NULL AFTER role;

-- Add status column (if not exists)
ALTER TABLE users 
ADD COLUMN status TINYINT(1) DEFAULT 1 AFTER department;

-- Add index on access_token for faster authentication
ALTER TABLE users 
ADD INDEX idx_access_token (access_token);

-- Set first user as admin (adjust ID as needed)
UPDATE users SET role = 'admin' WHERE id = 1;

-- Show updated structure
DESCRIBE users;

-- Show all users
SELECT id, username, email, role FROM users;
