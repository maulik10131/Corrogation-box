-- Update users table for role management

-- Add missing columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL AFTER username,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL AFTER role,
ADD COLUMN IF NOT EXISTS access_token VARCHAR(100) NULL AFTER password_hash,
ADD COLUMN IF NOT EXISTS status TINYINT(1) DEFAULT 1 AFTER role;

-- Update role enum to include supervisor
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'manager', 'supervisor', 'operator', 'staff') DEFAULT 'staff';

-- Add index on access_token for faster lookups
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_access_token (access_token);
