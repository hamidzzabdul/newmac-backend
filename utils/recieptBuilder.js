const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// ── Format currency ──────────────────────────────────────────────────────────
const ksh = (n) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

// ── Format date ───────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

// ── Encode logo to base64 so Puppeteer can embed it ──────────────────────────
function getLogoBase64() {
  try {
    const logoPath = path.resolve(__dirname, "../public/assets/logo.png");
    const data = fs.readFileSync(logoPath);
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null; // gracefully degrade if logo not found
  }
}

// ── HTML TEMPLATE ─────────────────────────────────────────────────────────────
function generateReceiptHTML(order) {
  const logo = getLogoBase64();
  const paidAt = order.payment?.paidAt || order.updatedAt || new Date();
  const paymentMethod =
    order.payment?.method === "mpesa"
      ? "M-Pesa"
      : order.payment?.method === "card"
        ? `Card · •••• ${order.payment?.card?.last4 || "****"}`
        : order.payment?.method === "cod"
          ? "Cash on Delivery"
          : "—";

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt · ${order.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #f4f4f0;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Page shell ── */
    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      background: #0d0d0d;
      padding: 36px 48px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
    }

    .logo-fallback {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.04em;
    }

    .brand-sub {
      font-size: 11px;
      color: #888888;
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .header-right {
      text-align: right;
    }

    .receipt-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #555555;
      margin-bottom: 4px;
    }

    .receipt-number {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.02em;
    }

    /* ── Status band ── */
    .status-band {
      background: #16a34a;
      padding: 10px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-paid {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #bbf7d0;
    }

    .status-date {
      font-size: 11px;
      color: #bbf7d0;
      font-weight: 400;
    }

    /* ── Body ── */
    .body {
      padding: 40px 48px;
      flex: 1;
    }

    /* ── Two-column meta ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 36px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e8e8e4;
    }

    .meta-block h4 {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #999999;
      margin-bottom: 10px;
    }

    .meta-block p {
      font-size: 13px;
      color: #1a1a1a;
      font-weight: 500;
      margin-bottom: 3px;
    }

    .meta-block p.muted {
      font-size: 12px;
      color: #666666;
      font-weight: 400;
    }

    /* ── Delivery address ── */
    .address-line {
      font-size: 12px;
      color: #666666;
      line-height: 1.7;
    }

    /* ── Items table ── */
    .section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #999999;
      margin-bottom: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead tr {
      background: #f7f7f5;
      border-top: 1px solid #e8e8e4;
      border-bottom: 1px solid #e8e8e4;
    }

    thead th {
      padding: 10px 14px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #888888;
      text-align: left;
    }

    thead th.right { text-align: right; }

    tbody tr {
      border-bottom: 1px solid #f0f0ec;
    }

    tbody tr:last-child {
      border-bottom: 1px solid #e8e8e4;
    }

    tbody td {
      padding: 13px 14px;
      font-size: 13px;
      color: #1a1a1a;
      vertical-align: middle;
    }

    tbody td.right { text-align: right; }
    tbody td.muted { color: #666666; }

    .item-name {
      font-weight: 500;
    }

    .item-qty {
      display: inline-block;
      background: #f0f0ec;
      color: #555555;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 99px;
    }

    /* ── Totals ── */
    .totals {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
    }

    .totals-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 48px;
      padding: 7px 14px;
      width: 340px;
    }

    .totals-row .label {
      font-size: 12px;
      color: #888888;
      min-width: 80px;
      text-align: right;
    }

    .totals-row .value {
      font-size: 13px;
      color: #1a1a1a;
      min-width: 100px;
      text-align: right;
      font-weight: 500;
    }

    .totals-row.free .value {
      color: #16a34a;
    }

    .totals-row.grand {
      background: #0d0d0d;
      border-radius: 8px;
      margin-top: 4px;
    }

    .totals-row.grand .label {
      font-size: 12px;
      font-weight: 600;
      color: #888888;
      letter-spacing: 0.04em;
    }

    .totals-row.grand .value {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }

    /* ── Payment info ── */
    .payment-row {
      margin-top: 32px;
      padding: 16px 20px;
      background: #f7f7f5;
      border-radius: 10px;
      border: 1px solid #e8e8e4;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .payment-row h4 {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #999999;
      margin-bottom: 4px;
    }

    .payment-row p {
      font-size: 13px;
      font-weight: 500;
      color: #1a1a1a;
    }

    .paid-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #dcfce7;
      color: #15803d;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 99px;
      border: 1px solid #bbf7d0;
    }

    .paid-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
    }

    /* ── Footer ── */
    .footer {
      margin-top: auto;
      padding: 24px 48px;
      border-top: 1px solid #e8e8e4;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .footer p {
      font-size: 11px;
      color: #aaaaaa;
    }

    .footer .brand-mark {
      font-size: 12px;
      font-weight: 600;
      color: #cccccc;
      letter-spacing: 0.06em;
    }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: #e8e8e4;
      margin: 28px 0;
    }

    /* ── Watermark ── */
    .watermark {
      position: absolute;
      bottom: 120px;
      right: 48px;
      font-size: 88px;
      font-weight: 900;
      color: rgba(22, 163, 74, 0.04);
      letter-spacing: -4px;
      pointer-events: none;
      user-select: none;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="header">
    <div class="header-left">
      ${
        logo
          ? `<img src="${logo}" alt="New Mark" class="logo-img" />`
          : `<div class="logo-fallback">
               <div class="brand-name">NEW MARK</div>
               <div class="brand-sub">Premium Fresh Meat</div>
             </div>`
      }
    </div>
    <div class="header-right">
      <div class="receipt-label">Receipt</div>
      <div class="receipt-number">#${order.orderNumber}</div>
    </div>
  </div>

  <!-- ── Status band ── -->
  <div class="status-band">
    <div class="status-paid">
      <div class="status-dot"></div>
      Payment confirmed
    </div>
    <div class="status-date">${formatDate(paidAt)}</div>
  </div>

  <!-- ── Body ── -->
  <div class="body" style="position:relative;">

    <div class="watermark">PAID</div>

    <!-- ── Meta: customer + delivery ── -->
    <div class="meta-grid">
      <div class="meta-block">
        <h4>Billed to</h4>
        <p>${order.customer.firstName}${order.customer.lastName ? " " + order.customer.lastName : ""}</p>
        <p class="muted">${order.customer.email}</p>
        <p class="muted">${order.customer.phone || "—"}</p>
      </div>

      <div class="meta-block">
        <h4>Delivery address</h4>
        ${
          order.shippingAddress
            ? `<p class="address-line">
                ${order.shippingAddress.street || ""}${order.shippingAddress.street ? "," : ""}
                ${order.shippingAddress.city || ""}
                ${order.shippingAddress.postalCode ? "· " + order.shippingAddress.postalCode : ""}
               </p>
               ${order.shippingAddress.deliveryNotes ? `<p class="muted" style="margin-top:4px;font-style:italic;">"${order.shippingAddress.deliveryNotes}"</p>` : ""}`
            : `<p class="muted">—</p>`
        }
      </div>

      <div class="meta-block">
        <h4>Order date</h4>
        <p>${formatDate(order.createdAt)}</p>
        <p class="muted">Order #${order.orderNumber}</p>
      </div>

      <div class="meta-block">
        <h4>Order status</h4>
        <p>${order.orderStatus ? order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1) : "Confirmed"}</p>
        <p class="muted">Payment received</p>
      </div>
    </div>

    <!-- ── Items ── -->
    <div class="section-label">Order items</div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Unit price</th>
          <th class="right">Qty (kg)</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td class="item-name">${item.product?.name || item.name || "Meat"}</td>
            <td class="muted">${ksh(item.price)}/kg</td>
            <td class="right"><span class="item-qty">${Number(item.quantity).toFixed(2)} kg</span></td>
            <td class="right">${ksh(item.price * item.quantity)}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <!-- ── Totals ── -->
    <div class="totals">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">${ksh(subtotal)}</span>
      </div>
      <div class="totals-row free">
        <span class="label">Delivery</span>
        <span class="value">Free</span>
      </div>
      <div class="totals-row grand">
        <span class="label">Total paid</span>
        <span class="value">${ksh(order.total)}</span>
      </div>
    </div>

    <!-- ── Payment info ── -->
    <div class="payment-row">
      <div>
        <h4>Payment method</h4>
        <p>${paymentMethod}</p>
      </div>
      <div class="paid-badge">
        <div class="paid-badge-dot"></div>
        Paid
      </div>
    </div>

  </div><!-- /body -->

  <!-- ── Footer ── -->
  <div class="footer">
    <p>Thank you for shopping with New Mark · Questions? support@newmark.co.ke</p>
    <div class="brand-mark">NEW MARK</div>
  </div>

</div>
</body>
</html>`;
}

// ── GENERATE PDF BUFFER ────────────────────────────────────────────────────────
async function generateReceiptBuffer(order) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const html = generateReceiptHTML(order);

  await page.setContent(html, { waitUntil: "networkidle0" }); // wait for Google Fonts

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();
  return buffer;
}

module.exports = { generateReceiptBuffer };
