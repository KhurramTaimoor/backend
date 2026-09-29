import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import SalesInvoicePage from "./SalesInvoicePage";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PURCHASE_INVOICES_API = `${API_ROOT}/api/purchase-invoices`;

const getList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.products)) return value.products;
  return [];
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toNumber(value);

    if (number > 0) {
      return number;
    }
  }

  return 0;
};

const getRecordId = (row) =>
  row?.id ??
  row?.value ??
  row?.product_id ??
  row?.category_id ??
  row?.unit_id ??
  row?.supplier_id ??
  row?.product_type_id ??
  "";

const pickText = (row, keys) => {
  for (const key of keys) {
    if (
      row?.[key] !== undefined &&
      row?.[key] !== null &&
      String(row[key]).trim()
    ) {
      return String(row[key]).trim();
    }
  }
  return "";
};

const cache = {
  suppliers: [],
  products: [],
  categories: [],
  units: [],
  productTypes: [],
  invoices: [],
};

const findById = (list, id) =>
  list.find((row) => String(getRecordId(row)) === String(id));

const supplierName = (row) =>
  pickText(row, [
    "supplier_name",
    "supplier_name_en",
    "vendor_name",
    "company_name",
    "name",
    "name_en",
    "title",
  ]);

const productName = (row) =>
  pickText(row, [
    "product_name",
    "product_name_en",
    "item_name",
    "name",
    "name_en",
    "title",
  ]);

const categoryName = (row) =>
  pickText(row, [
    "category_name",
    "category_name_en",
    "name",
    "name_en",
    "title",
  ]);

const unitName = (row) =>
  pickText(row, [
    "unit_name",
    "unit_name_en",
    "symbol",
    "name",
    "name_en",
    "title",
  ]);

const typeName = (row) =>
  pickText(row, [
    "product_type_en",
    "product_type",
    "product_type_name",
    "type_name",
    "type",
    "name",
    "name_en",
    "title",
  ]);

const findIdByName = (list, name, nameGetter) => {
  const target = String(name || "").trim().toLowerCase();
  if (!target) return "";
  const found = list.find(
    (row) => String(nameGetter(row) || "").trim().toLowerCase() === target
  );
  return found ? String(getRecordId(found)) : "";
};

