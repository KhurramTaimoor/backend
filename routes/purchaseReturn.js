const express = require("express");
const router = express.Router();
const db = require("../db");

const query = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (error, result) => {
      if (error) return reject(error);
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
      if (error) return reject(error);

      resolve({
        connection,
        release: () => connection.release?.(),
      });
    });
  });

const begin = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.beginTransaction) {
      resolve();
      return;
    }

    connection.beginTransaction((error) =>
      error ? reject(error) : resolve()
    );
  });

const commit = (connection) =>
  new Promise((resolve, reject) => {
    if (!connection.commit) {
      resolve();
      return;
    }

    connection.commit((error) =>
      error ? reject(error) : resolve()
    );
  });

const rollback = (connection) =>
  new Promise((resolve) => {
    if (!connection.rollback) {
      resolve();
      return;
    }

    connection.rollback(() => resolve());
  });

async function withTransaction(work) {
  const { connection, release } =
    await getConnection();

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
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const toPositiveId = (value) => {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
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

  const match = cleanText(value).match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  return match ? match[1] : null;
};

const httpError = (
  message,
  status = 400
) => {
  const error = new Error(message);

  error.status = status;

  return error;
};

const normalizeText = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, " ");

function isPlaceholderProductName(value) {
  const text = cleanText(value);

  return (
    !text ||
    /^product\s*#?\s*$/i.test(text) ||
    /^product\s*#\s*\d*$/i.test(text) ||
    /^selected product$/i.test(text)
  );
}

/*
|--------------------------------------------------------------------------
| Request items
|--------------------------------------------------------------------------
*/

function getBodyItems(body = {}) {
  if (Array.isArray(body.items)) {
    return body.items;
  }

  if (Array.isArray(body.returns)) {
    return body.returns;
  }

  if (
    Array.isArray(body.return_items)
  ) {
    return body.return_items;
  }

  if (
    Array.isArray(
      body.purchase_return_items
    )
  ) {
    return body.purchase_return_items;
  }

  const hasSingleItem =
    body.invoice_item_id ||
    body.product_id ||
    body.product_name ||
    body.manual_product_name ||
    body.return_qty ||
    body.quantity;

  return hasSingleItem
    ? [body]
    : [];
}

