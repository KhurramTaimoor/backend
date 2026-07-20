const express = require("express");
const router = express.Router();
const db = require("../db");

/*
 * Purchase Invoice Route
 * - Existing purchase_invoices / purchase_invoice_items schema compatible
 * - SalesInvoicePage-style payload compatible
 * - Supplier only
 * - Shipment field intentionally ignored
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

function getRawItems(body = {}) {
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.invoice_items)) return body.invoice_items;
  if (Array.isArray(body.sales_invoice_items)) return body.sales_invoice_items;
  if (Array.isArray(body.purchase_invoice_items)) return body.purchase_invoice_items;
  return [];
}

function normalizeRawItem(item = {}, index = 0) {
  const quantity = toNumber(
    firstDefined(
      item.qty,
      item.quantity,
      item.order_qty,
      item.pieces_qty,
      item.carton_qty
    )
  );
  const rate = toNumber(item.rate);
  const amount = toNumber(
    firstDefined(item.amount, item.line_total),
    quantity * rate
  );

  return {
    sr: toNumber(item.sr, index + 1),
    product_id: toPositiveId(item.product_id),
    product_name: cleanText(
      item.product_name ||
        item.item_name ||
        item.product_description ||
        item.description
    ),
    product_description: cleanText(
      item.product_description || item.description || item.product_name
    ),
    category_id: toPositiveId(item.category_id),
    category_name: cleanText(item.category_name),
    unit_id: toPositiveId(item.unit_id),
    unit_name: cleanText(item.unit_name),
    product_type_id: toPositiveId(item.product_type_id),
    type_name: cleanText(
      item.type_name || item.product_type || item.product_type_name
    ),
    sale_type: cleanText(item.sale_type || "single") || "single",
    carton_qty: toNumber(item.carton_qty),
    pieces_qty: toNumber(item.pieces_qty, quantity),
    qty: quantity,
    quantity,
    pieces_per_carton: toNumber(item.pieces_per_carton),
    rate,
    amount,
    debit: toNumber(item.debit),
    credit: toNumber(item.credit),
  };
}

async function getRowById(connection, table, id) {
  if (!id) return null;
  const rows = await runQuery(
    connection,
    `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

function pickName(row, keys) {
  if (!row) return "";
  for (const key of keys) {
    const value = cleanText(row[key]);
    if (value) return value;
  }
  return "";
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

async function enrichItem(connection, rawItem, index) {
  const item = normalizeRawItem(rawItem, index);
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
    product_description:
      item.product_description ||
      pickName(product, ["product_description", "description"]),
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
  const rawItems = getRawItems(body);
  const items = [];

  for (let index = 0; index < rawItems.length; index += 1) {
    const item = await enrichItem(connection, rawItems[index], index);

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

  let name = cleanText(
    body.supplier_name ||
      body.party_name ||
      body.customer_name_en ||
      body.customer_name ||
      body.name
  );

  if (supplierId && !name) {
    const supplier = await getRowById(
      connection,
      "suppliers",
      supplierId
    ).catch(() => null);
    name = pickName(supplier, ["supplier_name", "name", "name_en"]);
  }

  if (!supplierId && name) {
    const rows = await runQuery(
      connection,
      "SELECT id, supplier_name FROM suppliers WHERE LOWER(TRIM(supplier_name)) = LOWER(TRIM(?)) LIMIT 1",
      [name]
    ).catch(() => []);

    if (rows[0]) {
      supplierId = rows[0].id;
      name = rows[0].supplier_name || name;
    }
  }

  return { supplierId, supplierName: name };
}

function buildHeader(body, items, supplier) {
  const calculatedTotal = items.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );

  const invoiceTotal = toNumber(
    firstDefined(body.invoice_total, body.total_amount),
    calculatedTotal
  );

  const previousBalance = toNumber(body.previous_balance);
  const deliveryCharges = toNumber(
    firstDefined(body.delivery_charges, body.deliveryCharges)
  );
  const discount = toNumber(body.discount);

  const grandTotal = toNumber(
    body.grand_total,
    invoiceTotal + previousBalance + deliveryCharges - discount
  );

  const paidAmount = toNumber(
    firstDefined(
      body.credit,
      body.paid_amount,
      body.payment_received,
      body.advance_receive
    )
  );

  return {
    invoice_no: cleanText(body.invoice_no),
    supplier_id: supplier.supplierId,
    supplier_name: supplier.supplierName,
    invoice_date: toDate(body.invoice_date),
    total_amount: Number(grandTotal.toFixed(2)),
    debit: toNumber(body.debit, Number(grandTotal.toFixed(2))),
    credit: Number(paidAmount.toFixed(2)),
    status: cleanText(body.status || body.payment_status || "pending") || "pending",
    reference_no: cleanText(body.reference_no),
    previous_balance: previousBalance,
    delivery_charges: deliveryCharges,
    discount,
    invoice_total: invoiceTotal,
    grand_total: grandTotal,
  };
}

async function getInvoiceItems(connection, invoiceId) {
  const rows = await runQuery(
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
        pii.amount,
        p.category_id,
        p.unit_id,
        p.product_type_id
      FROM purchase_invoice_items pii
      LEFT JOIN products p ON p.id = pii.product_id
      WHERE pii.invoice_id = ?
      ORDER BY pii.id ASC
    `,
    [invoiceId]
  );

  return rows.map((row, index) => {
    const quantity = toNumber(row.quantity);
    const rate = toNumber(row.rate);
    const amount = toNumber(row.amount, quantity * rate);

    return {
      id: row.id,
      invoice_id: row.invoice_id,
      sr: index + 1,
      product_id: row.product_id,
      product_name: row.product_name || "",
      product_description: row.product_name || "",
      description: row.product_name || "",
      category_id: row.category_id || null,
      category_name: row.category_name || "",
      unit_id: row.unit_id || null,
      unit_name: row.unit_name || "",
      product_type_id: row.product_type_id || null,
      type_name: row.type_name || "",
      product_type: row.type_name || "",
      sale_type: "single",
      carton_qty: 0,
      pieces_qty: quantity,
      qty: quantity,
      quantity,
      pieces_per_carton: 0,
      rate,
      amount,
      debit: 0,
      credit: 0,
    };
  });
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

async function normalizeInvoiceResponse(connection, row) {
  const items = await getInvoiceItems(connection, row.id);
  const supplierName = cleanText(row.supplier_name);
  const supplierId = await resolveSupplierIdByName(
    connection,
    supplierName
  );
  const total = toNumber(row.total_amount);
  const debit = toNumber(row.debit, total);
  const credit = toNumber(row.credit);
  const totalQty = items.reduce((sum, item) => sum + toNumber(item.qty), 0);

  return {
    id: row.id,
    invoice_no: row.invoice_no || "",
    reference_no: "",
    party_type: "supplier",
    party_id: supplierId || "",
    party_name: supplierName,
    customer_type: "supplier",
    customer_name: supplierName,
    customer_name_en: supplierName,
    supplier_id: supplierId || "",
    supplier_name: supplierName,
    invoice_date: toDate(row.invoice_date),
    address: "",
    previous_balance: 0,
    delivery_charges: 0,
    discount: 0,
    invoice_total: total,
    total_amount: total,
    grand_total: total,
    total_qty: totalQty,
    items_count: items.length,
    debit,
    credit,
    paid_amount: credit,
    remaining_balance: Math.max(debit - credit, 0),
    payment_status: row.status || "pending",
    status: row.status || "pending",
    items,
  };
}

async function getInvoiceById(connection, id) {
  const rows = await runQuery(
    connection,
    "SELECT * FROM purchase_invoices WHERE id = ? LIMIT 1",
    [id]
  );

  if (!rows[0]) return null;
  return normalizeInvoiceResponse(connection, rows[0]);
}

async function insertItems(connection, invoiceId, items) {
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
        invoiceId,
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

async function validateInvoiceRequest(connection, body) {
  const items = await prepareItems(connection, body);
  const supplier = await resolveSupplier(connection, body);
  const header = buildHeader(body, items, supplier);

  if (!header.invoice_no) {
    const error = new Error("Invoice No zaroori hai.");
    error.status = 400;
    throw error;
  }

  if (!header.supplier_name) {
    const error = new Error("Supplier zaroori hai.");
    error.status = 400;
    throw error;
  }

  if (!items.length) {
    const error = new Error("Kam az kam aik valid product zaroori hai.");
    error.status = 400;
    throw error;
  }

  return { header, items };
}

// GET /api/purchase-invoices
router.get("/", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const rows = await runQuery(
      connection,
      "SELECT * FROM purchase_invoices ORDER BY id DESC"
    );

    const data = [];
    for (const row of rows) {
      data.push(await normalizeInvoiceResponse(connection, row));
    }

    // Array response keeps the old Purchase page compatible.
    res.json(data);
  } catch (error) {
    console.error("GET /purchase-invoices:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Purchase invoices load nahi ho sakin.",
    });
  } finally {
    release();
  }
});

// Sales-style supplier invoice filter
router.get("/customer/:partyType/:partyId", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    if (cleanText(req.params.partyType).toLowerCase() !== "supplier") {
      return res.json({ success: true, data: [], invoices: [] });
    }

    const supplier = await getRowById(
      connection,
      "suppliers",
      toPositiveId(req.params.partyId)
    );

    if (!supplier) {
      return res.json({ success: true, data: [], invoices: [] });
    }

    const name = pickName(supplier, ["supplier_name"]);
    const rows = await runQuery(
      connection,
      `
        SELECT *
        FROM purchase_invoices
        WHERE LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))
        ORDER BY id DESC
      `,
      [name]
    );

    const data = [];
    for (const row of rows) {
      data.push(await normalizeInvoiceResponse(connection, row));
    }

    res.json({ success: true, data, invoices: data });
  } catch (error) {
    console.error("GET /purchase-invoices/customer:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Supplier invoices load nahi ho sakin.",
    });
  } finally {
    release();
  }
});

// Sales-style bulk print
router.post("/bulk-print-data", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(toPositiveId).filter(Boolean)
      : [];

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: "Invoice ids zaroori hain.",
      });
    }

    const rows = await runQuery(
      connection,
      "SELECT * FROM purchase_invoices WHERE id IN (?) ORDER BY id DESC",
      [ids]
    );

    const data = [];
    for (const row of rows) {
      data.push(await normalizeInvoiceResponse(connection, row));
    }

    res.json({ success: true, data, invoices: data });
  } catch (error) {
    console.error("POST /purchase-invoices/bulk-print-data:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Bulk print data load nahi hua.",
    });
  } finally {
    release();
  }
});

// GET /api/purchase-invoices/:id
router.get("/:id", async (req, res) => {
  const { connection, release } = await getConnection();

  try {
    const invoice = await getInvoiceById(
      connection,
      toPositiveId(req.params.id)
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Purchase invoice nahi mili.",
      });
    }

    res.json({ success: true, data: invoice, invoice });
  } catch (error) {
    console.error(`GET /purchase-invoices/${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Purchase invoice load nahi hui.",
    });
  } finally {
    release();
  }
});

// POST /api/purchase-invoices
router.post("/", async (req, res) => {
  try {
    const invoice = await withTransaction(async (connection) => {
      const { header, items } = await validateInvoiceRequest(
        connection,
        req.body
      );

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
          header.invoice_no,
          header.supplier_name,
          header.invoice_date,
          header.total_amount,
          header.debit,
          header.credit,
          header.status,
        ]
      );

      await insertItems(connection, result.insertId, items);
      return getInvoiceById(connection, result.insertId);
    });

    res.json({
      success: true,
      message: "Purchase invoice save ho gayi!",
      data: invoice,
      invoice,
    });
  } catch (error) {
    console.error("POST /purchase-invoices:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Purchase invoice save nahi hui.",
    });
  }
});

// PUT /api/purchase-invoices/:id
router.put("/:id", async (req, res) => {
  try {
    const invoice = await withTransaction(async (connection) => {
      const invoiceId = toPositiveId(req.params.id);
      const existing = await getInvoiceById(connection, invoiceId);

      if (!existing) {
        const error = new Error("Purchase invoice nahi mili.");
        error.status = 404;
        throw error;
      }

      const { header, items } = await validateInvoiceRequest(
        connection,
        req.body
      );

      await runQuery(
        connection,
        `
          UPDATE purchase_invoices
          SET
            invoice_no = ?,
            supplier_name = ?,
            invoice_date = ?,
            total_amount = ?,
            debit = ?,
            credit = ?,
            status = ?
          WHERE id = ?
        `,
        [
          header.invoice_no,
          header.supplier_name,
          header.invoice_date,
          header.total_amount,
          header.debit,
          header.credit,
          header.status,
          invoiceId,
        ]
      );

      await runQuery(
        connection,
        "DELETE FROM purchase_invoice_items WHERE invoice_id = ?",
        [invoiceId]
      );
      await insertItems(connection, invoiceId, items);

      return getInvoiceById(connection, invoiceId);
    });

    res.json({
      success: true,
      message: "Purchase invoice update ho gayi!",
      data: invoice,
      invoice,
    });
  } catch (error) {
    console.error(`PUT /purchase-invoices/${req.params.id}:`, error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Purchase invoice update nahi hui.",
    });
  }
});

// DELETE /api/purchase-invoices/:id
router.delete("/:id", async (req, res) => {
  try {
    await withTransaction(async (connection) => {
      const invoiceId = toPositiveId(req.params.id);
      const existing = await getInvoiceById(connection, invoiceId);

      if (!existing) {
        const error = new Error("Purchase invoice nahi mili.");
        error.status = 404;
        throw error;
      }

      const returnRows = await runQuery(
        connection,
        "SELECT id FROM purchase_returns WHERE invoice_id = ? LIMIT 1",
        [invoiceId]
      ).catch(() => []);

      if (returnRows.length) {
        const error = new Error(
          "Is invoice ke purchase returns maujood hain. Pehle returns delete karein."
        );
        error.status = 409;
        throw error;
      }

      await runQuery(
        connection,
        "DELETE FROM purchase_invoice_items WHERE invoice_id = ?",
        [invoiceId]
      );
      await runQuery(
        connection,
        "DELETE FROM purchase_invoices WHERE id = ?",
        [invoiceId]
      );
    });

    res.json({
      success: true,
      message: "Purchase invoice delete ho gayi!",
    });
  } catch (error) {
    console.error(`DELETE /purchase-invoices/${req.params.id}:`, error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Purchase invoice delete nahi hui.",
    });
  }
});

module.exports = router;
