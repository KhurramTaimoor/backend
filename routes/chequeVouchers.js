const express = require("express");
const router = express.Router();
const db = require("../db");

const runQuery = (executor, sql, params = []) =>
  new Promise((resolve, reject) => {
    executor.query(sql, params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });

const getConnection = () =>
  new Promise((resolve, reject) => {
    db.getConnection((error, connection) => {
      if (error) return reject(error);
      resolve(connection);
    });
  });

const cleanText = (value) => String(value ?? "").trim();
const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};
const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const toDate = (value) => {
  const match = cleanText(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const schemaReady = (async () => {
  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS cheque_vouchers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      voucher_no VARCHAR(80) NOT NULL UNIQUE,
      payee_name VARCHAR(180) NOT NULL,
      account_id INT NOT NULL,
      issuance_date DATE NOT NULL,
      clearance_date DATE NOT NULL,
      total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cheque_clearance (clearance_date),
      INDEX idx_cheque_account (account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await runQuery(
    db,
    `CREATE TABLE IF NOT EXISTS cheque_voucher_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cheque_voucher_id INT NOT NULL,
      payment_date DATE NOT NULL,
      details VARCHAR(500) NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cheque_payment_voucher (cheque_voucher_id),
      CONSTRAINT fk_cheque_payment_voucher
        FOREIGN KEY (cheque_voucher_id)
        REFERENCES cheque_vouchers(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
})().catch((error) => {
  // Do not crash the whole API when MySQL is temporarily unavailable.
  // Individual requests will still return a normal 500 until the DB is reachable.
  console.error("Cheque voucher schema initialization failed:", error.message);
  return false;
});

const voucherSelect = `
  SELECT
    cv.id,
    cv.voucher_no,
    cv.payee_name,
    cv.account_id,
    coa.account_code,
    coa.account_title,
    DATE_FORMAT(cv.issuance_date, '%Y-%m-%d') AS issuance_date,
    DATE_FORMAT(cv.clearance_date, '%Y-%m-%d') AS clearance_date,
    cv.total_amount,
    cv.notes,
    cv.created_at,
    cv.updated_at,
    COALESCE(SUM(cvp.amount), 0) AS paid_amount,
    GREATEST(cv.total_amount - COALESCE(SUM(cvp.amount), 0), 0) AS remaining_amount,
    CASE
      WHEN COALESCE(SUM(cvp.amount), 0) >= cv.total_amount THEN 'cleared'
      WHEN COALESCE(SUM(cvp.amount), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END AS status
  FROM cheque_vouchers cv
  LEFT JOIN chart_of_accounts coa ON coa.id = cv.account_id
  LEFT JOIN cheque_voucher_payments cvp ON cvp.cheque_voucher_id = cv.id
`;

const voucherGroupBy = `
  GROUP BY
    cv.id, cv.voucher_no, cv.payee_name, cv.account_id,
    coa.account_code, coa.account_title, cv.issuance_date,
    cv.clearance_date, cv.total_amount, cv.notes,
    cv.created_at, cv.updated_at
`;

const normalizeVoucher = (row) => ({
  ...row,
  id: Number(row.id),
  account_id: Number(row.account_id),
  total_amount: toAmount(row.total_amount),
  paid_amount: toAmount(row.paid_amount),
  remaining_amount: toAmount(row.remaining_amount),
});

async function loadVoucher(id, executor = db) {
  const rows = await runQuery(
    executor,
    `${voucherSelect} WHERE cv.id = ? ${voucherGroupBy}`,
    [id]
  );

  if (!rows.length) return null;

  const payments = await runQuery(
    executor,
    `SELECT
       id,
       cheque_voucher_id,
       DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
       details,
       amount,
       created_at
     FROM cheque_voucher_payments
     WHERE cheque_voucher_id = ?
     ORDER BY payment_date ASC, id ASC`,
    [id]
  );

  return {
    ...normalizeVoucher(rows[0]),
    payments: payments.map((payment) => ({
      ...payment,
      id: Number(payment.id),
      cheque_voucher_id: Number(payment.cheque_voucher_id),
      amount: toAmount(payment.amount),
    })),
  };
}

function normalizePayload(body = {}) {
  const issuanceDate = toDate(body.issuance_date);
  const clearanceDate = toDate(body.clearance_date);
  const totalAmount = toAmount(body.total_amount);
  const accountId = toId(body.account_id);
  const payeeName = cleanText(body.payee_name);

  if (!payeeName) throw httpError("Payee / party name zaroori hai.");
  if (!accountId) throw httpError("Ledger account select karein.");
  if (!issuanceDate) throw httpError("Valid issuance date zaroori hai.");
  if (!clearanceDate) throw httpError("Valid clearance date zaroori hai.");
  if (clearanceDate < issuanceDate) {
    throw httpError("Clearance date issuance date se pehle nahi ho sakti.");
  }
  if (totalAmount <= 0) throw httpError("Total amount zero se zyada hona chahiye.");

  const payments = (Array.isArray(body.payments) ? body.payments : [])
    .map((payment) => ({
      payment_date: toDate(payment.payment_date),
      details: cleanText(payment.details),
      amount: toAmount(payment.amount),
    }))
    .filter((payment) => payment.payment_date || payment.details || payment.amount);

  payments.forEach((payment, index) => {
    if (!payment.payment_date) {
      throw httpError(`Payment row ${index + 1}: valid date zaroori hai.`);
    }
    if (!payment.details) {
      throw httpError(`Payment row ${index + 1}: details zaroori hain.`);
    }
    if (payment.amount <= 0) {
      throw httpError(`Payment row ${index + 1}: amount zero se zyada hona chahiye.`);
    }
  });

  const paidAmount = toAmount(
    payments.reduce((sum, payment) => sum + payment.amount, 0)
  );
  if (paidAmount > totalAmount) {
    throw httpError("Paid amount cheque total se zyada nahi ho sakta.");
  }

  return {
    voucher_no: cleanText(body.voucher_no),
    payee_name: payeeName,
    account_id: accountId,
    issuance_date: issuanceDate,
    clearance_date: clearanceDate,
    total_amount: totalAmount,
    notes: cleanText(body.notes),
    payments,
  };
}

async function assertAccount(accountId, executor = db) {
  const rows = await runQuery(
    executor,
    "SELECT id FROM chart_of_accounts WHERE id = ? LIMIT 1",
    [accountId]
  );
  if (!rows.length) throw httpError("Selected ledger account nahi mila.", 404);
}

async function insertPayments(executor, voucherId, payments) {
  for (const payment of payments) {
    await runQuery(
      executor,
      `INSERT INTO cheque_voucher_payments
       (cheque_voucher_id, payment_date, details, amount)
       VALUES (?, ?, ?, ?)`,
      [voucherId, payment.payment_date, payment.details, payment.amount]
    );
  }
}

function sendError(res, error, label) {
  console.error(label, error);
  const duplicate = error?.code === "ER_DUP_ENTRY";
  return res.status(duplicate ? 409 : error.status || 500).json({
    success: false,
    message: duplicate
      ? "Yeh voucher number pehle se maujood hai."
      : error.message || "Cheque voucher request failed.",
  });
}

router.get("/dashboard", async (req, res) => {
  try {
    await schemaReady;
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 50);
    const rows = await runQuery(
      db,
      `${voucherSelect}
       ${voucherGroupBy}
       ORDER BY
         CASE
           WHEN COALESCE(SUM(cvp.amount), 0) < cv.total_amount
                AND cv.clearance_date >= CURDATE() THEN 0
           WHEN COALESCE(SUM(cvp.amount), 0) < cv.total_amount THEN 1
           ELSE 2
         END ASC,
         CASE
           WHEN cv.clearance_date >= CURDATE() THEN cv.clearance_date
           ELSE NULL
         END ASC,
         cv.clearance_date DESC,
         cv.id DESC
       LIMIT ${limit}`
    );

    const data = rows.map(normalizeVoucher);
    return res.json({ success: true, data, vouchers: data });
  } catch (error) {
    return sendError(res, error, "GET /api/cheque-vouchers/dashboard:");
  }
});

router.get("/", async (req, res) => {
  try {
    await schemaReady;
    const status = cleanText(req.query.status).toLowerCase();
    const search = cleanText(req.query.search);
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(
        "(cv.voucher_no LIKE ? OR cv.payee_name LIKE ? OR coa.account_title LIKE ?)"
      );
      const needle = `%${search}%`;
      params.push(needle, needle, needle);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    let having = "";
    if (status === "cleared") {
      having = "HAVING paid_amount >= cv.total_amount";
    } else if (["remaining", "pending"].includes(status)) {
      having = "HAVING paid_amount < cv.total_amount";
    } else if (status === "partial") {
      having = "HAVING paid_amount > 0 AND paid_amount < cv.total_amount";
    }

    const rows = await runQuery(
      db,
      `${voucherSelect} ${where} ${voucherGroupBy} ${having}
       ORDER BY
         CASE
           WHEN COALESCE(SUM(cvp.amount), 0) < cv.total_amount
                AND cv.clearance_date >= CURDATE() THEN 0
           WHEN COALESCE(SUM(cvp.amount), 0) < cv.total_amount THEN 1
           ELSE 2
         END ASC,
         CASE WHEN cv.clearance_date >= CURDATE() THEN cv.clearance_date END ASC,
         cv.clearance_date DESC,
         cv.id DESC`,
      params
    );

    const data = rows.map(normalizeVoucher);
    return res.json({ success: true, data, vouchers: data });
  } catch (error) {
    return sendError(res, error, "GET /api/cheque-vouchers:");
  }
});

router.get("/:id", async (req, res) => {
  try {
    await schemaReady;
    const id = toId(req.params.id);
    if (!id) throw httpError("Valid cheque voucher id zaroori hai.");
    const voucher = await loadVoucher(id);
    if (!voucher) throw httpError("Cheque voucher nahi mila.", 404);
    return res.json({ success: true, data: voucher, voucher });
  } catch (error) {
    return sendError(res, error, "GET /api/cheque-vouchers/:id:");
  }
});

router.post("/", async (req, res) => {
  let connection;
  try {
    await schemaReady;
    const payload = normalizePayload(req.body);
    connection = await getConnection();
    await runQuery(connection, "START TRANSACTION");
    await assertAccount(payload.account_id, connection);

    let voucherNo = payload.voucher_no;
    if (!voucherNo) {
      const nextRows = await runQuery(
        connection,
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM cheque_vouchers"
      );
      voucherNo = `CHQ-${String(nextRows[0]?.next_id || 1).padStart(5, "0")}`;
    }

    const result = await runQuery(
      connection,
      `INSERT INTO cheque_vouchers
       (voucher_no, payee_name, account_id, issuance_date, clearance_date, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        voucherNo,
        payload.payee_name,
        payload.account_id,
        payload.issuance_date,
        payload.clearance_date,
        payload.total_amount,
        payload.notes,
      ]
    );

    await insertPayments(connection, result.insertId, payload.payments);
    await runQuery(connection, "COMMIT");
    const voucher = await loadVoucher(result.insertId);
    return res.status(201).json({
      success: true,
      message: "Cheque voucher save ho gaya.",
      data: voucher,
      voucher,
    });
  } catch (error) {
    if (connection) await runQuery(connection, "ROLLBACK").catch(() => {});
    return sendError(res, error, "POST /api/cheque-vouchers:");
  } finally {
    connection?.release?.();
  }
});

router.put("/:id", async (req, res) => {
  let connection;
  try {
    await schemaReady;
    const id = toId(req.params.id);
    if (!id) throw httpError("Valid cheque voucher id zaroori hai.");
    const payload = normalizePayload(req.body);

    connection = await getConnection();
    await runQuery(connection, "START TRANSACTION");
    await assertAccount(payload.account_id, connection);

    const current = await runQuery(
      connection,
      "SELECT id, voucher_no FROM cheque_vouchers WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!current.length) throw httpError("Cheque voucher nahi mila.", 404);

    await runQuery(
      connection,
      `UPDATE cheque_vouchers SET
         voucher_no = ?, payee_name = ?, account_id = ?, issuance_date = ?,
         clearance_date = ?, total_amount = ?, notes = ?
       WHERE id = ?`,
      [
        payload.voucher_no || current[0].voucher_no,
        payload.payee_name,
        payload.account_id,
        payload.issuance_date,
        payload.clearance_date,
        payload.total_amount,
        payload.notes,
        id,
      ]
    );
    await runQuery(
      connection,
      "DELETE FROM cheque_voucher_payments WHERE cheque_voucher_id = ?",
      [id]
    );
    await insertPayments(connection, id, payload.payments);
    await runQuery(connection, "COMMIT");

    const voucher = await loadVoucher(id);
    return res.json({
      success: true,
      message: "Cheque voucher update ho gaya.",
      data: voucher,
      voucher,
    });
  } catch (error) {
    if (connection) await runQuery(connection, "ROLLBACK").catch(() => {});
    return sendError(res, error, "PUT /api/cheque-vouchers/:id:");
  } finally {
    connection?.release?.();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await schemaReady;
    const id = toId(req.params.id);
    if (!id) throw httpError("Valid cheque voucher id zaroori hai.");
    const result = await runQuery(db, "DELETE FROM cheque_vouchers WHERE id = ?", [id]);
    if (!result.affectedRows) throw httpError("Cheque voucher nahi mila.", 404);
    return res.json({ success: true, message: "Cheque voucher delete ho gaya." });
  } catch (error) {
    return sendError(res, error, "DELETE /api/cheque-vouchers/:id:");
  }
});

module.exports = router;