function normalizeItem(item = {}) {
  const quantity = toNumber(
    firstDefined(
      item.return_qty,
      item.qty,
      item.quantity
    )
  );

  const rate = toNumber(item.rate);

  const rawName = cleanText(
    item.product_name ||
      item.manual_product_name ||
      item.product_description ||
      item.description
  );

  return {
    /*
     * Important:
     * Automatic return frontend invoice_item_id
     * bhejta hai. Isko remove nahi karna.
     */
    invoice_item_id: toPositiveId(
      item.invoice_item_id ||
        item.purchase_invoice_item_id ||
        item.item_id
    ),

    product_id:
      toPositiveId(item.product_id),

    product_name:
      isPlaceholderProductName(rawName)
        ? ""
        : rawName,

    unit_name:
      cleanText(item.unit_name),

    category_name:
      cleanText(item.category_name),

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

function itemKey(item) {
  const productId =
    toPositiveId(item.product_id);

  if (productId) {
    return `id:${productId}`;
  }

  return [
    `name:${normalizeText(
      item.product_name
    )}`,
    `unit:${normalizeText(
      item.unit_name
    )}`,
  ].join("|");
}

/*
|--------------------------------------------------------------------------
| Purchase invoice helpers
|--------------------------------------------------------------------------
*/

async function getInvoice(
  connection,
  invoiceId
) {
  const rows = await query(
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
    [invoiceId]
  );

  return rows[0] || null;
}

async function getInvoiceItems(
  connection,
  invoiceId
) {
  return query(
    connection,
    `
      SELECT
        pii.id,

        pii.id AS invoice_item_id,

        pii.invoice_id,
        pii.product_id,

        COALESCE(
          NULLIF(
            p.product_name,
            ''
          ),
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
}

/*
|--------------------------------------------------------------------------
| Match submitted return product with invoice product
|--------------------------------------------------------------------------
*/

function findInvoiceItem(
  invoiceItems,
  submittedItem
) {
  /*
   * First priority:
   * exact invoice line id.
   */
  if (submittedItem.invoice_item_id) {
    const matched =
      invoiceItems.find(
        (item) =>
          Number(
            item.invoice_item_id ||
              item.id
          ) ===
          Number(
            submittedItem.invoice_item_id
          )
      );

    if (matched) return matched;
  }

  /*
   * Second priority:
   * product id.
   */
  if (submittedItem.product_id) {
    const matched =
      invoiceItems.find(
        (item) =>
          Number(item.product_id) ===
          Number(
            submittedItem.product_id
          )
      );

    if (matched) return matched;
  }

  /*
   * Third priority:
   * product name and unit.
   */
  const submittedName =
    normalizeText(
      submittedItem.product_name
    );

  const submittedUnit =
    normalizeText(
      submittedItem.unit_name
    );

  if (submittedName) {
    const matched =
      invoiceItems.find((item) => {
        const sameName =
          normalizeText(
            item.product_name
          ) === submittedName;

        const invoiceUnit =
          normalizeText(
            item.unit_name
          );

        const sameUnit =
          !submittedUnit ||
          !invoiceUnit ||
          invoiceUnit === submittedUnit;

        return sameName && sameUnit;
      });

    if (matched) return matched;
  }

  /*
   * Old frontend fallback:
   * Product #/blank ho aur invoice mein
   * sirf aik product ho.
   */
  if (
    invoiceItems.length === 1 &&
    !submittedName
  ) {
    return invoiceItems[0];
  }

  return null;
}

function hydrateFromInvoice(
  submittedItem,
  invoiceItem
) {
  const quantity =
    toNumber(
      submittedItem.quantity
    );

  const rate =
    toNumber(
      submittedItem.rate
    ) > 0
      ? toNumber(
          submittedItem.rate
        )
      : toNumber(
          invoiceItem.rate
        );

  return {
    ...submittedItem,

    invoice_item_id:
      toPositiveId(
        invoiceItem.invoice_item_id ||
          invoiceItem.id
      ),

    product_id:
      toPositiveId(
        invoiceItem.product_id
      ),

    product_name:
      cleanText(
        invoiceItem.product_name
      ) ||
      submittedItem.product_name ||
      `Product #${
        invoiceItem.product_id || ""
      }`,

    unit_name:
      cleanText(
        invoiceItem.unit_name
      ) ||
      submittedItem.unit_name,

    category_name:
      cleanText(
        invoiceItem.category_name
      ) ||
      submittedItem.category_name,

    type_name:
      cleanText(
        invoiceItem.type_name
      ) ||
      submittedItem.type_name,

    quantity,
    rate,

    amount: Number(
      (
        quantity * rate
      ).toFixed(2)
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Previously returned quantities
|--------------------------------------------------------------------------
*/

async function getAlreadyReturnedMap(
  connection,
  invoiceId,
  excludeReturnId = null
) {
  let sql = `
    SELECT
      pri.product_id,

      COALESCE(
        NULLIF(
          p.product_name,
          ''
        ),
        ''
      ) AS product_name,

      pri.unit_name,

      SUM(
        pri.quantity
      ) AS returned_qty

    FROM purchase_return_items pri

    INNER JOIN purchase_returns pr
      ON pr.id = pri.return_id

    LEFT JOIN products p
      ON p.id = pri.product_id

    WHERE pr.invoice_id = ?
  `;

  const params = [invoiceId];

  /*
   * Edit ke waqt current return ko
   * already-returned calculation se exclude karo.
   */
  if (excludeReturnId) {
    sql += " AND pr.id <> ?";

    params.push(excludeReturnId);
  }

  sql += `
    GROUP BY
      pri.product_id,
      p.product_name,
      pri.unit_name
  `;

  const rows = await query(
    connection,
    sql,
    params
  );

  const map = new Map();

  for (const row of rows) {
    map.set(
      itemKey(row),
      toNumber(row.returned_qty)
    );
  }

  return map;
}

/*
|--------------------------------------------------------------------------
| Validate and hydrate items
|--------------------------------------------------------------------------
*/

async function validateAndHydrateItems(
  connection,
  invoiceId,
  rawItems,
  excludeReturnId = null,
  skipQuantityValidation = false
) {
  const invoiceItems =
    await getInvoiceItems(
      connection,
      invoiceId
    );

  if (!invoiceItems.length) {
    throw httpError(
      "Selected purchase invoice mein koi product item nahi mila.",
      400
    );
  }

  const submittedItems =
    rawItems
      .map(normalizeItem)
      .filter(
        (item) =>
          item.quantity > 0 &&
          (
            item.invoice_item_id ||
            item.product_id ||
            item.product_name
          )
      );

  if (!submittedItems.length) {
    throw httpError(
      "Kam az kam aik valid return item add karein.",
      400
    );
  }

  /*
   * Har submitted row ko exact invoice row
   * ke saath match karo.
   */
  const hydratedItems =
    submittedItems.map(
      (submittedItem) => {
        const invoiceItem =
          findInvoiceItem(
            invoiceItems,
            submittedItem
          );

        if (!invoiceItem) {
          const label =
            submittedItem.product_name ||
            (
              submittedItem.product_id
                ? `Product #${submittedItem.product_id}`
                : "Selected product"
            );

          throw httpError(
            `${label} is purchase invoice mein nahi hai. Invoice dobara select karein.`,
            400
          );
        }

        return hydrateFromInvoice(
          submittedItem,
          invoiceItem
        );
      }
    );

  if (skipQuantityValidation) {
    return hydratedItems;
  }

  /*
   * Purchased quantity map.
   */
  const purchasedMap = new Map();

  for (const item of invoiceItems) {
    const key = itemKey(item);

    purchasedMap.set(
      key,

      toNumber(
        purchasedMap.get(key)
      ) +
        toNumber(item.quantity)
    );
  }

  /*
   * Previously returned quantity.
   */
  const returnedMap =
    await getAlreadyReturnedMap(
      connection,
      invoiceId,
      excludeReturnId
    );

  /*
   * Current request mein same product ki
   * multiple rows hon to combine karo.
   */
  const requestedMap = new Map();

  for (const item of hydratedItems) {
    const key = itemKey(item);

    requestedMap.set(
      key,

      toNumber(
        requestedMap.get(key)
      ) +
        toNumber(item.quantity)
    );
  }

  for (
    const [
      key,
      requestedQuantity,
    ] of requestedMap.entries()
  ) {
    const purchasedQuantity =
      toNumber(
        purchasedMap.get(key)
      );

    const alreadyReturned =
      toNumber(
        returnedMap.get(key)
      );

    const remainingQuantity =
      Math.max(
        purchasedQuantity -
          alreadyReturned,
        0
      );

    if (
      requestedQuantity >
      remainingQuantity
    ) {
      const item =
        hydratedItems.find(
          (row) =>
            itemKey(row) === key
        );

      throw httpError(
        `${
          item?.product_name ||
          "Selected product"
        } ki maximum return quantity ${remainingQuantity} hai.`,
        400
      );
    }
  }

  return hydratedItems;
}