const parseData = (data) => {
  if (typeof data !== "string") return data || {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const makeAxiosResponse = (config, data, status = 200) => ({
  data,
  status,
  statusText: status >= 200 && status < 300 ? "OK" : "Error",
  headers: {},
  config,
  request: null,
});

const emptyAdapter = (data) => async (config) =>
  makeAxiosResponse(config, data);

const resolveProduct = (item) => findById(cache.products, item?.product_id);
const resolveCategory = (item) =>
  findById(cache.categories, item?.category_id);
const resolveUnit = (item) => findById(cache.units, item?.unit_id);
const resolveType = (item) =>
  findById(cache.productTypes, item?.product_type_id);

const mapSalesItemToPurchase = (item) => {
  const product = resolveProduct(item);
  const category = resolveCategory(item);
  const unit = resolveUnit(item);
  const productType = resolveType(item);

  // `??` zero ko valid value samajhta hai. Sales form mein `qty` kabhi
  // zero hota hai jabke actual quantity `pieces_qty` mein hoti hai.
  // Isliye pehli positive quantity select karni zaroori hai.
  const quantity = firstPositiveNumber(
    item?.qty,
    item?.quantity,
    item?.pieces_qty,
    item?.order_qty,
    item?.carton_qty
  );
  const rate = toNumber(item?.rate);
  const amount = toNumber(item?.amount) || quantity * rate;

  return {
    // IDs preserve karna zaroori hai, warna invoice/return mein sirf
    // "Product #" nazar aata hai.
    product_id:
      item?.product_id ||
      product?.id ||
      product?.product_id ||
      null,

    category_id:
      item?.category_id ||
      category?.id ||
      category?.category_id ||
      null,

    unit_id:
      item?.unit_id ||
      unit?.id ||
      unit?.unit_id ||
      null,

    product_type_id:
      item?.product_type_id ||
      productType?.id ||
      productType?.product_type_id ||
      null,

    product_name:
      item?.product_name ||
      productName(product) ||
      String(item?.product_description || "").trim() ||
      "",

    product_description:
      item?.product_description ||
      item?.description ||
      "",

    unit_name:
      item?.unit_name ||
      unitName(unit),

    category_name:
      item?.category_name ||
      categoryName(category),

    type_name:
      item?.type_name ||
      item?.product_type ||
      typeName(productType) ||
      typeName(product),

    quantity,
    qty: quantity,
    pieces_qty: quantity,
    rate,
    amount: Number(amount.toFixed(2)),
  };
};

const mapSalesPayloadToPurchase = (body) => {
  const items = getList(
    body?.items || body?.invoice_items || body?.sales_invoice_items || []
  )
    .map(mapSalesItemToPurchase)
    .filter(
      (item) =>
        item.quantity > 0 &&
        (
          item.product_id ||
          String(item.product_name || "").trim()
        )
    );

  const calculated = items.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );
  const invoiceTotal = toNumber(body?.invoice_total) || calculated;
  const previousBalance = toNumber(body?.previous_balance);
  const deliveryCharges = toNumber(body?.delivery_charges);
  const discount = toNumber(body?.discount);
  const total =
    toNumber(body?.grand_total) ||
    invoiceTotal + previousBalance + deliveryCharges - discount;

  const selectedSupplier = findById(
    cache.suppliers,
    body?.supplier_id || body?.party_id
  );

  return {
    invoice_no: String(body?.invoice_no || "")
      .trim()
      .replace(/^sales-invoice/i, "purchase-invoice"),
    supplier_id: Number(body?.supplier_id || body?.party_id || selectedSupplier?.id || 0) || null,
    supplier_name:
      String(
        body?.party_name ||
          body?.supplier_name ||
          body?.customer_name_en ||
          body?.customer_name ||
          supplierName(selectedSupplier) ||
          ""
      ).trim(),
    invoice_date: body?.invoice_date || "",
    reference_no: String(body?.reference_no || "").trim(),
    address: String(body?.address || "").trim(),
    previous_balance: previousBalance,
    delivery_charges: deliveryCharges,
    discount,
    invoice_total: Number(invoiceTotal.toFixed(2)),
    total_amount: Number(total.toFixed(2)),
    grand_total: Number(total.toFixed(2)),
    debit: Number(total.toFixed(2)),
    credit: toNumber(body?.credit),
    status: body?.status || "pending",
    items,
  };
};

const mapPurchaseItemToSales = (item, index) => {
  const productId =
    item?.product_id ||
    findIdByName(cache.products, item?.product_name, productName);
  const categoryId =
    item?.category_id ||
    findIdByName(cache.categories, item?.category_name, categoryName);
  const unitId =
    item?.unit_id ||
    findIdByName(cache.units, item?.unit_name, unitName);
  const productTypeId =
    item?.product_type_id ||
    findIdByName(cache.productTypes, item?.type_name, typeName);

  const quantity = toNumber(item?.quantity ?? item?.qty);
  const rate = toNumber(item?.rate);
  const amount = toNumber(item?.amount) || quantity * rate;

  return {
    ...item,
    sr: item?.sr || index + 1,
    product_id: productId || "",
    category_id: categoryId || "",
    unit_id: unitId || "",
    product_type_id: productTypeId || "",
    product_name: item?.product_name || "",
    product_description: item?.product_description || "",
    description: item?.product_description || "",
    sale_type: item?.sale_type || "single",
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
};

const mapPurchaseInvoiceToSales = (invoice) => {
  if (!invoice || typeof invoice !== "object") return invoice;

  const supplierId =
    invoice?.supplier_id ||
    invoice?.party_id ||
    findIdByName(cache.suppliers, invoice?.supplier_name, supplierName);

  const items = Array.isArray(invoice?.items)
    ? invoice.items.map(mapPurchaseItemToSales)
    : [];

  const total =
    toNumber(invoice?.total_amount) ||
    items.reduce((sum, item) => sum + toNumber(item.amount), 0);

  return {
    ...invoice,
    // Internally keep SalesInvoicePage in its customer pricing mode. The
    // "customer" records are supplier aliases on this screen, so this lets
    // its customer-specific rate resolver apply supplier-specific purchase rates.
    party_type: "customer",
    customer_type: "customer",
    party_id: supplierId || "",
    supplier_id: supplierId || "",
    party_name: invoice?.supplier_name || "",
    customer_name: invoice?.supplier_name || "",
    customer_name_en: invoice?.supplier_name || "",
    customer_id: supplierId || "",
    employee_id: null,
    general_ledger_id: null,
    reference_no: invoice?.reference_no || "",
    shipment_to: "",
    address: invoice?.address || "",
    previous_balance: toNumber(invoice?.previous_balance),
    delivery_charges: toNumber(invoice?.delivery_charges),
    discount: toNumber(invoice?.discount),
    invoice_total: toNumber(invoice?.invoice_total) || items.reduce((sum, item) => sum + toNumber(item.amount), 0),
    total_amount: total,
    grand_total: toNumber(invoice?.grand_total) || total,
    total_qty: items.reduce((sum, item) => sum + toNumber(item.qty), 0),
    items_count: items.length,
    items,
  };
};

const mapInvoiceResponse = (responseData) => {
  if (Array.isArray(responseData)) {
    const mapped = responseData.map(mapPurchaseInvoiceToSales);
    cache.invoices = mapped;
    return mapped;
  }

  if (!responseData || typeof responseData !== "object") {
    return responseData;
  }

  const next = { ...responseData };

  if (Array.isArray(next.data)) {
    next.data = next.data.map(mapPurchaseInvoiceToSales);
    cache.invoices = next.data;
  } else if (next.data && typeof next.data === "object") {
    next.data = mapPurchaseInvoiceToSales(next.data);
  }

  if (Array.isArray(next.invoices)) {
    next.invoices = next.invoices.map(mapPurchaseInvoiceToSales);
    cache.invoices = next.invoices;
  }

  if (next.invoice && typeof next.invoice === "object") {
    next.invoice = mapPurchaseInvoiceToSales(next.invoice);
  }

  if (
    next.id &&
    !next.data &&
    !next.invoice &&
    !Array.isArray(next.invoices)
  ) {
    return mapPurchaseInvoiceToSales(next);
  }

  return next;
};

const normalizeSupplierRecord = (supplier = {}) => {
  const id =
    supplier.id ??
    supplier.supplier_id ??
    supplier.value ??
    supplier.ID ??
    supplier.Id ??
    "";

  const name = String(
    supplier.supplier_name ??
      supplier.supplier_name_en ??
      supplier.vendor_name ??
      supplier.company_name ??
      supplier.name ??
      supplier.name_en ??
      supplier.title ??
      ""
  ).trim();

  return {
    ...supplier,
    id,
    supplier_id: supplier.supplier_id ?? id,
    supplier_name: name,
    supplier_name_en: name,
    customer_id: supplier.customer_id ?? id,
    customer_name: name,
    customer_name_en: name,
    name,
    name_en: name,
    title: name,
  };
};

const normalizeSupplierPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeSupplierRecord);
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const normalized = { ...payload };

  if (Array.isArray(normalized.data)) {
    normalized.data = normalized.data.map(normalizeSupplierRecord);
  } else if (normalized.data && typeof normalized.data === "object") {
    normalized.data = normalizeSupplierRecord(normalized.data);
  }

  if (Array.isArray(normalized.suppliers)) {
    normalized.suppliers = normalized.suppliers.map(normalizeSupplierRecord);
  }

  if (
    normalized.id &&
    !Array.isArray(normalized.data) &&
    !Array.isArray(normalized.suppliers)
  ) {
    return normalizeSupplierRecord(normalized);
  }

  return normalized;
};

