const express = require("express");
const router = express.Router();
const db = require("../db");

const runQuery = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });

const getConnection = () =>
  new Promise((resolve, reject) => {
    if (typeof db.getConnection !== "function") {
      resolve({
        connection: db,
        release: () => {},
      });
      return;
    }

    db.getConnection((error, connection) => {
      if (error) return reject(error);

      resolve({
        connection,
        release: () => connection.release?.(),
      });
    });
  });

const beginTransaction = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.beginTransaction) {
      resolve();
      return;
    }

    connection.beginTransaction((error) =>
      error ? reject(error) : resolve()
    );
  });

const commitTransaction = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.commit) {
      resolve();
      return;
    }

    connection.commit((error) =>
      error ? reject(error) : resolve()
    );
  });

const rollbackTransaction = (connection) =>
  new Promise((resolve) => {
    if (!connection.rollback) {
      resolve();
      return;
    }

    connection.rollback(() => resolve());
  });

async function withTransaction(work) {
  const { connection, release } = await getConnection();

  try {
    await beginTransaction(connection);
    const result = await work(connection);
    await commitTransaction(connection);
    return result;
  } catch (error) {
    await rollbackTransaction(connection);
    throw error;
  } finally {
    release();
  }
}

const cleanText = (value) =>
  String(value ?? "").trim();

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toPositiveId = (value) => {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
};

const dateOnly = (value) => {
  if (!value) return null;

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    const year = value.getFullYear();
    const month = String(
      value.getMonth() + 1
    ).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const match = cleanText(value).match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return match ? match[1] : null;
};

const today = () =>
  new Date().toISOString().slice(0, 10);

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const ACCOUNT_TYPES = {
  customer: {
    table: "customers",
    idColumn: "id",
    nameExpression: "customer_name_en",
    label: "Customer",
  },
  general_ledger: {
    table: "chart_of_accounts",
    idColumn: "id",
    nameExpression:
      "CONCAT(COALESCE(NULLIF(account_code, ''), ''), CASE WHEN account_code IS NULL OR account_code = '' THEN '' ELSE ' - ' END, account_title)",
    label: "General Ledger",
  },
  supplier: {
    table: "suppliers",
    idColumn: "id",
    nameExpression: "supplier_name",
    label: "Supplier",
  },
  employee: {
    table: "employees",
    idColumn: "id",
    nameExpression: "full_name",
    label: "Employee",
  },
};

const normalizeAccountType = (value) => {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "_");

  const aliases = {
    customer: "customer",
    customers: "customer",
    general_ledger: "general_ledger",
    generalledger: "general_ledger",
    ledger: "general_ledger",
    gl: "general_ledger",
    supplier: "supplier",
    suppliers: "supplier",
    employee: "employee",
    employees: "employee",
  };

  return aliases[normalized] || "";
};

async function accountByTypeAndId(
  connection,
  accountType,
  accountId
) {
  const config = ACCOUNT_TYPES[accountType];

  if (!config || !accountId) return null;

  const rows = await runQuery(
    connection,
    `
      SELECT
        ${config.idColumn} AS id,
        ${config.nameExpression} AS display_name
      FROM ${config.table}
      WHERE ${config.idColumn} = ?
      LIMIT 1
    `,
    [accountId]
  );

  if (!rows[0]) return null;

  return {
    id: rows[0].id,
    display_name: cleanText(rows[0].display_name),
    account_type: accountType,
    account_type_label: config.label,
  };
}

