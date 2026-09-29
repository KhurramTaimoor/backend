import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import SalesReportPage from "./SalesReportPage";

const installPurchaseReportApiAdapter = () => {
  const requestInterceptor = axios.interceptors.request.use((config) => {
    const url = String(config.url || "");
    config.__purchaseReportOriginalUrl = url;

    if (url.includes("/api/sales-report")) {
      config.url = url.replace("/api/sales-report", "/api/purchase-report");
    } else if (url.includes("/api/sales-invoices")) {
      config.url = url.replace(
        "/api/sales-invoices",
        "/api/purchase-invoices"
      );
    } else if (url.includes("/api/sales-returns")) {
      config.url = url.replace(
        "/api/sales-returns",
        "/api/purchase-returns"
      );
    }

    return config;
  });

  return () => {
    axios.interceptors.request.eject(requestInterceptor);
  };
};

const TEXT_REPLACEMENTS = [
  ["Sales Invoice & Return Report", "Purchase Invoice & Return Report"],
  ["Sales invoices and sales returns report", "Purchase invoices and purchase returns report"],
  ["Sales Report", "Purchase Report"],
  ["Sales Invoice", "Purchase Invoice"],
  ["Sales Return Details", "Purchase Return Details"],
  ["Sales Return", "Purchase Return"],
  ["Net Sales", "Net Purchases"],
  ["Search by Name", "Search by Supplier"],
  ["Type customer/person name", "Type supplier name"],
  ["customer/person", "supplier"],
  ["Customer/Person", "Supplier"],
  ["Paid Amount", "Paid Amount"],
  ["سیلز انوائس اور ریٹرن رپورٹ", "پرچیز انوائس اور ریٹرن رپورٹ"],
  ["سیلز رپورٹ", "پرچیز رپورٹ"],
  ["سیلز انوائس", "پرچیز انوائس"],
  ["سیلز ریٹرن تفصیل", "پرچیز ریٹرن تفصیل"],
  ["سیلز ریٹرن", "پرچیز ریٹرن"],
  ["نیٹ سیلز", "نیٹ پرچیز"],
  ["کسٹمر/شخص کا نام لکھیں", "سپلائر کا نام لکھیں"],
];

const replaceText = (value) => {
  let result = String(value ?? "");

  for (const [from, to] of TEXT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }

  return result;
};

