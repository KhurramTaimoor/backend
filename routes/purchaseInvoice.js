const express = require("express");
const router = express.Router();
const db = require("../db");

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
        release: () => connection.release?.(),
      });
    });
  });

const begin = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.beginTransaction) return resolve();

    connection.beginTransaction((error) =>
      error ? reject(error) : resolve()
    );
  });

const commit = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.commit) return resolve();

    connection.commit((error) =>
      error ? reject(error) : resolve()
    );
  });

const rollback = (connection) =>
  new Promise((resolve) => {
    if (!connection.rollback) return resolve();

    connection.rollback(() => resolve());
  });

async function withTransaction(work) {
  const { connection, release } = await getConnection();

  try {
    await begin(connection);

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

const cleanText = (value) =>
  String(value ?? "").trim();

const toNumber = (value, fallback = 0) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const toPositiveId = (value) => {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
};

const firstDefined = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;

  return error;
};

/*
|--------------------------------------------------------------------------
| Date formatter
|--------------------------------------------------------------------------
| mysql2 kabhi DATE ko JavaScript Date object bana deta hai.
| Is formatter se timezone ki wajah se 20 date, 19 nahi hogi.
|--------------------------------------------------------------------------
*/

const toDate = (value) => {
  if (!value) return null;

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    const year = value.getFullYear();

    const month = String(
      value.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      value.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const text = cleanText(value);

  const match = text.match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  if (match) {
    return match[1];
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();

  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

async function tableExists(
  connection,
  tableName
) {
  const rows = await runQuery(
    connection,
    "SHOW TABLES LIKE ?",
    [tableName]
  );

  return rows.length > 0;
}

/*
|--------------------------------------------------------------------------
| Invoice number helpers
|--------------------------------------------------------------------------
*/

function normalizeInvoiceNo(value) {
  return cleanText(value)
    .replace(
      /^sales-invoice/i,
      "purchase-invoice"
    )
    .replace(
      /^sales invoice/i,
      "purchase-invoice"
    );
}

function parseInvoiceNo(value) {
  const normalized =
    normalizeInvoiceNo(value) ||
    "purchase-invoice01";

  const standard = normalized.match(
    /^purchase-invoice(\d+)$/i
  );

  const short = normalized.match(
    /^PI[- ]?(\d+)$/i
  );

  const generic = normalized.match(
    /^(.*?)(\d+)$/
  );

  if (standard) {
    return {
      prefix: "purchase-invoice",
      number: Number(standard[1]) || 1,
      width: Math.max(
        standard[1].length,
        2
      ),
    };
  }

  if (short) {
    return {
      prefix: "purchase-invoice",
      number: Number(short[1]) || 1,
      width: Math.max(
        short[1].length,
        2
      ),
    };
  }

  if (generic) {
    return {
      prefix:
        generic[1] ||
        "purchase-invoice",

      number:
        Number(generic[2]) || 1,

      width: Math.max(
        generic[2].length,
        2
      ),
    };
  }

  return {
    prefix: "purchase-invoice",
    number: 1,
    width: 2,
  };
}

async function invoiceNoExists(
  connection,
  invoiceNo,
  excludeId = null
) {
  let sql = `
    SELECT id
    FROM purchase_invoices
    WHERE LOWER(TRIM(invoice_no)) =
          LOWER(TRIM(?))
  `;

  const params = [invoiceNo];

  if (excludeId) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const rows = await runQuery(
    connection,
    sql,
    params
  );

  return rows.length > 0;
}

async function getNextInvoiceNo(connection) {
  const rows = await runQuery(
    connection,
    `
      SELECT invoice_no
      FROM purchase_invoices
      WHERE invoice_no IS NOT NULL
    `
  );

  let maximum = 0;
  let width = 2;

  for (const row of rows) {
    const parsed = parseInvoiceNo(
      row.invoice_no
    );

    if (
      parsed.prefix.toLowerCase() !==
      "purchase-invoice"
    ) {
      continue;
    }

    maximum = Math.max(
      maximum,
      parsed.number
    );

    width = Math.max(
      width,
      parsed.width
    );
  }

  return `purchase-invoice${String(
    maximum + 1
  ).padStart(width, "0")}`;
}

async function getUniqueInvoiceNo(
  connection,
  requested,
  excludeId = null
) {
  const normalized =
    normalizeInvoiceNo(requested);

  if (
    normalized &&
    !(await invoiceNoExists(
      connection,
      normalized,
      excludeId
    ))
  ) {
    return normalized;
  }

  return getNextInvoiceNo(connection);
}

/*
|--------------------------------------------------------------------------
| Supplier helpers
|--------------------------------------------------------------------------
*/

function supplierName(row) {
  return cleanText(
    row?.supplier_name ||
      row?.supplier_name_en ||
      row?.company_name ||
      row?.name ||
      row?.name_en
  );
}

async function getSupplierById(
  connection,
  id
) {
  if (!id) return null;

  const rows = await runQuery(
    connection,
    `
      SELECT *
      FROM suppliers
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function resolveSupplier(
  connection,
  body
) {
  const partyType = cleanText(
    body.party_type ||
      body.customer_type ||
      "supplier"
  ).toLowerCase();

  let id = toPositiveId(
    body.supplier_id ||
      (
        partyType === "supplier"
          ? body.party_id
          : null
      )
  );

  let name = cleanText(
    body.supplier_name ||
      body.party_name ||
      body.customer_name_en ||
      body.customer_name ||
      body.name
  );

  if (id) {
    const supplier =
      await getSupplierById(
        connection,
        id
      );

    if (!supplier) {
      throw httpError(
        "Selected supplier nahi mila.",
        404
      );
    }

    name =
      supplierName(supplier) ||
      name;
  }

  if (!id && name) {
    const rows = await runQuery(
      connection,
      `
        SELECT *
        FROM suppliers
        WHERE LOWER(TRIM(supplier_name)) =
              LOWER(TRIM(?))
        LIMIT 1
      `,
      [name]
    ).catch(() => []);

    if (rows[0]) {
      id = rows[0].id;

      name =
        supplierName(rows[0]) ||
        name;
    }
  }

  if (!name) {
    throw httpError(
      "Supplier select karein.",
      400
    );
  }

  return {
    id,
    name,
  };
}

async function findSupplierIdByName(
  connection,
  name
) {
  if (!name) return null;

  const rows = await runQuery(
    connection,
    `
      SELECT id
      FROM suppliers
      WHERE LOWER(TRIM(supplier_name)) =
            LOWER(TRIM(?))
      LIMIT 1
    `,
    [name]
  ).catch(() => []);

  return rows[0]?.id || null;
}

/*
|--------------------------------------------------------------------------
| Product and item helpers
|--------------------------------------------------------------------------
*/

function rawItems(body) {
  if (Array.isArray(body.items)) {
    return body.items;
  }

  if (
    Array.isArray(body.invoice_items)
  ) {
    return body.invoice_items;
  }

  if (
    Array.isArray(
      body.sales_invoice_items
    )
  ) {
    return body.sales_invoice_items;
  }

  if (
    Array.isArray(
      body.purchase_invoice_items
    )
  ) {
    return body.purchase_invoice_items;
  }

  return [];
}

function normalizeItem(item, index) {
  const quantity = toNumber(
    firstDefined(
      item.qty,
      item.quantity,
      item.order_qty,
      item.pieces_qty,
      item.carton_qty
    )
  );

  const rate = toNumber(
    item.rate
  );

  return {
    sr: toNumber(
      item.sr,
      index + 1
    ),

    product_id:
      toPositiveId(
        item.product_id
      ),

    product_name: cleanText(
      item.product_name ||
        item.item_name ||
        item.product_description ||
        item.description
    ),

    category_name:
      cleanText(
        item.category_name
      ),

    unit_name:
      cleanText(
        item.unit_name
      ),

    type_name: cleanText(
      item.type_name ||
        item.product_type ||
        item.product_type_name
    ),

    quantity,
    rate,

    amount: Number(
      (
        quantity * rate
      ).toFixed(2)
    ),
  };
}

async function resolveProduct(
  connection,
  item
) {
  if (item.product_id) {
    const rows = await runQuery(
      connection,
      `
        SELECT *
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [item.product_id]
    );

    return rows[0] || null;
  }

  if (!item.product_name) {
    return null;
  }

  const rows = await runQuery(
    connection,
    `
      SELECT *
      FROM products
      WHERE LOWER(TRIM(product_name)) =
            LOWER(TRIM(?))
      LIMIT 1
    `,
    [item.product_name]
  ).catch(() => []);

  return rows[0] || null;
}

async function prepareItems(
  connection,
  body
) {
  const source = rawItems(body);
  const items = [];

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    const item = normalizeItem(
      source[index],
      index
    );

    const product =
      await resolveProduct(
        connection,
        item
      );

    const productId =
      product?.id ||
      item.product_id;

    const name = cleanText(
      item.product_name ||
        product?.product_name ||
        product?.name
    );

    if (!productId) {
      throw httpError(
        `${
          name ||
          `Row ${index + 1}`
        } ka valid product select karein.`,
        400
      );
    }

    if (item.quantity <= 0) {
      throw httpError(
        `${
          name ||
          `Row ${index + 1}`
        } ki quantity 0 se zyada honi chahiye.`,
        400
      );
    }

    items.push({
      ...item,

      product_id:
        productId,

      product_name:
        name,

      unit_name: cleanText(
        item.unit_name ||
          product?.unit_name
      ),

      category_name: cleanText(
        item.category_name ||
          product?.category_name
      ),

      type_name: cleanText(
        item.type_name ||
          product?.type_name
      ),
    });
  }

  if (!items.length) {
    throw httpError(
      "Kam az kam aik valid product aur quantity add karein.",
      400
    );
  }

  return items;
}

async function insertItems(
  connection,
  invoiceId,
  items
) {
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

async function getInvoiceItems(
  connection,
  invoiceId
) {
  const rows = await runQuery(
    connection,
    `
      SELECT
        pii.*,

        COALESCE(
          NULLIF(
            p.product_name,
            ''
          ),
          ''
        ) AS product_name

      FROM purchase_invoice_items pii

      LEFT JOIN products p
        ON p.id = pii.product_id

      WHERE pii.invoice_id = ?

      ORDER BY pii.id ASC
    `,
    [invoiceId]
  );

  return rows.map(
    (row, index) => {
      const quantity =
        toNumber(row.quantity);

      const rate =
        toNumber(row.rate);

      const amount =
        toNumber(
          row.amount,
          quantity * rate
        );

      return {
        id: row.id,

        invoice_id:
          row.invoice_id,

        sr: index + 1,

        product_id:
          row.product_id,

        product_name:
          cleanText(
            row.product_name
          ) ||
          `Product #${
            row.product_id || ""
          }`,

        product_description:
          cleanText(
            row.product_name
          ),

        description:
          cleanText(
            row.product_name
          ),

        category_name:
          cleanText(
            row.category_name
          ),

        unit_name:
          cleanText(
            row.unit_name
          ),

        type_name:
          cleanText(
            row.type_name
          ),

        product_type:
          cleanText(
            row.type_name
          ),

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
    }
  );
}

/*
|--------------------------------------------------------------------------
| Invoice response
|--------------------------------------------------------------------------
*/

async function normalizeResponse(
  connection,
  row
) {
  const items =
    await getInvoiceItems(
      connection,
      row.id
    );

  const name = cleanText(
    row.supplier_name
  );

  const supplierId =
    await findSupplierIdByName(
      connection,
      name
    );

  const total =
    toNumber(
      row.total_amount
    );

  const debit =
    toNumber(
      row.debit,
      total
    );

  const credit =
    toNumber(
      row.credit
    );

  const totalQty =
    items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  return {
    id: row.id,

    invoice_no:
      cleanText(
        row.invoice_no
      ),

    reference_no: "",

    party_type: "supplier",
    customer_type: "supplier",

    party_id:
      supplierId || "",

    supplier_id:
      supplierId || "",

    party_name: name,
    supplier_name: name,

    customer_name: name,
    customer_name_en: name,

    invoice_date: toDate(
      row.invoice_date_text ||
        row.invoice_date
    ),

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

    remaining_balance:
      Math.max(
        debit - credit,
        0
      ),

    payment_status:
      cleanText(
        row.status ||
          "pending"
      ),

    status:
      cleanText(
        row.status ||
          "pending"
      ),

    items,
  };
}

async function getInvoiceById(
  connection,
  id
) {
  const rows = await runQuery(
    connection,
    `
      SELECT
        pi.*,

        DATE_FORMAT(
          pi.invoice_date,
          '%Y-%m-%d'
        ) AS invoice_date_text

      FROM purchase_invoices pi

      WHERE pi.id = ?

      LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) {
    return null;
  }

  return normalizeResponse(
    connection,
    rows[0]
  );
}

async function prepareRequest(
  connection,
  body
) {
  const supplier =
    await resolveSupplier(
      connection,
      body
    );

  const items =
    await prepareItems(
      connection,
      body
    );

  const calculated =
    items.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  const total = toNumber(
    firstDefined(
      body.grand_total,
      body.invoice_total,
      body.total_amount
    ),
    calculated
  );

  const debit =
    toNumber(
      body.debit,
      total
    );

  const credit =
    toNumber(
      firstDefined(
        body.credit,
        body.paid_amount,
        body.payment_received,
        body.advance_receive
      ),
      0
    );

  return {
    requestedNo:
      normalizeInvoiceNo(
        body.invoice_no
      ),

    supplierName:
      supplier.name,

    invoiceDate:
      toDate(
        body.invoice_date
      ) ||
      toDate(
        new Date()
      ),

    total: Number(
      total.toFixed(2)
    ),

    debit: Number(
      debit.toFixed(2)
    ),

    credit: Number(
      credit.toFixed(2)
    ),

    status:
      cleanText(
        body.status ||
          body.payment_status ||
          "pending"
      ) ||
      "pending",

    items,
  };
}

/*
|--------------------------------------------------------------------------
| Next invoice number
|--------------------------------------------------------------------------
*/

router.get(
  "/next-number",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const invoiceNo =
        await getNextInvoiceNo(
          connection
        );

      res.json({
        success: true,

        invoice_no:
          invoiceNo,

        data: {
          invoice_no:
            invoiceNo,
        },
      });
    } catch (error) {
      console.error(
        "GET /purchase-invoices/next-number:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Next invoice number generate nahi hua.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Supplier invoices
|--------------------------------------------------------------------------
*/

router.get(
  "/customer/:partyType/:partyId",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const type = cleanText(
        req.params.partyType
      ).toLowerCase();

      const id = toPositiveId(
        req.params.partyId
      );

      if (
        type !== "supplier" ||
        !id
      ) {
        return res.json({
          success: true,
          data: [],
          invoices: [],
        });
      }

      const supplier =
        await getSupplierById(
          connection,
          id
        );

      if (!supplier) {
        return res.json({
          success: true,
          data: [],
          invoices: [],
        });
      }

      const rows = await runQuery(
        connection,
        `
          SELECT
            pi.*,

            DATE_FORMAT(
              pi.invoice_date,
              '%Y-%m-%d'
            ) AS invoice_date_text

          FROM purchase_invoices pi

          WHERE
            LOWER(
              TRIM(
                pi.supplier_name
              )
            ) =
            LOWER(
              TRIM(?)
            )

          ORDER BY pi.id DESC
        `,
        [
          supplierName(
            supplier
          ),
        ]
      );

      const invoices = [];

      for (const row of rows) {
        invoices.push(
          await normalizeResponse(
            connection,
            row
          )
        );
      }

      res.json({
        success: true,
        data: invoices,
        invoices,
      });
    } catch (error) {
      console.error(
        "GET supplier purchase invoices:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Supplier invoices load nahi huin.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Bulk print
|--------------------------------------------------------------------------
*/

router.post(
  "/bulk-print-data",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const source =
        Array.isArray(
          req.body?.ids
        )
          ? req.body.ids
          : Array.isArray(
              req.body
                ?.invoice_ids
            )
          ? req.body
              .invoice_ids
          : [];

      const ids = source
        .map(toPositiveId)
        .filter(Boolean);

      if (!ids.length) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invoice IDs zaroori hain.",
          });
      }

      const rows = await runQuery(
        connection,
        `
          SELECT
            pi.*,

            DATE_FORMAT(
              pi.invoice_date,
              '%Y-%m-%d'
            ) AS invoice_date_text

          FROM purchase_invoices pi

          WHERE pi.id IN (?)

          ORDER BY pi.id DESC
        `,
        [ids]
      );

      const invoices = [];

      for (const row of rows) {
        invoices.push(
          await normalizeResponse(
            connection,
            row
          )
        );
      }

      res.json({
        success: true,
        data: invoices,
        invoices,
      });
    } catch (error) {
      console.error(
        "POST /purchase-invoices/bulk-print-data:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Bulk print data load nahi hua.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get all invoices
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const rows = await runQuery(
        connection,
        `
          SELECT
            pi.*,

            DATE_FORMAT(
              pi.invoice_date,
              '%Y-%m-%d'
            ) AS invoice_date_text

          FROM purchase_invoices pi

          ORDER BY pi.id DESC
        `
      );

      const invoices = [];

      for (const row of rows) {
        invoices.push(
          await normalizeResponse(
            connection,
            row
          )
        );
      }

      res.json(invoices);
    } catch (error) {
      console.error(
        "GET /purchase-invoices:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Purchase invoices load nahi huin.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get single invoice
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const id = toPositiveId(
        req.params.id
      );

      if (!id) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Valid invoice ID zaroori hai.",
          });
      }

      const invoice =
        await getInvoiceById(
          connection,
          id
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Purchase invoice nahi mili.",
          });
      }

      res.json({
        success: true,
        data: invoice,
        invoice,
      });
    } catch (error) {
      console.error(
        `GET /purchase-invoices/${req.params.id}:`,
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Purchase invoice load nahi hui.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Create invoice
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  async (req, res) => {
    try {
      const invoice =
        await withTransaction(
          async (connection) => {
            const prepared =
              await prepareRequest(
                connection,
                req.body
              );

            let invoiceNo =
              await getUniqueInvoiceNo(
                connection,
                prepared.requestedNo
              );

            let result = null;

            /*
             * Duplicate protection:
             * Agar 2 users same waqt same invoice number save karain,
             * backend automatically next number generate karega.
             */
            for (
              let attempt = 0;
              attempt < 10;
              attempt += 1
            ) {
              try {
                result =
                  await runQuery(
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
                      prepared
                        .supplierName,
                      prepared
                        .invoiceDate,
                      prepared.total,
                      prepared.debit,
                      prepared.credit,
                      prepared.status,
                    ]
                  );

                break;
              } catch (error) {
                const duplicate =
                  error?.code ===
                    "ER_DUP_ENTRY" &&
                  /invoice_no/i.test(
                    `${
                      error
                        ?.message ||
                      ""
                    } ${
                      error
                        ?.sqlMessage ||
                      ""
                    }`
                  );

                if (!duplicate) {
                  throw error;
                }

                invoiceNo =
                  await getNextInvoiceNo(
                    connection
                  );
              }
            }

            if (!result?.insertId) {
              throw httpError(
                "Unique invoice number generate nahi ho saka. Dobara try karein.",
                409
              );
            }

            await insertItems(
              connection,
              result.insertId,
              prepared.items
            );

            return getInvoiceById(
              connection,
              result.insertId
            );
          }
        );

      res.status(201).json({
        success: true,

        message:
          "Purchase invoice save ho gayi!",

        data: invoice,
        invoice,
      });
    } catch (error) {
      console.error(
        "POST /purchase-invoices:",
        error
      );

      res
        .status(
          error.status || 500
        )
        .json({
          success: false,

          message:
            error.message ||
            "Purchase invoice save nahi hui.",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Update invoice
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  async (req, res) => {
    try {
      const invoice =
        await withTransaction(
          async (connection) => {
            const id =
              toPositiveId(
                req.params.id
              );

            if (!id) {
              throw httpError(
                "Valid invoice ID zaroori hai.",
                400
              );
            }

            const existing =
              await getInvoiceById(
                connection,
                id
              );

            if (!existing) {
              throw httpError(
                "Purchase invoice nahi mili.",
                404
              );
            }

            const prepared =
              await prepareRequest(
                connection,
                req.body
              );

            const invoiceNo =
              prepared
                .requestedNo ||
              existing
                .invoice_no;

            if (
              await invoiceNoExists(
                connection,
                invoiceNo,
                id
              )
            ) {
              throw httpError(
                `Invoice No "${invoiceNo}" pehle se maujood hai.`,
                409
              );
            }

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
                invoiceNo,
                prepared
                  .supplierName,
                prepared
                  .invoiceDate,
                prepared.total,
                prepared.debit,
                prepared.credit,
                prepared.status,
                id,
              ]
            );

            await runQuery(
              connection,
              `
                DELETE FROM
                  purchase_invoice_items

                WHERE invoice_id = ?
              `,
              [id]
            );

            await insertItems(
              connection,
              id,
              prepared.items
            );

            return getInvoiceById(
              connection,
              id
            );
          }
        );

      res.json({
        success: true,

        message:
          "Purchase invoice update ho gayi!",

        data: invoice,
        invoice,
      });
    } catch (error) {
      console.error(
        `PUT /purchase-invoices/${req.params.id}:`,
        error
      );

      res
        .status(
          error.status || 500
        )
        .json({
          success: false,

          message:
            error.message ||
            "Purchase invoice update nahi hui.",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete invoice
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  async (req, res) => {
    try {
      await withTransaction(
        async (connection) => {
          const id =
            toPositiveId(
              req.params.id
            );

          if (!id) {
            throw httpError(
              "Valid invoice ID zaroori hai.",
              400
            );
          }

          const existing =
            await getInvoiceById(
              connection,
              id
            );

          if (!existing) {
            throw httpError(
              "Purchase invoice nahi mili.",
              404
            );
          }

          /*
           * Invoice ke related returns hon to invoice delete nahi hogi.
           */
          if (
            await tableExists(
              connection,
              "purchase_returns"
            )
          ) {
            const returns =
              await runQuery(
                connection,
                `
                  SELECT id
                  FROM purchase_returns
                  WHERE invoice_id = ?
                  LIMIT 1
                `,
                [id]
              );

            if (returns.length) {
              throw httpError(
                "Is invoice ke purchase returns maujood hain. Pehle returns delete karein.",
                409
              );
            }
          }

          await runQuery(
            connection,
            `
              DELETE FROM
                purchase_invoice_items

              WHERE invoice_id = ?
            `,
            [id]
          );

          await runQuery(
            connection,
            `
              DELETE FROM
                purchase_invoices

              WHERE id = ?
            `,
            [id]
          );
        }
      );

      res.json({
        success: true,

        message:
          "Purchase invoice delete ho gayi!",
      });
    } catch (error) {
      console.error(
        `DELETE /purchase-invoices/${req.params.id}:`,
        error
      );

      res
        .status(
          error.status || 500
        )
        .json({
          success: false,

          message:
            error.message ||
            "Purchase invoice delete nahi hui.",
        });
    }
  }
);

module.exports = router;
