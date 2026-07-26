const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const optionalText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const normalizeType = (value) => {
  const type = String(value || "").trim();

  if (type === "Salaried" || type === "Contractor") {
    return type;
  }

  return null;
};

const employeeSelect = `
  SELECT
    e.id,
    e.full_name,
    e.cnic,
    e.phone,
    e.employee_type,
    e.department_id,
    e.designation_id,
    e.joining_date,
    e.created_at,
    e.updated_at,
    d.department_name,
    ds.designation_name,
    COALESCE(ds.designation_name, e.designation) AS designation
  FROM employees e
  LEFT JOIN departments d
    ON d.id = e.department_id
  LEFT JOIN designations ds
    ON ds.id = e.designation_id
`;

const sendError = (
  res,
  error,
  fallbackMessage
) => {
  console.error(fallbackMessage, {
    code: error.code,
    message: error.message,
    sqlMessage: error.sqlMessage,
    sql: error.sql,
  });

  return res
    .status(error.status || 500)
    .json({
      success: false,
      message:
        error.status && error.message
          ? error.message
          : fallbackMessage,
      error:
        error.sqlMessage ||
        error.message ||
        fallbackMessage,
      code:
        error.publicCode ||
        error.code ||
        null,
    });
};

const validateMasterIds = async (
  departmentId,
  designationId
) => {
  const [departmentRows, designationRows] =
    await Promise.all([
      query(
        `SELECT id
         FROM departments
         WHERE id = ?
         LIMIT 1`,
        [departmentId]
      ),
      query(
        `SELECT id, designation_name
         FROM designations
         WHERE id = ?
           AND status = 'Active'
         LIMIT 1`,
        [designationId]
      ),
    ]);

  if (!departmentRows.length) {
    const error = new Error(
      "Selected department does not exist."
    );
    error.status = 400;
    throw error;
  }

  if (!designationRows.length) {
    const error = new Error(
      "Selected designation does not exist."
    );
    error.status = 400;
    throw error;
  }

  return {
    designationName:
      designationRows[0].designation_name,
  };
};

const checkDuplicates = async ({
  cnic,
  phone,
  excludeId = null,
}) => {
  if (cnic) {
    const rows = await query(
      `SELECT id
       FROM employees
       WHERE cnic = ?
         ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1`,
      excludeId ? [cnic, excludeId] : [cnic]
    );

    if (rows.length) {
      const error = new Error(
        "An employee with this CNIC already exists."
      );
      error.status = 409;
      error.publicCode = "DUPLICATE_CNIC";
      throw error;
    }
  }

  const phoneRows = await query(
    `SELECT id
     FROM employees
     WHERE phone = ?
       ${excludeId ? "AND id <> ?" : ""}
     LIMIT 1`,
    excludeId ? [phone, excludeId] : [phone]
  );

  if (phoneRows.length) {
    const error = new Error(
      "An employee with this phone number already exists."
    );
    error.status = 409;
    error.publicCode = "DUPLICATE_PHONE";
    throw error;
  }
};

