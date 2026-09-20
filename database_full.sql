-- Ali Cages / CageMaster ERP - Full database schema
-- Generated 2026-09-20. Non-destructive fresh-install schema: no DROP statements.
CREATE DATABASE IF NOT EXISTS cagemaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cagemaster;

CREATE TABLE IF NOT EXISTS product_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_type_en VARCHAR(180) NULL,
  type_name VARCHAR(180) NULL,
  type_code VARCHAR(50) NULL,
  short_code VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(180) NOT NULL,
  category_code VARCHAR(50) NULL,
  short_code VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_name VARCHAR(120) NOT NULL,
  symbol VARCHAR(30) NULL,
  decimal_places INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(80) NULL,
  product_name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  product_type_id INT NULL,
  category_id INT NULL,
  unit_id INT NULL,
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  piece_rate DECIMAL(14,2) NOT NULL DEFAULT 0,
  sale_unit VARCHAR(30) NOT NULL DEFAULT 'single',
  pieces_per_carton DECIMAL(14,3) NOT NULL DEFAULT 0,
  master_packing_unit_id INT NULL,
  master_packing_pieces DECIMAL(14,3) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_name(product_name), INDEX idx_products_type(product_type_id), INDEX idx_products_category(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name_en VARCHAR(180) NOT NULL,
  customer_name VARCHAR(180) NULL,
  phone VARCHAR(80) NULL,
  city_en VARCHAR(180) NULL,
  address VARCHAR(500) NULL,
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(180) NOT NULL,
  phone VARCHAR(80) NULL,
  address VARCHAR(500) NULL,
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  opening_debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  opening_credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_name(supplier_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salesmen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesman_name VARCHAR(180) NOT NULL, phone VARCHAR(80) NULL, cnic VARCHAR(80) NULL,
  assigned_area VARCHAR(180) NULL, commission DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS retailers (
  id INT AUTO_INCREMENT PRIMARY KEY, shop_name VARCHAR(180) NOT NULL, owner_name VARCHAR(180) NULL,
  contact VARCHAR(80) NULL, city VARCHAR(120) NULL, zone VARCHAR(120) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS areas (
  id INT AUTO_INCREMENT PRIMARY KEY, area_name VARCHAR(180) NOT NULL, city VARCHAR(120) NULL,
  region_code VARCHAR(80) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY, department_name VARCHAR(180) NOT NULL, head_of_dept VARCHAR(180) NULL,
  extension_no VARCHAR(80) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS designations (
  id INT AUTO_INCREMENT PRIMARY KEY, designation_name VARCHAR(180) NOT NULL, status VARCHAR(50) NULL DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(180) NOT NULL, father_name VARCHAR(180) NULL, cnic VARCHAR(80) NULL,
  phone VARCHAR(80) NULL, employee_type VARCHAR(80) NULL, department_id INT NULL, designation_id INT NULL,
  designation VARCHAR(180) NULL, joining_date DATE NULL, basic_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NULL DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS employee_rates (
  id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NOT NULL, salary_month VARCHAR(20) NULL,
  basic_salary DECIMAL(14,2) DEFAULT 0, per_day_salary DECIMAL(14,2) DEFAULT 0, extra_days DECIMAL(10,2) DEFAULT 0,
  extra_day_amount DECIMAL(14,2) DEFAULT 0, absent_days DECIMAL(10,2) DEFAULT 0, absent_amount DECIMAL(14,2) DEFAULT 0,
  time_deduction_hours DECIMAL(10,2) DEFAULT 0, time_deduction_rate DECIMAL(14,2) DEFAULT 0, time_deduction_amount DECIMAL(14,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0, overtime_rate DECIMAL(14,2) DEFAULT 0, overtime_amount DECIMAL(14,2) DEFAULT 0,
  calculated_amount DECIMAL(14,2) DEFAULT 0, advance DECIMAL(14,2) DEFAULT 0, previous_advance DECIMAL(14,2) DEFAULT 0,
  total_advance DECIMAL(14,2) DEFAULT 0, remaining_balance DECIMAL(14,2) DEFAULT 0, status VARCHAR(50) NULL, notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_rates_employee(employee_id), INDEX idx_employee_rates_month(salary_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS payroll (
  id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NOT NULL, salary_month VARCHAR(20) NULL, net_salary DECIMAL(14,2) DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0, payment_date DATE NULL, status VARCHAR(50) NULL, notes TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS contractors (
  id INT AUTO_INCREMENT PRIMARY KEY, contractor_name VARCHAR(180) NOT NULL, cnic VARCHAR(80) NULL, phone VARCHAR(80) NULL,
  address VARCHAR(500) NULL, status VARCHAR(50) NULL DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS contractor_contracts (
  id INT AUTO_INCREMENT PRIMARY KEY, contractor_id INT NOT NULL, department_id INT NULL, work_title VARCHAR(220) NULL, work_description TEXT NULL,
  payment_basis VARCHAR(80) NULL, contract_rate DECIMAL(14,2) DEFAULT 0, duration_value DECIMAL(14,2) DEFAULT 0, duration_unit VARCHAR(80) NULL,
  total_value DECIMAL(14,2) DEFAULT 0, start_date DATE NULL, end_date DATE NULL, status VARCHAR(50) NULL, notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS opening_stock (
  id INT AUTO_INCREMENT PRIMARY KEY, product_id INT NULL, product_type_id INT NULL, category_id INT NULL, warehouse VARCHAR(180) NULL,
  quantity DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, total_value DECIMAL(14,2) DEFAULT 0, stock_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_receive (
  id INT AUTO_INCREMENT PRIMARY KEY, grn_no VARCHAR(100) NULL, receive_date DATE NULL, supplier_name VARCHAR(180) NULL,
  reference_no VARCHAR(120) NULL, remarks TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_receive_items (
  id INT AUTO_INCREMENT PRIMARY KEY, stock_receive_id INT NOT NULL, product_id INT NULL, product_name VARCHAR(180) NULL,
  category_id INT NULL, category_name VARCHAR(180) NULL, unit_id INT NULL, unit_name VARCHAR(120) NULL, product_type_id INT NULL,
  type_name VARCHAR(180) NULL, received_qty DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, total DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_receive_header(stock_receive_id), INDEX idx_receive_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_issue (
  id INT AUTO_INCREMENT PRIMARY KEY, issue_no VARCHAR(100) NULL, date DATE NULL, issue_date DATE NULL, shipment_to VARCHAR(255) NULL,
  reference_no VARCHAR(120) NULL, total DECIMAL(14,2) DEFAULT 0, remarks TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stock_issue_items (
  id INT AUTO_INCREMENT PRIMARY KEY, stock_issue_id INT NOT NULL, product_id INT NULL, product_name VARCHAR(180) NULL,
  category_id INT NULL, category_name VARCHAR(180) NULL, unit_id INT NULL, unit_name VARCHAR(120) NULL, product_type_id INT NULL,
  type_name VARCHAR(180) NULL, issued_qty DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, total DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_issue_header(stock_issue_id), INDEX idx_issue_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_rates (
  id INT AUTO_INCREMENT PRIMARY KEY, list_name VARCHAR(180) NULL, customer_id INT NULL, product_id INT NOT NULL,
  price_options LONGTEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sales_rates_customer(customer_id), INDEX idx_sales_rates_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS purchase_rates (
  id INT AUTO_INCREMENT PRIMARY KEY, list_name VARCHAR(180) NULL, supplier_id INT NULL, supplier_name VARCHAR(180) NULL,
  product_id INT NULL, product_name VARCHAR(180) NULL, unit_id INT NULL, unit_name VARCHAR(120) NULL, category_id INT NULL,
  category_name VARCHAR(180) NULL, product_type_id INT NULL, type_name VARCHAR(180) NULL, rate DECIMAL(14,2) DEFAULT 0,
  quantity DECIMAL(14,3) DEFAULT 0, effective_date DATE NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_purchase_rates_supplier(supplier_id), INDEX idx_purchase_rates_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sale_orders (
  id INT AUTO_INCREMENT PRIMARY KEY, order_no VARCHAR(100) NOT NULL, reference_no VARCHAR(120) NULL,
  party_type VARCHAR(50) NULL DEFAULT 'customer', party_id INT NULL, party_name VARCHAR(180) NULL,
  customer_type VARCHAR(50) NULL, customer_name_en VARCHAR(180) NULL, customer_id INT NULL, employee_id INT NULL, supplier_id INT NULL, general_ledger_id INT NULL,
  order_date DATE NULL, delivery_date DATE NULL, shipment_to VARCHAR(500) NULL, previous_balance DECIMAL(14,2) DEFAULT 0,
  delivery_charges DECIMAL(14,2) DEFAULT 0, discount DECIMAL(14,2) DEFAULT 0, total_amount DECIMAL(14,2) DEFAULT 0, grand_total DECIMAL(14,2) DEFAULT 0,
  payment_method VARCHAR(50) NULL, advance_receive DECIMAL(14,2) DEFAULT 0, payment_received DECIMAL(14,2) DEFAULT 0, paid_amount DECIMAL(14,2) DEFAULT 0,
  remaining_balance DECIMAL(14,2) DEFAULT 0, payment_status VARCHAR(50) NULL, payment_note TEXT NULL, status VARCHAR(50) NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sale_orders_date(order_date), INDEX idx_sale_orders_customer(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sale_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, product_type_id INT NULL, category_id INT NULL, product_id INT NULL,
  product_description VARCHAR(500) NULL, unit_id INT NULL, order_qty DECIMAL(14,3) DEFAULT 0, rate_mode VARCHAR(40) NULL DEFAULT 'auto',
  rate DECIMAL(14,2) DEFAULT 0, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_order_items_header(order_id), INDEX idx_order_items_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY, invoice_no VARCHAR(100) NOT NULL, reference_no VARCHAR(120) NULL,
  party_type VARCHAR(50) NULL DEFAULT 'customer', party_id INT NULL, party_name VARCHAR(180) NULL, customer_type VARCHAR(50) NULL,
  customer_name_en VARCHAR(180) NULL, customer_name VARCHAR(180) NULL, customer_id INT NULL, employee_id INT NULL, supplier_id INT NULL, general_ledger_id INT NULL,
  invoice_date DATE NULL, shipment_to VARCHAR(500) NULL, address VARCHAR(500) NULL, previous_balance DECIMAL(14,2) DEFAULT 0,
  delivery_charges DECIMAL(14,2) DEFAULT 0, discount DECIMAL(14,2) DEFAULT 0, invoice_total DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0, grand_total DECIMAL(14,2) DEFAULT 0, total_qty DECIMAL(14,3) DEFAULT 0, items_count INT DEFAULT 0,
  status VARCHAR(50) NULL DEFAULT 'Posted', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sales_invoice_date(invoice_date), INDEX idx_sales_invoice_customer(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, sr INT NULL, category_id INT NULL, product_id INT NULL,
  product_name VARCHAR(180) NULL, product_description VARCHAR(500) NULL, description VARCHAR(500) NULL, product_type_id INT NULL,
  unit_id INT NULL, sale_type VARCHAR(40) NULL DEFAULT 'single', carton_qty DECIMAL(14,3) DEFAULT 0, pieces_qty DECIMAL(14,3) DEFAULT 0,
  qty DECIMAL(14,3) DEFAULT 0, quantity DECIMAL(14,3) DEFAULT 0, pieces_per_carton DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0,
  amount DECIMAL(14,2) DEFAULT 0, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sales_item_invoice(invoice_id), INDEX idx_sales_item_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sales_returns (
  id INT AUTO_INCREMENT PRIMARY KEY, return_no VARCHAR(100) NOT NULL, return_mode VARCHAR(50) NULL, invoice_id INT NULL, invoice_ref VARCHAR(120) NULL,
  invoice_no VARCHAR(100) NULL, invoice_item_id INT NULL, party_type VARCHAR(50) NULL, party_id INT NULL, party_name VARCHAR(180) NULL, customer_name VARCHAR(180) NULL,
  product_id INT NULL, product_name VARCHAR(180) NULL, manual_product_name VARCHAR(180) NULL, product_description VARCHAR(500) NULL,
  product_type_id INT NULL, product_type VARCHAR(180) NULL, category_id INT NULL, category_name VARCHAR(180) NULL, unit_id INT NULL, unit_name VARCHAR(120) NULL,
  return_date DATE NULL, sale_order_date DATE NULL, invoice_date DATE NULL, sold_qty DECIMAL(14,3) DEFAULT 0, already_returned_qty DECIMAL(14,3) DEFAULT 0,
  available_qty DECIMAL(14,3) DEFAULT 0, return_qty DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, return_amount DECIMAL(14,2) DEFAULT 0,
  debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0, reason VARCHAR(500) NULL, status VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_sales_return_date(return_date), INDEX idx_sales_return_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY, invoice_no VARCHAR(100) NOT NULL, supplier_id INT NULL, supplier_name VARCHAR(180) NULL,
  reference_no VARCHAR(120) NULL, invoice_date DATE NULL, address VARCHAR(500) NULL, previous_balance DECIMAL(14,2) DEFAULT 0,
  delivery_charges DECIMAL(14,2) DEFAULT 0, freight DECIMAL(14,2) DEFAULT 0, discount DECIMAL(14,2) DEFAULT 0, invoice_total DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0, grand_total DECIMAL(14,2) DEFAULT 0, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0,
  status VARCHAR(50) NULL DEFAULT 'Posted', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_purchase_invoice_date(invoice_date), INDEX idx_purchase_invoice_supplier(supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NOT NULL, product_id INT NULL, product_description VARCHAR(500) NULL,
  category_id INT NULL, unit_id INT NULL, product_type_id INT NULL, unit_name VARCHAR(120) NULL, category_name VARCHAR(180) NULL,
  type_name VARCHAR(180) NULL, quantity DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_purchase_item_invoice(invoice_id), INDEX idx_purchase_item_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INT AUTO_INCREMENT PRIMARY KEY, invoice_id INT NULL, return_no VARCHAR(100) NULL, return_date DATE NULL, reason VARCHAR(500) NULL,
  total_amount DECIMAL(14,2) DEFAULT 0, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY, return_id INT NOT NULL, product_id INT NULL, product_description VARCHAR(500) NULL,
  unit_name VARCHAR(120) NULL, category_name VARCHAR(180) NULL, type_name VARCHAR(180) NULL, quantity DECIMAL(14,3) DEFAULT 0,
  rate DECIMAL(14,2) DEFAULT 0, amount DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_purchase_return_header(return_id), INDEX idx_purchase_return_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_groups (
  id INT AUTO_INCREMENT PRIMARY KEY, group_name VARCHAR(180) NOT NULL, parent_group VARCHAR(180) NULL, type VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY, account_code VARCHAR(80) NOT NULL, account_title VARCHAR(180) NOT NULL, group_id INT NULL,
  opening_balance DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coa_group(group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS general_ledgers (
  id INT AUTO_INCREMENT PRIMARY KEY, ledger_name VARCHAR(180) NULL, account_title VARCHAR(180) NULL, account_code VARCHAR(80) NULL,
  opening_balance DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS journal_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY, voucher_no VARCHAR(100) NOT NULL, voucher_date DATE NOT NULL, account_dr_id INT NULL, account_cr_id INT NULL,
  amount DECIMAL(14,2) DEFAULT 0, narration TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS journal_voucher_lines (
  id INT AUTO_INCREMENT PRIMARY KEY, journal_voucher_id INT NOT NULL, line_no INT NOT NULL DEFAULT 1, account_type VARCHAR(80) NULL,
  account_id INT NULL, description VARCHAR(500) NULL, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_jv_lines_header(journal_voucher_id), INDEX idx_jv_lines_account(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cheque_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY, voucher_no VARCHAR(100) NOT NULL, payee_name VARCHAR(180) NOT NULL, account_id INT NOT NULL,
  issuance_date DATE NOT NULL, clearance_date DATE NULL, total_amount DECIMAL(14,2) NOT NULL DEFAULT 0, notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cheque_clearance(clearance_date), INDEX idx_cheque_account(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cheque_voucher_payments (
  id INT AUTO_INCREMENT PRIMARY KEY, cheque_voucher_id INT NOT NULL, payment_date DATE NOT NULL, details VARCHAR(500) NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_cheque_payment_voucher(cheque_voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cash_book (
  id INT AUTO_INCREMENT PRIMARY KEY, entry_date DATE NOT NULL, description VARCHAR(500) NULL, cash_in DECIMAL(14,2) DEFAULT 0,
  cash_out DECIMAL(14,2) DEFAULT 0, balance DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cash_book_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY, voucher_no VARCHAR(100) NOT NULL, voucher_date DATE NOT NULL, notes TEXT NULL,
  total_receive DECIMAL(14,2) DEFAULT 0, total_paid DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cash_book_voucher_items (
  id INT AUTO_INCREMENT PRIMARY KEY, voucher_id INT NOT NULL, line_no INT DEFAULT 1, account_type VARCHAR(80) NULL, account_id INT NULL,
  account_name_snapshot VARCHAR(180) NULL, description VARCHAR(500) NULL, receive DECIMAL(14,2) DEFAULT 0, paid DECIMAL(14,2) DEFAULT 0,
  legacy_cash_book_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_cash_book_voucher(voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS opening_balances (
  id INT AUTO_INCREMENT PRIMARY KEY, fiscal_year VARCHAR(20) NULL, account_id INT NOT NULL, debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0, entry_date DATE NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_opening_balance_year_account(fiscal_year,account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS customer_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT NOT NULL, entry_date DATE NOT NULL, reference_no VARCHAR(120) NULL,
  description_en VARCHAR(500) NULL, description VARCHAR(500) NULL, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_customer_ledger(customer_id,entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY, supplier_id INT NOT NULL, entry_date DATE NOT NULL, reference_no VARCHAR(120) NULL,
  description VARCHAR(500) NULL, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_supplier_ledger(supplier_id,entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom (
  id INT AUTO_INCREMENT PRIMARY KEY, product_name VARCHAR(180) NULL, product_category_id INT NULL, bom_type VARCHAR(80) NULL,
  batch_size DECIMAL(14,3) DEFAULT 0, raw_material VARCHAR(255) NULL, qty DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0,
  total DECIMAL(14,2) DEFAULT 0, labor_cost DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS assembly (
  id INT AUTO_INCREMENT PRIMARY KEY, assembly_no VARCHAR(100) NOT NULL UNIQUE, product_name VARCHAR(255) NULL, bom_ref VARCHAR(100) NULL,
  product_id INT NULL, bom_id INT NULL, assembly_date DATE NOT NULL, qty_assembled DECIMAL(14,3) NOT NULL DEFAULT 0,
  warehouse VARCHAR(255) NULL, remarks TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS assembly_items (
  id INT AUTO_INCREMENT PRIMARY KEY, assembly_id INT NOT NULL, product_id INT NULL, product_name VARCHAR(180) NULL,
  type_name VARCHAR(180) NULL, category_name VARCHAR(180) NULL, unit_name VARCHAR(120) NULL, qty_used DECIMAL(14,3) NOT NULL DEFAULT 0,
  remarks VARCHAR(500) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_assembly_items_header(assembly_id), INDEX idx_assembly_items_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS production_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY, batch_no VARCHAR(100) NOT NULL UNIQUE, production_date DATE NOT NULL, product VARCHAR(255) NULL, product_id INT NULL,
  quantity_produced DECIMAL(14,3) DEFAULT 0, qty_produced DECIMAL(14,3) DEFAULT 0, warehouse VARCHAR(255) NULL, supervisor VARCHAR(180) NULL,
  assignee_type VARCHAR(50) NULL, assignee_id INT NULL, assignee_name VARCHAR(180) NULL, remarks TEXT NULL, total_qty DECIMAL(14,3) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0, status VARCHAR(50) NULL DEFAULT 'Completed', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_production_date(production_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS production_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY, production_invoice_id INT NOT NULL, product_id INT NULL, product_name VARCHAR(180) NULL, description VARCHAR(500) NULL,
  product_type_id INT NULL, type_name VARCHAR(180) NULL, category_id INT NULL, category_name VARCHAR(180) NULL, unit_id INT NULL, unit_name VARCHAR(120) NULL,
  quantity DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, amount DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prod_items_header(production_invoice_id), INDEX idx_prod_items_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS production_returns (
  id INT AUTO_INCREMENT PRIMARY KEY, return_no VARCHAR(100) NOT NULL UNIQUE, return_date DATE NOT NULL, production_invoice_id INT NULL, batch_no VARCHAR(100) NULL,
  product VARCHAR(255) NULL, product_id INT NULL, quantity_returned DECIMAL(14,3) DEFAULT 0, warehouse VARCHAR(255) NULL, reason VARCHAR(500) NULL,
  assignee_type VARCHAR(50) NULL, assignee_id INT NULL, assignee_name VARCHAR(180) NULL, total_qty DECIMAL(14,3) DEFAULT 0, total_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS production_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY, production_return_id INT NOT NULL, production_invoice_id INT NULL, production_item_id INT NULL,
  product_id INT NULL, product_name VARCHAR(180) NULL, description VARCHAR(500) NULL, unit_name VARCHAR(120) NULL,
  quantity DECIMAL(14,3) DEFAULT 0, rate DECIMAL(14,2) DEFAULT 0, amount DECIMAL(14,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prod_return_header(production_return_id), INDEX idx_prod_return_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY, employee_id INT NULL, user_id INT NULL, role_id INT NULL, role VARCHAR(50) NULL,
  access_level VARCHAR(50) NULL, module_access VARCHAR(255) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Keep both current and legacy product-type names populated.
UPDATE product_types SET product_type_en = COALESCE(NULLIF(product_type_en,''), type_name), type_name = COALESCE(NULLIF(type_name,''), product_type_en);
