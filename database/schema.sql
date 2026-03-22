-- Corrugation Box PMS Database Schema

-- Users & Authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'operator', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(191),
    gst_number VARCHAR(20),
    pan_number VARCHAR(10),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) DEFAULT 'Gujarat',
    pincode VARCHAR(10),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    credit_days INT DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_name (name),
    INDEX idx_customers_mobile (mobile),
    INDEX idx_customers_city (city),
    INDEX idx_customers_status (status)
);

-- Inventory Management
CREATE TABLE raw_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('paper', 'adhesive', 'ink', 'other') NOT NULL,
    gsm INT NULL,  -- For paper
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    min_stock_level DECIMAL(10,2),
    price_per_unit DECIMAL(10,2),
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Box Specifications & Calculations
CREATE TABLE box_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    
    -- Box Dimensions (in mm)
    length DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    
    -- Flute Type
    flute_type ENUM('A', 'B', 'C', 'E', 'F', 'BC', 'AB') NOT NULL,
    
    -- Ply Configuration
    ply_count INT NOT NULL,  -- 3, 5, 7 ply
    
    -- Paper GSM for each layer
    liner_gsm INT NOT NULL,
    fluting_gsm INT NOT NULL,
    
    -- Calculated Values
    deckle_size DECIMAL(10,2),
    cutting_size DECIMAL(10,2),
    sheet_area DECIMAL(10,4),
    box_weight DECIMAL(10,3),
    
    -- Pricing
    paper_cost DECIMAL(10,2),
    conversion_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    
    quantity INT NOT NULL,
    status ENUM('pending', 'in_production', 'completed', 'delivered') DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date DATE
);

-- Production Tracking
CREATE TABLE production_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    machine VARCHAR(100),
    process ENUM('corrugation', 'pasting', 'slitting', 'creasing', 'printing', 'die_cutting', 'stitching', 'packing'),
    quantity_produced INT,
    wastage INT,
    operator_id INT,
    shift ENUM('morning', 'evening', 'night'),
    start_time DATETIME,
    end_time DATETIME,
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES box_orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- Attendance
CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status ENUM('present', 'absent', 'half_day', 'leave') DEFAULT 'present',
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_attendance (user_id, date)
);

-- Stock Transactions
CREATE TABLE stock_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    material_id INT,
    transaction_type ENUM('in', 'out') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reference_type VARCHAR(50),  -- 'purchase', 'production', 'adjustment'
    reference_id INT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES raw_materials(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quotations
CREATE TABLE quotations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_number VARCHAR(50) UNIQUE,
    quotation_date DATE NOT NULL,
    valid_until DATE,
    customer_id INT NOT NULL,
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_gst VARCHAR(20),
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    taxable_amount DECIMAL(12,2) DEFAULT 0,
    cgst_percent DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(12,2) DEFAULT 0,
    sgst_percent DECIMAL(5,2) DEFAULT 0,
    sgst_amount DECIMAL(12,2) DEFAULT 0,
    igst_percent DECIMAL(5,2) DEFAULT 0,
    igst_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    delivery_terms TEXT,
    payment_terms VARCHAR(255),
    validity_days INT DEFAULT 15,
    notes TEXT,
    terms_conditions TEXT,
    status ENUM('draft','sent','approved','rejected','expired','converted') DEFAULT 'draft',
    created_by INT NULL,
    approved_by INT NULL,
    converted_order_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quotation_number (quotation_number),
    INDEX idx_customer_id (customer_id),
    INDEX idx_quotation_status (status),
    INDEX idx_quotation_date (quotation_date)
);

-- Quotation Items
CREATE TABLE quotation_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_id INT NOT NULL,
    box_name VARCHAR(255) NOT NULL,
    box_type VARCHAR(50) DEFAULT 'RSC',
    length DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    ply_count INT DEFAULT 3,
    flute_type VARCHAR(10) DEFAULT 'B',
    paper_config JSON NULL,
    deckle_size DECIMAL(10,2) DEFAULT 0,
    cutting_size DECIMAL(10,2) DEFAULT 0,
    sheet_area DECIMAL(12,4) DEFAULT 0,
    ups INT DEFAULT 1,
    paper_weight DECIMAL(12,4) DEFAULT 0,
    box_weight DECIMAL(12,4) DEFAULT 0,
    paper_rate DECIMAL(12,2) DEFAULT 0,
    paper_cost DECIMAL(12,2) DEFAULT 0,
    conversion_cost DECIMAL(12,2) DEFAULT 0,
    printing_cost DECIMAL(12,2) DEFAULT 0,
    die_cost DECIMAL(12,2) DEFAULT 0,
    other_cost DECIMAL(12,2) DEFAULT 0,
    cost_per_box DECIMAL(12,2) DEFAULT 0,
    margin_percent DECIMAL(5,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    quantity INT NOT NULL,
    amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qi_quotation_id (quotation_id),
    CONSTRAINT fk_qi_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

-- Inventory Categories
CREATE TABLE inventory_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT NULL,
    color VARCHAR(20) DEFAULT '#3b82f6',
    icon VARCHAR(50) DEFAULT 'cube',
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inventory_categories_name (name),
    INDEX idx_inventory_categories_status (status),
    FOREIGN KEY (parent_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
);

-- Inventory Items
CREATE TABLE inventory_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    min_stock INT DEFAULT 0,
    max_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    location VARCHAR(255),
    description TEXT,
    hsn_code VARCHAR(20),
    gst_percent DECIMAL(5,2) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    current_stock DECIMAL(12,2) DEFAULT 0,
    avg_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inventory_items_name (name),
    INDEX idx_inventory_items_category (category),
    INDEX idx_inventory_items_status (status)
);

