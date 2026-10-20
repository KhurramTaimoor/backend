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


const ACCOUNT_TYPES = {
  customer: { table: "customers", name: "customer_name_en" },
  supplier: { table: "suppliers", name: "supplier_name" },
  employee: { table: "employees", name: "full_name" },
  general_ledger: { table: "chart_of_accounts", name: "account_title" },
};
const normalizeType = (value) => {
  const key = cleanText(value).toLowerCase().replace(/\s+/g, "_");
  return ({ general: "general_ledger", general_account: "general_ledger", ledger: "general_ledger",
    customers: "customer", suppliers: "supplier", employees: "employee" })[key] || key;
};
const normalizeDirection = (v) => cleanText(v).toLowerCase() === "receive" ? "receive" : "issue";

const getAccount = async (connection, type, id) => {
  const item = ACCOUNT_TYPES[type];
  if (!item) throw httpError("Customer, Supplier, Employee ya General Account select karein.");
  const rows = await runQuery(connection,
    `SELECT id, \`${item.name}\` AS name FROM \`${item.table}\` WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) throw httpError("Selected account nahi mila.", 404);
  return { id: Number(rows[0].id), name: cleanText(rows[0].name) };
};

// A cleared instalment creates a real Cash Book voucher/line on the clearance date.
// Link is unique by cheque payment id. The cheque's face value is posted separately
// to the party ledger on the cheque issuance/receipt date; Cash Book is settlement.
async function syncCashbookPayments(connection, chequeId, voucherNo, accountType, accountId, accountName, direction, payments) {
  for (const payment of payments) {
    const no = `CHQ-${chequeId}-CLR-${payment.id}`;
    const receive = direction === "receive" ? payment.amount : 0;
    const paid = direction === "issue" ? payment.amount : 0;
    const description = `Cheque ${voucherNo} | ${payment.details}`.slice(0, 500);
    const voucher = await runQuery(connection,
      `INSERT INTO cash_book_vouchers (voucher_no, voucher_date, notes, total_receive, total_paid)
       VALUES (?, ?, ?, ?, ?)`, [no, payment.payment_date, `Cheque clearing - ${voucherNo}`, receive, paid]);
    const item = await runQuery(connection,
      `INSERT INTO cash_book_voucher_items
       (voucher_id,line_no,account_type,account_id,account_name_snapshot,description,receive,paid,legacy_cash_book_id)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, NULL)`,
      [voucher.insertId, accountType, accountId, accountName, description, receive, paid]);
    const legacy = await runQuery(connection,
      `INSERT INTO cash_book (entry_date,description,cash_in,cash_out,balance) VALUES (?, ?, ?, ?, 0)`,
      [payment.payment_date, `${no} | ${description}`, receive, paid]);
    await runQuery(connection, `UPDATE cash_book_voucher_items SET legacy_cash_book_id = ? WHERE id = ?`,
      [legacy.insertId,item.insertId]);
    await runQuery(connection,
      `INSERT INTO cheque_cashbook_links (payment_id,cheque_voucher_id,cash_book_voucher_id,cash_book_item_id,legacy_cash_book_id)
       VALUES (?, ?, ?, ?, ?)`, [payment.id, chequeId, voucher.insertId, item.insertId, legacy.insertId]);
  }
  if (payments.length) await recalcCashbookBalances(connection);
}
async function recalcCashbookBalances(connection) {
  const rows = await runQuery(connection,
    'SELECT id,cash_in,cash_out FROM cash_book ORDER BY entry_date ASC,id ASC');
  let balance = 0;
  for (const row of rows) {
    balance = toAmount(balance + toAmount(row.cash_in) - toAmount(row.cash_out));
    await runQuery(connection,'UPDATE cash_book SET balance = ? WHERE id = ?', [balance,row.id]);
  }
}
async function unlinkCashbookPayments(connection, chequeId) {
  const links = await runQuery(connection,
    `SELECT payment_id,cash_book_voucher_id,legacy_cash_book_id FROM cheque_cashbook_links
     WHERE cheque_voucher_id = ? FOR UPDATE`, [chequeId]);
  if (!links.length) return;
  const voucherIds = links.map(r => Number(r.cash_book_voucher_id));
  const legacyIds = links.map(r => Number(r.legacy_cash_book_id)).filter(Boolean);
  await runQuery(connection, 'DELETE FROM cheque_cashbook_links WHERE cheque_voucher_id = ?', [chequeId]);
  await runQuery(connection, 'DELETE FROM cash_book_voucher_items WHERE voucher_id IN (?)', [voucherIds]);
  await runQuery(connection, 'DELETE FROM cash_book_vouchers WHERE id IN (?)', [voucherIds]);
  if (legacyIds.length) await runQuery(connection, 'DELETE FROM cash_book WHERE id IN (?)',[legacyIds]);
  await recalcCashbookBalances(connection);
}

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

  const columns = new Set((await runQuery(db,'SHOW COLUMNS FROM cheque_vouchers')).map(r => r.Field));
  if (!columns.has('account_type')) {
    await runQuery(db, "ALTER TABLE cheque_vouchers ADD COLUMN account_type VARCHAR(40) NOT NULL DEFAULT 'general_ledger'");
  }
  if (!columns.has('cheque_direction')) {
    await runQuery(db, "ALTER TABLE cheque_vouchers ADD COLUMN cheque_direction VARCHAR(12) NOT NULL DEFAULT 'issue'");
  }
  await runQuery(db, `CREATE TABLE IF NOT EXISTS cheque_cashbook_links (
    payment_id INT NOT NULL PRIMARY KEY,
    cheque_voucher_id INT NOT NULL,
    cash_book_voucher_id INT NOT NULL UNIQUE,
    cash_book_item_id INT NOT NULL UNIQUE,
    legacy_cash_book_id INT NOT NULL UNIQUE,
    INDEX idx_cheque_link (cheque_voucher_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
})().catch((error) => {
  // Do not crash the whole API when MySQL is temporarily unavailable.
  // Individual requests will still return a normal 500 until the DB is reachable.
  console.error("Cheque voucher schema initialization failed:", error.message);
  throw error;
});

const voucherSelect = `
  SELECT
    cv.id,
    cv.voucher_no,
    cv.payee_name,
    cv.account_id,
    cv.account_type,
    cv.cheque_direction,
    COALESCE(cu.customer_name_en, su.supplier_name, em.full_name, coa.account_title, cv.payee_name) AS account_title,
    CASE WHEN cv.account_type = 'general_ledger' THEN coa.account_code ELSE NULL END AS account_code,
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
  LEFT JOIN chart_of_accounts coa ON cv.account_type = 'general_ledger' AND coa.id = cv.account_id
  LEFT JOIN customers cu ON cv.account_type = 'customer' AND cu.id = cv.account_id
  LEFT JOIN suppliers su ON cv.account_type = 'supplier' AND su.id = cv.account_id
  LEFT JOIN employees em ON cv.account_type = 'employee' AND em.id = cv.account_id
  LEFT JOIN cheque_voucher_payments cvp ON cvp.cheque_voucher_id = cv.id
`;

const voucherGroupBy = `
  GROUP BY
    cv.id, cv.voucher_no, cv.payee_name, cv.account_id,
    cv.account_type, cv.cheque_direction, coa.account_code, coa.account_title,
    cu.customer_name_en, su.supplier_name, em.full_name, cv.issuance_date,
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
       cvp.id,
       cvp.cheque_voucher_id,
       DATE_FORMAT(cvp.payment_date, '%Y-%m-%d') AS payment_date,
       cvp.details,
       cvp.amount,
       cvp.created_at,
       cbv.voucher_no AS cash_book_voucher_no,
       cbl.cash_book_voucher_id
     FROM cheque_voucher_payments cvp
     LEFT JOIN cheque_cashbook_links cbl ON cbl.payment_id = cvp.id
     LEFT JOIN cash_book_vouchers cbv ON cbv.id = cbl.cash_book_voucher_id
     WHERE cvp.cheque_voucher_id = ?
     ORDER BY cvp.payment_date ASC, cvp.id ASC`,
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
  const accountType = normalizeType(body.account_type || 'general_ledger');
  if (!ACCOUNT_TYPES[accountType]) throw httpError('Invalid account type.');
  const direction = normalizeDirection(body.cheque_direction);

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
    .filter((payment) => payment.details || payment.amount);

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
    if (payment.payment_date < issuanceDate) {
      throw httpError(`Clearing row ${index + 1} ki date cheque date se pehle nahi ho sakti.`);
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
    account_type: accountType,
    cheque_direction: direction,
    issuance_date: issuanceDate,
    clearance_date: clearanceDate,
    total_amount: totalAmount,
    notes: cleanText(body.notes),
    payments,
  };
}