async function getLookups(connection) {
  const [
    customers,
    generalLedgers,
    suppliers,
    employees,
    groups,
  ] = await Promise.all([
    runQuery(
      connection,
      `
        SELECT
          id,
          customer_name_en,
          phone,
          city_en,
          CONCAT(customer_name_en, CASE WHEN phone IS NULL OR phone = '' THEN '' ELSE CONCAT(' — ', phone) END) AS display_name
        FROM customers
        ORDER BY customer_name_en ASC
      `
    ),
    runQuery(
      connection,
      `
        SELECT
          coa.id,
          coa.account_code,
          coa.account_title,
          coa.group_id,
          ag.group_name,
          coa.opening_balance,
          CONCAT(
            COALESCE(NULLIF(coa.account_code, ''), ''),
            CASE WHEN coa.account_code IS NULL OR coa.account_code = '' THEN '' ELSE ' — ' END,
            coa.account_title
          ) AS display_name
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag
          ON ag.id = coa.group_id
        ORDER BY coa.account_title ASC
      `
    ),
    runQuery(
      connection,
      `
        SELECT
          id,
          supplier_name,
          phone,
          CONCAT(supplier_name, CASE WHEN phone IS NULL OR phone = '' THEN '' ELSE CONCAT(' — ', phone) END) AS display_name
        FROM suppliers
        ORDER BY supplier_name ASC
      `
    ),
    runQuery(
      connection,
      `
        SELECT
          id,
          full_name,
          phone,
          designation,
          CONCAT(full_name, CASE WHEN designation IS NULL OR designation = '' THEN '' ELSE CONCAT(' — ', designation) END) AS display_name
        FROM employees
        ORDER BY full_name ASC
      `
    ),
    runQuery(
      connection,
      `
        SELECT id, group_name, parent_group, type
        FROM account_groups
        ORDER BY group_name ASC
      `
    ),
  ]);

  return {
    customers,
    general_ledgers: generalLedgers,
    suppliers,
    employees,
    groups,
  };
}

async function nextVoucherNumber(connection) {
  const rows = await runQuery(
    connection,
    `
      SELECT
        COALESCE(
          MAX(
            CASE
              WHEN voucher_no REGEXP '^CINV-[0-9]+$'
              THEN CAST(SUBSTRING(voucher_no, 6) AS UNSIGNED)
              ELSE 0
            END
          ),
          0
        ) AS max_number
      FROM cash_book_vouchers
    `
  );

  const next = toNumber(rows[0]?.max_number) + 1;

  return `CINV-${String(next).padStart(4, "0")}`;
}

async function voucherNoExists(
  connection,
  voucherNo,
  excludeId = null
) {
  let sql = `
    SELECT id
    FROM cash_book_vouchers
    WHERE LOWER(TRIM(voucher_no)) =
          LOWER(TRIM(?))
  `;

  const params = [voucherNo];

  if (excludeId) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const rows = await runQuery(
    connection,
    sql,
    params
  );

  return rows.length > 0;
}

async function prepareItems(connection, body) {
  const rawItems = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.lines)
    ? body.lines
    : [];

  const submitted = rawItems
    .map((item) => ({
      account_type: normalizeAccountType(
        item.account_type
      ),
      account_id: toPositiveId(item.account_id),
      description: cleanText(item.description),
      receive: toNumber(
        item.receive ?? item.cash_in
      ),
      paid: toNumber(item.paid ?? item.cash_out),
    }))
    .filter(
      (item) =>
        item.account_type ||
        item.account_id ||
        item.description ||
        item.receive > 0 ||
        item.paid > 0
    );

  if (!submitted.length) {
    throw httpError(
      "Kam az kam aik valid account row add karein."
    );
  }

  const items = [];

  for (
    let index = 0;
    index < submitted.length;
    index += 1
  ) {
    const item = submitted[index];

    if (!ACCOUNT_TYPES[item.account_type]) {
      throw httpError(
        `Row ${index + 1}: valid account type select karein.`
      );
    }

    if (!item.account_id) {
      throw httpError(
        `Row ${index + 1}: account select karein.`
      );
    }

    if (item.receive <= 0 && item.paid <= 0) {
      throw httpError(
        `Row ${index + 1}: Receive ya Paid amount enter karein.`
      );
    }

    if (item.receive > 0 && item.paid > 0) {
      throw httpError(
        `Row ${index + 1}: Receive aur Paid dono aik saath enter nahi ho sakte.`
      );
    }

    const account = await accountByTypeAndId(
      connection,
      item.account_type,
      item.account_id
    );

    if (!account) {
      throw httpError(
        `Row ${index + 1}: selected account nahi mila.`,
        404
      );
    }

    items.push({
      line_no: index + 1,
      account_type: item.account_type,
      account_type_label:
        account.account_type_label,
      account_id: item.account_id,
      account_name: account.display_name,
      description:
        item.description || account.display_name,
      receive: Number(item.receive.toFixed(2)),
      paid: Number(item.paid.toFixed(2)),
    });
  }

  return items;
}