const cacheMasterResponse = (url, responseData) => {
  const list = getList(responseData);

  if (url.includes("/api/suppliers")) cache.suppliers = list;
  if (url.includes("/api/products")) cache.products = list;
  if (url.includes("/api/categories")) cache.categories = list;
  if (url.includes("/api/units")) cache.units = list;
  if (url.includes("/api/product-types")) cache.productTypes = list;
};

const installPurchaseInvoiceApiAdapter = () => {
  const requestId = axios.interceptors.request.use((config) => {
    const rawUrl = String(config.url || "");
    const originalUrl = rawUrl.replace("/api/api/", "/api/");
    config.url = originalUrl;
    config.__purchaseInvoiceOriginalUrl = originalUrl;

    // SalesInvoicePage initially opens with party_type="customer".
    // Return the supplier list through that lookup as well, so the exact
    // Sales layout always has supplier names before the DOM forces Supplier.
    if (originalUrl.includes("/api/customers")) {
      config.url = originalUrl
        .replace("/api/api/customers", "/api/suppliers")
        .replace("/api/customers", "/api/suppliers");
      config.__purchaseSupplierAlias = true;
      return config;
    }

    // SalesInvoicePage uses /api/rates for automatic pricing. On the purchase
    // screen that same hook must resolve the selected supplier's purchase list.
    if (/\/api\/rates(?:\?|$)/.test(originalUrl)) {
      config.url = `${API_ROOT}/api/purchase-rates/flat`;
      config.__purchaseRateAlias = true;
      return config;
    }

    if (
      originalUrl.includes("/api/employees") ||
      originalUrl.includes("/api/general-ledgers")
    ) {
      config.adapter = emptyAdapter([]);
      return config;
    }

    if (originalUrl.includes("/api/sale-orders")) {
      config.adapter = emptyAdapter({ success: true, data: [], orders: [] });
      return config;
    }

    if (originalUrl.includes("/api/sales-invoices/customer/")) {
      const parts = originalUrl.split("/");
      const partyId = parts[parts.length - 1];
      const filtered = cache.invoices.filter(
        (invoice) => String(invoice.party_id) === String(partyId)
      );
      config.adapter = emptyAdapter({
        success: true,
        data: filtered,
        invoices: filtered,
      });
      return config;
    }

    if (originalUrl.includes("/api/sales-invoices/bulk-print-data")) {
      const body = parseData(config.data);
      const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
      const filtered = cache.invoices.filter((invoice) =>
        ids.includes(String(invoice.id))
      );
      config.adapter = emptyAdapter({
        success: true,
        data: filtered,
        invoices: filtered,
      });
      return config;
    }

    if (originalUrl.includes("/api/sales-invoices")) {
      config.url = originalUrl.replace(
        "/api/sales-invoices",
        "/api/purchase-invoices"
      );

      const method = String(config.method || "get").toLowerCase();
      if (method === "post" || method === "put" || method === "patch") {
        const purchasePayload = mapSalesPayloadToPurchase(
          parseData(config.data)
        );

        if (method === "post") {
          const requestedNo = normalizePurchaseInvoiceNo(
            purchasePayload.invoice_no
          );
          const duplicateInCache = cache.invoices.some(
            (invoice) =>
              normalizePurchaseInvoiceNo(invoice?.invoice_no).toLowerCase() ===
              requestedNo.toLowerCase()
          );

          purchasePayload.invoice_no = duplicateInCache
            ? getNextPurchaseInvoiceNo()
            : requestedNo;
        }

        config.data = purchasePayload;
      }
    }

    return config;
  });

  const responseId = axios.interceptors.response.use(
    (response) => {
      const originalUrl = String(
        response?.config?.__purchaseInvoiceOriginalUrl ||
          response?.config?.url ||
          ""
      );

      cacheMasterResponse(originalUrl, response.data);

      if (response?.config?.__purchaseSupplierAlias) {
        response.data = normalizeSupplierPayload(response.data);
        cache.suppliers = getList(response.data);
      }

      if (originalUrl.includes("/api/sales-invoices")) {
        response.data = mapInvoiceResponse(response.data);
      }

      return response;
    },
    (error) => Promise.reject(error)
  );

  return () => {
    axios.interceptors.request.eject(requestId);
    axios.interceptors.response.eject(responseId);
  };
};

