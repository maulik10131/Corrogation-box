-- ============================================================
-- MASTER DATABASE SCHEMA
-- Multi-Tenant Architecture - Separate Database per Company
-- ============================================================

CREATE DATABASE IF NOT EXISTS pms_master 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pms_master;

-- Companies Table - Store all registered companies
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique code for company (e.g., ABC123)',
    db_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Database name (e.g., pms_company1)',
    db_host VARCHAR(100) DEFAULT 'localhost',
    db_username VARCHAR(100) DEFAULT 'root',
    db_password VARCHAR(255) DEFAULT '',
    db_port INT DEFAULT 3306,
    
    -- Company Details
    contact_person VARCHAR(255),
    email VARCHAR(191) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    
    -- Subscription Info
    plan_type ENUM('trial', 'basic', 'professional', 'enterprise') DEFAULT 'trial',
    subscription_start DATE,
    subscription_end DATE,
    max_users INT DEFAULT 5,
    is_active TINYINT(1) DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_company_code (company_code),
    INDEX idx_db_name (db_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Master Users Table - Login credentials and company mapping
CREATE TABLE master_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    
    -- Role in master system
    is_super_admin TINYINT(1) DEFAULT 0 COMMENT 'Can manage all companies',
    
    -- Access token for API
    access_token VARCHAR(100) NULL,
    
    -- Status
    status TINYINT(1) DEFAULT 1,
    last_login TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_username_company (company_id, username),
    UNIQUE KEY unique_email_company (company_id, email),
    INDEX idx_access_token (access_token),
    INDEX idx_company_id (company_id),
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Company Database Template Tracking
CREATE TABLE company_migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_company_id (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Audit Log - Track all company/user changes
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NULL,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL COMMENT 'login, create_company, delete_user, etc',
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_company_id (company_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Insert super admin company (for system management)
INSERT INTO companies (
    company_name, company_code, db_name, 
    email, contact_person, is_active, plan_type
) VALUES (
    'System Administration',
    'SUPERADMIN',
    'pms_master',
    'admin@pms.com',
    'System Administrator',
    1,
    'enterprise'
);

-- Create super admin user (password: admin123)
INSERT INTO master_users (
    company_id, username, email, password_hash, 
    full_name, is_super_admin, status
) VALUES (
    1,
    'superadmin',
    'admin@pms.com',
    '$2y$13$abcdefghijklmnopqrstuOabcdefghijklmnopqrstuOabcdefghijklmno', -- Replace with actual hash
    'Super Administrator',
    1,
    1
);

-- Sample Company 1
INSERT INTO companies (
    company_name, company_code, db_name,
    email, contact_person, phone,
    city, state, plan_type, max_users
) VALUES (
    'ABC Corrugation Ltd',
    'ABC001',
    'pms_abc001',
    'info@abccorrugation.com',
    'John Doe',
    '9876543210',
    'Ahmedabad',
    'Gujarat',
    'professional',
    10
);

-- Sample Company 2
INSERT INTO companies (
    company_name, company_code, db_name,
    email, contact_person, phone,
    city, state, plan_type, max_users
) VALUES (
    'XYZ Packaging Pvt Ltd',
    'XYZ002',
    'pms_xyz002',
    'info@xyzpackaging.com',
    'Jane Smith',
    '9876543211',
    'Surat',
    'Gujarat',
    'basic',
    5
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Active Companies View
CREATE VIEW v_active_companies AS
SELECT 
    id, company_name, company_code, db_name,
    email, phone, city, state,
    plan_type, max_users,
    subscription_start, subscription_end,
    created_at
FROM companies
WHERE is_active = 1
  AND (subscription_end IS NULL OR subscription_end >= CURDATE());

-- User Company Info View
CREATE VIEW v_user_company_info AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.full_name,
    u.is_super_admin,
    u.status as user_status,
    u.last_login,
    c.id as company_id,
    c.company_name,
    c.company_code,
    c.db_name,
    c.is_active as company_active,
    c.plan_type
FROM master_users u
JOIN companies c ON u.company_id = c.id;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER //

-- Create new company with database
CREATE PROCEDURE sp_create_company(
    IN p_company_name VARCHAR(255),
    IN p_company_code VARCHAR(50),
    IN p_email VARCHAR(191),
    IN p_contact_person VARCHAR(255),
    IN p_phone VARCHAR(20),
    OUT p_company_id INT,
    OUT p_db_name VARCHAR(100)
)
BEGIN
    DECLARE v_db_name VARCHAR(100);
    
    -- Generate database name
    SET v_db_name = CONCAT('pms_', LOWER(p_company_code));
    
    -- Insert company
    INSERT INTO companies (
        company_name, company_code, db_name,
        email, contact_person, phone
    ) VALUES (
        p_company_name, p_company_code, v_db_name,
        p_email, p_contact_person, p_phone
    );
    
    SET p_company_id = LAST_INSERT_ID();
    SET p_db_name = v_db_name;
    
    -- Log action
    INSERT INTO audit_log (company_id, action, details)
    VALUES (p_company_id, 'create_company', CONCAT('Created company: ', p_company_name));
END //

DELIMITER ;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Additional indexes for better query performance
ALTER TABLE master_users ADD INDEX idx_username (username);
ALTER TABLE master_users ADD INDEX idx_email (email);
ALTER TABLE master_users ADD INDEX idx_status (status);
ALTER TABLE companies ADD INDEX idx_email (email);
ALTER TABLE companies ADD INDEX idx_subscription_end (subscription_end);

-- ============================================================
SHOW TABLES;
SELECT 'Master Database Schema Created Successfully!' as status;
