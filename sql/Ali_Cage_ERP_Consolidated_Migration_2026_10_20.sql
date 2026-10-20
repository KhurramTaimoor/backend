-- Ali Bird Cage ERP -- cumulative additive migration

-- Save a full database BACKUP first. Select your correct ERP database before running.

-- Supports MySQL 8.x / common MariaDB versions. Run the entire script in one import.

-- Adds missing schema for employee photo/settings, user accounts & granular permissions,

-- cheque vouchers + Cash Book clearing, Payroll, scoped rates and BOM rate versions.

-- It does NOT reset existing data, passwords, permissions or amounts.

-- Valuation/Cash Book/Cheque reports use existing transactional tables; no separate report tables needed.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
 id INT AUTO_INCREMENT PRIMARY KEY,
 department_name VARCHAR(180) NOT NULL,
 head_of_dept VARCHAR(180) NULL,
 extension_no VARCHAR(45) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS designations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 designation_name VARCHAR(180) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(180) NOT NULL,
 cnic VARCHAR(45) NULL,
 phone VARCHAR(45) NULL,
 employee_type VARCHAR(50) NULL,
 department_id INT NULL,
 designation_id INT NULL,
 designation VARCHAR(180) NULL,
 joining_date DATE NULL,
 photo_data MEDIUMTEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS user_permissions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NULL,
 user_id INT NULL,
 role_id INT NULL,
 role VARCHAR(50) NULL,
 access_level VARCHAR(50) NULL,
 module_access VARCHAR(255) NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_feature_permissions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 app_user_id INT NOT NULL,
 feature_key VARCHAR(110) NOT NULL,
 can_read TINYINT(1) NOT NULL DEFAULT 0,
 can_write TINYINT(1) NOT NULL DEFAULT 0,
 can_delete TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_user_feature(app_user_id,feature_key),
 INDEX idx_user_feature_key(feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cash_book (
 id INT AUTO_INCREMENT PRIMARY KEY,
 entry_date DATE NOT NULL,
 description TEXT NULL,
 cash_in DECIMAL(14,2) NOT NULL DEFAULT 0,
 cash_out DECIMAL(14,2) NOT NULL DEFAULT 0,
 balance DECIMAL(14,2) NOT NULL DEFAULT 0,
 INDEX idx_cash_book_date(entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cash_book_vouchers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 voucher_no VARCHAR(100) NOT NULL UNIQUE,
 voucher_date DATE NOT NULL,
 notes TEXT NULL,
 total_receive DECIMAL(14,2) NOT NULL DEFAULT 0,
 total_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_cbv_date(voucher_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cash_book_voucher_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 voucher_id INT NOT NULL,
 line_no INT NOT NULL,
 account_type VARCHAR(50) NULL,
 account_id INT NULL,
 account_name_snapshot VARCHAR(180) NULL,
 description TEXT NULL,
 receive DECIMAL(14,2) NOT NULL DEFAULT 0,
 paid DECIMAL(14,2) NOT NULL DEFAULT 0,
 legacy_cash_book_id INT NULL,
 INDEX idx_cbvi_voucher(voucher_id),
 INDEX idx_cbvi_account(account_type,account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cheque_vouchers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 voucher_no VARCHAR(80) NOT NULL UNIQUE,
 payee_name VARCHAR(180) NOT NULL,
 account_id INT NOT NULL,
 account_type VARCHAR(40) NOT NULL DEFAULT 'general_ledger',
 cheque_direction VARCHAR(12) NOT NULL DEFAULT 'issue',
 issuance_date DATE NOT NULL,
 clearance_date DATE NOT NULL,
 total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 notes TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_cheque_clearance(clearance_date),
 INDEX idx_cheque_account(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cheque_voucher_payments (
 id INT AUTO_INCREMENT PRIMARY KEY,
 cheque_voucher_id INT NOT NULL,
 payment_date DATE NOT NULL,
 details VARCHAR(500) NOT NULL,
 amount DECIMAL(14,2) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_cheque_payment_voucher(cheque_voucher_id),
 CONSTRAINT fk_cheque_payment_voucher FOREIGN KEY (cheque_voucher_id)
   REFERENCES cheque_vouchers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cheque_cashbook_links (
 payment_id INT NOT NULL PRIMARY KEY,
 cheque_voucher_id INT NOT NULL,
 cash_book_voucher_id INT NOT NULL UNIQUE,
 cash_book_item_id INT NOT NULL UNIQUE,
 legacy_cash_book_id INT NOT NULL UNIQUE,
 INDEX idx_cheque_link(cheque_voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_period_status (
 id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 from_date DATE NOT NULL,
 to_date DATE NOT NULL,
 status ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uniq_employee_period(employee_id,from_date,to_date),
 INDEX idx_period_dates(from_date,to_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scoped_rate_lists (
 id INT AUTO_INCREMENT PRIMARY KEY,
 scope ENUM('supplier','production') NOT NULL,
 list_name VARCHAR(180) NOT NULL,
 items_json LONGTEXT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY unique_scope_list(scope,list_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scoped_rate_assignments (
 scope ENUM('supplier','production') NOT NULL,
 entity_id INT NOT NULL,
 list_id INT NOT NULL,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(scope,entity_id),
 INDEX idx_scope_assigned_list(list_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom (
 id INT AUTO_INCREMENT PRIMARY KEY,
 bom_code VARCHAR(100) NULL,
 product_id INT NULL,
 product_name VARCHAR(180) NULL,
 product_category_id INT NULL,
 product_type_id INT NULL,
 category_name VARCHAR(180) NULL,
 bom_type VARCHAR(80) NULL,
 batch_size DECIMAL(14,3) DEFAULT 0,
 output_qty DECIMAL(14,3) DEFAULT 1,
 output_unit_id INT NULL,
 output_unit_name VARCHAR(120) NULL,
 raw_material VARCHAR(255) NULL,
 qty DECIMAL(14,3) DEFAULT 0,
 rate DECIMAL(14,2) DEFAULT 0,
 total DECIMAL(14,2) DEFAULT 0,
 labor_cost DECIMAL(14,2) DEFAULT 0,
 expense_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
 rate_list_id INT NULL,
 notes TEXT NULL,
 material_total DECIMAL(14,2) DEFAULT 0,
 total_cost DECIMAL(14,2) DEFAULT 0,
 per_unit_cost DECIMAL(14,4) DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 bom_id INT NOT NULL,
 line_no INT NOT NULL DEFAULT 1,
 category_id INT NULL,
 category_name VARCHAR(180) NULL,
 product_id INT NULL,
 product_name VARCHAR(180) NULL,
 product_type_id INT NULL,
 type_name VARCHAR(180) NULL,
 extra_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS bom_rate_lists (
 id INT AUTO_INCREMENT PRIMARY KEY,
 list_name VARCHAR(180) NOT NULL UNIQUE,
 notes TEXT NULL,
 active_version_id INT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_rate_versions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 list_id INT NOT NULL,
 version_no INT NOT NULL,
 variation_note VARCHAR(500) NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uniq_bom_rate_version(list_id,version_no),
 INDEX idx_bom_rate_version_list(list_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_rate_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 version_id INT NOT NULL,
 product_id INT NOT NULL,
 rate DECIMAL(16,4) NOT NULL DEFAULT 0,
 UNIQUE KEY uniq_bom_version_product(version_id,product_id),
 INDEX idx_bom_rate_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Idempotent dynamic column helper. Only adds a missing column when its TABLE exists.
-- Does NOT overwrite an existing value or replace an existing table.
DROP PROCEDURE IF EXISTS ali_cage_add_missing_column;
DELIMITER $$
CREATE PROCEDURE ali_cage_add_missing_column(
 IN p_table VARCHAR(64),IN p_column VARCHAR(64),IN p_definition VARCHAR(255)
)
BEGIN
 DECLARE table_exists INT DEFAULT 0;
 DECLARE column_exists INT DEFAULT 0;
 SELECT COUNT(*) INTO table_exists FROM information_schema.TABLES
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table;
 IF table_exists>0 THEN
   SELECT COUNT(*) INTO column_exists FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND COLUMN_NAME=p_column;
   IF column_exists=0 THEN
     SET @ddl_sql = CONCAT('ALTER TABLE `',p_table,'` ADD COLUMN `',p_column,'` ',p_definition);
     PREPARE ddl_statement FROM @ddl_sql;
     EXECUTE ddl_statement;
     DEALLOCATE PREPARE ddl_statement;
   END IF;
 END IF;
END$$
DELIMITER ;

-- Ensure updated columns exist: departments

CALL ali_cage_add_missing_column('departments','head_of_dept','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('departments','extension_no','VARCHAR(45) NULL');

-- Ensure updated columns exist: designations

CALL ali_cage_add_missing_column('designations','designation_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('designations','status','VARCHAR(20) NOT NULL DEFAULT 'Active'');

-- Ensure updated columns exist: employees

CALL ali_cage_add_missing_column('employees','full_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('employees','cnic','VARCHAR(45) NULL');

CALL ali_cage_add_missing_column('employees','phone','VARCHAR(45) NULL');

CALL ali_cage_add_missing_column('employees','employee_type','VARCHAR(50) NULL');

CALL ali_cage_add_missing_column('employees','department_id','INT NULL');

CALL ali_cage_add_missing_column('employees','designation_id','INT NULL');

CALL ali_cage_add_missing_column('employees','designation','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('employees','joining_date','DATE NULL');

CALL ali_cage_add_missing_column('employees','photo_data','MEDIUMTEXT NULL');

-- Ensure updated columns exist: app_users

CALL ali_cage_add_missing_column('app_users','employee_id','INT NULL');

CALL ali_cage_add_missing_column('app_users','name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('app_users','username','VARCHAR(120) NULL');

CALL ali_cage_add_missing_column('app_users','email','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('app_users','password_hash','VARCHAR(255) NULL');

CALL ali_cage_add_missing_column('app_users','role','VARCHAR(50) NOT NULL DEFAULT 'employee'');

CALL ali_cage_add_missing_column('app_users','status','VARCHAR(30) NOT NULL DEFAULT 'active'');

CALL ali_cage_add_missing_column('app_users','last_login_at','DATETIME NULL');

CALL ali_cage_add_missing_column('app_users','created_at','TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

CALL ali_cage_add_missing_column('app_users','updated_at','TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- Ensure updated columns exist: user_permissions

CALL ali_cage_add_missing_column('user_permissions','employee_id','INT NULL');

CALL ali_cage_add_missing_column('user_permissions','user_id','INT NULL');

CALL ali_cage_add_missing_column('user_permissions','role_id','INT NULL');

CALL ali_cage_add_missing_column('user_permissions','role','VARCHAR(50) NULL');

CALL ali_cage_add_missing_column('user_permissions','access_level','VARCHAR(50) NULL');

CALL ali_cage_add_missing_column('user_permissions','module_access','VARCHAR(255) NULL');

-- Ensure updated columns exist: user_feature_permissions

CALL ali_cage_add_missing_column('user_feature_permissions','app_user_id','INT NULL');

CALL ali_cage_add_missing_column('user_feature_permissions','feature_key','VARCHAR(110) NULL');

CALL ali_cage_add_missing_column('user_feature_permissions','can_read','TINYINT(1) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('user_feature_permissions','can_write','TINYINT(1) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('user_feature_permissions','can_delete','TINYINT(1) NOT NULL DEFAULT 0');

-- Ensure updated columns exist: cash_book

CALL ali_cage_add_missing_column('cash_book','entry_date','DATE NULL');

CALL ali_cage_add_missing_column('cash_book','description','TEXT NULL');

CALL ali_cage_add_missing_column('cash_book','cash_in','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('cash_book','cash_out','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('cash_book','balance','DECIMAL(14,2) NOT NULL DEFAULT 0');

-- Ensure updated columns exist: cash_book_vouchers

CALL ali_cage_add_missing_column('cash_book_vouchers','voucher_no','VARCHAR(100) NULL');

CALL ali_cage_add_missing_column('cash_book_vouchers','voucher_date','DATE NULL');

CALL ali_cage_add_missing_column('cash_book_vouchers','notes','TEXT NULL');

CALL ali_cage_add_missing_column('cash_book_vouchers','total_receive','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('cash_book_vouchers','total_paid','DECIMAL(14,2) NOT NULL DEFAULT 0');

-- Ensure updated columns exist: cash_book_voucher_items

CALL ali_cage_add_missing_column('cash_book_voucher_items','voucher_id','INT NULL');

CALL ali_cage_add_missing_column('cash_book_voucher_items','line_no','INT NOT NULL DEFAULT 1');

CALL ali_cage_add_missing_column('cash_book_voucher_items','account_type','VARCHAR(50) NULL');

CALL ali_cage_add_missing_column('cash_book_voucher_items','account_id','INT NULL');

CALL ali_cage_add_missing_column('cash_book_voucher_items','account_name_snapshot','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('cash_book_voucher_items','description','TEXT NULL');

CALL ali_cage_add_missing_column('cash_book_voucher_items','receive','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('cash_book_voucher_items','paid','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('cash_book_voucher_items','legacy_cash_book_id','INT NULL');

-- Ensure updated columns exist: cheque_vouchers

CALL ali_cage_add_missing_column('cheque_vouchers','account_type','VARCHAR(40) NOT NULL DEFAULT 'general_ledger'');

CALL ali_cage_add_missing_column('cheque_vouchers','cheque_direction','VARCHAR(12) NOT NULL DEFAULT 'issue'');

-- Ensure updated columns exist: cheque_voucher_payments

CALL ali_cage_add_missing_column('cheque_voucher_payments','payment_date','DATE NULL');

CALL ali_cage_add_missing_column('cheque_voucher_payments','details','VARCHAR(500) NULL');

CALL ali_cage_add_missing_column('cheque_voucher_payments','amount','DECIMAL(14,2) NOT NULL DEFAULT 0');

-- Ensure updated columns exist: payroll_period_status

CALL ali_cage_add_missing_column('payroll_period_status','employee_id','INT NULL');

CALL ali_cage_add_missing_column('payroll_period_status','from_date','DATE NULL');

CALL ali_cage_add_missing_column('payroll_period_status','to_date','DATE NULL');

CALL ali_cage_add_missing_column('payroll_period_status','status','ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid'');

-- Ensure updated columns exist: scoped_rate_lists

CALL ali_cage_add_missing_column('scoped_rate_lists','scope','ENUM('supplier','production') NULL');

CALL ali_cage_add_missing_column('scoped_rate_lists','list_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('scoped_rate_lists','items_json','LONGTEXT NULL');

-- Ensure updated columns exist: scoped_rate_assignments

CALL ali_cage_add_missing_column('scoped_rate_assignments','scope','ENUM('supplier','production') NULL');

CALL ali_cage_add_missing_column('scoped_rate_assignments','entity_id','INT NULL');

CALL ali_cage_add_missing_column('scoped_rate_assignments','list_id','INT NULL');

-- Ensure updated columns exist: bom

CALL ali_cage_add_missing_column('bom','bom_code','VARCHAR(100) NULL');

CALL ali_cage_add_missing_column('bom','product_id','INT NULL');

CALL ali_cage_add_missing_column('bom','product_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('bom','product_category_id','INT NULL');

CALL ali_cage_add_missing_column('bom','category_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('bom','product_type_id','INT NULL');

CALL ali_cage_add_missing_column('bom','rate_list_id','INT NULL');

CALL ali_cage_add_missing_column('bom','output_qty','DECIMAL(14,3) DEFAULT 1');

CALL ali_cage_add_missing_column('bom','expense_cost','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('bom','labor_cost','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_add_missing_column('bom','total_cost','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_add_missing_column('bom','material_total','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_add_missing_column('bom','per_unit_cost','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_add_missing_column('bom','notes','TEXT NULL');

-- Ensure updated columns exist: bom_items

CALL ali_cage_add_missing_column('bom_items','product_type_id','INT NULL');

CALL ali_cage_add_missing_column('bom_items','type_name','VARCHAR(180) NULL');

CALL ali_cage_add_missing_column('bom_items','extra_charges','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_add_missing_column('bom_items','effective_qty','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_add_missing_column('bom_items','material_cost','DECIMAL(14,2) DEFAULT 0');

-- Ensure updated columns exist: production_invoices

CALL ali_cage_add_missing_column('production_invoices','rate_list_id','INT NULL');

DROP PROCEDURE IF EXISTS ali_cage_add_missing_column;

-- NOTES:
-- Existing password hashes are deliberately not changed here; use User Accounts UI
-- to create/reset passwords. Never put plaintext passwords in SQL files.
-- Login requires both backend+frontend latest commits and a valid app_users row.
-- New employee module checkboxes write user_feature_permissions; old free-text
-- module_access values are not auto-promoted to new permissions.
-- Supplier/Production rate list records and BOM rate history are preserved.
-- Existing cheque clearing rows are NOT retroactively mirrored into Cash Book
-- by this migration; update an old cheque through the application if necessary.
SELECT 'Ali Cage ERP additive migration completed (schema only).' AS migration_status;