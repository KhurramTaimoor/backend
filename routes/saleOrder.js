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

// ── Order + Items ko ek saath fetch karta hai ─────────────────────────────────
async function getOrderById(id) {
  const [orders, items] = await Promise.all([
    runQuery(
      `SELECT id, order_no, customer_name_en,
              DATE_FORMAT(order_date, '%Y-%m-%d') AS order_date,
              DATE_FORMAT(delivery_date, '%Y-%m-%d') AS delivery_date,
              total_amount, status
       FROM sale_orders
       WHERE id = ?`,
      [id]
    ),
    runQuery(
      `SELECT id, product_type_id, category_id, product_id, unit_id,
              order_qty, rate, debit, credit
       FROM sale_order_items
       WHERE order_id = ?
       ORDER BY id ASC`,
      [id]
    ),
  ]);

  if (!orders[0]) return null;
  return { ...orders[0], order_items: items };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const orders = await runQuery(
      `SELECT id, order_no, customer_name_en,
              DATE_FORMAT(order_date, '%Y-%m-%d') AS order_date,
              DATE_FORMAT(delivery_date, '%Y-%m-%d') AS delivery_date,
              total_amount, status
       FROM sale_orders
       ORDER BY id DESC`
    );

    if (!orders.length) return res.json([]);

    const orderIds = orders.map((o) => o.id);

    const allItems = await runQuery(
      `SELECT id, order_id, product_type_id, category_id, product_id, unit_id,
              order_qty, rate, debit, credit
       FROM sale_order_items
       WHERE order_id IN (?)
       ORDER BY order_id ASC, id ASC`,
      [orderIds]
    );

    const itemsMap = {};
    allItems.forEach((item) => {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    });

    const result = orders.map((o) => ({
      ...o,
      order_items: itemsMap[o.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ GET /sale-orders:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  try {
    console.log("👉 POST /sale-orders:", req.body);

    const {
      order_no,
      customer_name_en = "",
      order_date = null,
      delivery_date = null,
      status = "Pending",
      total_amount = 0,
      order_items = [],
    } = req.body;

    if (!order_no?.trim() || !customer_name_en?.trim()) {
      return res
        .status(400)
        .json({ message: "Order No aur Customer Name zaroori hain." });
    }

    const validItems = order_items.filter((i) => Number(i.product_id) > 0);
    if (!validItems.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam ek product zaroori hai." });
    }

    // ── Insert order header ───────────────────────────────────────────────────
    const orderResult = await runQuery(
      `INSERT INTO sale_orders
       (order_no, customer_name_en, order_date, delivery_date, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        order_no.trim(),
        customer_name_en.trim(),
        order_date || null,
        delivery_date || null,
        Number(total_amount) || 0,
        status,
      ]
    );

    const orderId = orderResult.insertId;

    // ── Insert items ──────────────────────────────────────────────────────────
    await Promise.all(
      validItems.map((item) =>
        runQuery(
          `INSERT INTO sale_order_items
           (order_id, product_type_id, category_id, product_id, unit_id, order_qty, rate, debit, credit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            Number(item.product_type_id) || 0,
            Number(item.category_id) || 0,
            Number(item.product_id) || 0,
            Number(item.unit_id) || 0,
            Number(item.order_qty) || 0,
            Number(item.rate) || 0,
            Number(item.debit) || 0,
            Number(item.credit) || 0,
          ]
        )
      )
    );

    const order = await getOrderById(orderId);
    res.json({ message: "Sale order save ho gaya!", data: order });
  } catch (err) {
    console.error("❌ POST /sale-orders:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
router.put("/:id", async (req, res) => {
  try {
    console.log(`👉 PUT /sale-orders/${req.params.id}:`, req.body);

    const {
      order_no,
      customer_name_en = "",
      order_date = null,
      delivery_date = null,
      status = "Pending",
      total_amount = 0,
      order_items = [],
    } = req.body;

    if (!order_no?.trim() || !customer_name_en?.trim()) {
      return res
        .status(400)
        .json({ message: "Order No aur Customer Name zaroori hain." });
    }

    const validItems = order_items.filter((i) => Number(i.product_id) > 0);
    if (!validItems.length) {
      return res
        .status(400)
        .json({ message: "Kam az kam ek product zaroori hai." });
    }

    // ── Update order header ───────────────────────────────────────────────────
    await runQuery(
      `UPDATE sale_orders
       SET order_no = ?, customer_name_en = ?, order_date = ?, delivery_date = ?, total_amount = ?, status = ?
       WHERE id = ?`,
      [
        order_no.trim(),
        customer_name_en.trim(),
        order_date || null,
        delivery_date || null,
        Number(total_amount) || 0,
        status,
        req.params.id,
      ]
    );

    // ── Purane items delete karke naye insert karo ────────────────────────────
    await runQuery(`DELETE FROM sale_order_items WHERE order_id = ?`, [req.params.id]);

    await Promise.all(
      validItems.map((item) =>
        runQuery(
          `INSERT INTO sale_order_items
           (order_id, product_type_id, category_id, product_id, unit_id, order_qty, rate, debit, credit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            Number(item.product_type_id) || 0,
            Number(item.category_id) || 0,
            Number(item.product_id) || 0,
            Number(item.unit_id) || 0,
            Number(item.order_qty) || 0,
            Number(item.rate) || 0,
            Number(item.debit) || 0,
            Number(item.credit) || 0,
          ]
        )
      )
    );

    const order = await getOrderById(req.params.id);
    res.json({ message: "Sale order update ho gaya!", data: order });
  } catch (err) {
    console.error(`❌ PUT /sale-orders/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════
router.delete("/:id", async (req, res) => {
  try {
    await runQuery(`DELETE FROM sale_orders WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    console.error(`❌ DELETE /sale-orders/${req.params.id}:`, err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;