async function assertAccount(accountType, accountId, executor = db) {
  return getAccount(executor, accountType, accountId);
}

async function insertPayments(executor, voucherId, payments) {
  const inserted = [];
  for (const payment of payments) {
    const result = await runQuery(
      executor,
      `INSERT INTO cheque_voucher_payments
       (cheque_voucher_id, payment_date, details, amount)
       VALUES (?, ?, ?, ?)`,
      [voucherId, payment.payment_date, payment.details, payment.amount]
    );
    inserted.push({ ...payment, id: result.insertId });
  }
  return inserted;
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

router.get('/lookups', async (_req, res) => {
  try {
    await schemaReady;
    const data = {};
    for (const [type, config] of Object.entries(ACCOUNT_TYPES)) {
      const records = await runQuery(db,
        `SELECT id, \`${config.name}\` AS name FROM \`${config.table}\` ORDER BY \`${config.name}\` ASC`);
      data[type] = records.map(row => ({ id: Number(row.id), name: cleanText(row.name) }));
    }
    return res.json({success:true,data});
  } catch(error) {return sendError(res,error,'GET /cheque-vouchers/lookups:');}
});

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

const chequeReportParams = (query = {}) => {
  const status = cleanText(query.status).toLowerCase();
  const search = cleanText(query.search);
  const direction = cleanText(query.direction).toLowerCase();
  const sort = cleanText(query.sort).toLowerCase();
  const type = cleanText(query.account_type).toLowerCase();
  const accountId = cleanText(query.account_id);
  const from = cleanText(query.from_date);
  const to = cleanText(query.to_date);
  const conditions = [], params = [];
  if (direction && direction !== "all") {
    if (!["receive", "issue"].includes(direction)) throw httpError("Invalid cheque direction.");
    conditions.push("cv.cheque_direction = ?");
    params.push(direction);
  }
  if (type && type !== "all") {
    if (!ACCOUNT_TYPES[type]) throw httpError("Invalid account type.");
    conditions.push("cv.account_type = ?");
    params.push(type);
  }
  if (accountId) {
    if (!/^[1-9]\d*$/.test(accountId)) throw httpError("Invalid account ID.");
    if (!type || type === "all") throw httpError("Select account type for an account name filter.");
    conditions.push("cv.account_id = ?");
    params.push(Number(accountId));
  }
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !validDate.test(from)) || (to && !validDate.test(to)) || (from && to && from > to)) {
    throw httpError("Invalid date range.");
  }
  // Date filters use the cheque date, not the clearing installment dates.
  if (from) { conditions.push("cv.issuance_date >= ?"); params.push(from); }
  if (to) { conditions.push("cv.issuance_date <= ?"); params.push(to); }
  if (search) {
    conditions.push("(cv.voucher_no LIKE ? OR cv.payee_name LIKE ? OR coa.account_title LIKE ? OR cu.customer_name_en LIKE ? OR su.supplier_name LIKE ? OR em.full_name LIKE ?)");
    const needle = "%" + search + "%";
    params.push(needle,needle,needle,needle,needle,needle);
  }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  let having = "";
  if (status === "cleared") having = "HAVING paid_amount >= cv.total_amount";
  else if (status === "remaining" || status === "pending") having = "HAVING paid_amount < cv.total_amount";
  else if (status === "partial") having = "HAVING paid_amount > 0 AND paid_amount < cv.total_amount";
  const ordering = sort === "newest" ?
    "ORDER BY cv.issuance_date DESC, cv.id DESC" :
    [
      "ORDER BY CASE",
      "WHEN COALESCE(SUM(cvp.amount),0) < cv.total_amount AND cv.clearance_date >= CURDATE() THEN 0",
      "WHEN COALESCE(SUM(cvp.amount),0) < cv.total_amount THEN 1",
      "ELSE 2 END ASC,",
      "CASE WHEN cv.clearance_date >= CURDATE() THEN cv.clearance_date END ASC,",
      "cv.clearance_date DESC, cv.id DESC"
    ].join(" ");
  return {where,having,ordering,params};
};

