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

const getConnection = () =>
  new Promise((resolve, reject) => {
    if (typeof db.getConnection === "function") {
      db.getConnection((error, connection) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(connection);
      });

      return;
    }

    resolve(db);
  });

const connectionQuery = (
  connection,
  sql,
  params = []
) =>
  new Promise((resolve, reject) => {
    connection.query(
      sql,
      params,
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );
  });

const beginTransaction = (connection) =>
  new Promise((resolve, reject) => {
    connection.beginTransaction((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const commitTransaction = (connection) =>
  new Promise((resolve, reject) => {
    connection.commit((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const rollbackTransaction = (connection) =>
  new Promise((resolve) => {
    connection.rollback(() => resolve());
  });

const releaseConnection = (connection) => {
  if (
    connection &&
    typeof connection.release === "function"
  ) {
    connection.release();
  }
};

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
  const allowed = [
    "Planned",
    "Active",
    "Completed",
    "Cancelled",
  ];

  return allowed.includes(value)
    ? value
    : "Planned";
};

const normalizePaymentBasis = (value) => {
  const allowed = [
    "Per Day",
    "Per Hour",
    "Monthly",
    "Fixed Contract",
  ];

  return allowed.includes(value) ? value : null;
};

const normalizeDurationUnit = (
  paymentBasis,
  requestedUnit
) => {
  if (paymentBasis === "Per Day") return "Days";
  if (paymentBasis === "Per Hour") return "Hours";
  if (paymentBasis === "Monthly") return "Months";

  return ["Days", "Hours", "Months"].includes(
    requestedUnit
  )
    ? requestedUnit
    : "Days";
};

/*
  Fixed Contract:
    Total Value = Contract Rate

  Per Day / Per Hour / Monthly:
    Total Value = Contract Rate × Duration
*/
const calculateTotalValue = (
  paymentBasis,
  contractRate,
  durationValue
) =>
  paymentBasis === "Fixed Contract"
    ? contractRate
    : contractRate * durationValue;

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

    COALESCE(stats.contracts_count, 0)
      AS contracts_count,

    COALESCE(stats.active_contracts, 0)
      AS active_contracts,

    COALESCE(
      (
        SELECT cc_latest.contract_rate
        FROM contractor_contracts cc_latest
        WHERE cc_latest.contractor_id = c.id
          AND cc_latest.status <> 'Cancelled'
        ORDER BY
          CASE
            WHEN cc_latest.status = 'Active' THEN 0
            WHEN cc_latest.status = 'Planned' THEN 1
            WHEN cc_latest.status = 'Completed' THEN 2
            ELSE 3
          END,
          cc_latest.id DESC
        LIMIT 1
      ),
      0
    ) AS latest_contract_rate,

    COALESCE(stats.total_value, 0)
      AS total_value

  FROM contractors c

  LEFT JOIN (
    SELECT
      contractor_id,
      COUNT(*) AS contracts_count,

      SUM(
        CASE
          WHEN status = 'Active' THEN 1
          ELSE 0
        END
      ) AS active_contracts,

      SUM(
        CASE
          WHEN status <> 'Cancelled'
            THEN total_value
          ELSE 0
        END
      ) AS total_value

    FROM contractor_contracts
    GROUP BY contractor_id
  ) stats
    ON stats.contractor_id = c.id
`;

const contractSelect = `
  SELECT
    cc.id,
    cc.contractor_id,
    cc.department_id,
    cc.work_title,
    cc.work_description,
    cc.payment_basis,
    cc.contract_rate,
    cc.duration_value,
    cc.duration_unit,
    cc.total_value,
    cc.start_date,
    cc.end_date,
    cc.status,
    cc.notes,
    cc.created_at,
    cc.updated_at,
    c.contractor_name,
    d.department_name

  FROM contractor_contracts cc

  INNER JOIN contractors c
    ON c.id = cc.contractor_id

  LEFT JOIN departments d
    ON d.id = cc.department_id
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

const getContractorById = async (id) => {
  const rows = await query(
    `${contractorSelect}
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

const getContractById = async (id) => {
  const rows = await query(
    `${contractSelect}
     WHERE cc.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

const checkContractorDuplicates = async ({
  cnic,
  phone,
  excludeId = null,
}) => {
  if (cnic) {
    const cnicRows = await query(
      `SELECT id
       FROM contractors
       WHERE cnic = ?
         ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1`,
      excludeId ? [cnic, excludeId] : [cnic]
    );

    if (cnicRows.length) {
      const error = new Error(
        "A contractor with this CNIC already exists."
      );
      error.status = 409;
      error.publicCode = "DUPLICATE_CNIC";
      throw error;
    }
  }

  const phoneRows = await query(
    `SELECT id
     FROM contractors
     WHERE phone = ?
       ${excludeId ? "AND id <> ?" : ""}
     LIMIT 1`,
    excludeId ? [phone, excludeId] : [phone]
  );

  if (phoneRows.length) {
    const error = new Error(
      "A contractor with this phone number already exists."
    );
    error.status = 409;
    error.publicCode = "DUPLICATE_PHONE";
    throw error;
  }
};

const validateReferences = async (
  contractorId,
  departmentId
) => {
  const [contractorRows, departmentRows] =
    await Promise.all([
      query(
        `SELECT id
         FROM contractors
         WHERE id = ?
         LIMIT 1`,
        [contractorId]
      ),
      query(
        `SELECT id
         FROM departments
         WHERE id = ?
         LIMIT 1`,
        [departmentId]
      ),
    ]);

  if (!contractorRows.length) {
    const error = new Error(
      "Selected contractor does not exist."
    );
    error.status = 400;
    throw error;
  }

  if (!departmentRows.length) {
    const error = new Error(
      "Selected department does not exist."
    );
    error.status = 400;
    throw error;
  }
};

const buildContractValues = (body) => {
  const contractorId = Number(body.contractor_id);
  const departmentId = Number(body.department_id);
  const workTitle = String(
    body.work_title || ""
  ).trim();

  const paymentBasis =
    normalizePaymentBasis(body.payment_basis);

  /*
    New canonical name: contract_rate
    Old rate_amount is accepted only for backward compatibility.
  */
  const contractRate = toNumber(
    body.contract_rate ?? body.rate_amount
  );

  const durationValue = toNumber(
    body.duration_value
  );

  if (
    !contractorId ||
    !departmentId ||
    !workTitle ||
    !paymentBasis
  ) {
    const error = new Error(
      "Contractor, department, work title and payment basis are required."
    );
    error.status = 400;
    throw error;
  }

  if (contractRate <= 0 || durationValue <= 0) {
    const error = new Error(
      "Contract rate and duration must be greater than zero."
    );
    error.status = 400;
    throw error;
  }

  const durationUnit = normalizeDurationUnit(
    paymentBasis,
    body.duration_unit
  );

  const totalValue = calculateTotalValue(
    paymentBasis,
    contractRate,
    durationValue
  );

  return {
    contractorId,
    departmentId,
    workTitle,
    paymentBasis,
    contractRate,
    durationValue,
    durationUnit,
    totalValue,
  };
};

/*
  GET /api/contractors/version
*/
router.get("/version", (req, res) => {
  return res.json({
    success: true,
    version: "contractor-add-modal-v3",
  });
});

/*
  GET /api/contractors

  One request returns:
  contractors + departments + contracts
*/
router.get("/", async (req, res) => {
  try {
    const [
      contractors,
      departments,
      contracts,
    ] = await Promise.all([
      query(
        `${contractorSelect}
         ORDER BY c.id DESC`
      ),
      query(
        `SELECT
          id,
          department_name
         FROM departments
         ORDER BY department_name ASC`
      ),
      query(
        `${contractSelect}
         ORDER BY cc.id DESC`
      ),
    ]);

    return res.json({
      success: true,
      contractors,
      departments,
      contracts,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Contractor data could not be loaded."
    );
  }
});

/*
  POST /api/contractors/departments
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
       WHERE CONVERT(department_name USING utf8mb4)
             COLLATE utf8mb4_unicode_ci
             =
             CONVERT(? USING utf8mb4)
             COLLATE utf8mb4_unicode_ci
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
      message:
        "Department added successfully.",
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
  POST /api/contractors/contracts
*/
router.post("/contracts", async (req, res) => {
  try {
    const values = buildContractValues(req.body);

    await validateReferences(
      values.contractorId,
      values.departmentId
    );

    const result = await query(
      `INSERT INTO contractor_contracts (
        contractor_id,
        department_id,
        work_title,
        work_description,
        payment_basis,
        contract_rate,
        duration_value,
        duration_unit,
        total_value,
        start_date,
        end_date,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.contractorId,
        values.departmentId,
        values.workTitle,
        optionalText(req.body.work_description),
        values.paymentBasis,
        values.contractRate,
        values.durationValue,
        values.durationUnit,
        values.totalValue,
        req.body.start_date || null,
        req.body.end_date || null,
        normalizeContractStatus(req.body.status),
        optionalText(req.body.notes),
      ]
    );

    const created = await getContractById(
      result.insertId
    );

    return res.status(201).json({
      success: true,
      contract: created,
      message: "Contract saved successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Contract could not be created."
    );
  }
});

/*
  PUT /api/contractors/contracts/:contractId
*/
router.put(
  "/contracts/:contractId",
  async (req, res) => {
    try {
      const existing = await getContractById(
        req.params.contractId
      );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Contract not found.",
        });
      }

      const values = buildContractValues(
        req.body
      );

      await validateReferences(
        values.contractorId,
        values.departmentId
      );

      await query(
        `UPDATE contractor_contracts
         SET
          contractor_id = ?,
          department_id = ?,
          work_title = ?,
          work_description = ?,
          payment_basis = ?,
          contract_rate = ?,
          duration_value = ?,
          duration_unit = ?,
          total_value = ?,
          start_date = ?,
          end_date = ?,
          status = ?,
          notes = ?
         WHERE id = ?`,
        [
          values.contractorId,
          values.departmentId,
          values.workTitle,
          optionalText(
            req.body.work_description
          ),
          values.paymentBasis,
          values.contractRate,
          values.durationValue,
          values.durationUnit,
          values.totalValue,
          req.body.start_date || null,
          req.body.end_date || null,
          normalizeContractStatus(
            req.body.status
          ),
          optionalText(req.body.notes),
          req.params.contractId,
        ]
      );

      const updated = await getContractById(
        req.params.contractId
      );

      return res.json({
        success: true,
        contract: updated,
        message:
          "Contract updated successfully.",
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Contract could not be updated."
      );
    }
  }
);

/*
  DELETE /api/contractors/contracts/:contractId
*/
router.delete(
  "/contracts/:contractId",
  async (req, res) => {
    try {
      const result = await query(
        `DELETE FROM contractor_contracts
         WHERE id = ?`,
        [req.params.contractId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          success: false,
          message: "Contract not found.",
        });
      }

      return res.json({
        success: true,
        message:
          "Contract deleted successfully.",
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Contract could not be deleted."
      );
    }
  }
);

/*
  POST /api/contractors
*/
router.post("/", async (req, res) => {
  let connection;

  try {
    const contractorName = String(
      req.body.contractor_name || ""
    ).trim();

    const phone = String(
      req.body.phone || ""
    ).trim();

    const cnic = optionalText(req.body.cnic);

    if (!contractorName || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Contractor name and phone number are required.",
      });
    }

    await checkContractorDuplicates({
      cnic,
      phone,
    });

    /*
      initial_contract is optional for backward API compatibility.
      The updated frontend always sends it while adding a contractor.
    */
    const initialContract =
      req.body.initial_contract || null;

    let initialValues = null;

    if (initialContract) {
      initialValues = buildContractValues({
        ...initialContract,
        contractor_id: 1,
      });

      /*
        contractor_id is only a temporary positive value above so
        common validation can parse the contract. The real insert ID
        is applied after contractor creation.
      */

      const departmentRows = await query(
        `SELECT id
         FROM departments
         WHERE id = ?
         LIMIT 1`,
        [initialValues.departmentId]
      );

      if (!departmentRows.length) {
        return res.status(400).json({
          success: false,
          message:
            "Selected department does not exist.",
        });
      }
    }

    connection = await getConnection();
    await beginTransaction(connection);

    const contractorResult =
      await connectionQuery(
        connection,
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
          normalizeContractorStatus(
            req.body.status
          ),
        ]
      );

    let createdContract = null;

    if (initialContract && initialValues) {
      const contractorId =
        contractorResult.insertId;

      const totalValue = calculateTotalValue(
        initialValues.paymentBasis,
        initialValues.contractRate,
        initialValues.durationValue
      );

      const contractResult =
        await connectionQuery(
          connection,
          `INSERT INTO contractor_contracts (
            contractor_id,
            department_id,
            work_title,
            work_description,
            payment_basis,
            contract_rate,
            duration_value,
            duration_unit,
            total_value,
            start_date,
            end_date,
            status,
            notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contractorId,
            initialValues.departmentId,
            initialValues.workTitle,
            optionalText(
              initialContract.work_description
            ),
            initialValues.paymentBasis,
            initialValues.contractRate,
            initialValues.durationValue,
            initialValues.durationUnit,
            totalValue,
            initialContract.start_date || null,
            initialContract.end_date || null,
            normalizeContractStatus(
              initialContract.status
            ),
            optionalText(initialContract.notes),
          ]
        );

      createdContract = {
        id: contractResult.insertId,
        contractor_id: contractorId,
        department_id:
          initialValues.departmentId,
        work_title: initialValues.workTitle,
        payment_basis:
          initialValues.paymentBasis,
        contract_rate:
          initialValues.contractRate,
        duration_value:
          initialValues.durationValue,
        duration_unit:
          initialValues.durationUnit,
        total_value: totalValue,
      };
    }

    await commitTransaction(connection);

    const created = await getContractorById(
      contractorResult.insertId
    );

    return res.status(201).json({
      success: true,
      contractor: created,
      initial_contract: createdContract,
      message:
        initialContract
          ? "Contractor and initial contract saved successfully."
          : "Contractor saved successfully.",
    });
  } catch (error) {
    if (connection) {
      await rollbackTransaction(connection);
    }

    return sendError(
      res,
      error,
      "Contractor could not be created."
    );
  } finally {
    releaseConnection(connection);
  }
});

/*
  GET /api/contractors/:id
*/
router.get("/:id", async (req, res) => {
  try {
    const contractor = await getContractorById(
      req.params.id
    );

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

    return res.json({
      success: true,
      contractor,
      contracts,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Contractor detail could not be loaded."
    );
  }
});

/*
  PUT /api/contractors/:id
*/
router.put("/:id", async (req, res) => {
  try {
    const existing = await getContractorById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found.",
      });
    }

    const contractorName = String(
      req.body.contractor_name || ""
    ).trim();

    const phone = String(
      req.body.phone || ""
    ).trim();

    const cnic = optionalText(
      req.body.cnic
    );

    if (!contractorName || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Contractor name and phone number are required.",
      });
    }

    await checkContractorDuplicates({
      cnic,
      phone,
      excludeId: req.params.id,
    });

    await query(
      `UPDATE contractors
       SET
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
        normalizeContractorStatus(
          req.body.status
        ),
        req.params.id,
      ]
    );

    const updated = await getContractorById(
      req.params.id
    );

    return res.json({
      success: true,
      contractor: updated,
      message:
        "Contractor updated successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Contractor could not be updated."
    );
  }
});

/*
  DELETE /api/contractors/:id
*/
router.delete("/:id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM contractor_contracts
       WHERE contractor_id = ?`,
      [req.params.id]
    );

    if (Number(rows[0]?.total || 0) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Delete the contractor contracts first.",
      });
    }

    const result = await query(
      `DELETE FROM contractors
       WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found.",
      });
    }

    return res.json({
      success: true,
      message:
        "Contractor deleted successfully.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Contractor could not be deleted."
    );
  }
});

module.exports = router;
