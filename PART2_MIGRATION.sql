-- Ali Cages ERP - Part 2 migration
-- Safe to run on an existing database. The Node API also performs these checks automatically.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NULL,
  name VARCHAR(180) NOT NULL,
  username VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(180) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_users_employee(employee_id),
  INDEX idx_app_users_role(role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_name VARCHAR(180) NOT NULL,
  owner_name VARCHAR(180) NULL,
  phone_1 VARCHAR(80) NULL,
  phone_2 VARCHAR(80) NULL,
  area VARCHAR(180) NULL,
  address VARCHAR(500) NULL,
  profile_type VARCHAR(100) NULL DEFAULT 'Customer',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_profiles_shop(shop_name),
  INDEX idx_account_profiles_phone(phone_1),
  INDEX idx_account_profiles_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transaction_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_no VARCHAR(80) NOT NULL UNIQUE,
  account_name VARCHAR(180) NULL,
  entry_no VARCHAR(180) NULL,
  user_id INT NULL,
  user_name VARCHAR(180) NULL,
  user_role VARCHAR(50) NULL,
  action VARCHAR(40) NOT NULL,
  module_name VARCHAR(120) NULL,
  method VARCHAR(12) NULL,
  endpoint VARCHAR(255) NULL,
  status_code INT NULL,
  details LONGTEXT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_date(transaction_date),
  INDEX idx_tx_user(user_id),
  INDEX idx_tx_entry(entry_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Structured BOM line items. Existing legacy BOM header rows remain compatible.
CREATE TABLE IF NOT EXISTS bom_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id INT NOT NULL,
  line_no INT NOT NULL DEFAULT 1,
  category_id INT NULL,
  category_name VARCHAR(180) NULL,
  product_id INT NULL,
  product_name VARCHAR(180) NULL,
  unit_id INT NULL,
  unit_name VARCHAR(120) NULL,
  qty DECIMAL(14,4) DEFAULT 0,
  required_qty DECIMAL(14,4) DEFAULT 0,
  wastage_percent DECIMAL(10,3) DEFAULT 0,
  effective_qty DECIMAL(14,4) DEFAULT 0,
  rate DECIMAL(14,2) DEFAULT 0,
  material_cost DECIMAL(14,2) DEFAULT 0,
  total DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bom_items_bom(bom_id),
  INDEX idx_bom_items_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- BOM header columns are added by backend/routes/bom.js on first BOM request,
-- with INFORMATION_SCHEMA/SHOW COLUMNS checks, so old databases are upgraded non-destructively.