async function listChequeVouchers(query) {
  const {where,having,ordering,params} = chequeReportParams(query);
  const rows = await runQuery(db,
    voucherSelect + " " + where + " " + voucherGroupBy + " " + having + " " + ordering,
    params
  );
  return rows.map(normalizeVoucher);
}

router.get("/print-report", async (req, res) => {
  try {
    await schemaReady;
    const vouchers = await listChequeVouchers(req.query);
    const ids = vouchers.map(row => row.id);
    let payments = [];
    if (ids.length) {
      payments = await runQuery(db,
        [
          "SELECT cvp.id,cvp.cheque_voucher_id,",
          "DATE_FORMAT(cvp.payment_date,'%Y-%m-%d') AS payment_date,",
          "cvp.details,cvp.amount,cbv.voucher_no AS cash_book_voucher_no",
          "FROM cheque_voucher_payments cvp",
          "LEFT JOIN cheque_cashbook_links cbl ON cbl.payment_id=cvp.id",
          "LEFT JOIN cash_book_vouchers cbv ON cbv.id=cbl.cash_book_voucher_id",
          "WHERE cvp.cheque_voucher_id IN (?)",
          "ORDER BY cvp.payment_date ASC,cvp.id ASC"
        ].join(" "), [ids]
      );
    }
    const byId = new Map(ids.map(id => [id, []]));
    for (const item of payments) {
      const id = Number(item.cheque_voucher_id);
      if (byId.has(id)) byId.get(id).push({...item,amount:toAmount(item.amount)});
    }
    const data = vouchers.map(voucher => ({...voucher,payments:byId.get(voucher.id) || []}));
    return res.json({success:true,data,vouchers:data});
  } catch (error) { return sendError(res,error,"GET /api/cheque-vouchers/print-report:"); }
});