const TEXT_REPLACEMENTS = [
  ["All Sales Invoices", "All Purchase Invoices"],
  ["All Sales Invoice", "All Purchase Invoice"],
  ["Sales Invoices", "Purchase Invoices"],
  ["Sales Invoice", "Purchase Invoice"],
  ["sales invoices", "purchase invoices"],
  ["sales invoice", "purchase invoice"],
  ["Customer Invoices", "Supplier Invoices"],
  ["customer invoices", "supplier invoices"],
  ["Type customer name", "Type supplier name"],
  ["Customer Type", "Supplier"],
  ["Select Name", "Select Supplier"],
  ["Customer", "Supplier"],
  ["Delivery Charges", "Freight"],
  ["Delivery Charge", "Freight"],
  ["Invoice saved.", "Purchase invoice saved."],
  ["Invoice updated.", "Purchase invoice updated."],
  ["Invoice deleted.", "Purchase invoice deleted."],
  ["سیلز انوائسز", "پرچیز انوائسز"],
  ["سیلز انوائس", "پرچیز انوائس"],
  ["کسٹمر انوائسز", "سپلائر انوائسز"],
  ["کسٹمر کا نام", "سپلائر کا نام"],
  ["کسٹمر ٹائپ", "سپلائر"],
  ["کسٹمر", "سپلائر"],
  ["ڈیلیوری چارجز", "فریٹ"],
];