/*
|--------------------------------------------------------------------------
| Manual return invoice
|--------------------------------------------------------------------------
*/

async function createManualInvoice(
  connection,
  body,
  items
) {
  const returnDate =
    toDate(body.return_date) ||
    toDate(new Date());

  const supplierName =
    cleanText(
      body.supplier_name ||
        body.party_name ||
        body.customer_name ||
        "Manual Supplier Return"
    );

  const total =
    items.reduce(
      (sum, item) =>
        sum +
        toNumber(item.amount),
      0
    );

  const invoiceNo =
    cleanText(
      body.invoice_no ||
        body.invoice_ref
    ) ||
    `PR-MANUAL-${Date.now()}`;

  const result = await query(
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
      supplierName,
      returnDate,
      total,
      total,
      0,
      "return-only",
    ]
  );

  /*
   * Manual return ke liye temporary
   * purchase invoice items create karo.
   */
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
        result.insertId,
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

  return result.insertId;
}

/*
|--------------------------------------------------------------------------
| Prepare POST/PUT request
|--------------------------------------------------------------------------
*/

async function prepareRequest(
  connection,
  body,
  excludeReturnId = null
) {
  let invoiceId =
    toPositiveId(body.invoice_id);

  const normalizedInputItems =
    getBodyItems(body).map(
      normalizeItem
    );

  let manualInvoice = false;

  /*
   * Manual mode:
   * Invoice ID na ho to temporary return-only
   * purchase invoice create hoti hai.
   */
  if (!invoiceId) {
    const validManualItems =
      normalizedInputItems.filter(
        (item) =>
          item.quantity > 0 &&
          (
            item.product_id ||
            item.product_name
          )
      );

    if (!validManualItems.length) {
      throw httpError(
        "Purchase invoice select karein.",
        400
      );
    }

    invoiceId =
      await createManualInvoice(
        connection,
        body,
        validManualItems
      );

    manualInvoice = true;
  }

  const invoice =
    await getInvoice(
      connection,
      invoiceId
    );

  if (!invoice) {
    throw httpError(
      "Related purchase invoice nahi mili.",
      404
    );
  }

  const items =
    await validateAndHydrateItems(
      connection,
      invoiceId,
      getBodyItems(body),
      excludeReturnId,

      manualInvoice ||
        cleanText(
          invoice.status
        ) === "return-only"
    );

  const calculatedTotal =
    items.reduce(
      (sum, item) =>
        sum +
        toNumber(item.amount),
      0
    );

  const total =
    toNumber(
      body.total_amount,
      calculatedTotal
    );

  const debit =
    toNumber(
      body.debit,
      0
    );

  const credit =
    toNumber(
      body.credit,
      total
    );

  return {
    invoiceId,

    header: {
      return_date:
        toDate(
          body.return_date
        ) ||
        toDate(new Date()),

      reason:
        cleanText(body.reason),

      total_amount:
        Number(
          total.toFixed(2)
        ),

      debit:
        Number(
          debit.toFixed(2)
        ),

      credit:
        Number(
          credit.toFixed(2)
        ),
    },

    items,
  };
}

