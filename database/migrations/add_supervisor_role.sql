-- Add 'supervisor' role to users table
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'manager', 'supervisor', 'operator', 'staff') DEFAULT 'staff';