async function recalculateLegacyCashBook(connection) {
  const rows = await runQuery(
    connection,
    `
      SELECT id, cash_in, cash_out
      FROM cash_book
      ORDER BY entry_date ASC, id ASC
    `
  );

  let runningBalance = 0;

  for (const row of rows) {
    runningBalance +=
      toNumber(row.cash_in) -
      toNumber(row.cash_out);

    await runQuery(
      connection,
      `
        UPDATE cash_book
        SET balance = ?
        WHERE id = ?
      `,
      [Number(runningBalance.toFixed(2)), row.id]
    );
  }
}

async function insertVoucherItems(
  connection,
  voucherId,
  voucherNo,
  voucherDate,
  items
) {
  for (const item of items) {
    const itemResult = await runQuery(
      connection,
      `
        INSERT INTO cash_book_voucher_items
        (
          voucher_id,
          line_no,
          account_type,
          account_id,
          account_name_snapshot,
          description,
          receive,
          paid,
          legacy_cash_book_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      [
        voucherId,
        item.line_no,
        item.account_type,
        item.account_id,
        item.account_name,
        item.description,
        item.receive,
        item.paid,
      ]
    );

    const legacyDescription = [
      voucherNo,
      `${item.account_type_label}: ${item.account_name}`,
      item.description,
    ]
      .filter(Boolean)
      .join(" | ");

    const legacyResult = await runQuery(
      connection,
      `
        INSERT INTO cash_book
        (
          entry_date,
          description,
          cash_in,
          cash_out,
          balance
        )
        VALUES (?, ?, ?, ?, 0)
      `,
      [
        voucherDate,
        legacyDescription,
        item.receive,
        item.paid,
      ]
    );

    await runQuery(
      connection,
      `
        UPDATE cash_book_voucher_items
        SET legacy_cash_book_id = ?
        WHERE id = ?
      `,
      [legacyResult.insertId, itemResult.insertId]
    );
  }

  await recalculateLegacyCashBook(connection);
}

async function deleteVoucherItems(
  connection,
  voucherId
) {
  const itemRows = await runQuery(
    connection,
    `
      SELECT legacy_cash_book_id
      FROM cash_book_voucher_items
      WHERE voucher_id = ?
    `,
    [voucherId]
  );

  const legacyIds = itemRows
    .map((row) => toPositiveId(row.legacy_cash_book_id))
    .filter(Boolean);

  if (legacyIds.length) {
    await runQuery(
      connection,
      `
        DELETE FROM cash_book
        WHERE id IN (?)
      `,
      [legacyIds]
    );
  }

  await runQuery(
    connection,
    `
      DELETE FROM cash_book_voucher_items
      WHERE voucher_id = ?
    `,
    [voucherId]
  );
}

async function getVoucherById(connection, voucherId) {
  const headerRows = await runQuery(
    connection,
    `
      SELECT
        cbv.*,
        DATE_FORMAT(
          cbv.voucher_date,
          '%Y-%m-%d'
        ) AS voucher_date_text
      FROM cash_book_vouchers cbv
      WHERE cbv.id = ?
      LIMIT 1
    `,
    [voucherId]
  );

  if (!headerRows[0]) return null;

  const itemRows = await runQuery(
    connection,
    `
      SELECT
        id,
        voucher_id,
        line_no,
        account_type,
        account_id,
        account_name_snapshot AS account_name,
        description,
        receive,
        paid
      FROM cash_book_voucher_items
      WHERE voucher_id = ?
      ORDER BY line_no ASC, id ASC
    `,
    [voucherId]
  );

  const header = headerRows[0];

  return {
    id: header.id,
    voucher_no: header.voucher_no,
    voucher_date:
      header.voucher_date_text ||
      dateOnly(header.voucher_date),
    notes: cleanText(header.notes),
    total_receive: toNumber(header.total_receive),
    total_paid: toNumber(header.total_paid),
    created_at: header.created_at,
    updated_at: header.updated_at,
    items: itemRows.map((item) => ({
      ...item,
      receive: toNumber(item.receive),
      paid: toNumber(item.paid),
      account_type_label:
        ACCOUNT_TYPES[item.account_type]?.label ||
        item.account_type,
    })),
  };
}

async function createVoucher(connection, body) {
  const voucherDate =
    dateOnly(body.voucher_date || body.entry_date) ||
    today();

  let voucherNo = cleanText(
    body.voucher_no || body.invoice_no
  );

  if (!voucherNo) {
    voucherNo = await nextVoucherNumber(connection);
  }

  if (
    await voucherNoExists(
      connection,
      voucherNo
    )
  ) {
    voucherNo = await nextVoucherNumber(connection);
  }

  const items = await prepareItems(
    connection,
    body
  );

  const totalReceive = items.reduce(
    (sum, item) => sum + item.receive,
    0
  );

  const totalPaid = items.reduce(
    (sum, item) => sum + item.paid,
    0
  );

  const result = await runQuery(
    connection,
    `
      INSERT INTO cash_book_vouchers
      (
        voucher_no,
        voucher_date,
        notes,
        total_receive,
        total_paid
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      voucherNo,
      voucherDate,
      cleanText(body.notes),
      Number(totalReceive.toFixed(2)),
      Number(totalPaid.toFixed(2)),
    ]
  );

  await insertVoucherItems(
    connection,
    result.insertId,
    voucherNo,
    voucherDate,
    items
  );

  return getVoucherById(
    connection,
    result.insertId
  );
}

router.get("/lookups", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const data = await getLookups(connection);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /cash-book/lookups:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Account dropdowns load nahi huay.",
    });
  } finally {
    release();
  }
});

