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

const cleanText = (v) => String(v ?? "").trim();

const toNum = (v, fallback = 0) => {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toNullableNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toDateOrNull = (v) => {
  if (!v) return null;
  return String(v).slice(0, 10);
};

const formatDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

const pickText = (obj, keys, fallback = "") => {
  for (const key of keys) {
    const val = obj?.[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  return fallback;
};

function getListFromBody(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.items)) return body.items;
  if (Array.isArray(body.returns)) return body.returns;
  if (Array.isArray(body.return_items)) return body.return_items;
  return [body];
}

function normalizeReturnPayload(body, parent = {}) {
  const returnQty = toNum(body.return_qty ?? body.qty);
  const rate = toNum(body.rate);
  const amount = toNum(body.return_amount, returnQty * rate);

  const productName = cleanText(
    body.product_name ||
      body.manual_product_name ||
      body.item_name ||
      body.name ||
      ""
  );

  const partyName = cleanText(
    body.party_name ||
      body.customer_name ||
      parent.party_name ||
      parent.customer_name ||
      ""
  );

  const invoiceNo = cleanText(
    body.invoice_no ||
      body.invoice_ref ||
      parent.invoice_no ||
      parent.invoice_ref ||
      ""
  );

  return {
    return_no: cleanText(parent.return_no || body.return_no),
    return_mode: cleanText(parent.return_mode || body.return_mode || body.mode || "manual"),

    invoice_id: toNullableNum(body.invoice_id ?? parent.invoice_id),
    invoice_ref: cleanText(body.invoice_ref || parent.invoice_ref || invoiceNo),
    invoice_no: invoiceNo,
    invoice_item_id: toNullableNum(body.invoice_item_id ?? body.id),

    party_type: cleanText(body.party_type || parent.party_type || "customer") || "customer",
    party_id: toNullableNum(body.party_id ?? parent.party_id),
    party_name: partyName,
    customer_name: partyName,

    product_id: toNullableNum(body.product_id),
    product_name: productName,
    manual_product_name: cleanText(body.manual_product_name || productName),
    product_description: cleanText(body.product_description || body.description || ""),

    product_type_id: toNullableNum(body.product_type_id),
    product_type: cleanText(body.product_type || body.type || "FMS") || "FMS",

    category_id: toNullableNum(body.category_id),
    category_name: cleanText(body.category_name || ""),

    unit_id: toNullableNum(body.unit_id),
    unit_name: cleanText(body.unit_name || ""),

    return_date: toDateOrNull(parent.return_date || body.return_date) || new Date().toISOString().slice(0, 10),
    sale_order_date: toDateOrNull(body.sale_order_date || body.order_date || body.invoice_date || parent.sale_order_date),
    invoice_date: toDateOrNull(body.invoice_date || parent.invoice_date || body.sale_order_date),

    sold_qty: toNum(body.sold_qty ?? body.qty ?? body.quantity),
    already_returned_qty: toNum(body.already_returned_qty ?? body.returned_qty),
    available_qty: toNum(body.available_qty),
    return_qty: returnQty,

    rate,
    return_amount: amount,

    debit: toNum(body.debit, 0),
    credit: toNum(body.credit, amount),

    reason: cleanText(parent.reason || body.reason),
    status: cleanText(body.status || parent.status || "Saved") || "Saved",
  };
}

async function getReturnById(id) {
  const rows = await runQuery(
    `SELECT
      id,
      return_no,
      return_mode,
      invoice_id,
      invoice_ref,
      invoice_no,
      invoice_item_id,
      party_type,
      party_id,
      party_name,
      customer_name,
      product_id,
      product_name,
      manual_product_name,
      product_description,
      product_type_id,
      product_type,
      category_id,
      category_name,
      unit_id,
      unit_name,
      DATE_FORMAT(return_date, '%Y-%m-%d') AS return_date,
      DATE_FORMAT(sale_order_date, '%Y-%m-%d') AS sale_order_date,
      DATE_FORMAT(invoice_date, '%Y-%m-%d') AS invoice_date,
      sold_qty,
      already_returned_qty,
      available_qty,
      return_qty,
      rate,
      return_amount,
      debit,
      credit,
      reason,
      status,
      created_at,
      updated_at
    FROM sales_returns
    WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function insertReturn(payload) {
  const result = await runQuery(
    `INSERT INTO sales_returns
      (
        return_no,
        return_mode,
        invoice_id,
        invoice_ref,
        invoice_no,
        invoice_item_id,
        party_type,
        party_id,
        party_name,
        customer_name,
        product_id,
        product_name,
        manual_product_name,
        product_description,
        product_type_id,
        product_type,
        category_id,
        category_name,
        unit_id,
        unit_name,
        return_date,
        sale_order_date,
        invoice_date,
        sold_qty,
        already_returned_qty,
        available_qty,
        return_qty,
        rate,
        return_amount,
        debit,
        credit,
        reason,
        status
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.return_no,
      payload.return_mode,
      payload.invoice_id,
      payload.invoice_ref,
      payload.invoice_no,
      payload.invoice_item_id,
      payload.party_type,
      payload.party_id,
      payload.party_name,
      payload.customer_name,
      payload.product_id,
      payload.product_name,
      payload.manual_product_name,
      payload.product_description,
      payload.product_type_id,
      payload.product_type,
      payload.category_id,
      payload.category_name,
      payload.unit_id,
      payload.unit_name,
      payload.return_date,
      payload.sale_order_date,
      payload.invoice_date,
      payload.sold_qty,
      payload.already_returned_qty,
      payload.available_qty,
      payload.return_qty,
      payload.rate,
      payload.return_amount,
      payload.debit,
      payload.credit,
      payload.reason,
      payload.status,
    ]
  );

  return result.insertId;
}

// GET /api/sales-returns
router.get("/", async (req, res) => {
  try {
    const rows = await runQuery(
      `SELECT
        id,
        return_no,
        return_mode,
        invoice_id,
        invoice_ref,
        invoice_no,
        invoice_item_id,
        party_type,
        party_id,
        party_name,
        customer_name,
        product_id,
        product_name,
        manual_product_name,
        product_description,
        product_type_id,
        product_type,
        category_id,
        category_name,
        unit_id,
        unit_name,
        DATE_FORMAT(return_date, '%Y-%m-%d') AS return_date,
        DATE_FORMAT(sale_order_date, '%Y-%m-%d') AS sale_order_date,
        DATE_FORMAT(invoice_date, '%Y-%m-%d') AS invoice_date,
        sold_qty,
        already_returned_qty,
        available_qty,
        return_qty,
        rate,
        return_amount,
        debit,
        credit,
        reason,
        status,
        created_at,
        updated_at
      FROM sales_returns
      ORDER BY id DESC`
    );

    res.json({ success: true, data: rows, returns: rows });
  } catch (err) {
    console.error("❌ GET /sales-returns:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sales returns." });
  }
});

