-- Ali Bird Cage ERP - Safe BOM update (MySQL 8 / MariaDB)

-- IMPORTANT: Backup your ERP database before running this migration.

-- Select the correct ERP database first: USE your_erp_database;

-- The migration adds missing columns/tables; it does not delete existing BOM data.

CREATE TABLE IF NOT EXISTS bom (
 id INT AUTO_INCREMENT PRIMARY KEY,bom_code VARCHAR(100),product_id INT,product_name VARCHAR(180),
 product_category_id INT,category_name VARCHAR(180),bom_type VARCHAR(80),batch_size DECIMAL(14,3) DEFAULT 0,
 output_qty DECIMAL(14,3) DEFAULT 1,output_unit_id INT,output_unit_name VARCHAR(120),
 raw_material VARCHAR(255),qty DECIMAL(14,3) DEFAULT 0,rate DECIMAL(14,2) DEFAULT 0,
 total DECIMAL(14,2) DEFAULT 0,labor_cost DECIMAL(14,2) DEFAULT 0,notes TEXT,
 material_total DECIMAL(14,2) DEFAULT 0,total_cost DECIMAL(14,2) DEFAULT 0,
 per_unit_cost DECIMAL(14,4) DEFAULT 0,
 expense_cost DECIMAL(14,2) NOT NULL DEFAULT 0,rate_list_id INT,product_type_id INT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_items (
 id INT AUTO_INCREMENT PRIMARY KEY,bom_id INT NOT NULL,line_no INT NOT NULL DEFAULT 1,
 category_id INT,category_name VARCHAR(180),product_id INT,product_name VARCHAR(180),
 unit_id INT,unit_name VARCHAR(120),qty DECIMAL(14,4) DEFAULT 0,required_qty DECIMAL(14,4) DEFAULT 0,
 wastage_percent DECIMAL(10,3) DEFAULT 0,effective_qty DECIMAL(14,4) DEFAULT 0,
 rate DECIMAL(14,2) DEFAULT 0,material_cost DECIMAL(14,2) DEFAULT 0,total DECIMAL(14,2) DEFAULT 0,
 extra_charges DECIMAL(14,2) NOT NULL DEFAULT 0,product_type_id INT,type_name VARCHAR(180),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 KEY idx_bom_items_bom(bom_id),KEY idx_bom_items_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_rate_lists (
 id INT AUTO_INCREMENT PRIMARY KEY,list_name VARCHAR(180) NOT NULL UNIQUE,
 notes TEXT,active_version_id INT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_rate_versions (
 id INT AUTO_INCREMENT PRIMARY KEY,list_id INT NOT NULL,version_no INT NOT NULL,
 variation_note VARCHAR(500),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uniq_bom_rate_version(list_id,version_no),
 KEY idx_bom_rate_version_list(list_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bom_rate_items (
 id INT AUTO_INCREMENT PRIMARY KEY,version_id INT NOT NULL,product_id INT NOT NULL,
 rate DECIMAL(16,4) NOT NULL DEFAULT 0,
 UNIQUE KEY uniq_bom_version_product(version_id,product_id),
 KEY idx_bom_rate_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS ali_cage_bom_add_column;
DELIMITER $$
CREATE PROCEDURE ali_cage_bom_add_column(
 IN p_table VARCHAR(64),IN p_column VARCHAR(64),IN p_definition VARCHAR(220)
)
BEGIN
 DECLARE found_col INT DEFAULT 0;
 SELECT COUNT(*) INTO found_col FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=p_table AND COLUMN_NAME=p_column;
 IF found_col=0 THEN
   SET @ddl=CONCAT('ALTER TABLE `',p_table,'` ADD COLUMN `',p_column,'` ',p_definition);
   PREPARE stmt FROM @ddl;
   EXECUTE stmt;
   DEALLOCATE PREPARE stmt;
 END IF;
END$$
DELIMITER ;

CALL ali_cage_bom_add_column('bom','bom_code','VARCHAR(100) NULL');

CALL ali_cage_bom_add_column('bom','product_id','INT NULL');

CALL ali_cage_bom_add_column('bom','product_name','VARCHAR(180) NULL');

CALL ali_cage_bom_add_column('bom','product_category_id','INT NULL');

CALL ali_cage_bom_add_column('bom','category_name','VARCHAR(180) NULL');

CALL ali_cage_bom_add_column('bom','bom_type','VARCHAR(80) NULL');

CALL ali_cage_bom_add_column('bom','batch_size','DECIMAL(14,3) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','output_qty','DECIMAL(14,3) DEFAULT 1');

CALL ali_cage_bom_add_column('bom','output_unit_id','INT NULL');

CALL ali_cage_bom_add_column('bom','output_unit_name','VARCHAR(120) NULL');

CALL ali_cage_bom_add_column('bom','raw_material','VARCHAR(255) NULL');

CALL ali_cage_bom_add_column('bom','qty','DECIMAL(14,3) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','rate','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','total','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','labor_cost','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','notes','TEXT NULL');

CALL ali_cage_bom_add_column('bom','material_total','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','total_cost','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','per_unit_cost','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_bom_add_column('bom','expense_cost','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_bom_add_column('bom','rate_list_id','INT NULL');

CALL ali_cage_bom_add_column('bom','product_type_id','INT NULL');

CALL ali_cage_bom_add_column('bom_items','bom_id','INT NOT NULL');

CALL ali_cage_bom_add_column('bom_items','line_no','INT NOT NULL DEFAULT 1');

CALL ali_cage_bom_add_column('bom_items','category_id','INT NULL');

CALL ali_cage_bom_add_column('bom_items','category_name','VARCHAR(180) NULL');

CALL ali_cage_bom_add_column('bom_items','product_id','INT NULL');

CALL ali_cage_bom_add_column('bom_items','product_name','VARCHAR(180) NULL');

CALL ali_cage_bom_add_column('bom_items','unit_id','INT NULL');

CALL ali_cage_bom_add_column('bom_items','unit_name','VARCHAR(120) NULL');

CALL ali_cage_bom_add_column('bom_items','qty','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','required_qty','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','wastage_percent','DECIMAL(10,3) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','effective_qty','DECIMAL(14,4) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','rate','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','material_cost','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','total','DECIMAL(14,2) DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','extra_charges','DECIMAL(14,2) NOT NULL DEFAULT 0');

CALL ali_cage_bom_add_column('bom_items','product_type_id','INT NULL');

CALL ali_cage_bom_add_column('bom_items','type_name','VARCHAR(180) NULL');

DROP PROCEDURE IF EXISTS ali_cage_bom_add_column;

-- Check: SELECT id,bom_code,rate_list_id,labor_cost,expense_cost,total_cost FROM bom ORDER BY id DESC LIMIT 10;