/*
|--------------------------------------------------------------------------
| Insert return items
|--------------------------------------------------------------------------
*/

async function insertReturnItems(
  connection,
  returnId,
  items
) {
  for (const item of items) {
    await query(
      connection,
      `
        INSERT INTO purchase_return_items
        (
          return_id,
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
        returnId,
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

/*
|--------------------------------------------------------------------------
| Fetch return items
|--------------------------------------------------------------------------
*/

async function getReturnItems(
  connection,
  returnId
) {
  const rows = await query(
    connection,
    `
      SELECT
        pri.*,

        COALESCE(
          NULLIF(
            p.product_name,
            ''
          ),
          ''
        ) AS product_name

      FROM purchase_return_items pri

      LEFT JOIN products p
        ON p.id = pri.product_id

      WHERE pri.return_id = ?

      ORDER BY pri.id ASC
    `,
    [returnId]
  );

  return rows.map((row) => ({
    id: row.id,

    return_id:
      row.return_id,

    product_id:
      row.product_id,

    product_name:
      cleanText(
        row.product_name
      ),

    manual_product_name:
      cleanText(
        row.product_name
      ),

    unit_name:
      cleanText(
        row.unit_name
      ),

    category_name:
      cleanText(
        row.category_name
      ),

    type_name:
      cleanText(
        row.type_name
      ),

    product_type:
      cleanText(
        row.type_name
      ),

    quantity:
      toNumber(
        row.quantity
      ),

    qty:
      toNumber(
        row.quantity
      ),

    return_qty:
      toNumber(
        row.quantity
      ),

    rate:
      toNumber(
        row.rate
      ),

    amount:
      toNumber(
        row.amount
      ),

    return_amount:
      toNumber(
        row.amount
      ),
  }));
}

/*
|--------------------------------------------------------------------------
| Fetch single purchase return
|--------------------------------------------------------------------------
*/

async function getReturnById(
  connection,
  returnId
) {
  const rows = await query(
    connection,
    `
      SELECT
        pr.*,

        DATE_FORMAT(
          pr.return_date,
          '%Y-%m-%d'
        ) AS return_date_text,

        pi.invoice_no,
        pi.supplier_name

      FROM purchase_returns pr

      LEFT JOIN purchase_invoices pi
        ON pi.id = pr.invoice_id

      WHERE pr.id = ?

      LIMIT 1
    `,
    [returnId]
  );

  if (!rows[0]) {
    return null;
  }

  const row = rows[0];

  const items =
    await getReturnItems(
      connection,
      row.id
    );

  return {
    id: row.id,

    return_no:
      `purchase-return${String(
        row.id
      ).padStart(2, "0")}`,

    return_mode:
      row.invoice_id
        ? "auto"
        : "manual",

    invoice_id:
      row.invoice_id,

    invoice_ref:
      cleanText(
        row.invoice_no
      ),

    invoice_no:
      cleanText(
        row.invoice_no
      ),

    party_type:
      "supplier",

    party_name:
      cleanText(
        row.supplier_name
      ),

    supplier_name:
      cleanText(
        row.supplier_name
      ),

    customer_name:
      cleanText(
        row.supplier_name
      ),

    return_date:
      toDate(
        row.return_date_text ||
          row.return_date
      ),

    reason:
      cleanText(
        row.reason
      ),

    total_amount:
      toNumber(
        row.total_amount
      ),

    debit:
      toNumber(
        row.debit
      ),

    credit:
      toNumber(
        row.credit
      ),

    status:
      "Saved",

    items,
  };
}

/*
|--------------------------------------------------------------------------
| Invoice product availability
|--------------------------------------------------------------------------
*/

router.get(
  "/invoice/:invoiceId/availability",
  async (req, res) => {
    const {
      connection,
      release,
    } = await getConnection();

    try {
      const invoiceId =
        toPositiveId(
          req.params.invoiceId
        );

      if (!invoiceId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Valid purchase invoice id zaroori hai.",
          });
      }

      const invoice =
        await getInvoice(
          connection,
          invoiceId
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

      const invoiceItems =
        await getInvoiceItems(
          connection,
          invoiceId
        );

      const returnedMap =
        await getAlreadyReturnedMap(
          connection,
          invoiceId
        );

      const items =
        invoiceItems.map((item) => {
          const purchasedQuantity =
            toNumber(
              item.quantity
            );

          const returnedQuantity =
            toNumber(
              returnedMap.get(
                itemKey(item)
              )
            );

          return {
            ...item,

            purchased_qty:
              purchasedQuantity,

            already_returned_qty:
              returnedQuantity,

            remaining_qty:
              Math.max(
                purchasedQuantity -
                  returnedQuantity,
                0
              ),
          };
        });

      res.json({
        success: true,
        data: items,
        items,
      });
    } catch (error) {
      console.error(
        "GET purchase return availability:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Availability load nahi hui.",
      });
    } finally {
      release();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get all purchase returns
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  const {
    connection,
    release,
  } = await getConnection();

  try {
    const rows = await query(
      connection,
      `
        SELECT id
        FROM purchase_returns
        ORDER BY id DESC
      `
    );

    const returns = [];

    for (const row of rows) {
      const purchaseReturn =
        await getReturnById(
          connection,
          row.id
        );

      if (purchaseReturn) {
        returns.push(
          purchaseReturn
        );
      }
    }

    res.json(returns);
  } catch (error) {
    console.error(
      "GET /purchase-returns:",
      error
    );

    res.status(500).json({
      success: false,

      error:
        error.message ||
        "Purchase returns load nahi huin.",

      message:
        error.message ||
        "Purchase returns load nahi huin.",
    });
  } finally {
    release();
  }
});

/*
|--------------------------------------------------------------------------
| Get single purchase return
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  const {
    connection,
    release,
  } = await getConnection();

  try {
    const returnId =
      toPositiveId(
        req.params.id
      );

    if (!returnId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Valid return id zaroori hai.",
        });
    }

    const purchaseReturn =
      await getReturnById(
        connection,
        returnId
      );

    if (!purchaseReturn) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Purchase return nahi mila.",
        });
    }

    res.json({
      success: true,
      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error(
      `GET /purchase-returns/${req.params.id}:`,
      error
    );

    res.status(500).json({
      success: false,

      error:
        error.message ||
        "Purchase return load nahi hua.",

      message:
        error.message ||
        "Purchase return load nahi hua.",
    });
  } finally {
    release();
  }
});

/*
|--------------------------------------------------------------------------
| Create purchase return
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const purchaseReturn =
      await withTransaction(
        async (connection) => {
          const {
            invoiceId,
            header,
            items,
          } =
            await prepareRequest(
              connection,
              req.body
            );

          const result =
            await query(
              connection,
              `
                INSERT INTO purchase_returns
                (
                  invoice_id,
                  return_date,
                  reason,
                  total_amount,
                  debit,
                  credit
                )
                VALUES (?, ?, ?, ?, ?, ?)
              `,
              [
                invoiceId,
                header.return_date,
                header.reason,
                header.total_amount,
                header.debit,
                header.credit,
              ]
            );

          await insertReturnItems(
            connection,
            result.insertId,
            items
          );

          return getReturnById(
            connection,
            result.insertId
          );
        }
      );

    res.status(201).json({
      success: true,

      message:
        "Purchase return save ho gaya!",

      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error(
      "POST /purchase-returns:",
      error
    );

    res
      .status(error.status || 500)
      .json({
        success: false,

        error:
          error.message ||
          "Purchase return save nahi hua.",

        message:
          error.message ||
          "Purchase return save nahi hua.",
      });
  }
});

/*
|--------------------------------------------------------------------------
| Update purchase return
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {
  try {
    const purchaseReturn =
      await withTransaction(
        async (connection) => {
          const returnId =
            toPositiveId(
              req.params.id
            );

          if (!returnId) {
            throw httpError(
              "Valid return id zaroori hai.",
              400
            );
          }

          const existing =
            await getReturnById(
              connection,
              returnId
            );

          if (!existing) {
            throw httpError(
              "Purchase return nahi mila.",
              404
            );
          }

          const {
            invoiceId,
            header,
            items,
          } =
            await prepareRequest(
              connection,
              req.body,
              returnId
            );

          await query(
            connection,
            `
              UPDATE purchase_returns

              SET
                invoice_id = ?,
                return_date = ?,
                reason = ?,
                total_amount = ?,
                debit = ?,
                credit = ?

              WHERE id = ?
            `,
            [
              invoiceId,
              header.return_date,
              header.reason,
              header.total_amount,
              header.debit,
              header.credit,
              returnId,
            ]
          );

          await query(
            connection,
            `
              DELETE FROM
                purchase_return_items

              WHERE return_id = ?
            `,
            [returnId]
          );

          await insertReturnItems(
            connection,
            returnId,
            items
          );

          return getReturnById(
            connection,
            returnId
          );
        }
      );

    res.json({
      success: true,

      message:
        "Purchase return update ho gaya!",

      data: purchaseReturn,
      return: purchaseReturn,
    });
  } catch (error) {
    console.error(
      `PUT /purchase-returns/${req.params.id}:`,
      error
    );

    res
      .status(error.status || 500)
      .json({
        success: false,

        error:
          error.message ||
          "Purchase return update nahi hua.",

        message:
          error.message ||
          "Purchase return update nahi hua.",
      });
  }
});

/*
|--------------------------------------------------------------------------
| Delete purchase return
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {
  try {
    await withTransaction(
      async (connection) => {
        const returnId =
          toPositiveId(
            req.params.id
          );

        if (!returnId) {
          throw httpError(
            "Valid return id zaroori hai.",
            400
          );
        }

        const existing =
          await getReturnById(
            connection,
            returnId
          );

        if (!existing) {
          throw httpError(
            "Purchase return nahi mila.",
            404
          );
        }

        await query(
          connection,
          `
            DELETE FROM
              purchase_return_items

            WHERE return_id = ?
          `,
          [returnId]
        );

        await query(
          connection,
          `
            DELETE FROM
              purchase_returns

            WHERE id = ?
          `,
          [returnId]
        );
      }
    );

    res.json({
      success: true,

      message:
        "Purchase return delete ho gaya!",
    });
  } catch (error) {
    console.error(
      `DELETE /purchase-returns/${req.params.id}:`,
      error
    );

    res
      .status(error.status || 500)
      .json({
        success: false,

        error:
          error.message ||
          "Purchase return delete nahi hua.",

        message:
          error.message ||
          "Purchase return delete nahi hua.",
      });
  }
});

module.exports = router;
