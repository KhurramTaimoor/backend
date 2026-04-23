const express = require("express");
const router = express.Router();
const db = require("../db");

const ensurePermissionsTable = () => {
  db.query(
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NULL,
      role VARCHAR(50) NULL,
      access_level VARCHAR(50) NULL,
      module_access VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    () => {}
  );

  db.query("SHOW COLUMNS FROM user_permissions LIKE 'employee_id'", (err, rows) => {
    if (!err && (!rows || rows.length === 0)) {
      db.query("ALTER TABLE user_permissions ADD COLUMN employee_id INT NULL AFTER id");
    }
  });

  db.query("SHOW COLUMNS FROM user_permissions LIKE 'role'", (err, rows) => {
    if (!err && (!rows || rows.length === 0)) {
      db.query("ALTER TABLE user_permissions ADD COLUMN role VARCHAR(50) NULL AFTER employee_id");
    }
  });

  db.query("SHOW COLUMNS FROM user_permissions LIKE 'access_level'", (err, rows) => {
    if (!err && rows && rows.length > 0) {
      db.query("ALTER TABLE user_permissions MODIFY COLUMN access_level VARCHAR(50) NULL");
    }
  });

  db.query("SHOW COLUMNS FROM user_permissions LIKE 'module_access'", (err, rows) => {
    if (!err && rows && rows.length > 0) {
      db.query("ALTER TABLE user_permissions MODIFY COLUMN module_access VARCHAR(255) NULL");
    }
  });
};

ensurePermissionsTable();

router.get("/users", (req, res) => {
  db.query("SELECT id, full_name FROM employees ORDER BY full_name ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/", (req, res) => {
  const sql = `
    SELECT
      up.id,
      COALESCE(up.employee_id, up.user_id) AS employee_id,
      COALESCE(e.full_name, 'Unknown User') AS user_name,
      COALESCE(up.role, CONCAT('Role-', up.role_id)) AS role,
      up.access_level,
      up.module_access
    FROM user_permissions up
    LEFT JOIN employees e ON e.id = COALESCE(up.employee_id, up.user_id)
    ORDER BY up.id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { employee_id, role, access_level, module_access } = req.body;
  if (!employee_id || !role || !access_level || !module_access) {
    return res.status(400).json({ error: "User, role, access level aur module access required hain." });
  }

  const sql = `
    INSERT INTO user_permissions (employee_id, user_id, role, access_level, module_access)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [employee_id, employee_id, role, access_level, module_access], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Permission save ho gayi!", id: result.insertId });
  });
});

router.put("/:id", (req, res) => {
  const { employee_id, role, access_level, module_access } = req.body;
  if (!employee_id || !role || !access_level || !module_access) {
    return res.status(400).json({ error: "User, role, access level aur module access required hain." });
  }

  const sql = `
    UPDATE user_permissions
    SET employee_id = ?, user_id = ?, role = ?, access_level = ?, module_access = ?
    WHERE id = ?
  `;

  db.query(sql, [employee_id, employee_id, role, access_level, module_access, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Permission update ho gayi!" });
  });
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM user_permissions WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

module.exports = router;
