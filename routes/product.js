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
  const allowed = ["products", "product_types", "categories", "units"];
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

function toZeroNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function getUnitName(id) {
  if (!id) return "";

  const unitNameCol = await firstColumn("units", ["unit_name", "name", "symbol"]);
  if (!unitNameCol) return "";

  const rows = await runQuery(
    `SELECT \`${unitNameCol}\` AS unit_name FROM units WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows?.[0]?.unit_name || "";
}

function makeDescription({
  product_name,
  product_type_name,
  category_name,
  unit_name,
  master_packing_unit_name,
  master_packing_pieces,
}) {
  const parts = [];

  if (product_name) parts.push(product_name);
  if (product_type_name) parts.push(`Type: ${product_type_name}`);
  if (category_name) parts.push(`Category: ${category_name}`);
  if (unit_name) parts.push(`Unit: ${unit_name}`);

  if (master_packing_unit_name && Number(master_packing_pieces || 0) > 0) {
    parts.push(
      `Master Packing: ${master_packing_unit_name} - ${Number(
        master_packing_pieces
      )} Pieces`
    );
  }

  return parts.join(" | ");
}

async function buildProductSelect(whereSql = "", params = []) {
  const pHasDescription = await hasColumn("products", "description");
  const pHasTypeId = await hasColumn("products", "product_type_id");
  const pHasCategoryId = await hasColumn("products", "category_id");
  const pHasUnitId = await hasColumn("products", "unit_id");
  const pHasMasterUnitId = await hasColumn("products", "master_packing_unit_id");
  const pHasMasterPieces = await hasColumn("products", "master_packing_pieces");
  const pHasSaleUnit = await hasColumn("products", "sale_unit");
  const pHasPieces = await hasColumn("products", "pieces_per_carton");
  const pHasPieceRate = await hasColumn("products", "piece_rate");
  const pHasIsActive = await hasColumn("products", "is_active");
  const pHasCreatedAt = await hasColumn("products", "created_at");

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

  const unitNameCol = await firstColumn("units", ["unit_name", "name", "symbol"]);

  const joins = [];

  if (pHasTypeId) {
    joins.push("LEFT JOIN product_types pt ON pt.id = p.product_type_id");
  }

  if (pHasCategoryId) {
    joins.push("LEFT JOIN categories c ON c.id = p.category_id");
  }

  if (pHasUnitId) {
    joins.push("LEFT JOIN units u ON u.id = p.unit_id");
  }

  if (pHasMasterUnitId) {
    joins.push("LEFT JOIN units mu ON mu.id = p.master_packing_unit_id");
  }

  const selectParts = [
    "p.id",
    "p.product_name",
    pHasDescription ? "COALESCE(p.description, '') AS description" : "'' AS description",
    pHasTypeId ? "p.product_type_id" : "NULL AS product_type_id",
    pHasCategoryId ? "p.category_id" : "NULL AS category_id",
    pHasUnitId ? "p.unit_id" : "NULL AS unit_id",
    pHasMasterUnitId
      ? "p.master_packing_unit_id"
      : "NULL AS master_packing_unit_id",
    pHasMasterPieces
      ? "COALESCE(p.master_packing_pieces, 0) AS master_packing_pieces"
      : pHasPieces
      ? "COALESCE(p.pieces_per_carton, 0) AS master_packing_pieces"
      : "0 AS master_packing_pieces",
    pHasSaleUnit ? "COALESCE(p.sale_unit, 'single') AS sale_unit" : "'single' AS sale_unit",
    pHasPieces ? "COALESCE(p.pieces_per_carton, 0) AS pieces_per_carton" : "0 AS pieces_per_carton",
    pHasPieceRate ? "COALESCE(p.piece_rate, 0) AS piece_rate" : "0 AS piece_rate",
    pHasIsActive ? "COALESCE(p.is_active, 1) AS is_active" : "1 AS is_active",
    pHasCreatedAt ? "p.created_at" : "NULL AS created_at",
  ];

  if (pHasTypeId) {
    selectParts.push(
      typeNameCol ? `COALESCE(pt.\`${typeNameCol}\`, '') AS product_type_en` : "'' AS product_type_en"
    );
  } else {
    selectParts.push("'' AS product_type_en");
  }

  if (pHasCategoryId) {
    selectParts.push(
      categoryNameCol ? `COALESCE(c.\`${categoryNameCol}\`, '') AS category_name` : "'' AS category_name"
    );
  } else {
    selectParts.push("'' AS category_name");
  }

  if (pHasUnitId) {
    selectParts.push(
      unitNameCol ? `COALESCE(u.\`${unitNameCol}\`, '') AS unit_name` : "'' AS unit_name"
    );
  } else {
    selectParts.push("'' AS unit_name");
  }

  if (pHasMasterUnitId) {
    selectParts.push(
      unitNameCol
        ? `COALESCE(mu.\`${unitNameCol}\`, '') AS master_packing_unit_name`
        : "'' AS master_packing_unit_name"
    );
  } else {
    selectParts.push("'' AS master_packing_unit_name");
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
      description = "",
      product_type_id = null,
      category_id = null,
      unit_id = null,
      master_packing_unit_id = null,
      master_packing_pieces = 0,
      is_active = 1,
    } = req.body;

    const cleanProductName = String(product_name || "").trim();

    if (!cleanProductName) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const cleanProductTypeId = toNullNumber(product_type_id);
    const cleanCategoryId = toNullNumber(category_id);
    const cleanUnitId = toNullNumber(unit_id);
    const cleanMasterPackingUnitId = toNullNumber(master_packing_unit_id);
    const cleanMasterPackingPieces = toZeroNumber(master_packing_pieces);
    const cleanActive = cleanIsActive(is_active);

    if (cleanMasterPackingUnitId && cleanMasterPackingPieces <= 0) {
      return res.status(400).json({
        message: "Master packing pieces required hain.",
      });
    }

    if (!cleanMasterPackingUnitId && cleanMasterPackingPieces > 0) {
      return res.status(400).json({
        message: "Master packing unit required hai.",
      });
    }

    const unitName = await getUnitName(cleanUnitId);
    const masterPackingUnitName = await getUnitName(cleanMasterPackingUnitId);

    let finalDescription = String(description || "").trim();

    if (!finalDescription) {
      finalDescription = makeDescription({
        product_name: cleanProductName,
        product_type_name: "",
        category_name: "",
        unit_name: unitName,
        master_packing_unit_name: masterPackingUnitName,
        master_packing_pieces: cleanMasterPackingPieces,
      });
    }

    const cols = ["product_name"];
    const values = [cleanProductName];
    const marks = ["?"];

    if (await hasColumn("products", "description")) {
      cols.push("description");
      values.push(finalDescription);
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

    if (await hasColumn("products", "unit_id")) {
      cols.push("unit_id");
      values.push(cleanUnitId);
      marks.push("?");
    }

    if (await hasColumn("products", "master_packing_unit_id")) {
      cols.push("master_packing_unit_id");
      values.push(cleanMasterPackingUnitId);
      marks.push("?");
    }

    if (await hasColumn("products", "master_packing_pieces")) {
      cols.push("master_packing_pieces");
      values.push(cleanMasterPackingPieces);
      marks.push("?");
    }

    // old fields ko safe rakha hai taa-ke doosre pages break na hon
    if (await hasColumn("products", "sale_unit")) {
      cols.push("sale_unit");
      values.push(cleanMasterPackingUnitId ? "carton" : "single");
      marks.push("?");
    }

    if (await hasColumn("products", "pieces_per_carton")) {
      cols.push("pieces_per_carton");
      values.push(cleanMasterPackingPieces);
      marks.push("?");
    }

    if (await hasColumn("products", "piece_rate")) {
      cols.push("piece_rate");
      values.push(0);
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
      description = "",
      product_type_id = null,
      category_id = null,
      unit_id = null,
      master_packing_unit_id = null,
      master_packing_pieces = 0,
      is_active = 1,
    } = req.body;

    const cleanProductName = String(product_name || "").trim();

    if (!cleanProductName) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const existing = await getProductById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Product not found." });
    }

    const cleanProductTypeId = toNullNumber(product_type_id);
    const cleanCategoryId = toNullNumber(category_id);
    const cleanUnitId = toNullNumber(unit_id);
    const cleanMasterPackingUnitId = toNullNumber(master_packing_unit_id);
    const cleanMasterPackingPieces = toZeroNumber(master_packing_pieces);
    const cleanActive = cleanIsActive(is_active);

    if (cleanMasterPackingUnitId && cleanMasterPackingPieces <= 0) {
      return res.status(400).json({
        message: "Master packing pieces required hain.",
      });
    }

    if (!cleanMasterPackingUnitId && cleanMasterPackingPieces > 0) {
      return res.status(400).json({
        message: "Master packing unit required hai.",
      });
    }

    const unitName = await getUnitName(cleanUnitId);
    const masterPackingUnitName = await getUnitName(cleanMasterPackingUnitId);

    let finalDescription = String(description || "").trim();

    if (!finalDescription) {
      finalDescription = makeDescription({
        product_name: cleanProductName,
        product_type_name: "",
        category_name: "",
        unit_name: unitName,
        master_packing_unit_name: masterPackingUnitName,
        master_packing_pieces: cleanMasterPackingPieces,
      });
    }

    const sets = ["product_name = ?"];
    const values = [cleanProductName];

    if (await hasColumn("products", "description")) {
      sets.push("description = ?");
      values.push(finalDescription);
    }

    if (await hasColumn("products", "product_type_id")) {
      sets.push("product_type_id = ?");
      values.push(cleanProductTypeId);
    }

    if (await hasColumn("products", "category_id")) {
      sets.push("category_id = ?");
      values.push(cleanCategoryId);
    }

    if (await hasColumn("products", "unit_id")) {
      sets.push("unit_id = ?");
      values.push(cleanUnitId);
    }

    if (await hasColumn("products", "master_packing_unit_id")) {
      sets.push("master_packing_unit_id = ?");
      values.push(cleanMasterPackingUnitId);
    }

    if (await hasColumn("products", "master_packing_pieces")) {
      sets.push("master_packing_pieces = ?");
      values.push(cleanMasterPackingPieces);
    }

    // old fields ko safe rakha hai
    if (await hasColumn("products", "sale_unit")) {
      sets.push("sale_unit = ?");
      values.push(cleanMasterPackingUnitId ? "carton" : "single");
    }

    if (await hasColumn("products", "pieces_per_carton")) {
      sets.push("pieces_per_carton = ?");
      values.push(cleanMasterPackingPieces);
    }

    if (await hasColumn("products", "piece_rate")) {
      sets.push("piece_rate = ?");
      values.push(0);
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
