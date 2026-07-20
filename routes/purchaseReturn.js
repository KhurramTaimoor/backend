const express = require("express");
const router = express.Router();
const db = require("../db");

/*
 * Purchase Return Route
 * - Existing purchase_returns / purchase_return_items schema compatible
 * - SalesReturnPage-style and old PurchaseReturn payload compatible
 * - Automatic invoice return + manual return support
 * - Prevents returning more than the purchased remaining quantity
 */

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
      resolve({ connection: db, release: () => {} });
      return;
    }

    db.getConnection((error, connection) => {
      if (error) return reject(error);
      resolve({
        connection,
        release: () => {
          if (typeof connection.release === "function") connection.release();
        },
      });
    });
  });

const beginTransaction = (connection) =>
  new Promise((resolve, reject) => {
    if (typeof connection.beginTransaction !== "function") return resolve();
    connection.beginTransaction((error) => {
      if (error) return reject(error);
      resolve();
    });
  });

const commit = (connection) =>
  new Promise((resolve, reject) => {
    if (typeof connection.commit !== "function") return resolve();
    connection.commit((error) => {
      if (error) return reject(error);
      resolve();
    });
  });

const rollback = (connection) =>
  new Promise((resolve) => {
    if (typeof connection.rollback !== "function") return resolve();
    connection.rollback(() => resolve());
  });