-- Employees
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(191),
    joining_date DATE NOT NULL,
    salary DECIMAL(12,2) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employees_name (name),
    INDEX idx_employees_department (department),
    INDEX idx_employees_status (status)
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    movement_type ENUM('in','out') NOT NULL,
    movement_date DATE NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    rate DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) DEFAULT 0,
    reference_no VARCHAR(100),
    reference_type VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inventory_movements_item (item_id),
    INDEX idx_inventory_movements_date (movement_date),
    INDEX idx_inventory_movements_type (movement_type),
    CONSTRAINT fk_inventory_movement_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- Employee Attendance
CREATE TABLE employee_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present','absent','half_day','leave','holiday') NOT NULL,
    check_in TIME NULL,
    check_out TIME NULL,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_employee_date (employee_id, date),
    INDEX idx_employee_attendance_date (date),
    INDEX idx_employee_attendance_status (status),
    CONSTRAINT fk_employee_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Work Orders
CREATE TABLE work_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    work_order_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT NULL,
    customer_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    target_date DATE NULL,
    priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
    status ENUM('planned','in_progress','completed','hold','cancelled') DEFAULT 'planned',
    notes TEXT,
    total_quantity INT DEFAULT 0,
    produced_quantity INT DEFAULT 0,
    pending_quantity INT DEFAULT 0,
    wastage_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_work_orders_customer (customer_id),
    INDEX idx_work_orders_status (status),
    INDEX idx_work_orders_date (order_date),
    CONSTRAINT fk_work_order_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_work_order_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
);

CREATE TABLE work_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    work_order_id INT NOT NULL,
    quotation_item_id INT NULL,
    box_name VARCHAR(255) NOT NULL,
    box_type VARCHAR(50) DEFAULT 'RSC',
    length DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    ply_count INT DEFAULT 3,
    flute_type VARCHAR(10) DEFAULT 'B',
    gsm VARCHAR(50) DEFAULT NULL,
    print_type VARCHAR(100) DEFAULT NULL,
    quantity INT NOT NULL,
    produced_quantity INT DEFAULT 0,
    pending_quantity INT DEFAULT 0,
    unit_rate DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_work_order_items_order (work_order_id),
    CONSTRAINT fk_work_order_item_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE TABLE work_order_status_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    work_order_id INT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    remarks TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_work_order_status_logs_order (work_order_id),
    CONSTRAINT fk_work_order_status_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

-- Dispatch & Challan
CREATE TABLE dispatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dispatch_number VARCHAR(50) NOT NULL UNIQUE,
    challan_number VARCHAR(50) NOT NULL UNIQUE,
    work_order_id INT NULL,
    customer_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    dispatch_date DATE NOT NULL,
    vehicle_no VARCHAR(50),
    driver_name VARCHAR(255),
    lr_no VARCHAR(100),
    eway_bill_no VARCHAR(100),
    eway_valid_upto DATE NULL,
    destination VARCHAR(255),
    status ENUM('planned','in_transit','delivered','pod_received','cancelled') DEFAULT 'planned',
    notes TEXT,
    total_quantity INT DEFAULT 0,
    delivered_quantity INT DEFAULT 0,
    pending_quantity INT DEFAULT 0,
    pod_received TINYINT(1) DEFAULT 0,
    pod_received_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dispatch_customer (customer_id),
    INDEX idx_dispatch_date (dispatch_date),
    INDEX idx_dispatch_status (status),
    CONSTRAINT fk_dispatch_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_dispatch_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

CREATE TABLE dispatch_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dispatch_id INT NOT NULL,
    work_order_item_id INT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    delivered_quantity INT DEFAULT 0,
    pending_quantity INT DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'pcs',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dispatch_items_dispatch (dispatch_id),
    CONSTRAINT fk_dispatch_items_dispatch FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
    CONSTRAINT fk_dispatch_items_wo_item FOREIGN KEY (work_order_item_id) REFERENCES work_order_items(id) ON DELETE SET NULL
);

-- Invoices, Payments & Outstanding
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    work_order_id INT NULL,
    dispatch_id INT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NULL,
    taxable_amount DECIMAL(12,2) DEFAULT 0,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    status ENUM('draft','issued','partially_paid','paid','overdue','cancelled') DEFAULT 'issued',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_invoice_customer (customer_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_invoice_due (due_date),
    INDEX idx_invoice_status (status),
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_invoice_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_dispatch FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE SET NULL
);

CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id INT NOT NULL,
    customer_id INT NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode ENUM('cash','cheque','neft','rtgs','upi') DEFAULT 'neft',
    reference_no VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_invoice (invoice_id),
    INDEX idx_payment_customer (customer_id),
    INDEX idx_payment_date (payment_date),
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);