const getEmployeeById = async (id) => {
  const rows = await query(
    `${employeeSelect}
     WHERE e.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

/*
  One GET request returns all data required by the page.
*/
router.get("/", async (req, res) => {
  try {
    const [
      employees,
      departments,
      designations,
    ] = await Promise.all([
      query(
        `${employeeSelect}
         ORDER BY e.id DESC`
      ),
      query(
        `SELECT
          id,
          department_name
         FROM departments
         ORDER BY department_name ASC`
      ),
      query(
        `SELECT
          id,
          designation_name
         FROM designations
         WHERE status = 'Active'
         ORDER BY designation_name ASC`
      ),
    ]);

    return res.json({
      success: true,
      employees,
      departments,
      designations,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Employee data could not be loaded."
    );
  }
});

/*
  Department is added through the same /api/employees API.
*/
router.post("/departments", async (req, res) => {
  try {
    const departmentName = String(
      req.body.department_name || ""
    ).trim();

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const duplicate = await query(
      `SELECT id
       FROM departments
       WHERE LOWER(department_name) =
             LOWER(?)
       LIMIT 1`,
      [departmentName]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message:
          "This department already exists.",
        code: "ER_DUP_ENTRY",
      });
    }

    const result = await query(
      `INSERT INTO departments (
        department_name
      ) VALUES (?)`,
      [departmentName]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      department_name: departmentName,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Department could not be created."
    );
  }
});

/*
  Designation is added through the same /api/employees API.
*/
router.post("/designations", async (req, res) => {
  try {
    const designationName = String(
      req.body.designation_name || ""
    ).trim();

    if (!designationName) {
      return res.status(400).json({
        success: false,
        message:
          "Designation name is required.",
      });
    }

    const duplicate = await query(
      `SELECT id
       FROM designations
       WHERE LOWER(designation_name) =
             LOWER(?)
       LIMIT 1`,
      [designationName]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message:
          "This designation already exists.",
        code: "ER_DUP_ENTRY",
      });
    }

    const result = await query(
      `INSERT INTO designations (
        designation_name,
        status
      ) VALUES (?, 'Active')`,
      [designationName]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      designation_name: designationName,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Designation could not be created."
    );
  }
});

router.get("/:id", async (req, res) => {
  try {
    const employee = await getEmployeeById(
      req.params.id
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.json({
      success: true,
      employee,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Employee detail could not be loaded."
    );
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      full_name,
      cnic,
      phone,
      employee_type,
      department_id,
      designation_id,
      joining_date,
    } = req.body;

    const cleanName = String(
      full_name || ""
    ).trim();
    const cleanPhone = String(
      phone || ""
    ).trim();
    const cleanCnic = optionalText(cnic);
    const cleanType =
      normalizeType(employee_type);

    if (
      !cleanName ||
      !cleanPhone ||
      !cleanType ||
      !department_id ||
      !designation_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee name, phone, type, department and designation are required.",
      });
    }

    const { designationName } =
      await validateMasterIds(
        department_id,
        designation_id
      );

    await checkDuplicates({
      cnic: cleanCnic,
      phone: cleanPhone,
    });

    /*
      father_name and basic_salary are legacy columns.
      They are not used by this module, but safe defaults
      are inserted so the old database schema does not fail.
    */
    const result = await query(
      `INSERT INTO employees (
        full_name,
        father_name,
        cnic,
        phone,
        employee_type,
        department_id,
        designation_id,
        designation,
        joining_date,
        basic_salary
      ) VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        cleanName,
        cleanCnic,
        cleanPhone,
        cleanType,
        Number(department_id),
        Number(designation_id),
        designationName,
        joining_date || null,
      ]
    );

    const created = await getEmployeeById(
      result.insertId
    );

    return res.status(201).json({
      success: true,
      employee: created,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Employee could not be created."
    );
  }
});

router.put("/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;

    const existing = await getEmployeeById(
      employeeId
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const {
      full_name,
      cnic,
      phone,
      employee_type,
      department_id,
      designation_id,
      joining_date,
    } = req.body;

    const cleanName = String(
      full_name || ""
    ).trim();
    const cleanPhone = String(
      phone || ""
    ).trim();
    const cleanCnic = optionalText(cnic);
    const cleanType =
      normalizeType(employee_type);

    if (
      !cleanName ||
      !cleanPhone ||
      !cleanType ||
      !department_id ||
      !designation_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee name, phone, type, department and designation are required.",
      });
    }

    const { designationName } =
      await validateMasterIds(
        department_id,
        designation_id
      );

    await checkDuplicates({
      cnic: cleanCnic,
      phone: cleanPhone,
      excludeId: employeeId,
    });

    await query(
      `UPDATE employees
       SET
        full_name = ?,
        cnic = ?,
        phone = ?,
        employee_type = ?,
        department_id = ?,
        designation_id = ?,
        designation = ?,
        joining_date = ?
       WHERE id = ?`,
      [
        cleanName,
        cleanCnic,
        cleanPhone,
        cleanType,
        Number(department_id),
        Number(designation_id),
        designationName,
        joining_date || null,
        employeeId,
      ]
    );

    const updated = await getEmployeeById(
      employeeId
    );

    return res.json({
      success: true,
      employee: updated,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Employee could not be updated."
    );
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM employees
       WHERE id = ?`,
      [req.params.id]
    );

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
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      error.status = 409;
      error.message =
        "Employee is used in salary, ledger or another transaction and cannot be deleted.";
    }

    return sendError(
      res,
      error,
      "Employee could not be deleted."
    );
  }
});

module.exports = router;
