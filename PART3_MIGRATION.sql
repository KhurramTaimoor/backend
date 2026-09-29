-- Ali Cages ERP - Part 3 migration
-- Bulk Sales Rate Lists + customer assignments + invoice due dates/calendar support.
-- Safe for an existing Part 2 database.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS sales_rate_list_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  list_name VARCHAR(180) NOT NULL,
  customer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_rate_list_customer (list_name, customer_id),
  INDEX idx_rate_list_assign_list (list_name),
  INDEX idx_rate_list_assign_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add optional Sales Invoice due date without failing if the column already exists.
SET @has_due_date := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales_invoices'
    AND COLUMN_NAME = 'due_date'
);
SET @due_sql := IF(
  @has_due_date = 0,
  'ALTER TABLE sales_invoices ADD COLUMN due_date DATE NULL AFTER invoice_date',
  'SELECT 1'
);
PREPARE due_stmt FROM @due_sql;
EXECUTE due_stmt;
DEALLOCATE PREPARE due_stmt;

-- Optional index for named list filtering. Ignore manually if your MySQL reports it already exists.
SET @has_rate_list_index := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales_rates'
    AND INDEX_NAME = 'idx_sales_rates_list'
);
SET @rate_index_sql := IF(
  @has_rate_list_index = 0,
  'ALTER TABLE sales_rates ADD INDEX idx_sales_rates_list (list_name)',
  'SELECT 1'
);
PREPARE rate_idx_stmt FROM @rate_index_sql;
EXECUTE rate_idx_stmt;
DEALLOCATE PREPARE rate_idx_stmt;