const replacePurchaseText = (value) => {
  let result = String(value || "");
  for (const [from, to] of TEXT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
};

const normalizePurchaseInvoiceNo = (value) =>
  String(value || "")
    .trim()
    .replace(/^sales-invoice/i, "purchase-invoice");

const getNextPurchaseInvoiceNo = () => {
  let max = 0;
  let width = 2;

  cache.invoices.forEach((invoice) => {
    const value = normalizePurchaseInvoiceNo(invoice?.invoice_no);

    const standard = value.match(/^purchase-invoice(\d+)$/i);
    const short = value.match(/^PI[- ]?(\d+)$/i);
    const match = standard || short;

    if (!match) return;

    max = Math.max(max, Number(match[1]) || 0);
    width = Math.max(width, String(match[1]).length);
  });

  return `purchase-invoice${String(max + 1).padStart(width, "0")}`;
};

const setNativeValue = (element, value) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) descriptor.set.call(element, value);
  else element.value = value;

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const fixNewPurchaseInvoiceNumber = (root) => {
  const buttons = Array.from(root.querySelectorAll("button"));
  const isUpdateMode = buttons.some((button) =>
    /^(update|اپڈیٹ)$/i.test(String(button.textContent || "").trim())
  );
  const isCreateMode = buttons.some((button) =>
    /^(save|محفوظ کریں)$/i.test(String(button.textContent || "").trim())
  );

  if (!isCreateMode || isUpdateMode) return;

  const invoiceInputs = Array.from(root.querySelectorAll("input")).filter(
    (input) =>
      /^(sales-invoice|purchase-invoice)\d+$/i.test(
        String(input.value || "").trim()
      )
  );

  invoiceInputs.forEach((input) => {
    const current = normalizePurchaseInvoiceNo(input.value);
    const alreadyExists = cache.invoices.some(
      (invoice) =>
        normalizePurchaseInvoiceNo(invoice?.invoice_no).toLowerCase() ===
        current.toLowerCase()
    );

    if (alreadyExists) {
      setNativeValue(input, getNextPurchaseInvoiceNo());
    }
  });
};

