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
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clean = (v) => String(v ?? "").trim();

const formatDate = (v) => {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
};

const pick = (row, keys, fallback = "") => {
  for (const key of keys) {
    if (
      row?.[key] !== undefined &&
      row?.[key] !== null &&
      String(row[key]).trim() !== ""
    ) {
      return row[key];
    }
  }
  return fallback;
};

async function tableExists(table) {
  try {
    const rows = await runQuery("SHOW TABLES LIKE ?", [table]);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function loadRowsFromExistingTables(candidates) {
  const all = [];

  for (const table of candidates) {
    if (await tableExists(table)) {
      const rows = await runQuery(
        `SELECT * FROM \`${table}\` ORDER BY id DESC LIMIT 5000`
      );

      rows.forEach((row) => {
        all.push({ ...row, __table: table });
      });
    }
  }

  return all;
}

function inDateRange(dateValue, from, to) {
  const d = formatDate(dateValue);

  if (!d) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;

  return true;
}

function nameMatches(name, q) {
  if (!q) return true;
  return clean(name).toLowerCase().includes(clean(q).toLowerCase());
}

function mapOrder(row) {
  const reference = pick(row, [
    "order_no",
    "sale_order_no",
    "sales_order_no",
    "orderNo",
    "reference_no",
    "ref_no",
    "id",
  ]);

  const date = pick(row, [
    "order_date",
    "sale_order_date",
    "sales_order_date",
    "date",
    "created_at",
  ]);

  const person = pick(row, [
    "party_name",
    "customer_name",
    "customer_name_en",
    "name",
    "buyer_name",
    "client_name",
    "account_name",
  ]);

  const gross = toNum(
    pick(row, [
      "order_total",
      "sale_order_total",
      "invoice_total",
      "total_amount",
      "gross_amount",
      "sub_total",
      "subtotal",
      "amount",
      "grand_total",
    ])
  );

  const discount = toNum(
    pick(row, ["discount", "discount_amount", "total_discount"])
  );

  const net = toNum(
    pick(row, ["grand_total", "net_total", "total", "total_amount"], gross - discount),
    gross - discount
  );

  return {
    id: row.id,
    entry_type: "order",
    reference_no: String(reference || ""),
    person_name: String(person || ""),
    entry_date: formatDate(date),
    gross_amount: gross || net,
    discount,
    net_total: net,
    signed_total: net,
    source_table: row.__table,
  };
}

function mapInvoice(row) {
  const reference = pick(row, [
    "invoice_no",
    "reference_no",
    "ref_no",
    "id",
  ]);

  const date = pick(row, ["invoice_date", "date", "created_at"]);

  const person = pick(row, [
    "party_name",
    "customer_name",
    "customer_name_en",
    "name",
    "buyer_name",
    "client_name",
    "employee_name",
    "supplier_name",
    "general_ledger_name",
  ]);

  const gross = toNum(
    pick(row, [
      "invoice_total",
      "total_amount",
      "gross_amount",
      "sub_total",
      "subtotal",
      "amount",
      "grand_total",
    ])
  );

  const discount = toNum(
    pick(row, ["discount", "discount_amount", "total_discount"])
  );

  const net = toNum(
    pick(row, ["grand_total", "net_total", "total", "total_amount"], gross - discount),
    gross - discount
  );

  return {
    id: row.id,
    entry_type: "invoice",
    reference_no: String(reference || ""),
    person_name: String(person || ""),
    entry_date: formatDate(date),
    gross_amount: gross || net,
    discount,
    net_total: net,
    signed_total: net,
    source_table: row.__table,
  };
}

function mapReturn(row) {
  const reference = pick(row, [
    "return_no",
    "invoice_ref",
    "invoice_no",
    "reference_no",
    "id",
  ]);

  const date = pick(row, ["return_date", "date", "created_at"]);

  const person = pick(row, [
    "party_name",
    "customer_name",
    "customer_name_en",
    "name",
    "buyer_name",
    "client_name",
  ]);

  const amount = toNum(
    pick(row, ["return_amount", "grand_total", "net_total", "total_amount", "amount"])
  );

  return {
    id: row.id,
    entry_type: "return",
    reference_no: String(reference || ""),
    person_name: String(person || ""),
    entry_date: formatDate(date),
    gross_amount: amount,
    discount: 0,
    net_total: -Math.abs(amount),
    signed_total: -Math.abs(amount),
    source_table: row.__table,
  };
}

// GET /api/sales-report
router.get("/", async (req, res) => {
  try {
    const from = clean(req.query.from_date);
    const to = clean(req.query.to_date);
    const qName = clean(req.query.name || req.query.customer_name || req.query.search);
    const type = clean(req.query.type || "all").toLowerCase();

    let records = [];

    if (type === "all" || type === "order" || type === "orders") {
      const rows = await loadRowsFromExistingTables(["sale_orders", "sales_orders"]);
      records.push(...rows.map(mapOrder));
    }

    if (type === "all" || type === "invoice" || type === "invoices") {
      const rows = await loadRowsFromExistingTables([
        "sales_invoices",
        "sale_invoices",
      ]);
      records.push(...rows.map(mapInvoice));
    }

    if (type === "all" || type === "return" || type === "returns") {
      const rows = await loadRowsFromExistingTables([
        "sales_returns",
        "sale_returns",
      ]);
      records.push(...rows.map(mapReturn));
    }

    records = records
      .filter((r) => inDateRange(r.entry_date, from, to))
      .filter((r) => nameMatches(r.person_name, qName))
      .sort((a, b) => {
        return (
          String(b.entry_date || "").localeCompare(String(a.entry_date || "")) ||
          Number(b.id || 0) - Number(a.id || 0)
        );
      });

    const summary = records.reduce(
      (acc, r) => {
        const abs = Math.abs(toNum(r.net_total));

        if (r.entry_type === "order") acc.orders_total += abs;
        if (r.entry_type === "invoice") acc.invoices_total += abs;
        if (r.entry_type === "return") acc.returns_total += abs;

        acc.net_after_return += toNum(r.signed_total);

        return acc;
      },
      {
        orders_total: 0,
        invoices_total: 0,
        returns_total: 0,
        net_after_return: 0,
      }
    );

    res.json({
      success: true,
      data: records,
      records,
      summary,
    });
  } catch (err) {
    console.error("❌ GET /sales-report:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Sales report load failed.",
    });
  }
});

module.exports = router;
