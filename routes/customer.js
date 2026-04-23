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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ── GET CUSTOMER BY ID (with updated current_balance) ────────────────────────
async function getCustomerById(id) {
  const results = await runQuery(
    `SELECT
       c.id,
       c.customer_name_en,
       c.phone,
       c.city_en,
       c.opening_balance,
       (
         c.opening_balance

         -- customer_ledger debit/credit
         + COALESCE((SELECT SUM(cl.debit)  FROM customer_ledger cl WHERE cl.customer_id = c.id), 0)
         - COALESCE((SELECT SUM(cl.credit) FROM customer_ledger cl WHERE cl.customer_id = c.id), 0)

         -- sales invoice items (har item alag debit)
         + COALESCE((
             SELECT SUM(sii.amount)
             FROM sales_invoice_items sii
             INNER JOIN sales_invoices si ON si.id = sii.invoice_id
             WHERE si.customer_id = c.id
           ), 0)

         -- sales returns (credit)
         - COALESCE((
             SELECT SUM(sr.return_amount)
             FROM sales_returns sr
             WHERE sr.invoice_ref IN (
               SELECT invoice_no FROM sales_invoices WHERE customer_id = c.id
             )
           ), 0)

       ) AS current_balance
     FROM customers c
     WHERE c.id = ?`,
    [id]
  );
  return results[0] || null;
}

// ── GET COMBINED LEDGER BY CUSTOMER ID ───────────────────────────────────────
async function getLedgerByCustomerId(customerId) {
  return await runQuery(
    `SELECT
       'ledger'            AS source,
       cl.id,
       cl.entry_date       AS date,
       cl.description_en   AS description,
       cl.debit,
       cl.credit,
       NULL                AS invoice_no,
       NULL                AS invoice_id,
       NULL                AS return_no
     FROM customer_ledger cl
     WHERE cl.customer_id = ?

     UNION ALL

     SELECT
       'invoice'                                   AS source,
       sii.id,
       DATE_FORMAT(si.invoice_date, '%Y-%m-%d')    AS date,
       CONCAT(
         sii.product_name,
         ' (x', sii.qty, ' @ ', sii.rate, ')'
       )                                           AS description,
       sii.amount                                  AS debit,
       0                                           AS credit,
       si.invoice_no,
       si.id                                       AS invoice_id,
       NULL                                        AS return_no
     FROM sales_invoice_items sii
     INNER JOIN sales_invoices si ON si.id = sii.invoice_id
     WHERE si.customer_id = ?

     UNION ALL

     SELECT
       'return'                                    AS source,
       sr.id,
       DATE_FORMAT(sr.return_date, '%Y-%m-%d')     AS date,
       CONCAT(
         'Return: ', sr.product_name,
         ' (x', sr.return_qty, ' @ ', sr.rate, ')'
       )                                           AS description,
       0                                           AS debit,
       sr.return_amount                            AS credit,
       sr.invoice_ref                              AS invoice_no,
       NULL                                        AS invoice_id,
       sr.return_no
     FROM sales_returns sr
     WHERE sr.invoice_ref IN (
       SELECT invoice_no FROM sales_invoices WHERE customer_id = ?
     )

     ORDER BY date ASC, id ASC`,
    [customerId, customerId, customerId]
  );
}

// ── CUSTOMER EXISTS CHECK ─────────────────────────────────────────────────────
async function customerExists(id) {
  const results = await runQuery(
    `SELECT id FROM customers WHERE id = ? LIMIT 1`,
    [id]
  );
  return results.length > 0;
}