router.get(
  "/next-number",
  async (req, res) => {
    const { connection, release } =
      await getConnection();

    try {
      const voucherNo =
        await nextVoucherNumber(connection);

      res.json({
        success: true,
        voucher_no: voucherNo,
        data: {
          voucher_no: voucherNo,
        },
      });
    } catch (error) {
      console.error(
        "GET /cash-book/next-number:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Next voucher number generate nahi hua.",
      });
    } finally {
      release();
    }
  }
);

router.post("/accounts", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const accountTitle = cleanText(
      req.body.account_title
    );

    let accountCode = cleanText(
      req.body.account_code
    );

    const groupId = toPositiveId(
      req.body.group_id
    );

    const openingBalance = toNumber(
      req.body.opening_balance
    );

    if (!accountTitle) {
      return res.status(400).json({
        success: false,
        message:
          "Account title zaroori hai.",
      });
    }

    if (!accountCode) {
      const codeRows = await runQuery(
        connection,
        `
          SELECT
            COALESCE(
              MAX(
                CASE
                  WHEN account_code REGEXP '^[0-9]+$'
                  THEN CAST(account_code AS UNSIGNED)
                  ELSE 0
                END
              ),
              1000
            ) AS max_code
          FROM chart_of_accounts
        `
      );

      accountCode = String(
        toNumber(codeRows[0]?.max_code, 1000) + 1
      );
    }

    const duplicateRows = await runQuery(
      connection,
      `
        SELECT id
        FROM chart_of_accounts
        WHERE LOWER(TRIM(account_code)) =
              LOWER(TRIM(?))
        LIMIT 1
      `,
      [accountCode]
    );

    if (duplicateRows.length) {
      return res.status(409).json({
        success: false,
        message:
          "Yeh account code pehle se maujood hai.",
      });
    }

    if (groupId) {
      const groupRows = await runQuery(
        connection,
        `
          SELECT id
          FROM account_groups
          WHERE id = ?
          LIMIT 1
        `,
        [groupId]
      );

      if (!groupRows.length) {
        return res.status(400).json({
          success: false,
          message:
            "Selected account group nahi mila.",
        });
      }
    }

    const result = await runQuery(
      connection,
      `
        INSERT INTO chart_of_accounts
        (
          account_code,
          account_title,
          group_id,
          opening_balance
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        accountCode,
        accountTitle,
        groupId,
        openingBalance,
      ]
    );

    const rows = await runQuery(
      connection,
      `
        SELECT
          coa.id,
          coa.account_code,
          coa.account_title,
          coa.group_id,
          ag.group_name,
          coa.opening_balance,
          CONCAT(
            COALESCE(NULLIF(coa.account_code, ''), ''),
            CASE WHEN coa.account_code IS NULL OR coa.account_code = '' THEN '' ELSE ' — ' END,
            coa.account_title
          ) AS display_name
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag
          ON ag.id = coa.group_id
        WHERE coa.id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message:
        "Account save ho gaya aur dropdown mein add ho gaya.",
      data: rows[0],
      account: rows[0],
    });
  } catch (error) {
    console.error(
      "POST /cash-book/accounts:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Account save nahi hua.",
    });
  } finally {
    release();
  }
});