async function withTransaction(work) {
  const { connection, release } = await getConnection();

  try {
    await beginTransaction(connection);
    const result = await work(connection);
    await commit(connection);
    return result;
  } catch (error) {
    await rollback(connection);
    throw error;
  } finally {
    release();
  }
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const cleanText = (value) => String(value ?? "").trim();

const toDate = (value) => {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const getRowById = async (connection, table, id) => {
  if (!id) return null;

  const rows = await runQuery(
    connection,
    `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const pickName = (row, keys) => {
  if (!row) return "";
  for (const key of keys) {
    const value = cleanText(row[key]);
    if (value) return value;
  }
  return "";
};

function getBodyItems(body = {}) {
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.returns)) return body.returns;
  if (Array.isArray(body.return_items)) return body.return_items;
  if (Array.isArray(body.purchase_return_items)) {
    return body.purchase_return_items;
  }

  const hasSingleItem =
    body.product_id ||
    body.product_name ||
    body.manual_product_name ||
    body.return_qty ||
    body.quantity;

  return hasSingleItem ? [body] : [];
}

function normalizeRawItem(item = {}) {
  const quantity = toNumber(
    firstDefined(item.return_qty, item.qty, item.quantity)
  );
  const rate = toNumber(item.rate);
  const amount = toNumber(
    firstDefined(item.return_amount, item.amount),
    quantity * rate
  );

  return {
    product_id: toPositiveId(item.product_id),
    product_name: cleanText(
      item.product_name ||
        item.manual_product_name ||
        item.product_description ||
        item.description
    ),
    category_id: toPositiveId(item.category_id),
    category_name: cleanText(item.category_name),
    unit_id: toPositiveId(item.unit_id),
    unit_name: cleanText(item.unit_name),
    product_type_id: toPositiveId(item.product_type_id),
    type_name: cleanText(
      item.type_name || item.product_type || item.product_type_name
    ),
    quantity,
    rate,
    amount: Number(amount.toFixed(2)),
  };
}

async function getOrCreateProduct(connection, item) {
  let product = null;

  if (item.product_id) {
    product = await getRowById(connection, "products", item.product_id);
  }

  if (!product && item.product_name) {
    const rows = await runQuery(
      connection,
      "SELECT * FROM products WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?)) LIMIT 1",
      [item.product_name]
    );
    product = rows[0] || null;
  }

  if (!product && item.product_name) {
    const result = await runQuery(
      connection,
      "INSERT INTO products (product_name) VALUES (?)",
      [item.product_name]
    );
    product = {
      id: result.insertId,
      product_name: item.product_name,
    };
  }

  return product;
}

async function enrichItem(connection, rawItem) {
  const item = normalizeRawItem(rawItem);
  const product = await getOrCreateProduct(connection, item);

  const category =
    item.category_id || product?.category_id
      ? await getRowById(
          connection,
          "categories",
          item.category_id || product?.category_id
        ).catch(() => null)
      : null;

  const unit =
    item.unit_id || product?.unit_id
      ? await getRowById(
          connection,
          "units",
          item.unit_id || product?.unit_id
        ).catch(() => null)
      : null;

  const productType =
    item.product_type_id || product?.product_type_id
      ? await getRowById(
          connection,
          "product_types",
          item.product_type_id || product?.product_type_id
        ).catch(() => null)
      : null;

  return {
    ...item,
    product_id: product?.id || item.product_id,
    product_name:
      item.product_name ||
      pickName(product, ["product_name", "name", "name_en"]),
    category_id: item.category_id || product?.category_id || null,
    category_name:
      item.category_name ||
      pickName(category, ["category_name", "name", "name_en"]),
    unit_id: item.unit_id || product?.unit_id || null,
    unit_name:
      item.unit_name ||
      pickName(unit, ["unit_name", "name", "name_en", "symbol"]),
    product_type_id:
      item.product_type_id || product?.product_type_id || null,
    type_name:
      item.type_name ||
      pickName(productType, [
        "product_type_en",
        "product_type",
        "type_name",
        "name",
        "name_en",
      ]),
  };
}

async function prepareItems(connection, body) {
  const rawItems = getBodyItems(body);
  const items = [];

  for (const rawItem of rawItems) {
    const item = await enrichItem(connection, rawItem);

    if (!item.product_id && !item.product_name) continue;
    if (item.quantity <= 0) continue;

    items.push({
      ...item,
      amount: Number((item.quantity * item.rate).toFixed(2)),
    });
  }

  return items;
}

async function resolveSupplier(connection, body = {}) {
  let supplierId = toPositiveId(
    body.supplier_id ||
      (cleanText(body.party_type || body.customer_type).toLowerCase() ===
      "supplier"
        ? body.party_id
        : null)
  );

  let supplierName = cleanText(
    body.supplier_name ||
      body.party_name ||
      body.customer_name ||
      body.customer_name_en
  );

  if (supplierId && !supplierName) {
    const supplier = await getRowById(
      connection,
      "suppliers",
      supplierId
    ).catch(() => null);
    supplierName = pickName(supplier, ["supplier_name"]);
  }

  return { supplierId, supplierName };
}

async function getInvoice(connection, invoiceId) {
  const rows = await runQuery(
    connection,
    "SELECT * FROM purchase_invoices WHERE id = ? LIMIT 1",
    [invoiceId]
  );
  return rows[0] || null;
}

async function getInvoiceItems(connection, invoiceId) {
  return runQuery(
    connection,
    `
      SELECT
        pii.id,
        pii.invoice_id,
        pii.product_id,
        COALESCE(p.product_name, '') AS product_name,
        pii.unit_name,
        pii.category_name,
        pii.type_name,
        pii.quantity,
        pii.rate,
        pii.amount
      FROM purchase_invoice_items pii
      LEFT JOIN products p ON p.id = pii.product_id
      WHERE pii.invoice_id = ?
      ORDER BY pii.id ASC
    `,
    [invoiceId]
  );
}

async function createManualInvoice(connection, body, items) {
  const supplier = await resolveSupplier(connection, body);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const date = toDate(body.return_date) || new Date().toISOString().slice(0, 10);
  const invoiceNo =
    cleanText(body.invoice_no || body.invoice_ref) ||
    `PR-MANUAL-${Date.now()}`;

  const result = await runQuery(
    connection,
    `
      INSERT INTO purchase_invoices
        (
          invoice_no,
          supplier_name,
          invoice_date,
          total_amount,
          debit,
          credit,
          status
        )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      invoiceNo,
      supplier.supplierName || "Manual Supplier Return",
      date,
      total,
      total,
      0,
      "return-only",
    ]
  );

  for (const item of items) {
    await runQuery(
      connection,
      `
        INSERT INTO purchase_invoice_items
          (
            invoice_id,
            product_id,
            unit_name,
            category_name,
            type_name,
            quantity,
            rate,
            amount
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        result.insertId,
        item.product_id,
        item.unit_name || null,
        item.category_name || null,
        item.type_name || null,
        item.quantity,
        item.rate,
        item.amount,
      ]
    );
  }

  return result.insertId;
}

const itemKey = (item) => {
  if (item.product_id) return `id:${item.product_id}`;
  return `name:${cleanText(item.product_name).toLowerCase()}|${cleanText(
    item.unit_name
  ).toLowerCase()}`;
};

async function validateAvailableQuantities(
  connection,
  invoiceId,
  items,
  excludeReturnId = null,
  skipValidation = false
) {
  if (skipValidation) return;

  const purchasedItems = await getInvoiceItems(connection, invoiceId);
  const purchasedMap = new Map();

  for (const item of purchasedItems) {
    const key = itemKey(item);
    purchasedMap.set(
      key,
      toNumber(purchasedMap.get(key)) + toNumber(item.quantity)
    );
  }

  let returnedSql = `
    SELECT
      pri.product_id,
      COALESCE(p.product_name, '') AS product_name,
      pri.unit_name,
      SUM(pri.quantity) AS returned_qty
    FROM purchase_return_items pri
    INNER JOIN purchase_returns pr ON pr.id = pri.return_id
    LEFT JOIN products p ON p.id = pri.product_id
    WHERE pr.invoice_id = ?
  `;
  const returnedParams = [invoiceId];

  if (excludeReturnId) {
    returnedSql += " AND pr.id <> ?";
    returnedParams.push(excludeReturnId);
  }

  returnedSql += `
    GROUP BY pri.product_id, p.product_name, pri.unit_name
  `;

  const returnedRows = await runQuery(
    connection,
    returnedSql,
    returnedParams
  );
  const returnedMap = new Map();

  for (const item of returnedRows) {
    const key = itemKey(item);
    returnedMap.set(key, toNumber(item.returned_qty));
  }

  for (const item of items) {
    const key = itemKey(item);
    const purchased = toNumber(purchasedMap.get(key));
    const returned = toNumber(returnedMap.get(key));
    const remaining = Math.max(purchased - returned, 0);

    if (!purchasedMap.has(key)) {
      const error = new Error(
        `${item.product_name || "Selected product"} is invoice mein nahi hai.`
      );
      error.status = 400;
      throw error;
    }

    if (item.quantity > remaining) {
      const error = new Error(
        `${item.product_name || "Selected product"} ki maximum return quantity ${remaining} hai.`
      );
      error.status = 400;
      throw error;
    }
  }
}

async function getReturnItems(connection, returnId) {
  const rows = await runQuery(
    connection,
    `
      SELECT
        pri.id,
        pri.return_id,
        pri.product_id,
        COALESCE(p.product_name, '') AS product_name,
        pri.unit_name,
        pri.category_name,
        pri.type_name,
        pri.quantity,
        pri.rate,
        pri.amount
      FROM purchase_return_items pri
      LEFT JOIN products p ON p.id = pri.product_id
      WHERE pri.return_id = ?
      ORDER BY pri.id ASC
    `,
    [returnId]
  );

  return rows.map((row) => ({
    id: row.id,
    return_id: row.return_id,
    product_id: row.product_id,
    product_name: row.product_name || "",
    manual_product_name: row.product_name || "",
    unit_name: row.unit_name || "",
    category_name: row.category_name || "",
    type_name: row.type_name || "",
    product_type: row.type_name || "",
    quantity: toNumber(row.quantity),
    qty: toNumber(row.quantity),
    return_qty: toNumber(row.quantity),
    rate: toNumber(row.rate),
    amount: toNumber(row.amount),
    return_amount: toNumber(row.amount),
  }));
}

async function resolveSupplierIdByName(connection, name) {
  if (!name) return null;
  const rows = await runQuery(
    connection,
    "SELECT id FROM suppliers WHERE LOWER(TRIM(supplier_name)) = LOWER(TRIM(?)) LIMIT 1",
    [name]
  ).catch(() => []);
  return rows[0]?.id || null;
}

async function normalizeReturnResponse(connection, row) {
  const items = await getReturnItems(connection, row.id);
  const supplierName = cleanText(row.supplier_name);
  const supplierId = await resolveSupplierIdByName(
    connection,
    supplierName
  );

  return {
    id: row.id,
    return_no: `purchase-return${String(row.id).padStart(2, "0")}`,
    return_mode: row.invoice_id ? "auto" : "manual",
    invoice_id: row.invoice_id || "",
    invoice_ref: row.invoice_no || "",
    invoice_no: row.invoice_no || "",
    party_type: "supplier",
    party_id: supplierId || "",
    party_name: supplierName,
    customer_name: supplierName,
    supplier_id: supplierId || "",
    supplier_name: supplierName,
    return_date: toDate(row.return_date),
    reason: row.reason || "",
    total_amount: toNumber(row.total_amount),
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    status: "Saved",
    items,
  };
}

async function getReturnById(connection, id) {
  const rows = await runQuery(
    connection,
    `
      SELECT
        pr.*,
        pi.invoice_no,
        pi.supplier_name
      FROM purchase_returns pr
      LEFT JOIN purchase_invoices pi ON pi.id = pr.invoice_id
      WHERE pr.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) return null;
  return normalizeReturnResponse(connection, rows[0]);
}

async function insertItems(connection, returnId, items) {
  for (const item of items) {
    await runQuery(
      connection,
      `
        INSERT INTO purchase_return_items
          (
            return_id,
            product_id,
            unit_name,
            category_name,
            type_name,
            quantity,
            rate,
            amount
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        returnId,
        item.product_id,
        item.unit_name || null,
        item.category_name || null,
        item.type_name || null,
        item.quantity,
        item.rate,
        item.amount,
      ]
    );
  }
}

async function prepareReturnRequest(
  connection,
  body,
  excludeReturnId = null
) {
  const items = await prepareItems(connection, body);

  if (!items.length) {
    const error = new Error("Kam az kam aik valid return item zaroori hai.");
    error.status = 400;
    throw error;
  }

  let invoiceId = toPositiveId(body.invoice_id);
  const returnMode = cleanText(body.return_mode).toLowerCase();
  let manualInvoiceCreated = false;

  if (!invoiceId) {
    if (returnMode && returnMode !== "manual") {
      const error = new Error("Purchase invoice zaroori hai.");
      error.status = 400;
      throw error;
    }

    invoiceId = await createManualInvoice(connection, body, items);
    manualInvoiceCreated = true;
  }

  const invoice = await getInvoice(connection, invoiceId);

  if (!invoice) {
    const error = new Error("Related purchase invoice nahi mili.");
    error.status = 404;
    throw error;
  }

  await validateAvailableQuantities(
    connection,
    invoiceId,
    items,
    excludeReturnId,
    manualInvoiceCreated || invoice.status === "return-only"
  );

  const calculatedTotal = items.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const total = toNumber(body.total_amount, calculatedTotal);
  const debit = toNumber(body.debit);
  const credit = toNumber(body.credit, total);

  return {
    invoiceId,
    items,
    header: {
      return_date:
        toDate(body.return_date) || new Date().toISOString().slice(0, 10),
      reason: cleanText(body.reason),
      total_amount: Number(total.toFixed(2)),
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
    },
  };
}

// GET /api/purchase-returns
router.get("/", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const rows = await runQuery(
      connection,
      `
        SELECT
          pr.*,
          pi.invoice_no,
          pi.supplier_name
        FROM purchase_returns pr
        LEFT JOIN purchase_invoices pi ON pi.id = pr.invoice_id
        ORDER BY pr.id DESC
      `
    );

    const data = [];
    for (const row of rows) {
      data.push(await normalizeReturnResponse(connection, row));
    }

    // Array response keeps old Purchase Return frontend compatible.
    res.json(data);
  } catch (error) {
    console.error("GET /purchase-returns:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Purchase returns load nahi ho sakin.",
      message: error.message || "Purchase returns load nahi ho sakin.",
    });
  } finally {
    release();
  }
});

// Availability helper for automatic return UI
router.get("/invoice/:invoiceId/availability", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const invoiceId = toPositiveId(req.params.invoiceId);
    const invoice = await getInvoice(connection, invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Purchase invoice nahi mili.",
      });
    }

    const purchasedItems = await getInvoiceItems(connection, invoiceId);
    const returnedRows = await runQuery(
      connection,
      `
        SELECT
          pri.product_id,
          COALESCE(p.product_name, '') AS product_name,
          pri.unit_name,
          SUM(pri.quantity) AS returned_qty
        FROM purchase_return_items pri
        INNER JOIN purchase_returns pr ON pr.id = pri.return_id
        LEFT JOIN products p ON p.id = pri.product_id
        WHERE pr.invoice_id = ?
        GROUP BY pri.product_id, p.product_name, pri.unit_name
      `,
      [invoiceId]
    );

    const returnedMap = new Map(
      returnedRows.map((row) => [itemKey(row), toNumber(row.returned_qty)])
    );

    const data = purchasedItems.map((item) => {
      const purchasedQty = toNumber(item.quantity);
      const returnedQty = toNumber(returnedMap.get(itemKey(item)));

      return {
        ...item,
        purchased_qty: purchasedQty,
        already_returned_qty: returnedQty,
        remaining_qty: Math.max(purchasedQty - returnedQty, 0),
      };
    });

    res.json({ success: true, data, items: data });
  } catch (error) {
    console.error(
      `GET /purchase-returns/invoice/${req.params.invoiceId}/availability:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message || "Return availability load nahi hui.",
    });
  } finally {
    release();
  }
});

