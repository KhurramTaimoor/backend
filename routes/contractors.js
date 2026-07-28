const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });

const optionalText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeContractorStatus = (value) =>
  value === "Inactive" ? "Inactive" : "Active";

const normalizeContractStatus = (value) => {
  const allowed = ["Planned", "Active", "Completed", "Cancelled"];
  return allowed.includes(value) ? value : "Planned";
};

const normalizePaymentBasis = (value) => {
  const allowed = ["Per Day", "Per Hour", "Monthly", "Fixed Contract"];
  return allowed.includes(value) ? value : null;
};

const normalizeDurationUnit = (paymentBasis, requestedUnit) => {
  if (paymentBasis === "Per Day") return "Days";
  if (paymentBasis === "Per Hour") return "Hours";
  if (paymentBasis === "Monthly") return "Months";
  return ["Days", "Hours", "Months"].includes(requestedUnit)
    ? requestedUnit
    : "Days";
};

const calculateTotal = (paymentBasis, rateAmount, durationValue) =>
  paymentBasis === "Fixed Contract"
    ? rateAmount
    : rateAmount * durationValue;

const contractorSelect = `
  SELECT
    c.id,
    c.contractor_name,
    c.cnic,
    c.phone,
    c.address,
    c.status,
    c.created_at,
    c.updated_at,
    COALESCE(s.contracts_count, 0) AS contracts_count,
    COALESCE(s.active_contracts, 0) AS active_contracts,
    COALESCE(s.total_contract_value, 0) AS total_contract_value
  FROM contractors c
  LEFT JOIN (
    SELECT
      contractor_id,
      COUNT(*) AS contracts_count,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_contracts,
      SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END)
        AS total_contract_value
    FROM contractor_contracts
    GROUP BY contractor_id
  ) s ON s.contractor_id = c.id
`;

const contractSelect = `
  SELECT
    cc.id,
    cc.contractor_id,
    cc.department_id,
    cc.work_title,
    cc.work_description,
    cc.payment_basis,
    cc.rate_amount,
    cc.duration_value,
    cc.duration_unit,
    cc.total_amount,
    cc.start_date,
    cc.end_date,
    cc.status,
    cc.notes,
    cc.created_at,
    cc.updated_at,
    c.contractor_name,
    d.department_name
  FROM contractor_contracts cc
  INNER JOIN contractors c ON c.id = cc.contractor_id
  LEFT JOIN departments d ON d.id = cc.department_id
`;

const sendError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, {
    code: error.code,
    message: error.message,
    sqlMessage: error.sqlMessage,
    sql: error.sql,
  });

  return res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.message ? error.message : fallbackMessage,
    error: error.sqlMessage || error.message || fallbackMessage,
    code: error.publicCode || error.code || null,
  });
};