router.get(
  "/vouchers",
  async (req, res) => {
    const { connection, release } =
      await getConnection();

    try {
      const search = cleanText(req.query.search);
      const fromDate = dateOnly(req.query.from_date);
      const toDate = dateOnly(req.query.to_date);

      const where = [];
      const params = [];

      if (search) {
        where.push(`
          (
            cbv.voucher_no LIKE ?
            OR cbv.notes LIKE ?
            OR EXISTS (
              SELECT 1
              FROM cash_book_voucher_items cbvi
              WHERE cbvi.voucher_id = cbv.id
                AND (
                  cbvi.account_name_snapshot LIKE ?
                  OR cbvi.description LIKE ?
                )
            )
          )
        `);

        const like = `%${search}%`;

        params.push(like, like, like, like);
      }

      if (fromDate) {
        where.push("cbv.voucher_date >= ?");
        params.push(fromDate);
      }

      if (toDate) {
        where.push("cbv.voucher_date <= ?");
        params.push(toDate);
      }

      const whereSql = where.length
        ? `WHERE ${where.join(" AND ")}`
        : "";

      const rows = await runQuery(
        connection,
        `
          SELECT
            cbv.id,
            cbv.voucher_no,
            DATE_FORMAT(
              cbv.voucher_date,
              '%Y-%m-%d'
            ) AS voucher_date,
            cbv.notes,
            cbv.total_receive,
            cbv.total_paid,
            cbv.created_at,
            cbv.updated_at,
            COUNT(cbvi.id) AS items_count,
            GROUP_CONCAT(
              DISTINCT cbvi.account_name_snapshot
              ORDER BY cbvi.line_no
              SEPARATOR ', '
            ) AS account_names
          FROM cash_book_vouchers cbv
          LEFT JOIN cash_book_voucher_items cbvi
            ON cbvi.voucher_id = cbv.id
          ${whereSql}
          GROUP BY cbv.id
          ORDER BY cbv.voucher_date DESC, cbv.id DESC
        `,
        params
      );

      res.json({
        success: true,
        data: rows,
        vouchers: rows,
      });
    } catch (error) {
      console.error(
        "GET /cash-book/vouchers:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Cash Book vouchers load nahi huay.",
      });
    } finally {
      release();
    }
  }
);