// GET /api/purchase-returns/:id
router.get("/:id", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const purchaseReturn = await getReturnById(
      connection,
      toPositiveId(req.params.id)
    );

    if (!purchaseReturn) {
      return res.status(404).json({
        success: false,
        error: "Purchase return nahi mila.",
        message: "Purchase return nahi mila.",
      });
    }

    res.json({
      success: true,
      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error(`GET /purchase-returns/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Purchase return load nahi hua.",
      message: error.message || "Purchase return load nahi hua.",
    });
  } finally {
    release();
  }
});

// POST /api/purchase-returns
router.post("/", async (req, res) => {
  try {
    const purchaseReturn = await withTransaction(async (connection) => {
      const { invoiceId, header, items } = await prepareReturnRequest(
        connection,
        req.body
      );

      const result = await runQuery(
        connection,
        `
          INSERT INTO purchase_returns
            (
              invoice_id,
              return_date,
              reason,
              total_amount,
              debit,
              credit
            )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          invoiceId,
          header.return_date,
          header.reason,
          header.total_amount,
          header.debit,
          header.credit,
        ]
      );

      await insertItems(connection, result.insertId, items);
      return getReturnById(connection, result.insertId);
    });

    res.json({
      success: true,
      message: "Purchase return save ho gaya!",
      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error("POST /purchase-returns:", error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "Purchase return save nahi hua.",
      message: error.message || "Purchase return save nahi hua.",
    });
  }
});

