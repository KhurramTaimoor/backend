const express = require("express");
const router = express.Router();
const db = require("../db");

/*
|--------------------------------------------------------------------------
| Purchase Invoice Route
|--------------------------------------------------------------------------
| Supports:
| - Purchase Invoice create, list, details, update and delete
| - Supplier selection
| - Multiple products
| - SalesInvoicePage-style payload
| - Automatic unique invoice number
| - Duplicate invoice number protection
| - Bulk print data
| - No Shipment / Ship To field
|--------------------------------------------------------------------------
*/

const query = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

const getConnection = () =>
  new Promise((resolve, reject) => {
    if (typeof db.getConnection !== "function") {
      resolve({
        connection: db,
        release: () => {},
      });
      return;
    }

    db.getConnection((error, connection) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        connection,
        release: () => {
          if (typeof connection.release === "function") {
            connection.release();
          }
        },
      });
    });
  });

const beginTransaction = (connection) =>
  new Promise((resolve, reject) => {
    if (typeof connection.beginTransaction !== "function") {
      resolve();
      return;
    }

    connection.beginTransaction((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const commitTransaction = (connection) =>
  new Promise((resolve, reject) => {
    if (typeof connection.commit !== "function") {
      resolve();
      return;
    }

    connection.commit((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const rollbackTransaction = (connection) =>
  new Promise((resolve) => {
    if (typeof connection.rollback !== "function") {
      resolve();
      return;
    }

    connection.rollback(() => resolve());
  });

async function withTransaction(callback) {
  const { connection, release } = await getConnection();

  try {
    await beginTransaction(connection);

    const result = await callback(connection);

    await commitTransaction(connection);

    return result;
  } catch (error) {
    await rollbackTransaction(connection);
    throw error;
  } finally {
    release();
  }
}

const cleanText = (value) => String(value ?? "").trim();

const toNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
};

const toPositiveId = (value) => {
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
};

const toDate = (value) => {
  if (!value) return null;

  const formattedDate = String(value).slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(formattedDate)
    ? formattedDate
    : null;
};

const firstDefined = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

/*
|--------------------------------------------------------------------------
| Invoice Number Helpers
|--------------------------------------------------------------------------
*/

function normalizePurchaseInvoiceNo(value) {
  return cleanText(value).replace(
    /^sales-invoice/i,
    "purchase-invoice"
  );
}

async function invoiceNumberExists(
  connection,
  invoiceNo,
  excludeInvoiceId = null
) {
  let sql = `
    SELECT id
    FROM purchase_invoices
    WHERE LOWER(TRIM(invoice_no)) = LOWER(TRIM(?))
  `;

  const params = [invoiceNo];

  if (excludeInvoiceId) {
    sql += " AND id <> ?";
    params.push(excludeInvoiceId);
  }

  sql += " LIMIT 1";

  const rows = await query(connection, sql, params);

  return rows.length > 0;
}

function splitInvoiceNumber(value) {
  const normalizedValue =
    normalizePurchaseInvoiceNo(value) ||
    "purchase-invoice01";

  const match = normalizedValue.match(
    /^(.*?)(\d+)$/
  );

  if (!match) {
    return {
      prefix: "purchase-invoice",
      currentNumber: 1,
      width: 2,
    };
  }

  return {
    prefix: match[1] || "purchase-invoice",
    currentNumber: Number(match[2]) || 1,
    width: Math.max(match[2].length, 2),
  };
}

async function getUniqueInvoiceNumber(
  connection,
  requestedInvoiceNo = "purchase-invoice01",
  excludeInvoiceId = null
) {
  const normalizedRequestedNo =
    normalizePurchaseInvoiceNo(requestedInvoiceNo);

  if (
    normalizedRequestedNo &&
    !(await invoiceNumberExists(
      connection,
      normalizedRequestedNo,
      excludeInvoiceId
    ))
  ) {
    return normalizedRequestedNo;
  }

  const parsedNumber = splitInvoiceNumber(
    normalizedRequestedNo
  );

  const existingRows = await query(
    connection,
    `
      SELECT invoice_no
      FROM purchase_invoices
      WHERE invoice_no IS NOT NULL
    `
  );

  let maximumNumber = 0;
  let numberWidth = parsedNumber.width;

  for (const row of existingRows) {
    const invoiceNo = normalizePurchaseInvoiceNo(
      row.invoice_no
    );

    const match = invoiceNo.match(/^(.*?)(\d+)$/);

    if (!match) continue;

    const existingPrefix = match[1];
    const existingNumber = Number(match[2]) || 0;

    if (
      existingPrefix.toLowerCase() !==
      parsedNumber.prefix.toLowerCase()
    ) {
      continue;
    }

    maximumNumber = Math.max(
      maximumNumber,
      existingNumber
    );

    numberWidth = Math.max(
      numberWidth,
      match[2].length
    );
  }

  const nextNumber = Math.max(
    maximumNumber + 1,
    parsedNumber.currentNumber + 1
  );

  return `${parsedNumber.prefix}${String(
    nextNumber
  ).padStart(numberWidth, "0")}`;
}

/*
|--------------------------------------------------------------------------
| Supplier Helpers
|--------------------------------------------------------------------------
*/

async function getSupplierById(connection, supplierId) {
  if (!supplierId) return null;

  const rows = await query(
    connection,
    `
      SELECT *
      FROM suppliers
      WHERE id = ?
      LIMIT 1
    `,
    [supplierId]
  );

  return rows[0] || null;
}

function getSupplierName(supplier) {
  if (!supplier) return "";

  return cleanText(
    supplier.supplier_name ||
      supplier.supplier_name_en ||
      supplier.name ||
      supplier.name_en ||
      supplier.company_name
  );
}

async function resolveSupplier(connection, body = {}) {
  let supplierId = toPositiveId(
    body.supplier_id ||
      (
        cleanText(
          body.party_type ||
            body.customer_type
        ).toLowerCase() === "supplier"
          ? body.party_id
          : null
      )
  );

  let supplierName = cleanText(
    body.supplier_name ||
      body.party_name ||
      body.customer_name_en ||
      body.customer_name ||
      body.name
  );

  if (supplierId && !supplierName) {
    const supplier = await getSupplierById(
      connection,
      supplierId
    );

    supplierName = getSupplierName(supplier);
  }

  if (!supplierId && supplierName) {
    const rows = await query(
      connection,
      `
        SELECT *
        FROM suppliers
        WHERE LOWER(TRIM(supplier_name)) =
              LOWER(TRIM(?))
        LIMIT 1
      `,
      [supplierName]
    ).catch(() => []);

    if (rows[0]) {
      supplierId = rows[0].id;
      supplierName =
        getSupplierName(rows[0]) || supplierName;
    }
  }

  return {
    supplierId,
    supplierName,
  };
}

/*
|--------------------------------------------------------------------------
| Product Item Helpers
|--------------------------------------------------------------------------
*/

function getRawItems(body = {}) {
  if (Array.isArray(body.items)) {
    return body.items;
  }

  if (Array.isArray(body.invoice_items)) {
    return body.invoice_items;
  }

  if (Array.isArray(body.sales_invoice_items)) {
    return body.sales_invoice_items;
  }

  if (Array.isArray(body.purchase_invoice_items)) {
    return body.purchase_invoice_items;
  }

  return [];
}

function normalizeItem(item = {}, index = 0) {
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
    firstDefined(
      item.amount,
      item.line_total
    ),
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

    category_name: cleanText(
      item.category_name
    ),

    unit_name: cleanText(
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
        amount || quantity * rate
      ).toFixed(2)
    ),
  };
}

async function prepareInvoiceItems(body) {
  const rawItems = getRawItems(body);

  return rawItems
    .map(normalizeItem)
    .filter(
      (item) =>
        (item.product_id || item.product_name) &&
        item.quantity > 0
    )
    .map((item) => ({
      ...item,
      amount: Number(
        (
          item.quantity * item.rate
        ).toFixed(2)
      ),
    }));
}

async function insertInvoiceItems(
  connection,
  invoiceId,
  items
) {
  for (const item of items) {
    await query(
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
  const rows = await query(
    connection,
    `
      SELECT
        pii.id,
        pii.invoice_id,
        pii.product_id,

        COALESCE(
          NULLIF(p.product_name, ''),
          ''
        ) AS product_name,

        pii.unit_name,
        pii.category_name,
        pii.type_name,
        pii.quantity,
        pii.rate,
        pii.amount

      FROM purchase_invoice_items pii

      LEFT JOIN products p
        ON p.id = pii.product_id

      WHERE pii.invoice_id = ?

      ORDER BY pii.id ASC
    `,
    [invoiceId]
  );

  return rows.map((row, index) => {
    const quantity = toNumber(row.quantity);
    const rate = toNumber(row.rate);
    const amount = toNumber(
      row.amount,
      quantity * rate
    );

    return {
      id: row.id,
      invoice_id: row.invoice_id,
      sr: index + 1,

      product_id: row.product_id,
      product_name:
        row.product_name ||
        `Product #${row.product_id || ""}`,

      product_description:
        row.product_name || "",

      description:
        row.product_name || "",

      category_name:
        row.category_name || "",

      unit_name:
        row.unit_name || "",

      type_name:
        row.type_name || "",

      product_type:
        row.type_name || "",

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

/*
|--------------------------------------------------------------------------
| Invoice Response Helpers
|--------------------------------------------------------------------------
*/

async function findSupplierIdByName(
  connection,
  supplierName
) {
  if (!supplierName) return null;

  const rows = await query(
    connection,
    `
      SELECT id
      FROM suppliers
      WHERE LOWER(TRIM(supplier_name)) =
            LOWER(TRIM(?))
      LIMIT 1
    `,
    [supplierName]
  ).catch(() => []);

  return rows[0]?.id || null;
}

async function normalizeInvoiceResponse(
  connection,
  invoice
) {
  const items = await getInvoiceItems(
    connection,
    invoice.id
  );

  const supplierName = cleanText(
    invoice.supplier_name
  );

  const supplierId =
    await findSupplierIdByName(
      connection,
      supplierName
    );

  const totalAmount = toNumber(
    invoice.total_amount
  );

  const debit = toNumber(
    invoice.debit,
    totalAmount
  );

  const credit = toNumber(
    invoice.credit
  );

  const totalQuantity = items.reduce(
    (total, item) =>
      total + toNumber(item.quantity),
    0
  );

  return {
    id: invoice.id,

    invoice_no:
      invoice.invoice_no || "",

    reference_no: "",

    party_type: "supplier",
    customer_type: "supplier",

    party_id: supplierId || "",
    supplier_id: supplierId || "",

    party_name: supplierName,
    supplier_name: supplierName,

    customer_name: supplierName,
    customer_name_en: supplierName,

    invoice_date: toDate(
      invoice.invoice_date
    ),

    address: "",

    previous_balance: 0,
    delivery_charges: 0,
    discount: 0,

    invoice_total: totalAmount,
    total_amount: totalAmount,
    grand_total: totalAmount,

    total_qty: totalQuantity,
    items_count: items.length,

    debit,
    credit,

    paid_amount: credit,

    remaining_balance: Math.max(
      debit - credit,
      0
    ),

    payment_status:
      invoice.status || "pending",

    status:
      invoice.status || "pending",

    items,
  };
}

async function getInvoiceById(
  connection,
  invoiceId
) {
  const rows = await query(
    connection,
    `
      SELECT *
      FROM purchase_invoices
      WHERE id = ?
      LIMIT 1
    `,
    [invoiceId]
  );

  if (!rows[0]) return null;

  return normalizeInvoiceResponse(
    connection,
    rows[0]
  );
}

/*
|--------------------------------------------------------------------------
| Request Validation
|--------------------------------------------------------------------------
*/

async function prepareInvoiceRequest(
  connection,
  body
) {
  const supplier = await resolveSupplier(
    connection,
    body
  );

  const items = await prepareInvoiceItems(body);

  let invoiceNo =
    normalizePurchaseInvoiceNo(
      body.invoice_no
    );

  if (!invoiceNo) {
    invoiceNo = await getUniqueInvoiceNumber(
      connection,
      "purchase-invoice01"
    );
  }

  if (!supplier.supplierName) {
    const error = new Error(
      "Supplier select karein."
    );

    error.status = 400;
    throw error;
  }

  if (!items.length) {
    const error = new Error(
      "Kam az kam aik valid product aur quantity add karein."
    );

    error.status = 400;
    throw error;
  }

  const calculatedTotal = items.reduce(
    (total, item) =>
      total + toNumber(item.amount),
    0
  );

  const totalAmount = toNumber(
    firstDefined(
      body.grand_total,
      body.invoice_total,
      body.total_amount
    ),
    calculatedTotal
  );

  const debit = toNumber(
    body.debit,
    totalAmount
  );

  const credit = toNumber(
    firstDefined(
      body.credit,
      body.paid_amount,
      body.payment_received
    )
  );

  return {
    invoiceNo,

    supplierId:
      supplier.supplierId,

    supplierName:
      supplier.supplierName,

    invoiceDate:
      toDate(body.invoice_date),

    totalAmount:
      Number(totalAmount.toFixed(2)),

    debit:
      Number(debit.toFixed(2)),

    credit:
      Number(credit.toFixed(2)),

    status:
      cleanText(
        body.status ||
          body.payment_status ||
          "pending"
      ) || "pending",

    items,
  };
}

/*
|--------------------------------------------------------------------------
| GET NEXT INVOICE NUMBER
|--------------------------------------------------------------------------
| Important: this route must remain before /:id.
*/

router.get("/next-number", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const invoiceNo =
      await getUniqueInvoiceNumber(
        connection,
        "purchase-invoice01"
      );

    res.json({
      success: true,
      invoice_no: invoiceNo,
      data: {
        invoice_no: invoiceNo,
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
});

/*
|--------------------------------------------------------------------------
| GET SUPPLIER INVOICES
|--------------------------------------------------------------------------
| Sales Invoice page compatibility.
*/

router.get(
  "/customer/:partyType/:partyId",
  async (req, res) => {
    const { connection, release } =
      await getConnection();

    try {
      const partyType = cleanText(
        req.params.partyType
      ).toLowerCase();

      const supplierId = toPositiveId(
        req.params.partyId
      );

      if (
        partyType !== "supplier" ||
        !supplierId
      ) {
        return res.json({
          success: true,
          data: [],
          invoices: [],
        });
      }

      const supplier = await getSupplierById(
        connection,
        supplierId
      );

      if (!supplier) {
        return res.json({
          success: true,
          data: [],
          invoices: [],
        });
      }

      const supplierName =
        getSupplierName(supplier);

      const rows = await query(
        connection,
        `
          SELECT *
          FROM purchase_invoices
          WHERE LOWER(TRIM(supplier_name)) =
                LOWER(TRIM(?))
          ORDER BY id DESC
        `,
        [supplierName]
      );

      const invoices = [];

      for (const row of rows) {
        invoices.push(
          await normalizeInvoiceResponse(
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
| BULK PRINT DATA
|--------------------------------------------------------------------------
*/

router.post(
  "/bulk-print-data",
  async (req, res) => {
    const { connection, release } =
      await getConnection();

    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids
            .map(toPositiveId)
            .filter(Boolean)
        : [];

      if (!ids.length) {
        return res.status(400).json({
          success: false,
          message:
            "Invoice IDs zaroori hain.",
        });
      }

      const rows = await query(
        connection,
        `
          SELECT *
          FROM purchase_invoices
          WHERE id IN (?)
          ORDER BY id DESC
        `,
        [ids]
      );

      const invoices = [];

      for (const row of rows) {
        invoices.push(
          await normalizeInvoiceResponse(
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
        "POST purchase invoice bulk print:",
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
| GET ALL PURCHASE INVOICES
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const rows = await query(
      connection,
      `
        SELECT *
        FROM purchase_invoices
        ORDER BY id DESC
      `
    );

    const invoices = [];

    for (const row of rows) {
      invoices.push(
        await normalizeInvoiceResponse(
          connection,
          row
        )
      );
    }

    /*
     * Array response old Purchase Invoice frontend
     * aur new wrapper dono ke saath compatible hai.
     */
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
});

/*
|--------------------------------------------------------------------------
| GET SINGLE PURCHASE INVOICE
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  const { connection, release } =
    await getConnection();

  try {
    const invoiceId = toPositiveId(
      req.params.id
    );

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message:
          "Valid invoice ID zaroori hai.",
      });
    }

    const invoice = await getInvoiceById(
      connection,
      invoiceId
    );

    if (!invoice) {
      return res.status(404).json({
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
});

/*
|--------------------------------------------------------------------------
| CREATE PURCHASE INVOICE
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const invoice = await withTransaction(
      async (connection) => {
        const prepared =
          await prepareInvoiceRequest(
            connection,
            req.body
          );

        let requestedInvoiceNo =
          prepared.invoiceNo;

        let insertResult = null;
        let finalInvoiceNo = null;

        /*
         * Retry protection:
         * Do users same number bhej dein tab bhi
         * next number automatically generate hoga.
         */
        for (
          let attempt = 0;
          attempt < 10;
          attempt += 1
        ) {
          finalInvoiceNo =
            await getUniqueInvoiceNumber(
              connection,
              requestedInvoiceNo
            );

          try {
            insertResult = await query(
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
                finalInvoiceNo,
                prepared.supplierName,
                prepared.invoiceDate,
                prepared.totalAmount,
                prepared.debit,
                prepared.credit,
                prepared.status,
              ]
            );

            break;
          } catch (error) {
            const duplicateInvoiceNumber =
              error?.code === "ER_DUP_ENTRY" &&
              /invoice_no/i.test(
                `${
                  error.message || ""
                } ${
                  error.sqlMessage || ""
                }`
              );

            if (!duplicateInvoiceNumber) {
              throw error;
            }

            requestedInvoiceNo =
              finalInvoiceNo;
          }
        }

        if (!insertResult?.insertId) {
          const error = new Error(
            "Unique invoice number generate nahi ho saka. Dobara try karein."
          );

          error.status = 409;
          throw error;
        }

        await insertInvoiceItems(
          connection,
          insertResult.insertId,
          prepared.items
        );

        return getInvoiceById(
          connection,
          insertResult.insertId
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

    const duplicateInvoiceNumber =
      error?.code === "ER_DUP_ENTRY" &&
      /invoice_no/i.test(
        `${
          error.message || ""
        } ${
          error.sqlMessage || ""
        }`
      );

    res
      .status(
        error.status ||
          (duplicateInvoiceNumber
            ? 409
            : 500)
      )
      .json({
        success: false,

        message: duplicateInvoiceNumber
          ? "Invoice number pehle se maujood hai. Dobara Save karein; next number automatically generate hoga."
          : error.message ||
            "Purchase invoice save nahi hui.",
      });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE PURCHASE INVOICE
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {
  try {
    const invoice = await withTransaction(
      async (connection) => {
        const invoiceId = toPositiveId(
          req.params.id
        );

        if (!invoiceId) {
          const error = new Error(
            "Valid invoice ID zaroori hai."
          );

          error.status = 400;
          throw error;
        }

        const existingInvoice =
          await getInvoiceById(
            connection,
            invoiceId
          );

        if (!existingInvoice) {
          const error = new Error(
            "Purchase invoice nahi mili."
          );

          error.status = 404;
          throw error;
        }

        const prepared =
          await prepareInvoiceRequest(
            connection,
            req.body
          );

        const duplicateExists =
          await invoiceNumberExists(
            connection,
            prepared.invoiceNo,
            invoiceId
          );

        if (duplicateExists) {
          const error = new Error(
            `Invoice No "${prepared.invoiceNo}" pehle se maujood hai.`
          );

          error.status = 409;
          throw error;
        }

        await query(
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
            prepared.invoiceNo,
            prepared.supplierName,
            prepared.invoiceDate,
            prepared.totalAmount,
            prepared.debit,
            prepared.credit,
            prepared.status,
            invoiceId,
          ]
        );

        await query(
          connection,
          `
            DELETE FROM purchase_invoice_items
            WHERE invoice_id = ?
          `,
          [invoiceId]
        );

        await insertInvoiceItems(
          connection,
          invoiceId,
          prepared.items
        );

        return getInvoiceById(
          connection,
          invoiceId
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
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Purchase invoice update nahi hui.",
      });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE PURCHASE INVOICE
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {
  try {
    await withTransaction(
      async (connection) => {
        const invoiceId = toPositiveId(
          req.params.id
        );

        if (!invoiceId) {
          const error = new Error(
            "Valid invoice ID zaroori hai."
          );

          error.status = 400;
          throw error;
        }

        const existingInvoice =
          await getInvoiceById(
            connection,
            invoiceId
          );

        if (!existingInvoice) {
          const error = new Error(
            "Purchase invoice nahi mili."
          );

          error.status = 404;
          throw error;
        }

        /*
         * Check whether purchase_returns table exists.
         */
        const tableRows = await query(
          connection,
          "SHOW TABLES LIKE 'purchase_returns'"
        );

        if (tableRows.length) {
          const returnRows = await query(
            connection,
            `
              SELECT id
              FROM purchase_returns
              WHERE invoice_id = ?
              LIMIT 1
            `,
            [invoiceId]
          );

          if (returnRows.length) {
            const error = new Error(
              "Is invoice ke purchase returns maujood hain. Pehle related returns delete karein."
            );

            error.status = 409;
            throw error;
          }
        }

        await query(
          connection,
          `
            DELETE FROM purchase_invoice_items
            WHERE invoice_id = ?
          `,
          [invoiceId]
        );

        await query(
          connection,
          `
            DELETE FROM purchase_invoices
            WHERE id = ?
          `,
          [invoiceId]
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
      .status(error.status || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Purchase invoice delete nahi hui.",
      });
  }
});

module.exports = router;
