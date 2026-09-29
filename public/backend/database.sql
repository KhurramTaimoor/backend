-- CageMaster ERP Database Setup
-- Run this SQL in phpMyAdmin to create the database

-- Create database
CREATE DATABASE IF NOT EXISTS cagemaster;
USE cagemaster;

-- Product Types Table
CREATE TABLE IF NOT EXISTS product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    short_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) NOT NULL UNIQUE,
    category_name VARCHAR(100) NOT NULL,
    short_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    product_type_id INT,
    category_id INT,
    quantity INT DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Assembly Table
CREATE TABLE IF NOT EXISTS assembly (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assembly_no VARCHAR(100) UNIQUE,
    product_name VARCHAR(255),
    bom_ref VARCHAR(100),
    product_id INT NULL,
    bom_id INT NULL,
    assembly_date DATE,
    qty_assembled DECIMAL(10,2) DEFAULT 0,
    warehouse VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Production Invoices Table
CREATE TABLE IF NOT EXISTS production_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_no VARCHAR(100) UNIQUE,
    production_date DATE,
    product VARCHAR(255),
    product_id INT NULL,
    quantity_produced DECIMAL(10,2) DEFAULT 0,
    qty_produced DECIMAL(10,2) DEFAULT 0,
    warehouse VARCHAR(255),
    supervisor VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Production Returns Table
CREATE TABLE IF NOT EXISTS production_returns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    return_no VARCHAR(100) UNIQUE,
    return_date DATE,
    batch_no VARCHAR(100),
    product VARCHAR(255),
    quantity_returned DECIMAL(10,2) DEFAULT 0,
    warehouse VARCHAR(255),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL,
    role VARCHAR(50) NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    module_access VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Retailers Table
CREATE TABLE IF NOT EXISTS retailers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(150),
    contact VARCHAR(50),
    city VARCHAR(100),
    zone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Areas Table
CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    area_name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    region_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Rates Table
CREATE TABLE IF NOT EXISTS sales_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_item VARCHAR(150) NOT NULL,
    unit VARCHAR(50),
    retail_rate DECIMAL(10,2) DEFAULT 0,
    wholesale_rate DECIMAL(10,2) DEFAULT 0,
    distributor_rate DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Orders Table
CREATE TABLE IF NOT EXISTS sale_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(100) NOT NULL,
    customer VARCHAR(150),
    order_date DATE,
    delivery_date DATE,
    order_qty DECIMAL(12,2) DEFAULT 0,
    rate DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Invoices Table
CREATE TABLE IF NOT EXISTS sale_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(100) NOT NULL,
    customer VARCHAR(150),
    invoice_date DATE,
    salesman VARCHAR(150),
    gross_amount DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    net_total DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    return_no VARCHAR(100) NOT NULL,
    invoice_ref VARCHAR(100),
    customer VARCHAR(150),
    return_date DATE,
    return_qty DECIMAL(12,2) DEFAULT 0,
    rate DECIMAL(12,2) DEFAULT 0,
    return_amount DECIMAL(12,2) DEFAULT 0,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Existing DB Upgrade (safe on MySQL/MariaDB versions that support IF NOT EXISTS)
ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS order_qty DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS rate DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sale_invoices ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS return_qty DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS rate DECIMAL(12,2) DEFAULT 0;
ALTER TABLE stock_issue ADD COLUMN IF NOT EXISTS total DECIMAL(12,2) DEFAULT 0;
ALTER TABLE production_invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Sample Data
INSERT INTO product_types (type_code, type_name, short_code) VALUES 
('PT001', 'Electronics', 'ELEC'),
('PT002', 'Hardware', 'HARD'),
('PT003', 'Software', 'SOFT');

INSERT INTO categories (category_code, category_name, short_code) VALUES 
('CAT001', 'Mobile Phones', 'MOB'),
('CAT001', 'Laptops', 'LAP'),
('CAT003', 'Accessories', 'ACC');

INSERT INTO products (product_code, product_name, product_type_id, category_id, quantity, unit_price) VALUES 
('PROD001', 'iPhone 14', 1, 1, 50, 999.99),
('PROD002', 'Dell Laptop', 1, 2, 25, 1299.99),
('PROD003', 'USB Cable', 2, 3, 500, 9.99);