const forceSupplierOnly = (root) => {
  root.querySelectorAll("select").forEach((select) => {
    const options = Array.from(select.options || []);
    const customerOption = options.find(
      (option) => option.value === "customer"
    );
    const isPartyTypeSelect =
      customerOption &&
      options.some((option) =>
        ["employee", "supplier", "general_ledger"].includes(option.value)
      );

    if (!isPartyTypeSelect) return;

    // PurchaseInvoice reuses SalesInvoice's stable form engine. Suppliers are
    // deliberately exposed to it through the /customers alias, so the
    // internal value stays "customer" while the visible label is Supplier.
    // This also makes supplier-specific purchase-rate lists auto-resolve.
    customerOption.textContent = "Supplier";
    options.forEach((option) => {
      const keep = option === customerOption;
      option.hidden = !keep;
      option.disabled = !keep;
    });

    if (select.value !== customerOption.value) {
      setNativeValue(select, customerOption.value);
    }
  });
};

const hideShipmentFields = (root) => {
  root.querySelectorAll("label, span, p, th, td, div").forEach((element) => {
    const directText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.nodeValue)
      .join(" ")
      .trim();

    if (!/^(ship\s*to|شپ\s*ٹو)\s*:?\s*$/i.test(directText)) return;

    let container = element;
    for (let depth = 0; depth < 4 && container; depth += 1) {
      if (
        container.matches?.("th,td") ||
        container.querySelector?.("input,textarea,select")
      ) {
        container.style.display = "none";
        break;
      }
      container = container.parentElement;
    }
  });
};


const applyPremiumPurchaseUi = (root) => {
  if (!root) return;

  root.classList.add("purchase-premium-root");

  const buttonText = (button) =>
    String(button?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  root.querySelectorAll("button").forEach((button) => {
    const text = buttonText(button);

    button.classList.add("purchase-premium-button");
    button.classList.remove(
      "purchase-premium-primary",
      "purchase-premium-outline",
      "purchase-premium-danger",
      "purchase-premium-soft"
    );

    if (/delete|remove|حذف|ڈیلیٹ/.test(text)) {
      button.classList.add("purchase-premium-danger");
    } else if (/edit|details|detail|ترمیم|تفصیل/.test(text)) {
      button.classList.add("purchase-premium-soft");
    } else if (
      /cancel|close|reset|hide summary|english|اردو|منسوخ|بند|ری سیٹ|سمری بند/.test(
        text
      )
    ) {
      button.classList.add("purchase-premium-outline");
    } else {
      button.classList.add("purchase-premium-primary");
    }
  });

  root.querySelectorAll("input, select, textarea").forEach((control) => {
    control.classList.add("purchase-premium-control");
  });

  root.querySelectorAll("table").forEach((table) => {
    table.classList.add("purchase-premium-table");

    const parent = table.parentElement;

    if (parent && !parent.classList.contains("purchase-premium-table-wrap")) {
      parent.classList.add("purchase-premium-table-wrap");
    }
  });

  const heading = root.querySelector("h1");

  if (heading) {
    heading.classList.add("purchase-premium-title");

    let header = heading.parentElement;

    while (
      header &&
      header !== root &&
      !header.querySelector("button") &&
      header.parentElement !== root
    ) {
      header = header.parentElement;
    }

    if (header && header !== root) {
      header.classList.add("purchase-premium-header");
    }
  }

  const summaryPattern =
    /^(total invoices|total items|total value|previous balance|delivery charges|total discount|total returns|total amount|total debit|total credit|total invoice|total return|net purchases|records|opening balance|closing balance|debit|credit|balance|کل انوائسز|کل آئٹمز|کل رقم|کل ریٹرنز|سابقہ بیلنس|نیٹ پرچیز)$/i;

  root.querySelectorAll("span, p, div, strong, small").forEach((element) => {
    if (element.children.length > 0) return;

    const text = String(element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!summaryPattern.test(text)) return;

    const card = element.parentElement;

    if (card && card !== root) {
      card.classList.add("purchase-premium-stat");
    }
  });

  root.querySelectorAll("form").forEach((form) => {
    form.classList.add("purchase-premium-form");
  });

  root.querySelectorAll("[role='dialog']").forEach((dialog) => {
    dialog.classList.add("purchase-premium-dialog");
  });
};

const transformPurchaseDom = (root) => {
  if (!root) return;

  hideShipmentFields(root);
  forceSupplierOnly(root);
  applyPremiumPurchaseUi(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const next = replacePurchaseText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  });

  root.querySelectorAll("input, textarea").forEach((input) => {
    if (input.placeholder) {
      const nextPlaceholder = replacePurchaseText(input.placeholder);
      if (nextPlaceholder !== input.placeholder) {
        input.placeholder = nextPlaceholder;
      }
    }

    if (/^sales-invoice/i.test(input.value || "")) {
      setNativeValue(
        input,
        String(input.value).replace(/^sales-invoice/i, "purchase-invoice")
      );
    }
  });

  fixNewPurchaseInvoiceNumber(root);
};

