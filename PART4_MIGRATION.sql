-- Ali Cages ERP - Part 4 migration
-- Camz unified UI + invoice-level rate-list override.
-- Safe to run after Part 3.
SET NAMES utf8mb4;

SET @has_rate_list_name := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales_invoices'
    AND COLUMN_NAME = 'rate_list_name'
);

SET @rate_list_sql := IF(
  @has_rate_list_name = 0,
  'ALTER TABLE sales_invoices ADD COLUMN rate_list_name VARCHAR(180) NULL AFTER shipment_to',
  'SELECT 1'
);
PREPARE rate_list_stmt FROM @rate_list_sql;
EXECUTE rate_list_stmt;
DEALLOCATE PREPARE rate_list_stmt;