// GET /api/sales-returns/:id
router.get("/:id", async (req, res) => {
  try {
    const row = await getReturnById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Sales return nahi mila." });
    }

    res.json({ success: true, data: row, return: row });
  } catch (err) {
    console.error("❌ GET /sales-returns/:id:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to load sales return." });
  }
});

// POST /api/sales-returns
// Single return bhi save karega aur items/returns array bhi save karega.
router.post("/", async (req, res) => {
  try {
    console.log("👉 CREATE SALES RETURN:", req.body);

    const list = getListFromBody(req.body);
    const parent = req.body || {};

    const payloads = list.map((item) => normalizeReturnPayload(item, parent));

    if (!payloads[0]?.return_no) {
      return res.status(400).json({ success: false, message: "Return No zaroori hai." });
    }

    const validPayloads = payloads.filter((p) => {
      const hasManualName = p.product_name || p.manual_product_name;
      const hasAutoProduct = p.product_id || p.invoice_item_id;
      return (hasManualName || hasAutoProduct) && p.return_qty > 0;
    });

    if (!validPayloads.length) {
      return res.status(400).json({ success: false, message: "Kam az kam ek valid return product zaroori hai." });
    }

    const inserted = [];
    for (const payload of validPayloads) {
      const id = await insertReturn(payload);
      const row = await getReturnById(id);
      inserted.push(row);
    }

    res.status(201).json({
      success: true,
      message: "Sales return save ho gaya!",
      data: inserted.length === 1 ? inserted[0] : inserted,
      returns: inserted,
    });
  } catch (err) {
    console.error("❌ POST /sales-returns:", err);
    res.status(500).json({ success: false, message: err.message || "Sales return save failed." });
  }
});