router.get(
  "/vouchers/:id",
  async (req, res) => {
    const { connection, release } =
      await getConnection();

    try {
      const voucherId = toPositiveId(
        req.params.id
      );

      if (!voucherId) {
        return res.status(400).json({
          success: false,
          message:
            "Valid voucher id zaroori hai.",
        });
      }

      const voucher = await getVoucherById(
        connection,
        voucherId
      );

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message:
            "Cash Book voucher nahi mila.",
        });
      }

      res.json({
        success: true,
        data: voucher,
        voucher,
      });
    } catch (error) {
      console.error(
        `GET /cash-book/vouchers/${req.params.id}:`,
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Voucher load nahi hua.",
      });
    } finally {
      release();
    }
  }
);

router.post(
  "/vouchers",
  async (req, res) => {
    try {
      const voucher = await withTransaction(
        (connection) =>
          createVoucher(connection, req.body)
      );

      res.status(201).json({
        success: true,
        message:
          "Cash Book voucher save ho gaya.",
        data: voucher,
        voucher,
      });
    } catch (error) {
      console.error(
        "POST /cash-book/vouchers:",
        error
      );

      res
        .status(error.status || 500)
        .json({
          success: false,
          message:
            error.message ||
            "Cash Book voucher save nahi hua.",
        });
    }
  }
);

router.put(
  "/vouchers/:id",
  async (req, res) => {
    try {
      const voucher = await withTransaction(
        async (connection) => {
          const voucherId = toPositiveId(
            req.params.id
          );

          if (!voucherId) {
            throw httpError(
              "Valid voucher id zaroori hai."
            );
          }

          const existing =
            await getVoucherById(
              connection,
              voucherId
            );

          if (!existing) {
            throw httpError(
              "Cash Book voucher nahi mila.",
              404
            );
          }

          const voucherDate =
            dateOnly(
              req.body.voucher_date ||
                req.body.entry_date
            ) || today();

          const voucherNo =
            cleanText(
              req.body.voucher_no ||
                req.body.invoice_no
            ) || existing.voucher_no;

          if (
            await voucherNoExists(
              connection,
              voucherNo,
              voucherId
            )
          ) {
            throw httpError(
              "Yeh invoice number pehle se maujood hai.",
              409
            );
          }

          const items = await prepareItems(
            connection,
            req.body
          );

          const totalReceive =
            items.reduce(
              (sum, item) =>
                sum + item.receive,
              0
            );

          const totalPaid =
            items.reduce(
              (sum, item) => sum + item.paid,
              0
            );

          await deleteVoucherItems(
            connection,
            voucherId
          );

          await runQuery(
            connection,
            `
              UPDATE cash_book_vouchers
              SET
                voucher_no = ?,
                voucher_date = ?,
                notes = ?,
                total_receive = ?,
                total_paid = ?
              WHERE id = ?
            `,
            [
              voucherNo,
              voucherDate,
              cleanText(req.body.notes),
              Number(totalReceive.toFixed(2)),
              Number(totalPaid.toFixed(2)),
              voucherId,
            ]
          );

          await insertVoucherItems(
            connection,
            voucherId,
            voucherNo,
            voucherDate,
            items
          );

          return getVoucherById(
            connection,
            voucherId
          );
        }
      );

      res.json({
        success: true,
        message:
          "Cash Book voucher update ho gaya.",
        data: voucher,
        voucher,
      });
    } catch (error) {
      console.error(
        `PUT /cash-book/vouchers/${req.params.id}:`,
        error
      );

      res
        .status(error.status || 500)
        .json({
          success: false,
          message:
            error.message ||
            "Voucher update nahi hua.",
        });
    }
  }
);