const getContractorById = async (id) => {
  const rows = await query(
    `${contractorSelect} WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const getContractById = async (id) => {
  const rows = await query(
    `${contractSelect} WHERE cc.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const checkContractorDuplicates = async ({ cnic, phone, excludeId }) => {
  if (cnic) {
    const rows = await query(
      `SELECT id FROM contractors
       WHERE cnic = ? ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1`,
      excludeId ? [cnic, excludeId] : [cnic]
    );

    if (rows.length) {
      const error = new Error("A contractor with this CNIC already exists.");
      error.status = 409;
      error.publicCode = "DUPLICATE_CNIC";
      throw error;
    }
  }

  const rows = await query(
    `SELECT id FROM contractors
     WHERE phone = ? ${excludeId ? "AND id <> ?" : ""}
     LIMIT 1`,
    excludeId ? [phone, excludeId] : [phone]
  );

  if (rows.length) {
    const error = new Error("A contractor with this phone number already exists.");
    error.status = 409;
    error.publicCode = "DUPLICATE_PHONE";
    throw error;
  }
};

const validateReferences = async (contractorId, departmentId) => {
  const [contractorRows, departmentRows] = await Promise.all([
    query("SELECT id FROM contractors WHERE id = ? LIMIT 1", [contractorId]),
    query("SELECT id FROM departments WHERE id = ? LIMIT 1", [departmentId]),
  ]);

  if (!contractorRows.length) {
    const error = new Error("Selected contractor does not exist.");
    error.status = 400;
    throw error;
  }

  if (!departmentRows.length) {
    const error = new Error("Selected department does not exist.");
    error.status = 400;
    throw error;
  }
};

router.get("/version", (req, res) => {
  res.json({ success: true, version: "contractor-module-v1" });
});

router.get("/", async (req, res) => {
  try {
    const [contractors, departments, contracts] = await Promise.all([
      query(`${contractorSelect} ORDER BY c.id DESC`),
      query(
        `SELECT id, department_name
         FROM departments
         ORDER BY department_name ASC`
      ),
      query(`${contractSelect} ORDER BY cc.id DESC`),
    ]);

    res.json({ success: true, contractors, departments, contracts });
  } catch (error) {
    sendError(res, error, "Contractor data could not be loaded.");
  }
});

router.post("/departments", async (req, res) => {
  try {
    const departmentName = String(req.body.department_name || "").trim();

    if (!departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const duplicate = await query(
      `SELECT id FROM departments
       WHERE CONVERT(department_name USING utf8mb4)
             COLLATE utf8mb4_unicode_ci =
             CONVERT(? USING utf8mb4)
             COLLATE utf8mb4_unicode_ci
       LIMIT 1`,
      [departmentName]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message: "This department already exists.",
        code: "ER_DUP_ENTRY",
      });
    }

    const result = await query(
      "INSERT INTO departments (department_name) VALUES (?)",
      [departmentName]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      department_name: departmentName,
      message: "Department added successfully.",
    });
  } catch (error) {
    sendError(res, error, "Department could not be created.");
  }
});