// PUT /api/sales-returns/:id
router.put("/:id", async (req, res) => {
  try {
    console.log("👉 UPDATE SALES RETURN:", req.body);

    const payload = normalizeReturnPayload(req.body, req.body);

    if (!payload.return_no) {
      return res.status(400).json({ success: false, message: "Return No zaroori hai." });
    }

    if (!(payload.product_name || payload.manual_product_name || payload.product_id || payload.invoice_item_id)) {
      return res.status(400).json({ success: false, message: "Product zaroori hai." });
    }

    if (payload.return_qty <= 0) {
      return res.status(400).json({ success: false, message: "Return Qty 0 se zyada honi chahiye." });
    }

    await runQuery(
      `UPDATE sales_returns SET
        return_no = ?,
        return_mode = ?,
        invoice_id = ?,
        invoice_ref = ?,
        invoice_no = ?,
        invoice_item_id = ?,
        party_type = ?,
        party_id = ?,
        party_name = ?,
        customer_name = ?,
        product_id = ?,
        product_name = ?,
        manual_product_name = ?,
        product_description = ?,
        product_type_id = ?,
        product_type = ?,
        category_id = ?,
        category_name = ?,
        unit_id = ?,
        unit_name = ?,
        return_date = ?,
        sale_order_date = ?,
        invoice_date = ?,
        sold_qty = ?,
        already_returned_qty = ?,
        available_qty = ?,
        return_qty = ?,
        rate = ?,
        return_amount = ?,
        debit = ?,
        credit = ?,
        reason = ?,
        status = ?
      WHERE id = ?`,
      [
        payload.return_no,
        payload.return_mode,
        payload.invoice_id,
        payload.invoice_ref,
        payload.invoice_no,
        payload.invoice_item_id,
        payload.party_type,
        payload.party_id,
        payload.party_name,
        payload.customer_name,
        payload.product_id,
        payload.product_name,
        payload.manual_product_name,
        payload.product_description,
        payload.product_type_id,
        payload.product_type,
        payload.category_id,
        payload.category_name,
        payload.unit_id,
        payload.unit_name,
        payload.return_date,
        payload.sale_order_date,
        payload.invoice_date,
        payload.sold_qty,
        payload.already_returned_qty,
        payload.available_qty,
        payload.return_qty,
        payload.rate,
        payload.return_amount,
        payload.debit,
        payload.credit,
        payload.reason,
        payload.status,
        req.params.id,
      ]
    );

    const updated = await getReturnById(req.params.id);

    res.json({
      success: true,
      message: "Sales return update ho gaya!",
      data: updated,
      return: updated,
    });
  } catch (err) {
    console.error("❌ PUT /sales-returns/:id:", err);
    res.status(500).json({ success: false, message: err.message || "Sales return update failed." });
  }
});

// DELETE /api/sales-returns/:id
router.delete("/:id", async (req, res) => {
  try {
    await runQuery("DELETE FROM sales_returns WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: "Sales return delete ho gaya!" });
  } catch (err) {
    console.error("❌ DELETE /sales-returns/:id:", err);
    res.status(500).json({ success: false, message: err.message || "Sales return delete failed." });
  }
});

module.exports = router;
