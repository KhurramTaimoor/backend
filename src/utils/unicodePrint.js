export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function hasRtlText(value) {
  return /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(String(value ?? ""));
}

export function printableText(value, className = "") {
  const text = String(value ?? "");
  const classes = [className, hasRtlText(text) ? "rtl-text" : ""].filter(Boolean).join(" ");
  return `<span${classes ? ` class="${classes}"` : ""}>${escapeHtml(text)}</span>`;
}

/**
 * Open a browser print document that is safe for Urdu/Arabic Unicode text.
 * Browser rendering is intentionally used instead of jsPDF's built-in Helvetica,
 * because the standard PDF fonts do not contain Urdu glyphs and turn text into mojibake.
 */
export function openUnicodePrint({
  title = "Report",
  bodyHtml = "",
  styles = "",
  dir = "ltr",
  lang = "en",
  pageSize = "A4 portrait",
  autoClose = true,
  windowFeatures = "width=1200,height=850",
} = {}) {
  const printWindow = window.open("", "_blank", windowFeatures);
  if (!printWindow) return false;

  const safeTitle = escapeHtml(title);
  const safeDir = dir === "rtl" ? "rtl" : "ltr";
  const safeLang = lang === "ur" ? "ur" : "en";

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="${safeLang}" dir="${safeDir}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#13263A;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Poppins','Noto Naskh Arabic','Noto Nastaliq Urdu','Segoe UI',Tahoma,Arial,sans-serif}
    .rtl-text{direction:rtl;unicode-bidi:plaintext;font-family:'Noto Nastaliq Urdu','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif;line-height:1.75}
    .ltr-text{direction:ltr;unicode-bidi:plaintext}
    .num{direction:ltr;unicode-bidi:plaintext;font-family:'Poppins','Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums}
    .pdf-hint{margin:0 auto 12px;max-width:1100px;padding:9px 12px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#1d4ed8;text-align:center;font-size:12px}
    @page{size:${pageSize};margin:9mm}
    @media print{.pdf-hint{display:none!important}}
    ${styles}
  </style>
</head>
<body>
${bodyHtml}
<script>
(function(){
  var started = false;
  function doPrint(){
    if(started) return;
    started = true;
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function(resolve){ setTimeout(resolve, 1400); });
    Promise.race([fontsReady, timeout]).then(function(){
      setTimeout(function(){ window.print(); }, 120);
    });
  }
  if(document.readyState === 'complete') doPrint();
  else window.addEventListener('load', doPrint, {once:true});
  setTimeout(doPrint, 1800);
  ${autoClose ? "window.addEventListener('afterprint', function(){ window.close(); });" : ""}
})();
<\/script>
</body>
</html>`);
  printWindow.document.close();
  return true;
}
