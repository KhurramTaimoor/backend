import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import CustomerSalesLedgerPage from "./CustomerSalesLedgerPage";

const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.suppliers)) return payload.suppliers;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

const createJsonResponse = (response, payload) =>
  new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": "application/json",
    },
  });

const installSupplierLedgerFetchAdapter = () => {
  const originalFetch = window.fetch.bind(window);

  const patchedFetch = async (input, init) => {
    const originalUrl =
      typeof input === "string" ? input : String(input?.url || "");

    if (/\/api\/customers(?:\?|$)/i.test(originalUrl)) {
      const response = await originalFetch(
        `${API_ROOT}/api/supplier-ledger/suppliers`,
        init
      );
      const payload = await response.json().catch(() => []);
      const suppliers = normalizeList(payload).map((supplier) => {
        const id =
          supplier.id ?? supplier.supplier_id ?? supplier.value ?? "";

        const name =
          supplier.supplier_name ??
          supplier.name ??
          supplier.name_en ??
          supplier.company_name ??
          "-";

        return {
          ...supplier,
          id: String(id),
          customer_id: String(id),
          customer_name: String(name),
          customer_name_en: String(name),
          phone: String(
            supplier.phone ??
              supplier.mobile ??
              supplier.contact_no ??
              supplier.contact_number ??
              ""
          ),
          city: String(
            supplier.city ??
              supplier.city_en ??
              supplier.address ??
              supplier.location ??
              ""
          ),
          city_en: String(
            supplier.city ??
              supplier.city_en ??
              supplier.address ??
              supplier.location ??
              ""
          ),
          opening_balance: Number(supplier.opening_balance || 0),
        };
      });

      return createJsonResponse(response, suppliers);
    }

    const ledgerMatch = originalUrl.match(
      /\/api\/ledger\/customer\/([^/?]+)\/details(\?[^#]*)?/i
    );

    if (ledgerMatch) {
      const supplierId = ledgerMatch[1];
      const query = ledgerMatch[2] || "";
      return originalFetch(
        `${API_ROOT}/api/supplier-ledger/${supplierId}/details${query}`,
        init
      );
    }

    return originalFetch(input, init);
  };

  window.fetch = patchedFetch;

  return () => {
    if (window.fetch === patchedFetch) {
      window.fetch = originalFetch;
    }
  };
};

const TEXT_REPLACEMENTS = [
  [
    "Complete customer statement with invoice products, sales returns, shipping details and running balance.",
    "Complete supplier statement with purchase invoice products, purchase returns and running balance.",
  ],
  ["Customer Detail Ledger", "Supplier Detail Ledger"],
  ["Customer Sales Ledger", "Supplier Purchase Ledger"],
  ["Detailed Customer Ledger", "Detailed Supplier Ledger"],
  ["customer statement", "supplier statement"],
  ["Customer Invoices", "Supplier Invoices"],
  ["Customer Ledger", "Supplier Ledger"],
  ["Select Customer", "Select Supplier"],
  ["Choose Customer", "Choose Supplier"],
  ["Search customer by name, phone or city", "Search supplier by name, phone or city"],
  ["Loading customers", "Loading suppliers"],
  ["Loading detailed customer ledger", "Loading detailed supplier ledger"],
  ["Select a customer to view the complete ledger.", "Select a supplier to view the complete ledger."],
  ["Products Sold", "Products Purchased"],
  ["Sold Qty", "Purchased Qty"],
  ["Sales Invoice", "Purchase Invoice"],
  ["Sales Return", "Purchase Return"],
  ["sales returns", "purchase returns"],
  ["sales invoices", "purchase invoices"],
  ["customer", "supplier"],
  ["Customer", "Supplier"],
  ["Shipping Information", "Purchase Information"],
  ["Ship To", "Supplier"],
  [
    "انوائس پروڈکٹس، سیلز ریٹرن، شپنگ تفصیل اور رننگ بیلنس کے ساتھ مکمل کسٹمر اسٹیٹمنٹ۔",
    "پرچیز انوائس پروڈکٹس، پرچیز ریٹرن اور رننگ بیلنس کے ساتھ مکمل سپلائر اسٹیٹمنٹ۔",
  ],
  ["کسٹمر تفصیلی لیجر", "سپلائر تفصیلی لیجر"],
  ["کسٹمر لیجر", "سپلائر لیجر"],
  ["کسٹمر منتخب کریں", "سپلائر منتخب کریں"],
  ["کسٹمر تلاش کریں", "سپلائر تلاش کریں"],
  ["کسٹمر لوڈ ہو رہے ہیں", "سپلائر لوڈ ہو رہے ہیں"],
  ["فروخت شدہ پروڈکٹس", "خریدے گئے پروڈکٹس"],
  ["فروخت مقدار", "خریدی گئی مقدار"],
  ["سیلز انوائس", "پرچیز انوائس"],
  ["سیلز ریٹرن", "پرچیز ریٹرن"],
  ["شپنگ کی معلومات", "پرچیز کی معلومات"],
  ["شپ کس کو کیا", "سپلائر"],
  ["کسٹمر", "سپلائر"],
];

const replaceText = (value) => {
  let result = String(value ?? "");

  for (const [from, to] of TEXT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }

  return result;
};

const shouldHideShipmentElement = (element) => {
  const text = String(element?.textContent || "").trim();

  return /^(shipping information|ship to|شپنگ کی معلومات|شپ کس کو کیا)\s*:?\s*$/i.test(
    text
  );
};

const hideShipmentUi = (root) => {
  root
    .querySelectorAll("label, span, p, th, td, div, section")
    .forEach((element) => {
      if (!shouldHideShipmentElement(element)) return;

      let container = element;

      for (let depth = 0; depth < 5 && container; depth += 1) {
        const tag = container.tagName?.toLowerCase();

        if (
          tag === "th" ||
          tag === "td" ||
          container.querySelector?.("input, textarea, select") ||
          container.className?.toString().includes("info")
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
    /^(total invoices|total items|total value|previous balance|delivery charges|total discount|total returns|total amount|total debit|total credit|total invoice|total return|net purchases|records|opening balance|closing balance|products purchased|products returned|purchased qty|debit|credit|balance|کل انوائسز|کل آئٹمز|کل رقم|کل ریٹرنز|سابقہ بیلنس|نیٹ پرچیز|خریدے گئے پروڈکٹس|واپس شدہ پروڈکٹس)$/i;

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

const cleanSupplierLedgerLayout = (root) => {
  if (!root) return;

  /*
   * Actual CustomerSalesLedgerPage structure:
   * .ledger-customer-card
   *   1. .ledger-customer-avatar
   *   2. .ledger-customer-main
   *   3-5. .ledger-info-item
   *
   * Direct inline styles use ki ja rahi hain taa-ke original component CSS
   * ya stylesheet order inko override na kar sake.
   */
  const customerCard = root.querySelector(".ledger-customer-card");

  if (customerCard) {
    customerCard
      .querySelectorAll(".purchase-premium-stat")
      .forEach((element) => {
        element.classList.remove("purchase-premium-stat");
      });

    customerCard.style.setProperty("display", "grid", "important");
    customerCard.style.setProperty(
      "grid-template-columns",
      "58px minmax(210px, 1.35fr) repeat(3, minmax(135px, 0.72fr))",
      "important"
    );
    customerCard.style.setProperty("align-items", "center", "important");
    customerCard.style.setProperty("gap", "18px", "important");
    customerCard.style.setProperty("width", "100%", "important");
    customerCard.style.setProperty("margin", "18px 0 14px", "important");
    customerCard.style.setProperty("padding", "18px 20px", "important");
    customerCard.style.setProperty(
      "border",
      "1px solid #d9e2f3",
      "important"
    );
    customerCard.style.setProperty("border-radius", "20px", "important");
    customerCard.style.setProperty("background", "#ffffff", "important");
    customerCard.style.setProperty(
      "box-shadow",
      "0 10px 28px rgba(24, 55, 105, 0.06)",
      "important"
    );

    const avatar = customerCard.querySelector(".ledger-customer-avatar");

    if (avatar) {
      avatar.style.setProperty("display", "grid", "important");
      avatar.style.setProperty("place-items", "center", "important");
      avatar.style.setProperty("width", "54px", "important");
      avatar.style.setProperty("height", "54px", "important");
      avatar.style.setProperty("min-width", "54px", "important");
      avatar.style.setProperty("margin", "0", "important");
      avatar.style.setProperty("border-radius", "16px", "important");
      avatar.style.setProperty(
        "background",
        "linear-gradient(135deg, #0B4E9B, #0B4E9B)",
        "important"
      );
      avatar.style.setProperty("color", "#ffffff", "important");
      avatar.style.setProperty("font-size", "20px", "important");
      avatar.style.setProperty("font-weight", "900", "important");
      avatar.style.setProperty(
        "box-shadow",
        "0 9px 20px rgba(49, 94, 251, 0.22)",
        "important"
      );
    }

    const main = customerCard.querySelector(".ledger-customer-main");

    if (main) {
      main.style.setProperty("display", "block", "important");
      main.style.setProperty("min-width", "0", "important");
      main.style.setProperty("margin", "0", "important");
      main.style.setProperty("padding", "0 8px 0 0", "important");

      const label = main.querySelector(".ledger-muted-label");
      const name = main.querySelector("h2");

      if (label) {
        label.style.setProperty("display", "block", "important");
        label.style.setProperty("margin", "0 0 5px", "important");
        label.style.setProperty("color", "#70809d", "important");
        label.style.setProperty("font-size", "11px", "important");
        label.style.setProperty("font-weight", "850", "important");
        label.style.setProperty(
          "letter-spacing",
          "0.08em",
          "important"
        );
        label.style.setProperty("text-transform", "uppercase", "important");
      }

      if (name) {
        name.style.setProperty("display", "block", "important");
        name.style.setProperty("overflow", "hidden", "important");
        name.style.setProperty("margin", "0", "important");
        name.style.setProperty("color", "#13263A", "important");
        name.style.setProperty("font-size", "21px", "important");
        name.style.setProperty("font-weight", "900", "important");
        name.style.setProperty("line-height", "1.25", "important");
        name.style.setProperty("text-overflow", "ellipsis", "important");
        name.style.setProperty("white-space", "nowrap", "important");
      }
    }

    customerCard.querySelectorAll(".ledger-info-item").forEach((item) => {
      item.classList.remove("purchase-premium-stat");

      item.style.setProperty("display", "block", "important");
      item.style.setProperty("min-width", "0", "important");
      item.style.setProperty("min-height", "52px", "important");
      item.style.setProperty("margin", "0", "important");
      item.style.setProperty("padding", "4px 0 4px 18px", "important");
      item.style.setProperty("border-top", "0", "important");
      item.style.setProperty("border-right", "0", "important");
      item.style.setProperty("border-bottom", "0", "important");
      item.style.setProperty(
        "border-left",
        "1px solid #dce4f2",
        "important"
      );
      item.style.setProperty("border-radius", "0", "important");
      item.style.setProperty("background", "transparent", "important");
      item.style.setProperty("box-shadow", "none", "important");

      const label = item.querySelector("span");
      const value = item.querySelector("strong");

      if (label) {
        label.style.setProperty("display", "block", "important");
        label.style.setProperty("margin", "0 0 7px", "important");
        label.style.setProperty("color", "#70809d", "important");
        label.style.setProperty("font-size", "10px", "important");
        label.style.setProperty("font-weight", "850", "important");
        label.style.setProperty(
          "letter-spacing",
          "0.075em",
          "important"
        );
        label.style.setProperty("line-height", "1.2", "important");
        label.style.setProperty("text-transform", "uppercase", "important");
      }

      if (value) {
        value.style.setProperty("display", "block", "important");
        value.style.setProperty("overflow", "hidden", "important");
        value.style.setProperty("margin", "0", "important");
        value.style.setProperty("color", "#13213d", "important");
        value.style.setProperty("font-size", "14px", "important");
        value.style.setProperty("font-weight", "800", "important");
        value.style.setProperty("line-height", "1.35", "important");
        value.style.setProperty("text-overflow", "ellipsis", "important");
        value.style.setProperty("white-space", "nowrap", "important");
      }
    });
  }

  /*
   * Summary cards exact order:
   * 1 Opening Balance
   * 2 Total Invoices
   * 3 Total Returns
   * 4 Closing Balance
   * 5 Products Purchased
   * 6 Products Returned
   *
   * Last two are hidden by position, not by translated text.
   */
  const summaryGrid = root.querySelector(".ledger-summary-grid");

  if (summaryGrid) {
    summaryGrid.style.setProperty("display", "grid", "important");
    summaryGrid.style.setProperty(
      "grid-template-columns",
      "repeat(4, minmax(170px, 1fr))",
      "important"
    );
    summaryGrid.style.setProperty("gap", "14px", "important");
    summaryGrid.style.setProperty("width", "100%", "important");
    summaryGrid.style.setProperty("margin", "14px 0 18px", "important");

    const summaryCards = Array.from(
      summaryGrid.querySelectorAll(":scope > .ledger-summary-card")
    );

    summaryCards.forEach((card, index) => {
      card.classList.remove("purchase-premium-stat");

      if (index >= 4) {
        card.style.setProperty("display", "none", "important");
        card.setAttribute("aria-hidden", "true");
        return;
      }

      card.style.setProperty("display", "block", "important");
      card.style.setProperty("min-width", "0", "important");
      card.style.setProperty("width", "auto", "important");
      card.style.setProperty("margin", "0", "important");
      card.style.setProperty("padding", "17px 18px", "important");
      card.style.setProperty("border-radius", "18px", "important");
      card.style.setProperty("background", "#ffffff", "important");
      card.style.setProperty(
        "box-shadow",
        "0 9px 24px rgba(24, 55, 105, 0.055)",
        "important"
      );
      card.removeAttribute("aria-hidden");
    });
  }
};

const transformSupplierLedgerDom = (root) => {
  if (!root) return;

  hideShipmentUi(root);
  applyPremiumPurchaseUi(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    const updated = replaceText(node.nodeValue);

    if (updated !== node.nodeValue) {
      node.nodeValue = updated;
    }
  });

  root.querySelectorAll("input, textarea").forEach((element) => {
    if (element.placeholder) {
      const updated = replaceText(element.placeholder);

      if (updated !== element.placeholder) {
        element.placeholder = updated;
      }
    }
  });

  // Text replacement ke baad hard layout dobara apply hota hai.
  cleanSupplierLedgerLayout(root);
};

const installPrintTransformer = () => {
  const originalPrint = window.print.bind(window);

  const patchedPrint = (...args) => {
    transformSupplierLedgerDom(document.body);
    return originalPrint(...args);
  };

  window.print = patchedPrint;

  return () => {
    if (window.print === patchedPrint) {
      window.print = originalPrint;
    }
  };
};

export default function SupplierLedgerPage() {
  const rootRef = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const removeFetchAdapter = installSupplierLedgerFetchAdapter();
    const removePrintTransformer = installPrintTransformer();

    setReady(true);

    return () => {
      removeFetchAdapter();
      removePrintTransformer();
    };
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return undefined;

    const root = rootRef.current;

    transformSupplierLedgerDom(root);

    const observer = new MutationObserver(() => {
      transformSupplierLedgerDom(root);
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
    <div ref={rootRef} data-page="supplier-ledger-customer-layout">
      <CustomerSalesLedgerPage />

      <style>{`

      [data-page="supplier-ledger-customer-layout"] {
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

      [data-page="supplier-ledger-customer-layout"],
      [data-page="supplier-ledger-customer-layout"] * {
        box-sizing: border-box;
      }

      [data-page="supplier-ledger-customer-layout"] > div:first-of-type {
        min-height: 100%;
        padding: 20px !important;
        background:
          radial-gradient(circle at top right, rgba(49, 94, 251, 0.08), transparent 32%),
          var(--purchase-bg) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-header {
        margin-bottom: 16px !important;
        padding: 22px 24px !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 24px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 32px rgba(24, 55, 105, 0.06) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-title,
      [data-page="supplier-ledger-customer-layout"] h1 {
        margin-top: 0 !important;
        color: #071938 !important;
        font-size: clamp(26px, 3vw, 34px) !important;
        font-weight: 900 !important;
        letter-spacing: -0.035em !important;
      }

      [data-page="supplier-ledger-customer-layout"] h2,
      [data-page="supplier-ledger-customer-layout"] h3 {
        color: #102143 !important;
      }

      [data-page="supplier-ledger-customer-layout"] p {
        color: var(--purchase-muted);
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-button {
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

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-button:hover:not(:disabled) {
        transform: translateY(-1px) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-primary {
        border: 1px solid transparent !important;
        background: linear-gradient(
          135deg,
          var(--purchase-blue),
          var(--purchase-indigo)
        ) !important;
        color: #ffffff !important;
        box-shadow: 0 8px 18px rgba(49, 94, 251, 0.2) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-primary:hover:not(:disabled) {
        background: linear-gradient(
          135deg,
          var(--purchase-blue-dark),
          #0A65BD
        ) !important;
        box-shadow: 0 11px 23px rgba(49, 94, 251, 0.26) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-outline {
        border: 1px solid #bfcdf4 !important;
        background: #f8faff !important;
        color: #2949c8 !important;
        box-shadow: none !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-soft {
        border: 1px solid #c9d5ff !important;
        background: #edf2ff !important;
        color: #2448cd !important;
        box-shadow: none !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-danger {
        border: 1px solid #fecaca !important;
        background: #fff0f0 !important;
        color: #c62828 !important;
        box-shadow: none !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-control {
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

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-control:focus {
        border-color: var(--purchase-blue) !important;
        box-shadow: 0 0 0 4px rgba(49, 94, 251, 0.12) !important;
      }

      [data-page="supplier-ledger-customer-layout"] textarea.purchase-premium-control {
        min-height: 90px !important;
        resize: vertical !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-form {
        border-radius: 20px !important;
      }

      [data-page="supplier-ledger-customer-layout"] div:has(> .purchase-premium-stat) {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: stretch !important;
        gap: 14px !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-stat {
        flex: 1 1 160px !important;
        min-width: 160px !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        padding: 16px 18px !important;
        border: 1px solid var(--purchase-border) !important;
        border-top: 3px solid var(--purchase-blue) !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        box-shadow: 0 9px 24px rgba(24, 55, 105, 0.05) !important;
        overflow-wrap: break-word !important;
      }

      @media (max-width: 620px) {
        [data-page="supplier-ledger-customer-layout"] .purchase-premium-stat {
          flex: 1 1 130px !important;
          min-width: 130px !important;
        }
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table-wrap {
        width: 100% !important;
        overflow-x: auto !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 20px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 30px rgba(24, 55, 105, 0.055) !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table {
        width: 100% !important;
        min-width: 920px !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: auto !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table thead th {
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

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table thead th:first-child {
        border-top-left-radius: 18px !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table thead th:last-child {
        border-top-right-radius: 18px !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table tbody td {
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

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table tbody tr:hover td {
        background: #f8faff !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table td:last-child {
        white-space: nowrap !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-table td:last-child button {
        margin: 3px !important;
      }

      [data-page="supplier-ledger-customer-layout"] .purchase-premium-dialog,
      body .purchase-premium-dialog {
        border-radius: 22px !important;
        box-shadow: 0 32px 80px rgba(4, 17, 46, 0.28) !important;
      }

      [data-page="supplier-ledger-customer-layout"] label {
        color: #53627f !important;
        font-size: 12px !important;
        font-weight: 750 !important;
      }

      [data-page="supplier-ledger-customer-layout"] ::placeholder {
        color: #91a0bc !important;
        opacity: 1 !important;
      }

      @media (max-width: 900px) {
        [data-page="supplier-ledger-customer-layout"] > div:first-of-type {
          padding: 14px !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-header {
          padding: 18px !important;
          border-radius: 20px !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-button {
          min-height: 40px !important;
          padding: 8px 13px !important;
        }
      }

      @media (max-width: 620px) {
        [data-page="supplier-ledger-customer-layout"] > div:first-of-type {
          padding: 10px !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-title,
        [data-page="supplier-ledger-customer-layout"] h1 {
          font-size: 25px !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-button {
          flex: 1 1 auto !important;
        }
      }

      @media print {
        [data-page="supplier-ledger-customer-layout"] > div:first-of-type {
          padding: 0 !important;
          background: #ffffff !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-button {
          display: none !important;
        }

        [data-page="supplier-ledger-customer-layout"] .purchase-premium-header,
        [data-page="supplier-ledger-customer-layout"] .purchase-premium-table-wrap,
        [data-page="supplier-ledger-customer-layout"] .purchase-premium-stat {
          box-shadow: none !important;
        }
      }

      
        [data-page="supplier-ledger-customer-layout"] .customer-detail-ledger {
          --ledger-primary: #0B4E9B !important;
          --ledger-primary-hover: #244bd4 !important;
          --ledger-ink: #13263A !important;
          --ledger-muted: #6b7a99 !important;
          --ledger-border: #d9e2f3 !important;
          --ledger-soft: #f4f7ff !important;
          padding: 20px !important;
          background:
            radial-gradient(circle at top right, rgba(49, 94, 251, 0.08), transparent 30%),
            #f4f7ff !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-page-header {
          margin-bottom: 16px !important;
          padding: 22px !important;
          border: 1px solid #d8e2f4 !important;
          border-radius: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 12px 32px rgba(24, 55, 105, 0.06) !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-page-header h1 {
          color: #071938 !important;
          font-size: clamp(26px, 3vw, 34px) !important;
          font-weight: 900 !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-button-primary,
        [data-page="supplier-ledger-customer-layout"] .ledger-filter-pill.active,
        [data-page="supplier-ledger-customer-layout"] .ledger-customer-avatar {
          border-color: transparent !important;
          background: linear-gradient(135deg, #0B4E9B, #0B4E9B) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 18px rgba(49, 94, 251, 0.2) !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-button-light,
        [data-page="supplier-ledger-customer-layout"] .ledger-detail-button {
          border-color: #bfcef8 !important;
          background: #f8faff !important;
          color: #2548c9 !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-filter-panel,
        [data-page="supplier-ledger-customer-layout"] .ledger-customer-card,
        [data-page="supplier-ledger-customer-layout"] .ledger-summary-card,
        [data-page="supplier-ledger-customer-layout"] .ledger-table-card,
        [data-page="supplier-ledger-customer-layout"] .ledger-modal-section {
          border-color: #d9e2f3 !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          box-shadow: 0 10px 28px rgba(24, 55, 105, 0.05) !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-field input,
        [data-page="supplier-ledger-customer-layout"] .ledger-field select {
          height: 45px !important;
          border-color: #ccd8ee !important;
          border-radius: 13px !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-field input:focus,
        [data-page="supplier-ledger-customer-layout"] .ledger-field select:focus {
          border-color: #0B4E9B !important;
          box-shadow: 0 0 0 4px rgba(49, 94, 251, 0.12) !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-desktop-table th,
        [data-page="supplier-ledger-customer-layout"] .ledger-product-table th {
          padding: 13px 12px !important;
          border-bottom: 0 !important;
          background: #13263A !important;
          color: #ffffff !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-desktop-table td,
        [data-page="supplier-ledger-customer-layout"] .ledger-product-table td {
          padding: 14px 12px !important;
        }

        [data-page="supplier-ledger-customer-layout"] div:has(> .ledger-summary-card) {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: stretch !important;
          gap: 14px !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-summary-card {
          flex: 1 1 160px !important;
          min-width: 160px !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow-wrap: break-word !important;
          border-top: 3px solid #0B4E9B !important;
        }

        @media (max-width: 620px) {
          [data-page="supplier-ledger-customer-layout"] .ledger-summary-card {
            flex: 1 1 130px !important;
            min-width: 130px !important;
          }
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-summary-debit {
          border-top-color: #ef4444 !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-summary-credit {
          border-top-color: #10b981 !important;
        }

        [data-page="supplier-ledger-customer-layout"] .ledger-summary-strong {
          border-top-color: #0B4E9B !important;
          background: #f8faff !important;
        }
        
    

        /* HARD RESPONSIVE SUPPLIER CARD FIX */
        @media (max-width: 1050px) {
          [data-page="supplier-ledger-customer-layout"]
            .ledger-customer-card {
            grid-template-columns:
              58px minmax(190px, 1fr)
              repeat(2, minmax(135px, 0.75fr)) !important;
          }

          [data-page="supplier-ledger-customer-layout"]
            .ledger-customer-card
            .ledger-info-item:last-child {
            grid-column: 3 / 5 !important;
          }

          [data-page="supplier-ledger-customer-layout"]
            .ledger-summary-grid {
            grid-template-columns:
              repeat(2, minmax(170px, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          [data-page="supplier-ledger-customer-layout"]
            .ledger-customer-card {
            grid-template-columns: 54px minmax(0, 1fr) !important;
            gap: 14px !important;
            padding: 16px !important;
          }

          [data-page="supplier-ledger-customer-layout"]
            .ledger-customer-card
            .ledger-info-item,
          [data-page="supplier-ledger-customer-layout"]
            .ledger-customer-card
            .ledger-info-item:last-child {
            display: grid !important;
            grid-column: 1 / -1 !important;
            grid-template-columns:
              minmax(110px, 0.42fr) minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 12px !important;
            min-height: 46px !important;
            padding: 11px 0 0 !important;
            border-top: 1px solid #e3e9f4 !important;
            border-left: 0 !important;
          }

          [data-page="supplier-ledger-customer-layout"]
            .ledger-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }

      `}</style>
    </div>
  );
}