router.post("/contracts", async (req, res) => {
  try {
    const contractorId = Number(req.body.contractor_id);
    const departmentId = Number(req.body.department_id);
    const workTitle = String(req.body.work_title || "").trim();
    const paymentBasis = normalizePaymentBasis(req.body.payment_basis);
    const rateAmount = toNumber(req.body.rate_amount);
    const durationValue = toNumber(req.body.duration_value);

    if (!contractorId || !departmentId || !workTitle || !paymentBasis) {
      return res.status(400).json({
        success: false,
        message:
          "Contractor, department, work title and payment basis are required.",
      });
    }

    if (rateAmount <= 0 || durationValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rate and duration must be greater than zero.",
      });
    }

    await validateReferences(contractorId, departmentId);

    const durationUnit = normalizeDurationUnit(
      paymentBasis,
      req.body.duration_unit
    );
    const totalAmount = calculateTotal(
      paymentBasis,
      rateAmount,
      durationValue
    );

    const result = await query(
      `INSERT INTO contractor_contracts (
        contractor_id,
        department_id,
        work_title,
        work_description,
        payment_basis,
        rate_amount,
        duration_value,
        duration_unit,
        total_amount,
        start_date,
        end_date,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractorId,
        departmentId,
        workTitle,
        optionalText(req.body.work_description),
        paymentBasis,
        rateAmount,
        durationValue,
        durationUnit,
        totalAmount,
        req.body.start_date || null,
        req.body.end_date || null,
        normalizeContractStatus(req.body.status),
        optionalText(req.body.notes),
      ]
    );

    const created = await getContractById(result.insertId);

    res.status(201).json({
      success: true,
      contract: created,
      message: "Contract saved successfully.",
    });
  } catch (error) {
    sendError(res, error, "Contract could not be created.");
  }
});

router.put("/contracts/:contractId", async (req, res) => {
  try {
    const existing = await getContractById(req.params.contractId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Contract not found.",
      });
    }

    const contractorId = Number(req.body.contractor_id);
    const departmentId = Number(req.body.department_id);
    const workTitle = String(req.body.work_title || "").trim();
    const paymentBasis = normalizePaymentBasis(req.body.payment_basis);
    const rateAmount = toNumber(req.body.rate_amount);
    const durationValue = toNumber(req.body.duration_value);

    if (!contractorId || !departmentId || !workTitle || !paymentBasis) {
      return res.status(400).json({
        success: false,
        message:
          "Contractor, department, work title and payment basis are required.",
      });
    }

    if (rateAmount <= 0 || durationValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rate and duration must be greater than zero.",
      });
    }

    await validateReferences(contractorId, departmentId);

    const durationUnit = normalizeDurationUnit(
      paymentBasis,
      req.body.duration_unit
    );
    const totalAmount = calculateTotal(
      paymentBasis,
      rateAmount,
      durationValue
    );

    await query(
      `UPDATE contractor_contracts SET
        contractor_id = ?,
        department_id = ?,
        work_title = ?,
        work_description = ?,
        payment_basis = ?,
        rate_amount = ?,
        duration_value = ?,
        duration_unit = ?,
        total_amount = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        notes = ?
       WHERE id = ?`,
      [
        contractorId,
        departmentId,
        workTitle,
        optionalText(req.body.work_description),
        paymentBasis,
        rateAmount,
        durationValue,
        durationUnit,
        totalAmount,
        req.body.start_date || null,
        req.body.end_date || null,
        normalizeContractStatus(req.body.status),
        optionalText(req.body.notes),
        req.params.contractId,
      ]
    );

    const updated = await getContractById(req.params.contractId);

    res.json({
      success: true,
      contract: updated,
      message: "Contract updated successfully.",
    });
  } catch (error) {
    sendError(res, error, "Contract could not be updated.");
  }
});

router.delete("/contracts/:contractId", async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM contractor_contracts WHERE id = ?",
      [req.params.contractId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Contract not found.",
      });
    }

    res.json({ success: true, message: "Contract deleted successfully." });
  } catch (error) {
    sendError(res, error, "Contract could not be deleted.");
  }
});

router.post("/", async (req, res) => {
  try {
    const contractorName = String(req.body.contractor_name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const cnic = optionalText(req.body.cnic);

    if (!contractorName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Contractor name and phone number are required.",
      });
    }

    await checkContractorDuplicates({ cnic, phone });

    const result = await query(
      `INSERT INTO contractors (
        contractor_name,
        cnic,
        phone,
        address,
        status
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        contractorName,
        cnic,
        phone,
        optionalText(req.body.address),
        normalizeContractorStatus(req.body.status),
      ]
    );

    const created = await getContractorById(result.insertId);

    res.status(201).json({
      success: true,
      contractor: created,
      message: "Contractor saved successfully.",
    });
  } catch (error) {
    sendError(res, error, "Contractor could not be created.");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const contractor = await getContractorById(req.params.id);

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found.",
      });
    }

    const contracts = await query(
      `${contractSelect}
       WHERE cc.contractor_id = ?
       ORDER BY cc.id DESC`,
      [req.params.id]
    );

    res.json({ success: true, contractor, contracts });
  } catch (error) {
    sendError(res, error, "Contractor detail could not be loaded.");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await getContractorById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found.",
      });
    }

    const contractorName = String(req.body.contractor_name || "").trim();
    const phone = String(req.body.phone || "").trim();
    const cnic = optionalText(req.body.cnic);

    if (!contractorName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Contractor name and phone number are required.",
      });
    }

    await checkContractorDuplicates({
      cnic,
      phone,
      excludeId: req.params.id,
    });

    await query(
      `UPDATE contractors SET
        contractor_name = ?,
        cnic = ?,
        phone = ?,
        address = ?,
        status = ?
       WHERE id = ?`,
      [
        contractorName,
        cnic,
        phone,
        optionalText(req.body.address),
        normalizeContractorStatus(req.body.status),
        req.params.id,
      ]
    );

    const updated = await getContractorById(req.params.id);

    res.json({
      success: true,
      contractor: updated,
      message: "Contractor updated successfully.",
    });
  } catch (error) {
    sendError(res, error, "Contractor could not be updated.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const rows = await query(
      "SELECT COUNT(*) AS total FROM contractor_contracts WHERE contractor_id = ?",
      [req.params.id]
    );

    if (Number(rows[0]?.total || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: "Delete the contractor contracts first.",
      });
    }

    const result = await query(
      "DELETE FROM contractors WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found.",
      });
    }

    res.json({ success: true, message: "Contractor deleted successfully." });
  } catch (error) {
    sendError(res, error, "Contractor could not be deleted.");
  }
});

module.exports = router;
