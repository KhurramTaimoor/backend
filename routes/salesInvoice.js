const express = require("express");
const router = express.Router();
const db = require("../db");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toNullableNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const cleanText = (v) => String(v ?? "").trim();

const toDateOrNull = (v) => {
  if (!v) return null;
  return String(v).slice(0, 10);
};

const formatDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

const normalizePartyType = (v) => {
  const value = cleanText(v || "customer").toLowerCase();
  if (["customer", "employee", "supplier", "general_ledger"].includes(value)) return value;
  return "customer";
};

function getInvoicePartyType(inv) {
  return normalizePartyType(
    inv.party_type ||
      inv.customer_type ||
      (inv.employee_id ? "employee" : inv.supplier_id ? "supplier" : inv.general_ledger_id ? "general_ledger" : "customer")
  );
}

function getInvoicePartyId(inv) {
  const type = getInvoicePartyType(inv);
  if (inv.party_id) return inv.party_id;
  if (type === "employee") return inv.employee_id || "";
  if (type === "supplier") return inv.supplier_id || "";
  if (type === "general_ledger") return inv.general_ledger_id || "";
  return inv.customer_id || "";
}

function getInvoicePartyName(inv) {
  return cleanText(
    inv.party_name ||
      inv.customer_name_en ||
      inv.customer_name ||
      inv.employee_name ||
      inv.supplier_name ||
      inv.general_ledger_name ||
      ""
  );
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const qty = toNum(item.qty ?? item.quantity ?? item.order_qty ?? item.pieces_qty ?? item.carton_qty);
      const rate = toNum(item.rate);
      const amount = toNum(item.amount, qty * rate);

      return {
        sr: toNum(item.sr, index + 1),
        category_id: toNullableNum(item.category_id),
        product_id: toNullableNum(item.product_id),
        product_description: cleanText(item.product_description || item.description || item.product_desc || ""),
        description: cleanText(item.description || item.product_description || item.product_desc || ""),
        unit_id: toNullableNum(item.unit_id),
        sale_type: cleanText(item.sale_type || "single") || "single",
        carton_qty: toNum(item.carton_qty),
        pieces_qty: toNum(item.pieces_qty),
        qty,
        quantity: qty,
        pieces_per_carton: toNum(item.pieces_per_carton),
        rate,
        amount,
        debit: toNum(item.debit),
        credit: toNum(item.credit),
      };
    })
    .filter((item) => item.product_id && item.amount > 0);
}

function buildInvoicePayload(body) {
  const items = normalizeItems(body.items || body.invoice_items || body.sales_invoice_items);
  const invoiceTotal = toNum(body.invoice_total, items.reduce((sum, item) => sum + toNum(item.amount), 0));
  const previousBalance = toNum(body.previous_balance);
  const deliveryCharges = toNum(body.delivery_charges ?? body.deliveryCharges);
  const discount = toNum(body.discount);
  const grandTotal = toNum(body.grand_total, invoiceTotal + previousBalance + deliveryCharges - discount);

  const partyType = normalizePartyType(body.party_type || body.customer_type);
  const partyId = toNullableNum(body.party_id);
  const partyName = cleanText(body.party_name || body.customer_name_en || body.customer_name || body.name || "");

  return {
    invoice_no: cleanText(body.invoice_no),
    reference_no: cleanText(body.reference_no),
    party_type: partyType,
    party_id: partyId,
    party_name: partyName,
    customer_type: partyType,
    customer_name_en: partyName,
    customer_name: partyName,
    customer_id: partyType === "customer" ? toNullableNum(body.customer_id || partyId) : null,
    employee_id: partyType === "employee" ? toNullableNum(body.employee_id || partyId) : null,
    supplier_id: partyType === "supplier" ? toNullableNum(body.supplier_id || partyId) : null,
    general_ledger_id: partyType === "general_ledger" ? toNullableNum(body.general_ledger_id || partyId) : null,
    invoice_date: toDateOrNull(body.invoice_date),
    shipment_to: cleanText(body.shipment_to),
    address: cleanText(body.address),
    previous_balance: previousBalance,
    delivery_charges: deliveryCharges,
    discount,
    invoice_total: invoiceTotal,
    total_amount: invoiceTotal,
    grand_total: grandTotal,
    total_qty: items.reduce((sum, item) => sum + toNum(item.qty), 0),
    items_count: items.length,
    status: cleanText(body.status || "Pending") || "Pending",
  };
}

async function getItemsForInvoiceIds(invoiceIds) {
  const ids = invoiceIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return {};

  const rows = await runQuery(
    `SELECT * FROM sales_invoice_items WHERE invoice_id IN (?) ORDER BY invoice_id ASC, id ASC`,
    [ids]
  );

  const map = {};
  rows.forEach((row) => {
    if (!map[row.invoice_id]) map[row.invoice_id] = [];
    map[row.invoice_id].push(row);
  });
  return map;
}