// ── GET ALL CUSTOMERS ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const results = await runQuery(
      `SELECT
         c.id,
         c.customer_name_en,
         c.phone,
         c.city_en,
         c.opening_balance,
         (
           c.opening_balance

           + COALESCE((SELECT SUM(cl.debit)  FROM customer_ledger cl WHERE cl.customer_id = c.id), 0)
           - COALESCE((SELECT SUM(cl.credit) FROM customer_ledger cl WHERE cl.customer_id = c.id), 0)

           + COALESCE((
               SELECT SUM(sii.amount)
               FROM sales_invoice_items sii
               INNER JOIN sales_invoices si ON si.id = sii.invoice_id
               WHERE si.customer_id = c.id
             ), 0)

           - COALESCE((
               SELECT SUM(sr.return_amount)
               FROM sales_returns sr
               WHERE sr.invoice_ref IN (
                 SELECT invoice_no FROM sales_invoices WHERE customer_id = c.id
               )
             ), 0)

         ) AS current_balance
       FROM customers c
       ORDER BY c.id DESC`
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET SINGLE CUSTOMER ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET COMBINED LEDGER ───────────────────────────────────────────────────────
router.get("/:id/ledger", async (req, res) => {
  try {
    const exists = await customerExists(req.params.id);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const results = await getLedgerByCustomerId(req.params.id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE CUSTOMER ───────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      customer_name_en = "",
      phone = "",
      city_en = "",
      opening_balance = 0,
    } = req.body;

    if (!customer_name_en.trim()) {
      return res.status(400).json({ message: "Customer name is required." });
    }

    const result = await runQuery(
      `INSERT INTO customers (customer_name_en, phone, city_en, opening_balance)
       VALUES (?, ?, ?, ?)`,
      [
        customer_name_en.trim(),
        phone.trim(),
        city_en.trim(),
        toNumber(opening_balance),
      ]
    );

    const customer = await getCustomerById(result.insertId);
    res.json({ message: "Customer saved!", data: customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE CUSTOMER ───────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const {
      customer_name_en = "",
      phone = "",
      city_en = "",
      opening_balance = 0,
    } = req.body;

    if (!customer_name_en.trim()) {
      return res.status(400).json({ message: "Customer name is required." });
    }

    const exists = await customerExists(req.params.id);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    await runQuery(
      `UPDATE customers
       SET customer_name_en = ?, phone = ?, city_en = ?, opening_balance = ?
       WHERE id = ?`,
      [
        customer_name_en.trim(),
        phone.trim(),
        city_en.trim(),
        toNumber(opening_balance),
        req.params.id,
      ]
    );

    const customer = await getCustomerById(req.params.id);
    res.json({ message: "Customer updated!", data: customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE CUSTOMER ───────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const exists = await customerExists(req.params.id);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    await runQuery(`DELETE FROM customer_ledger WHERE customer_id = ?`, [req.params.id]);
    await runQuery(`DELETE FROM customers WHERE id = ?`, [req.params.id]);

    res.json({ message: "Deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE LEDGER ENTRY ───────────────────────────────────────────────────────
router.post("/:id/ledger", async (req, res) => {
  try {
    const customerId = req.params.id;
    const {
      entry_date = "",
      description_en = "",
      debit = 0,
      credit = 0,
    } = req.body;

    const exists = await customerExists(customerId);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    if (!description_en.trim()) {
      return res.status(400).json({ message: "Description is required." });
    }

    const debitNum  = toNumber(debit);
    const creditNum = toNumber(credit);

    if (debitNum <= 0 && creditNum <= 0) {
      return res.status(400).json({
        message: "At least one of debit or credit must be greater than zero.",
      });
    }

    if (!entry_date) {
      return res.status(400).json({ message: "Entry date is required." });
    }

    const result = await runQuery(
      `INSERT INTO customer_ledger (customer_id, entry_date, description_en, debit, credit)
       VALUES (?, ?, ?, ?, ?)`,
      [customerId, entry_date, description_en.trim(), debitNum, creditNum]
    );

    const inserted = await runQuery(
      `SELECT id, customer_id, entry_date, description_en, debit, credit
       FROM customer_ledger WHERE id = ?`,
      [result.insertId]
    );

    res.json({ message: "Ledger entry saved!", data: inserted[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE LEDGER ENTRY ───────────────────────────────────────────────────────
router.put("/:id/ledger/:entryId", async (req, res) => {
  try {
    const customerId = req.params.id;
    const entryId    = req.params.entryId;

    const {
      entry_date = "",
      description_en = "",
      debit = 0,
      credit = 0,
    } = req.body;

    const exists = await customerExists(customerId);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    if (!description_en.trim()) {
      return res.status(400).json({ message: "Description is required." });
    }

    const debitNum  = toNumber(debit);
    const creditNum = toNumber(credit);

    if (debitNum <= 0 && creditNum <= 0) {
      return res.status(400).json({
        message: "At least one of debit or credit must be greater than zero.",
      });
    }

    if (!entry_date) {
      return res.status(400).json({ message: "Entry date is required." });
    }

    const entryCheck = await runQuery(
      `SELECT id FROM customer_ledger WHERE id = ? AND customer_id = ? LIMIT 1`,
      [entryId, customerId]
    );

    if (entryCheck.length === 0) {
      return res.status(404).json({ message: "Ledger entry not found." });
    }

    await runQuery(
      `UPDATE customer_ledger
       SET entry_date = ?, description_en = ?, debit = ?, credit = ?
       WHERE id = ? AND customer_id = ?`,
      [entry_date, description_en.trim(), debitNum, creditNum, entryId, customerId]
    );

    const updated = await runQuery(
      `SELECT id, customer_id, entry_date, description_en, debit, credit
       FROM customer_ledger WHERE id = ? AND customer_id = ?`,
      [entryId, customerId]
    );

    res.json({ message: "Ledger entry updated!", data: updated[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE LEDGER ENTRY ───────────────────────────────────────────────────────
router.delete("/:id/ledger/:entryId", async (req, res) => {
  try {
    const customerId = req.params.id;
    const entryId    = req.params.entryId;

    const exists = await customerExists(customerId);
    if (!exists) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const entryCheck = await runQuery(
      `SELECT id FROM customer_ledger WHERE id = ? AND customer_id = ? LIMIT 1`,
      [entryId, customerId]
    );

    if (entryCheck.length === 0) {
      return res.status(404).json({ message: "Ledger entry not found." });
    }

    await runQuery(
      `DELETE FROM customer_ledger WHERE id = ? AND customer_id = ?`,
      [entryId, customerId]
    );

    res.json({ message: "Ledger entry deleted!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;