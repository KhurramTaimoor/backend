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

const columnCache = {};

async function getColumns(table) {
  const allowed = ["products", "product_types", "categories"];
  if (!allowed.includes(table)) throw new Error("Invalid table name");

  if (columnCache[table]) return columnCache[table];

  const rows = await runQuery(`SHOW COLUMNS FROM \`${table}\``);
  columnCache[table] = rows.map((r) => r.Field);
  return columnCache[table];
}

async function hasColumn(table, column) {
  const cols = await getColumns(table);
  return cols.includes(column);
}

async function firstColumn(table, possibleColumns) {
  const cols = await getColumns(table);
  return possibleColumns.find((c) => cols.includes(c)) || null;
}

function cleanIsActive(value) {
  if (value === undefined || value === null || value === "") return 1;
  if (typeof value === "boolean") return value ? 1 : 0;

  const text = String(value).trim().toLowerCase();
  if (["0", "false", "inactive", "in-active", "disabled", "no"].includes(text)) {
    return 0;
  }

  return 1;
}

function toNullNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function buildProductSelect(whereSql = "", params = []) {
  const pHasTypeId = await hasColumn("products", "product_type_id");
  const pHasCategoryId = await hasColumn("products", "category_id");
  const pHasSaleUnit = await hasColumn("products", "sale_unit");
  const pHasPieces = await hasColumn("products", "pieces_per_carton");
  const pHasPieceRate = await hasColumn("products", "piece_rate");
  const pHasIsActive = await hasColumn("products", "is_active");

  const typeNameCol = await firstColumn("product_types", [
    "product_type_en",
    "type_name",
    "product_type_name",
    "name",
  ]);

  const categoryNameCol = await firstColumn("categories", [
    "category_name",
    "name",
  ]);

  const joins = [];

  if (pHasTypeId) {
    joins.push("LEFT JOIN product_types pt ON pt.id = p.product_type_id");
  }

  if (pHasCategoryId) {
    joins.push("LEFT JOIN categories c ON c.id = p.category_id");
  }

  const selectParts = [
    "p.id",
    "p.product_name",
    pHasSaleUnit ? "p.sale_unit" : "'single' AS sale_unit",
    pHasPieces ? "p.pieces_per_carton" : "0 AS pieces_per_carton",
    pHasPieceRate ? "p.piece_rate" : "0 AS piece_rate",
    pHasIsActive ? "COALESCE(p.is_active, 1) AS is_active" : "1 AS is_active",
    "p.created_at",
  ];

  if (pHasTypeId) {
    selectParts.push("p.product_type_id");
    selectParts.push(
      typeNameCol ? `pt.\`${typeNameCol}\` AS product_type_en` : "'' AS product_type_en"
    );
  } else {
    selectParts.push("NULL AS product_type_id");
    selectParts.push("'' AS product_type_en");
  }

  if (pHasCategoryId) {
    selectParts.push("p.category_id");
    selectParts.push(
      categoryNameCol ? `c.\`${categoryNameCol}\` AS category_name` : "'' AS category_name"
    );
  } else {
    selectParts.push("NULL AS category_id");
    selectParts.push("'' AS category_name");
  }

  const sql = `
    SELECT
      ${selectParts.join(",\n      ")}
    FROM products p
    ${joins.join("\n    ")}
    ${whereSql}
    ORDER BY p.id DESC
  `;

  return runQuery(sql, params);
}

async function getProductById(id) {
  const rows = await buildProductSelect("WHERE p.id = ?", [id]);
  return rows[0] || null;
}