router.delete(
  "/vouchers/:id",
  async (req, res) => {
    try {
      await withTransaction(
        async (connection) => {
          const voucherId = toPositiveId(
            req.params.id
          );

          if (!voucherId) {
            throw httpError(
              "Valid voucher id zaroori hai."
            );
          }

          const existing =
            await getVoucherById(
              connection,
              voucherId
            );

          if (!existing) {
            throw httpError(
              "Cash Book voucher nahi mila.",
              404
            );
          }

          await deleteVoucherItems(
            connection,
            voucherId
          );

          await runQuery(
            connection,
            `
              DELETE FROM cash_book_vouchers
              WHERE id = ?
            `,
            [voucherId]
          );

          await recalculateLegacyCashBook(
            connection
          );
        }
      );

      res.json({
        success: true,
        message:
          "Cash Book voucher delete ho gaya.",
      });
    } catch (error) {
      console.error(
        `DELETE /cash-book/vouchers/${req.params.id}:`,
        error
      );

      res
        .status(error.status || 500)
        .json({
          success: false,
          message:
            error.message ||
            "Voucher delete nahi hua.",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LEGACY CASH BOOK CRUD
|--------------------------------------------------------------------------
| Existing CashBookReportPage and older clients ke liye old API retained hai.
*/

router.get("/", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const rows = await runQuery(
      connection,
      `
        SELECT
          id,
          DATE_FORMAT(
            entry_date,
            '%Y-%m-%d'
          ) AS entry_date,
          description,
          cash_in,
          cash_out,
          balance
        FROM cash_book
        ORDER BY entry_date DESC, id DESC
      `
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  } finally {
    release();
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await withTransaction(
      async (connection) => {
        const entryDate =
          dateOnly(req.body.entry_date) ||
          today();

        const description =
          cleanText(req.body.description);

        const cashIn = toNumber(
          req.body.cash_in
        );

        const cashOut = toNumber(
          req.body.cash_out
        );

        if (!description) {
          throw httpError(
            "Description zaroori hai."
          );
        }

        if (cashIn <= 0 && cashOut <= 0) {
          throw httpError(
            "Cash In ya Cash Out amount enter karein."
          );
        }

        const inserted = await runQuery(
          connection,
          `
            INSERT INTO cash_book
            (
              entry_date,
              description,
              cash_in,
              cash_out,
              balance
            )
            VALUES (?, ?, ?, ?, 0)
          `,
          [
            entryDate,
            description,
            cashIn,
            cashOut,
          ]
        );

        await recalculateLegacyCashBook(
          connection
        );

        return inserted;
      }
    );

    res.json({
      message:
        "Cash Book entry save ho gayi.",
      id: result.insertId,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        message: error.message,
      });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await withTransaction(
      async (connection) => {
        const id = toPositiveId(req.params.id);

        if (!id) {
          throw httpError(
            "Valid entry id zaroori hai."
          );
        }

        await runQuery(
          connection,
          `
            UPDATE cash_book
            SET
              entry_date = ?,
              description = ?,
              cash_in = ?,
              cash_out = ?
            WHERE id = ?
          `,
          [
            dateOnly(req.body.entry_date) ||
              today(),
            cleanText(req.body.description),
            toNumber(req.body.cash_in),
            toNumber(req.body.cash_out),
            id,
          ]
        );

        await recalculateLegacyCashBook(
          connection
        );
      }
    );

    res.json({
      message:
        "Cash Book entry update ho gayi.",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        message: error.message,
      });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await withTransaction(
      async (connection) => {
        const id = toPositiveId(req.params.id);

        if (!id) {
          throw httpError(
            "Valid entry id zaroori hai."
          );
        }

        await runQuery(
          connection,
          `
            DELETE FROM cash_book
            WHERE id = ?
          `,
          [id]
        );

        await recalculateLegacyCashBook(
          connection
        );
      }
    );

    res.json({
      message:
        "Cash Book entry delete ho gayi.",
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({
        message: error.message,
      });
  }
});

module.exports = router;
