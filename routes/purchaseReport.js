const express = require("express");
const router = express.Router();
const db = require("../db");

/*
 * Purchase Report
 *
 * Same data contract as routes/salesReport.js so the frontend can render the
 * exact SalesReportPage layout.
 */

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

const toNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const cleanText = (value) => String(value ?? "").trim();

const formatDate = (value) => {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
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

async function tableExists(tableName) {
  const rows = await runQuery("SHOW TABLES LIKE ?", [tableName]);
  return Array.isArray(rows) && rows.length > 0;
}

async function getColumns(tableName) {
  if (!(await tableExists(tableName))) return new Set();

  const rows = await runQuery(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => row.Field));
}

function firstColumn(columns, candidates) {
  return candidates.find((candidate) => columns.has(candidate)) || null;
}

async function loadRows(tableName) {
  if (!(await tableExists(tableName))) return [];

  const rows = await runQuery(
    `SELECT * FROM \`${tableName}\` ORDER BY id DESC LIMIT 5000`
  );

  return rows.map((row) => ({
    ...row,
    __table: tableName,
  }));
}

function inDateRange(dateValue, fromDate, toDate) {
  const date = formatDate(dateValue);

  if (!date) return true;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;

  return true;
}

function nameMatches(name, query) {
  if (!query) return true;

  return cleanText(name)
    .toLowerCase()
    .includes(cleanText(query).toLowerCase());
}

function mapInvoice(row) {
  const reference = pick(row, [
    "invoice_no",
    "reference_no",
    "ref_no",
    "id",
  ]);

  const date = pick(row, [
    "invoice_date",
    "date",
    "created_at",
  ]);

  const supplier = pick(row, [
    "supplier_name",
    "party_name",
    "vendor_name",
    "name",
    "account_name",
  ]);

  const gross = toNumber(
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

  const discount = toNumber(
    pick(row, [
      "discount",
      "discount_amount",
      "total_discount",
    ])
  );

  const net = toNumber(
    pick(
      row,
      [
        "grand_total",
        "net_total",
        "total",
        "total_amount",
      ],
      gross - discount
    ),
    gross - discount
  );

  return {
    id: row.id,
    entry_type: "invoice",
    reference_no: String(reference || ""),
    person_name: String(supplier || ""),
    supplier_id: row.supplier_id || row.party_id || null,
    entry_date: formatDate(date),
    gross_amount: gross || net,
    discount,
    net_total: net,
    signed_total: net,
    source_table: row.__table,
  };
}

function mapReturn(row, invoiceMap) {
  const invoice = invoiceMap.get(Number(row.invoice_id)) || {};

  const reference = pick(row, [
    "return_no",
    "reference_no",
    "id",
  ]);

  const date = pick(row, [
    "return_date",
    "date",
    "created_at",
  ]);

  const supplier = pick(row, [
    "supplier_name",
    "party_name",
    "vendor_name",
  ], pick(invoice, [
    "supplier_name",
    "party_name",
    "vendor_name",
    "name",
  ]));

  const amount = toNumber(
    pick(row, [
      "return_amount",
      "grand_total",
      "net_total",
      "total_amount",
      "credit",
      "amount",
    ])
  );

  const linkedInvoice = pick(invoice, [
    "invoice_no",
    "reference_no",
    "id",
  ]);

  return {
    id: row.id,
    entry_type: "return",
    reference_no: String(
      reference || `PR-${row.id}`
    ),
    invoice_ref: String(linkedInvoice || ""),
    person_name: String(supplier || ""),
    supplier_id:
      row.supplier_id ||
      invoice.supplier_id ||
      invoice.party_id ||
      null,
    entry_date: formatDate(date),
    gross_amount: amount,
    discount: 0,
    net_total: -Math.abs(amount),
    signed_total: -Math.abs(amount),
    source_table: row.__table,
  };
}

async function getSupplierNameById(supplierId) {
  if (!supplierId) return "";

  const columns = await getColumns("suppliers");

  if (!columns.size) return "";

  const nameColumn = firstColumn(columns, [
    "supplier_name",
    "name",
    "name_en",
    "company_name",
  ]);

  if (!nameColumn) return "";

  const rows = await runQuery(
    `
      SELECT \`${nameColumn}\` AS supplier_name
      FROM suppliers
      WHERE id = ?
      LIMIT 1
    `,
    [supplierId]
  );

  return cleanText(rows[0]?.supplier_name);
}

// GET /api/purchase-report
router.get("/", async (req, res) => {
  try {
    const fromDate = cleanText(req.query.from_date);
    const toDate = cleanText(req.query.to_date);
    const queryName = cleanText(
      req.query.name ||
        req.query.supplier_name ||
        req.query.search
    );
    const supplierId = Number(req.query.supplier_id) || null;

    const invoiceRows = await loadRows("purchase_invoices");
    const invoiceMap = new Map(
      invoiceRows.map((row) => [Number(row.id), row])
    );

    const returnRows = await loadRows("purchase_returns");

    let records = [
      ...invoiceRows.map(mapInvoice),
      ...returnRows.map((row) =>
        mapReturn(row, invoiceMap)
      ),
    ];

    let supplierFilterName = "";

    if (supplierId) {
      supplierFilterName =
        await getSupplierNameById(supplierId);
    }

    records = records
      .filter((record) =>
        inDateRange(
          record.entry_date,
          fromDate,
          toDate
        )
      )
      .filter((record) =>
        nameMatches(record.person_name, queryName)
      )
      .filter((record) => {
        if (!supplierId) return true;

        if (
          record.supplier_id &&
          Number(record.supplier_id) === supplierId
        ) {
          return true;
        }

        if (supplierFilterName) {
          return (
            cleanText(record.person_name).toLowerCase() ===
            supplierFilterName.toLowerCase()
          );
        }

        return false;
      })
      .sort((a, b) => {
        return (
          String(b.entry_date || "").localeCompare(
            String(a.entry_date || "")
          ) ||
          Number(b.id || 0) - Number(a.id || 0)
        );
      });

    const summary = records.reduce(
      (result, record) => {
        const amount = Math.abs(
          toNumber(record.net_total)
        );

        if (record.entry_type === "invoice") {
          result.invoices_total += amount;
        }

        if (record.entry_type === "return") {
          result.returns_total += amount;
        }

        result.net_after_return += toNumber(
          record.signed_total
        );

        return result;
      },
      {
        orders_total: 0,
        invoices_total: 0,
        returns_total: 0,
        net_after_return: 0,
      }
    );

    return res.json({
      success: true,
      data: records,
      records,
      summary,
    });
  } catch (error) {
    console.error("GET /purchase-report:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Purchase report load failed.",
    });
  }
});

module.exports = router;