// PUT /api/purchase-returns/:id
router.put("/:id", async (req, res) => {
  try {
    const purchaseReturn = await withTransaction(async (connection) => {
      const returnId = toPositiveId(req.params.id);
      const existing = await getReturnById(connection, returnId);

      if (!existing) {
        const error = new Error("Purchase return nahi mila.");
        error.status = 404;
        throw error;
      }

      const { invoiceId, header, items } = await prepareReturnRequest(
        connection,
        req.body,
        returnId
      );

      await runQuery(
        connection,
        `
          UPDATE purchase_returns
          SET
            invoice_id = ?,
            return_date = ?,
            reason = ?,
            total_amount = ?,
            debit = ?,
            credit = ?
          WHERE id = ?
        `,
        [
          invoiceId,
          header.return_date,
          header.reason,
          header.total_amount,
          header.debit,
          header.credit,
          returnId,
        ]
      );

      await runQuery(
        connection,
        "DELETE FROM purchase_return_items WHERE return_id = ?",
        [returnId]
      );
      await insertItems(connection, returnId, items);

      return getReturnById(connection, returnId);
    });

    res.json({
      success: true,
      message: "Purchase return update ho gaya!",
      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error(`PUT /purchase-returns/${req.params.id}:`, error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "Purchase return update nahi hua.",
      message: error.message || "Purchase return update nahi hua.",
    });
  }
});

// DELETE /api/purchase-returns/:id
router.delete("/:id", async (req, res) => {
  try {
    await withTransaction(async (connection) => {
      const returnId = toPositiveId(req.params.id);
      const existing = await getReturnById(connection, returnId);

      if (!existing) {
        const error = new Error("Purchase return nahi mila.");
        error.status = 404;
        throw error;
      }

      await runQuery(
        connection,
        "DELETE FROM purchase_return_items WHERE return_id = ?",
        [returnId]
      );
      await runQuery(
        connection,
        "DELETE FROM purchase_returns WHERE id = ?",
        [returnId]
      );
    });

    res.json({
      success: true,
      message: "Purchase return delete ho gaya!",
    });
  } catch (error) {
    console.error(`DELETE /purchase-returns/${req.params.id}:`, error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || "Purchase return delete nahi hua.",
      message: error.message || "Purchase return delete nahi hua.",
    });
  }
});

module.exports = router;