async function getInvoiceById(id) {
  const rows = await runQuery(`SELECT * FROM sales_invoices WHERE id = ?`, [id]);
  if (!rows[0]) return null;

  const itemsMap = await getItemsForInvoiceIds([id]);
  const inv = rows[0];

  return {
    ...inv,
    invoice_date: formatDate(inv.invoice_date),
    party_type: getInvoicePartyType(inv),
    party_id: getInvoicePartyId(inv),
    party_name: getInvoicePartyName(inv),
    customer_name: getInvoicePartyName(inv),
    items: itemsMap[inv.id] || [],
  };
}

async function insertInvoiceItems(invoiceId, items) {
  for (const item of items) {
    await runQuery(
      `INSERT INTO sales_invoice_items
       (invoice_id, sr, category_id, product_id, product_description, description, unit_id, sale_type,
        carton_qty, pieces_qty, qty, quantity, pieces_per_carton, rate, amount, debit, credit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        item.sr,
        item.category_id,
        item.product_id,
        item.product_description,
        item.description,
        item.unit_id,
        item.sale_type,
        item.carton_qty,
        item.pieces_qty,
        item.qty,
        item.quantity,
        item.pieces_per_carton,
        item.rate,
        item.amount,
        item.debit,
        item.credit,
      ]
    );
  }
}

// GET /api/sales-invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await runQuery(`SELECT * FROM sales_invoices ORDER BY id DESC`);
    const itemsMap = await getItemsForInvoiceIds(invoices.map((inv) => inv.id));

    const data = invoices.map((inv) => ({
      ...inv,
      invoice_date: formatDate(inv.invoice_date),
      party_type: getInvoicePartyType(inv),
      party_id: getInvoicePartyId(inv),
      party_name: getInvoicePartyName(inv),
      customer_name: getInvoicePartyName(inv),
      items_count: toNum(inv.items_count, (itemsMap[inv.id] || []).length),
      items: itemsMap[inv.id] || [],
    }));

    res.json({ success: true, data, invoices: data });
  } catch (err) {
    console.error("❌ GET /sales-invoices:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sales invoices." });
  }
});

// GET /api/sales-invoices/customer/:partyType/:partyId
router.get("/customer/:partyType/:partyId", async (req, res) => {
  try {
    const partyType = normalizePartyType(req.params.partyType);
    const partyId = Number(req.params.partyId);

    if (!partyId || partyId <= 0) {
      return res.status(400).json({ success: false, message: "Valid party id zaroori hai." });
    }

    const conditions = [`(party_type = ? AND party_id = ?)`];
    const params = [partyType, partyId];

    if (partyType === "customer") {
      conditions.push(`customer_id = ?`);
      params.push(partyId);
    }
    if (partyType === "employee") {
      conditions.push(`employee_id = ?`);
      params.push(partyId);
    }
    if (partyType === "supplier") {
      conditions.push(`supplier_id = ?`);
      params.push(partyId);
    }
    if (partyType === "general_ledger") {
      conditions.push(`general_ledger_id = ?`);
      params.push(partyId);
    }

    const invoices = await runQuery(
      `SELECT * FROM sales_invoices WHERE ${conditions.join(" OR ")} ORDER BY id DESC`,
      params
    );

    const itemsMap = await getItemsForInvoiceIds(invoices.map((inv) => inv.id));
    const data = invoices.map((inv) => ({
      ...inv,
      invoice_date: formatDate(inv.invoice_date),
      party_type: getInvoicePartyType(inv),
      party_id: getInvoicePartyId(inv),
      party_name: getInvoicePartyName(inv),
      customer_name: getInvoicePartyName(inv),
      items: itemsMap[inv.id] || [],
    }));

    res.json({ success: true, data, invoices: data });
  } catch (err) {
    console.error("❌ GET /sales-invoices/customer:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load customer invoices." });
  }
});

// POST /api/sales-invoices/bulk-print-data
router.post("/bulk-print-data", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((id) => id > 0) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "Invoice ids zaroori hain." });

    const invoices = await runQuery(`SELECT * FROM sales_invoices WHERE id IN (?) ORDER BY id DESC`, [ids]);
    const itemsMap = await getItemsForInvoiceIds(invoices.map((inv) => inv.id));

    const data = invoices.map((inv) => ({
      ...inv,
      invoice_date: formatDate(inv.invoice_date),
      party_type: getInvoicePartyType(inv),
      party_id: getInvoicePartyId(inv),
      party_name: getInvoicePartyName(inv),
      customer_name: getInvoicePartyName(inv),
      items: itemsMap[inv.id] || [],
    }));

    res.json({ success: true, data, invoices: data });
  } catch (err) {
    console.error("❌ POST /sales-invoices/bulk-print-data:", err);
    res.status(500).json({ success: false, message: err.message || "Bulk print data load failed." });
  }
});

// GET /api/sales-invoices/:id
router.get("/:id", async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Sales invoice nahi mili." });
    res.json({ success: true, data: invoice, invoice });
  } catch (err) {
    console.error(`❌ GET /sales-invoices/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sales invoice." });
  }
});