// GET ALL PRODUCTS
router.get("/", async (req, res) => {
  try {
    const results = await buildProductSelect();
    res.json(results);
  } catch (err) {
    console.error("GET /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// CREATE PRODUCT
router.post("/", async (req, res) => {
  try {
    const {
      product_name = "",
      sale_unit = "single",
      pieces_per_carton = 0,
      piece_rate = 0,
      product_type_id = null,
      category_id = null,
      is_active = 1,
    } = req.body;

    if (!String(product_name).trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const cleanSaleUnit =
      String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";

    const cleanPiecesPerCarton =
      cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;

    const cleanPieceRate = Number(piece_rate || 0);
    const cleanProductTypeId = toNullNumber(product_type_id);
    const cleanCategoryId = toNullNumber(category_id);
    const cleanActive = cleanIsActive(is_active);

    if (cleanSaleUnit === "carton" && cleanPiecesPerCarton <= 0) {
      return res.status(400).json({
        message: "Pieces per carton must be greater than 0 for carton products.",
      });
    }

    if (cleanPieceRate < 0) {
      return res.status(400).json({
        message: "Piece rate cannot be negative.",
      });
    }

    const cols = ["product_name"];
    const values = [String(product_name).trim()];
    const marks = ["?"];

    if (await hasColumn("products", "sale_unit")) {
      cols.push("sale_unit");
      values.push(cleanSaleUnit);
      marks.push("?");
    }

    if (await hasColumn("products", "pieces_per_carton")) {
      cols.push("pieces_per_carton");
      values.push(cleanPiecesPerCarton);
      marks.push("?");
    }

    if (await hasColumn("products", "piece_rate")) {
      cols.push("piece_rate");
      values.push(cleanPieceRate);
      marks.push("?");
    }

    if (await hasColumn("products", "product_type_id")) {
      cols.push("product_type_id");
      values.push(cleanProductTypeId);
      marks.push("?");
    }

    if (await hasColumn("products", "category_id")) {
      cols.push("category_id");
      values.push(cleanCategoryId);
      marks.push("?");
    }

    if (await hasColumn("products", "is_active")) {
      cols.push("is_active");
      values.push(cleanActive);
      marks.push("?");
    }

    const result = await runQuery(
      `
        INSERT INTO products
        (${cols.map((c) => `\`${c}\``).join(", ")})
        VALUES (${marks.join(", ")})
      `,
      values
    );

    const record = await getProductById(result.insertId);
    res.json({ message: "Saved!", data: record });
  } catch (err) {
    console.error("POST /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE PRODUCT
router.put("/:id", async (req, res) => {
  try {
    const {
      product_name = "",
      sale_unit = "single",
      pieces_per_carton = 0,
      piece_rate = 0,
      product_type_id = null,
      category_id = null,
      is_active = 1,
    } = req.body;

    if (!String(product_name).trim()) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const existing = await getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    const cleanSaleUnit =
      String(sale_unit).toLowerCase() === "carton" ? "carton" : "single";

    const cleanPiecesPerCarton =
      cleanSaleUnit === "carton" ? Number(pieces_per_carton || 0) : 0;

    const cleanPieceRate = Number(piece_rate || 0);
    const cleanProductTypeId = toNullNumber(product_type_id);
    const cleanCategoryId = toNullNumber(category_id);
    const cleanActive = cleanIsActive(is_active);

    if (cleanSaleUnit === "carton" && cleanPiecesPerCarton <= 0) {
      return res.status(400).json({
        message: "Pieces per carton must be greater than 0 for carton products.",
      });
    }

    if (cleanPieceRate < 0) {
      return res.status(400).json({
        message: "Piece rate cannot be negative.",
      });
    }

    const sets = ["product_name = ?"];
    const values = [String(product_name).trim()];

    if (await hasColumn("products", "sale_unit")) {
      sets.push("sale_unit = ?");
      values.push(cleanSaleUnit);
    }

    if (await hasColumn("products", "pieces_per_carton")) {
      sets.push("pieces_per_carton = ?");
      values.push(cleanPiecesPerCarton);
    }

    if (await hasColumn("products", "piece_rate")) {
      sets.push("piece_rate = ?");
      values.push(cleanPieceRate);
    }

    if (await hasColumn("products", "product_type_id")) {
      sets.push("product_type_id = ?");
      values.push(cleanProductTypeId);
    }

    if (await hasColumn("products", "category_id")) {
      sets.push("category_id = ?");
      values.push(cleanCategoryId);
    }

    if (await hasColumn("products", "is_active")) {
      sets.push("is_active = ?");
      values.push(cleanActive);
    }

    values.push(req.params.id);

    await runQuery(
      `
        UPDATE products
        SET ${sets.join(", ")}
        WHERE id = ?
      `,
      values
    );

    const record = await getProductById(req.params.id);
    res.json({ message: "Updated!", data: record });
  } catch (err) {
    console.error("PUT /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE PRODUCT
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    await runQuery(`DELETE FROM products WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted!" });
  } catch (err) {
    console.error("DELETE /products:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