const hideShipmentUi = (root) => {
  root
    .querySelectorAll("label, span, p, th, td, div")
    .forEach((element) => {
      const text = String(element.textContent || "").trim();

      if (!/^(shipment to|ship to|شپ ٹو|شپ کس کو کیا)\s*:?\s*$/i.test(text)) {
        return;
      }

      let container = element;

      for (let depth = 0; depth < 5 && container; depth += 1) {
        const tag = container.tagName?.toLowerCase();

        if (
          tag === "th" ||
          tag === "td" ||
          container.querySelector?.("input, textarea, select")
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

const transformPurchaseReportDom = (root) => {
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
};

const installWindowOpenTransformer = () => {
  const originalOpen = window.open;

  const patchedOpen = function patchedWindowOpen(...args) {
    const popup = originalOpen.apply(window, args);

    if (!popup?.document) return popup;

    const originalClose = popup.document.close.bind(popup.document);

    popup.document.close = (...closeArgs) => {
      const result = originalClose(...closeArgs);

      window.setTimeout(() => {
        try {
          transformPurchaseReportDom(popup.document.body);
        } catch {
          // The print window may already be closed.
        }
      }, 0);

      return result;
    };

    return popup;
  };

  window.open = patchedOpen;

  return () => {
    if (window.open === patchedOpen) {
      window.open = originalOpen;
    }
  };
};

export default function PurchaseReportPage() {
  const rootRef = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const removeApiAdapter = installPurchaseReportApiAdapter();
    const removeWindowTransformer = installWindowOpenTransformer();

    setReady(true);

    return () => {
      removeApiAdapter();
      removeWindowTransformer();
    };
  }, []);

  useEffect(() => {
    if (!ready || !rootRef.current) return undefined;

    const root = rootRef.current;

    transformPurchaseReportDom(root);

    const observer = new MutationObserver(() => {
      transformPurchaseReportDom(root);
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
    <div ref={rootRef} data-page="purchase-report-sales-layout">
      <SalesReportPage />

      <style>{`

      [data-page="purchase-report-sales-layout"] {
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

      [data-page="purchase-report-sales-layout"],
      [data-page="purchase-report-sales-layout"] * {
        box-sizing: border-box;
      }

      [data-page="purchase-report-sales-layout"] > div:first-of-type {
        min-height: 100%;
        padding: 20px !important;
        background:
          radial-gradient(circle at top right, rgba(49, 94, 251, 0.08), transparent 32%),
          var(--purchase-bg) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-header {
        margin-bottom: 16px !important;
        padding: 22px 24px !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 24px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 32px rgba(24, 55, 105, 0.06) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-title,
      [data-page="purchase-report-sales-layout"] h1 {
        margin-top: 0 !important;
        color: #071938 !important;
        font-size: clamp(26px, 3vw, 34px) !important;
        font-weight: 900 !important;
        letter-spacing: -0.035em !important;
      }

      [data-page="purchase-report-sales-layout"] h2,
      [data-page="purchase-report-sales-layout"] h3 {
        color: #102143 !important;
      }

      [data-page="purchase-report-sales-layout"] p {
        color: var(--purchase-muted);
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-button {
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

      [data-page="purchase-report-sales-layout"] .purchase-premium-button:hover:not(:disabled) {
        transform: translateY(-1px) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-primary {
        border: 1px solid transparent !important;
        background: linear-gradient(
          135deg,
          var(--purchase-blue),
          var(--purchase-indigo)
        ) !important;
        color: #ffffff !important;
        box-shadow: 0 8px 18px rgba(49, 94, 251, 0.2) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-primary:hover:not(:disabled) {
        background: linear-gradient(
          135deg,
          var(--purchase-blue-dark),
          #0A65BD
        ) !important;
        box-shadow: 0 11px 23px rgba(49, 94, 251, 0.26) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-outline {
        border: 1px solid #bfcdf4 !important;
        background: #f8faff !important;
        color: #2949c8 !important;
        box-shadow: none !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-soft {
        border: 1px solid #c9d5ff !important;
        background: #edf2ff !important;
        color: #2448cd !important;
        box-shadow: none !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-danger {
        border: 1px solid #fecaca !important;
        background: #fff0f0 !important;
        color: #c62828 !important;
        box-shadow: none !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-control {
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

      [data-page="purchase-report-sales-layout"] .purchase-premium-control:focus {
        border-color: var(--purchase-blue) !important;
        box-shadow: 0 0 0 4px rgba(49, 94, 251, 0.12) !important;
      }

      [data-page="purchase-report-sales-layout"] textarea.purchase-premium-control {
        min-height: 90px !important;
        resize: vertical !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-form {
        border-radius: 20px !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-stat {
        min-width: 0 !important;
        padding: 16px 18px !important;
        border: 1px solid var(--purchase-border) !important;
        border-top: 3px solid var(--purchase-blue) !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        box-shadow: 0 9px 24px rgba(24, 55, 105, 0.05) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table-wrap {
        width: 100% !important;
        overflow-x: auto !important;
        border: 1px solid var(--purchase-border) !important;
        border-radius: 20px !important;
        background: #ffffff !important;
        box-shadow: 0 12px 30px rgba(24, 55, 105, 0.055) !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table {
        width: 100% !important;
        min-width: 920px !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: auto !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table thead th {
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

      [data-page="purchase-report-sales-layout"] .purchase-premium-table thead th:first-child {
        border-top-left-radius: 18px !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table thead th:last-child {
        border-top-right-radius: 18px !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table tbody td {
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

      [data-page="purchase-report-sales-layout"] .purchase-premium-table tbody tr:hover td {
        background: #f8faff !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table td:last-child {
        white-space: nowrap !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-table td:last-child button {
        margin: 3px !important;
      }

      [data-page="purchase-report-sales-layout"] .purchase-premium-dialog,
      body .purchase-premium-dialog {
        border-radius: 22px !important;
        box-shadow: 0 32px 80px rgba(4, 17, 46, 0.28) !important;
      }

      [data-page="purchase-report-sales-layout"] label {
        color: #53627f !important;
        font-size: 12px !important;
        font-weight: 750 !important;
      }

      [data-page="purchase-report-sales-layout"] ::placeholder {
        color: #91a0bc !important;
        opacity: 1 !important;
      }

      @media (max-width: 900px) {
        [data-page="purchase-report-sales-layout"] > div:first-of-type {
          padding: 14px !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-header {
          padding: 18px !important;
          border-radius: 20px !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-button {
          min-height: 40px !important;
          padding: 8px 13px !important;
        }
      }

      @media (max-width: 620px) {
        [data-page="purchase-report-sales-layout"] > div:first-of-type {
          padding: 10px !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-title,
        [data-page="purchase-report-sales-layout"] h1 {
          font-size: 25px !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-button {
          flex: 1 1 auto !important;
        }
      }

      @media print {
        [data-page="purchase-report-sales-layout"] > div:first-of-type {
          padding: 0 !important;
          background: #ffffff !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-button {
          display: none !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-header,
        [data-page="purchase-report-sales-layout"] .purchase-premium-table-wrap,
        [data-page="purchase-report-sales-layout"] .purchase-premium-stat {
          box-shadow: none !important;
        }
      }

      
        [data-page="purchase-report-sales-layout"] .purchase-premium-header {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          flex-wrap: wrap !important;
          gap: 16px !important;
        }

        [data-page="purchase-report-sales-layout"] .purchase-premium-stat {
          min-height: 104px !important;
        }
        
    
      `}</style>
    </div>
  );
}