// POST /api/sales-invoices
router.post("/", async (req, res) => {
  try {
    const payload = buildInvoicePayload(req.body);
    const items = normalizeItems(req.body.items || req.body.invoice_items || req.body.sales_invoice_items);

    if (!payload.invoice_no) return res.status(400).json({ success: false, message: "Invoice No zaroori hai." });
    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({ success: false, message: "Customer Type aur Name zaroori hain." });
    }
    if (!items.length) return res.status(400).json({ success: false, message: "Kam az kam ek product zaroori hai." });

    const result = await runQuery(
      `INSERT INTO sales_invoices
       (invoice_no, reference_no, party_type, party_id, party_name, customer_type, customer_name_en, customer_name,
        customer_id, employee_id, supplier_id, general_ledger_id, invoice_date, shipment_to, address,
        previous_balance, delivery_charges, discount, invoice_total, total_amount, grand_total, total_qty, items_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.invoice_no,
        payload.reference_no,
        payload.party_type,
        payload.party_id,
        payload.party_name,
        payload.customer_type,
        payload.customer_name_en,
        payload.customer_name,
        payload.customer_id,
        payload.employee_id,
        payload.supplier_id,
        payload.general_ledger_id,
        payload.invoice_date,
        payload.shipment_to,
        payload.address,
        payload.previous_balance,
        payload.delivery_charges,
        payload.discount,
        payload.invoice_total,
        payload.total_amount,
        payload.grand_total,
        payload.total_qty,
        payload.items_count,
        payload.status,
      ]
    );

    const invoiceId = result.insertId;
    await insertInvoiceItems(invoiceId, items);

    const invoice = await getInvoiceById(invoiceId);
    res.json({ success: true, message: "Sales invoice save ho gayi!", data: invoice, invoice });
  } catch (err) {
    console.error("❌ POST /sales-invoices:", err);
    res.status(500).json({ success: false, message: err.message || "Sales invoice save failed." });
  }
});

// PUT /api/sales-invoices/:id
router.put("/:id", async (req, res) => {
  try {
    const payload = buildInvoicePayload(req.body);
    const items = normalizeItems(req.body.items || req.body.invoice_items || req.body.sales_invoice_items);

    if (!payload.invoice_no) return res.status(400).json({ success: false, message: "Invoice No zaroori hai." });
    if (!payload.party_type || !payload.party_id || !payload.party_name) {
      return res.status(400).json({ success: false, message: "Customer Type aur Name zaroori hain." });
    }
    if (!items.length) return res.status(400).json({ success: false, message: "Kam az kam ek product zaroori hai." });

    await runQuery(
      `UPDATE sales_invoices SET
        invoice_no = ?, reference_no = ?, party_type = ?, party_id = ?, party_name = ?, customer_type = ?,
        customer_name_en = ?, customer_name = ?, customer_id = ?, employee_id = ?, supplier_id = ?, general_ledger_id = ?,
        invoice_date = ?, shipment_to = ?, address = ?, previous_balance = ?, delivery_charges = ?, discount = ?,
        invoice_total = ?, total_amount = ?, grand_total = ?, total_qty = ?, items_count = ?, status = ?
       WHERE id = ?`,
      [
        payload.invoice_no,
        payload.reference_no,
        payload.party_type,
        payload.party_id,
        payload.party_name,
        payload.customer_type,
        payload.customer_name_en,
        payload.customer_name,
        payload.customer_id,
        payload.employee_id,
        payload.supplier_id,
        payload.general_ledger_id,
        payload.invoice_date,
        payload.shipment_to,
        payload.address,
        payload.previous_balance,
        payload.delivery_charges,
        payload.discount,
        payload.invoice_total,
        payload.total_amount,
        payload.grand_total,
        payload.total_qty,
        payload.items_count,
        payload.status,
        req.params.id,
      ]
    );

    await runQuery(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [req.params.id]);
    await insertInvoiceItems(req.params.id, items);

    const invoice = await getInvoiceById(req.params.id);
    res.json({ success: true, message: "Sales invoice update ho gayi!", data: invoice, invoice });
  } catch (err) {
    console.error(`❌ PUT /sales-invoices/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Sales invoice update failed." });
  }
});

// DELETE /api/sales-invoices/:id
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`, [req.params.id]).catch(() => {});
    await runQuery(`DELETE FROM sales_invoices WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: "Sales invoice delete ho gayi!" });
  } catch (err) {
    console.error(`❌ DELETE /sales-invoices/${req.params.id}:`, err);
    res.status(500).json({ success: false, message: err.message || "Sales invoice delete failed." });
  }
});

module.exports = router;