router.get("/", async (req, res) => {
  try {
    await schemaReady;
    const data = await listChequeVouchers(req.query);
    return res.json({success:true,data,vouchers:data});
  } catch (error) { return sendError(res,error,"GET /api/cheque-vouchers:"); }
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
    const account = await assertAccount(payload.account_type, payload.account_id, connection);

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
       (voucher_no, payee_name, account_id, account_type, cheque_direction, issuance_date, clearance_date, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voucherNo,
        payload.payee_name,
        payload.account_id,
        payload.account_type,
        payload.cheque_direction,
        payload.issuance_date,
        payload.clearance_date,
        payload.total_amount,
        payload.notes,
      ]
    );

    const payments = await insertPayments(connection, result.insertId, payload.payments);
    await syncCashbookPayments(connection, result.insertId, voucherNo, payload.account_type,
      payload.account_id, account.name, payload.cheque_direction, payments);
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
    const account = await assertAccount(payload.account_type, payload.account_id, connection);

    const current = await runQuery(
      connection,
      "SELECT id, voucher_no FROM cheque_vouchers WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!current.length) throw httpError("Cheque voucher nahi mila.", 404);

    await runQuery(
      connection,
      `UPDATE cheque_vouchers SET
         voucher_no = ?, payee_name = ?, account_id = ?, account_type = ?, cheque_direction = ?, issuance_date = ?,
         clearance_date = ?, total_amount = ?, notes = ?
       WHERE id = ?`,
      [
        payload.voucher_no || current[0].voucher_no,
        payload.payee_name,
        payload.account_id,
        payload.account_type,
        payload.cheque_direction,
        payload.issuance_date,
        payload.clearance_date,
        payload.total_amount,
        payload.notes,
        id,
      ]
    );
    await unlinkCashbookPayments(connection, id);
    await runQuery(
      connection,
      "DELETE FROM cheque_voucher_payments WHERE cheque_voucher_id = ?",
      [id]
    );
    const payments = await insertPayments(connection, id, payload.payments);
    await syncCashbookPayments(connection, id, payload.voucher_no || current[0].voucher_no,
      payload.account_type, payload.account_id, account.name, payload.cheque_direction, payments);
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
  let connection;
  try {
    await schemaReady;
    const id = toId(req.params.id);
    if (!id) throw httpError("Valid cheque voucher id zaroori hai.");
    connection = await getConnection();
    await runQuery(connection,"START TRANSACTION");
    const locked = await runQuery(connection,'SELECT id FROM cheque_vouchers WHERE id = ? FOR UPDATE',[id]);
    if (!locked.length) throw httpError('Cheque voucher nahi mila.',404);
    await unlinkCashbookPayments(connection,id);
    await runQuery(connection, 'DELETE FROM cheque_voucher_payments WHERE cheque_voucher_id = ?', [id]);
    await runQuery(connection, 'DELETE FROM cheque_vouchers WHERE id = ?', [id]);
    await runQuery(connection,"COMMIT");
    return res.json({success:true,message:'Cheque voucher delete ho gaya.'});
  } catch(error) {
    if (connection) await runQuery(connection,"ROLLBACK").catch(()=>{});
    return sendError(res,error,'DELETE /api/cheque-vouchers/:id:');
  } finally { connection?.release?.(); }
});

module.exports = router;
