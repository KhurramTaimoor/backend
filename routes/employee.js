const express = require("express");
const router = express.Router();
const db = require("../db");

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const baseSelect = `
  SELECT
    e.*,
    d.department_name
  FROM employees e
  LEFT JOIN departments d
    ON d.id = e.department_id
`;

router.get("/", (req, res) => {
  db.query(
    `${baseSelect}
     ORDER BY e.id DESC`,
    (error, rows) => {
      if (error) {
        console.error("GET employees error:", error);

        return res.status(500).json({
          success: false,
          message: "Employees could not be loaded.",
          error: error.sqlMessage || error.message,
          code: error.code || null,
        });
      }

      return res.json(rows);
    }
  );
});

router.get("/:id", (req, res) => {
  db.query(
    `${baseSelect}
     WHERE e.id = ?
     LIMIT 1`,
    [req.params.id],
    (error, rows) => {
      if (error) {
        console.error(
          "GET employee detail error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Employee detail could not be loaded.",
          error: error.sqlMessage || error.message,
          code: error.code || null,
        });
      }

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      return res.json(rows[0]);
    }
  );
});

router.post("/", (req, res) => {
  const {
    full_name,
    father_name,
    cnic,
    phone,
    designation,
    department_id,
    joining_date,
    basic_salary,
  } = req.body;

  if (
    !String(full_name || "").trim() ||
    !String(designation || "").trim() ||
    !department_id
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Full name, designation and department are required.",
    });
  }

  db.query(
    `INSERT INTO employees (
      full_name,
      father_name,
      cnic,
      phone,
      designation,
      department_id,
      joining_date,
      basic_salary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(full_name).trim(),
      cleanText(father_name),
      cleanText(cnic),
      cleanText(phone),
      String(designation).trim(),
      Number(department_id),
      joining_date || null,
      toNumber(basic_salary),
    ],
    (error, result) => {
      if (error) {
        console.error("POST employee error:", error);

        return res.status(500).json({
          success: false,
          message: "Employee could not be created.",
          error: error.sqlMessage || error.message,
          code: error.code || null,
        });
      }

      return res.status(201).json({
        success: true,
        id: result.insertId,
        message: "Employee saved successfully.",
      });
    }
  );
});

router.put("/:id", (req, res) => {
  const {
    full_name,
    father_name,
    cnic,
    phone,
    designation,
    department_id,
    joining_date,
    basic_salary,
  } = req.body;

  if (
    !String(full_name || "").trim() ||
    !String(designation || "").trim() ||
    !department_id
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Full name, designation and department are required.",
    });
  }

  db.query(
    `UPDATE employees
     SET
      full_name = ?,
      father_name = ?,
      cnic = ?,
      phone = ?,
      designation = ?,
      department_id = ?,
      joining_date = ?,
      basic_salary = ?
     WHERE id = ?`,
    [
      String(full_name).trim(),
      cleanText(father_name),
      cleanText(cnic),
      cleanText(phone),
      String(designation).trim(),
      Number(department_id),
      joining_date || null,
      toNumber(basic_salary),
      req.params.id,
    ],
    (error, result) => {
      if (error) {
        console.error("PUT employee error:", error);

        return res.status(500).json({
          success: false,
          message: "Employee could not be updated.",
          error: error.sqlMessage || error.message,
          code: error.code || null,
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      return res.json({
        success: true,
        message: "Employee updated successfully.",
      });
    }
  );
});

router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM employees WHERE id = ?",
    [req.params.id],
    (error, result) => {
      if (error) {
        console.error(
          "DELETE employee error:",
          error
        );

        if (
          error.code ===
          "ER_ROW_IS_REFERENCED_2"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Employee is used in salary, ledger or other records and cannot be deleted.",
            error: error.sqlMessage || error.message,
            code: error.code,
          });
        }

        return res.status(500).json({
          success: false,
          message: "Employee could not be deleted.",
          error: error.sqlMessage || error.message,
          code: error.code || null,
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      return res.json({
        success: true,
        message: "Employee deleted successfully.",
      });
    }
  );
});

module.exports = router;