const installPrintTransformer = () => {
  const originalOpen = window.open;

  const patchedOpen = function patchedWindowOpen(...args) {
    const popup = originalOpen.apply(window, args);
    if (!popup?.document) return popup;

    const originalClose = popup.document.close.bind(popup.document);
    popup.document.close = (...closeArgs) => {
      const result = originalClose(...closeArgs);
      window.setTimeout(() => {
        try {
          transformPurchaseDom(popup.document.body);
        } catch {
          // Print window may already be closed.
        }
      }, 0);
      return result;
    };

    return popup;
  };

  window.open = patchedOpen;

  return () => {
    if (window.open === patchedOpen) window.open = originalOpen;
  };
};

function PurchaseInvoicePage() {
  const rootRef = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const removeApiAdapter = installPurchaseInvoiceApiAdapter();
    const removePrintTransformer = installPrintTransformer();
    setReady(true);

    return () => {
      removeApiAdapter();
      removePrintTransformer();
    };
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return undefined;

    const root = rootRef.current;
    transformPurchaseDom(root);

    const observer = new MutationObserver(() => {
      transformPurchaseDom(root);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [ready]);

  if (!ready) return null;

  return (
    <div ref={rootRef} data-page="purchase-invoice-exact-sales-layout">
      <SalesInvoicePage />

      <style>{`

      [data-page="purchase-invoice-exact-sales-layout"] {
        --purchase-blue: #0B4E9B;
        --purchase-blue-dark: #244bd4;
        --purchase-indigo: #0B4E9B;
        --purchase-navy: #13263A;
        --purchase-text: #101b36;
        --purchase-muted: #6c7b98;
        --purchase-border: #d8e2f3;
        --purchase-bg: #f4f7ff;
        width: 100%;
        min-width: 0;
        min-height: 100%;
        color: var(--purchase-text);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
      }

      [data-page="purchase-invoice-exact-sales-layout"],
      [data-page="purchase-invoice-exact-sales-layout"] * {
        box-sizing: border-box;
      }

      [data-page="purchase-invoice-exact-sales-layout"] > div:first-of-type {
        min-height: 100%;
        padding: 20px !important;
        background:
          radial-gradient(circle at top right, rgba(49, 94, 251, 0.08), transparent 32%),
          var(--purchase-bg) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-header {
        margin-bottom: 16px !important;
        padding: 22px 24px !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 24px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 32px rgba(24, 55, 105, 0.06) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-title,
      [data-page="purchase-invoice-exact-sales-layout"] h1 {
        margin-top: 0 !important;
        color: #071938 !important;
        font-size: clamp(26px, 3vw, 34px) !important;
        font-weight: 900 !important;
        letter-spacing: -0.035em !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] h2,
      [data-page="purchase-invoice-exact-sales-layout"] h3 {
        color: #102143 !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] p {
        color: var(--purchase-muted);
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-button {
        min-height: 42px !important;
        padding: 9px 16px !important;
        border-radius: 13px !important;
        font: inherit !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease,
          background 0.18s ease !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-button:hover:not(:disabled) {
        transform: translateY(-1px) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-primary {
        border: 1px solid transparent !important;
        background: linear-gradient(
          135deg,
          var(--purchase-blue),
          var(--purchase-indigo)
        ) !important;
        color: #ffffff !important;
        box-shadow: 0 8px 18px rgba(49, 94, 251, 0.2) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-primary:hover:not(:disabled) {
        background: linear-gradient(
          135deg,
          var(--purchase-blue-dark),
          #0A65BD
        ) !important;
        box-shadow: 0 11px 23px rgba(49, 94, 251, 0.26) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-outline {
        border: 1px solid #bfcdf4 !important;
        background: #f8faff !important;
        color: #2949c8 !important;
        box-shadow: none !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-soft {
        border: 1px solid #c9d5ff !important;
        background: #edf2ff !important;
        color: #2448cd !important;
        box-shadow: none !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-danger {
        border: 1px solid #fecaca !important;
        background: #fff0f0 !important;
        color: #c62828 !important;
        box-shadow: none !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-control {
        min-width: 0 !important;
        min-height: 43px !important;
        padding: 9px 12px !important;
        border: 1px solid #ccd8ee !important;
        border-radius: 13px !important;
        outline: none !important;
        background: #ffffff !important;
        color: #15213c !important;
        font: inherit !important;
        font-size: 13px !important;
        transition:
          border-color 0.18s ease,
          box-shadow 0.18s ease !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-control:focus {
        border-color: var(--purchase-blue) !important;
        box-shadow: 0 0 0 4px rgba(49, 94, 251, 0.12) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] textarea.purchase-premium-control {
        min-height: 90px !important;
        resize: vertical !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-form {
        border-radius: 20px !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-stat {
        min-width: 0 !important;
        padding: 16px 18px !important;
        border: 1px solid var(--purchase-border) !important;
        border-top: 3px solid var(--purchase-blue) !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        box-shadow: 0 9px 24px rgba(24, 55, 105, 0.05) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table-wrap {
        width: 100% !important;
        overflow-x: auto !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 20px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 30px rgba(24, 55, 105, 0.055) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table {
        width: 100% !important;
        min-width: 920px !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: auto !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table thead th {
        padding: 14px 12px !important;
        border: 0 !important;
        background: var(--purchase-navy) !important;
        color: #ffffff !important;
        font-size: 11px !important;
        font-weight: 850 !important;
        text-align: left !important;
        text-transform: uppercase !important;
        letter-spacing: 0.045em !important;
        white-space: nowrap !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table thead th:first-child {
        border-top-left-radius: 18px !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table thead th:last-child {
        border-top-right-radius: 18px !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table tbody td {
        padding: 15px 12px !important;
        border-top: 1px solid #edf1f8 !important;
        background: #ffffff !important;
        color: #17223e !important;
        font-size: 13px !important;
        line-height: 1.45 !important;
        vertical-align: middle !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table tbody tr:hover td {
        background: #f8faff !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table td:last-child {
        white-space: nowrap !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table td:last-child button {
        margin: 3px !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-dialog,
      body .purchase-premium-dialog {
        border-radius: 22px !important;
        box-shadow: 0 32px 80px rgba(4, 17, 46, 0.28) !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] label {
        color: #53627f !important;
        font-size: 12px !important;
        font-weight: 750 !important;
      }

      [data-page="purchase-invoice-exact-sales-layout"] ::placeholder {
        color: #91a0bc !important;
        opacity: 1 !important;
      }

      @media (max-width: 900px) {
        [data-page="purchase-invoice-exact-sales-layout"] > div:first-of-type {
          padding: 14px !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-header {
          padding: 18px !important;
          border-radius: 20px !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-button {
          min-height: 40px !important;
          padding: 8px 13px !important;
        }
      }

      @media (max-width: 620px) {
        [data-page="purchase-invoice-exact-sales-layout"] > div:first-of-type {
          padding: 10px !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-title,
        [data-page="purchase-invoice-exact-sales-layout"] h1 {
          font-size: 25px !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-button {
          flex: 1 1 auto !important;
        }
      }

      @media print {
        [data-page="purchase-invoice-exact-sales-layout"] > div:first-of-type {
          padding: 0 !important;
          background: #ffffff !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-button {
          display: none !important;
        }

        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-header,
        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-table-wrap,
        [data-page="purchase-invoice-exact-sales-layout"] .purchase-premium-stat {
          box-shadow: none !important;
        }
      }

      
    
      `}</style>
    </div>
  );
}

export default PurchaseInvoicePage;
