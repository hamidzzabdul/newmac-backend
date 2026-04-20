const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// ── Format currency ──────────────────────────────────────────────────────────
const ksh = (n) =>
  `KSh ${Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ── Format date ──────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

// ── Safe text helpers ────────────────────────────────────────────────────────
const safe = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str ? str : fallback;
};

const humanizeStatus = (status) => {
  if (!status) return "Confirmed";
  return String(status)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// ── Encode logo to base64 so Puppeteer can embed it ─────────────────────────
function getLogoBase64() {
  const candidatePaths = [
    path.resolve(__dirname, "../public/assets/logo.jpeg"),
    path.resolve(__dirname, "../public/assets/logo.jpg"),
    path.resolve(__dirname, "../public/assets/logo.png"),
  ];

  for (const logoPath of candidatePaths) {
    try {
      if (fs.existsSync(logoPath)) {
        const data = fs.readFileSync(logoPath);
        const ext = path.extname(logoPath).toLowerCase();
        const mime =
          ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : "image/png";

        return `data:${mime};base64,${data.toString("base64")}`;
      }
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

// ── HTML TEMPLATE ────────────────────────────────────────────────────────────
function generateReceiptHTML(order) {
  const logo = getLogoBase64();
  const paidAt = order.payment?.paidAt || order.updatedAt || order.createdAt;
  const paymentMethod =
    order.payment?.method === "mpesa"
      ? "M-Pesa"
      : order.payment?.method === "card"
        ? `Card · •••• ${order.payment?.card?.last4 || "****"}`
        : order.payment?.method === "cod"
          ? "Cash on Delivery"
          : "—";

  const subtotal = Array.isArray(order.items)
    ? order.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      )
    : Number(order.subtotal || 0);

  const shippingFee = Number(order.shippingFee || 0);
  const total = Number(order.total || subtotal + shippingFee);
  const isPickup = order.fulfillment?.method === "pickup";
  const customerName = safe(order.customer?.fullName, "Customer");
  const customerEmail = safe(order.customer?.email, "—");
  const customerPhone = safe(order.customer?.phone, "—");
  const receiptNumber = safe(order.orderNumber, "Order Receipt");
  const paymentStatus = safe(order.payment?.status, "paid").toLowerCase();
  const paidLabel =
    paymentStatus === "paid"
      ? "Paid"
      : paymentStatus === "pending"
        ? "Pending"
        : paymentStatus === "failed"
          ? "Failed"
          : humanizeStatus(paymentStatus);

  const paymentBadgeClass =
    paymentStatus === "paid"
      ? "badge-success"
      : paymentStatus === "pending"
        ? "badge-warning"
        : "badge-danger";

  const deliveryBlock = isPickup
    ? `
      <p class="address-line">Pickup at shop</p>
      <p class="muted" style="margin-top:4px;">Customer will collect the order from the store.</p>
    `
    : `
      <p class="address-line">${safe(order.shippingAddress?.location, "—")}</p>
      ${
        order.shippingAddress?.additionalInfo
          ? `<p class="muted" style="margin-top:4px;font-style:italic;">"${safe(order.shippingAddress.additionalInfo, "")}"</p>`
          : ""
      }
    `;

  const receiptRef =
    order.payment?.mpesaReceiptNumber ||
    order.payment?.card?.chargeId ||
    order.payment?.checkoutRequestID ||
    "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt · ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #f4f4f0;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }

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
      height: 48px;
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
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.04em;
    }

    .brand-sub {
      font-size: 11px;
      color: #9ca3af;
      font-weight: 500;
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
      color: #6b7280;
      margin-bottom: 4px;
    }

    .receipt-number {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.02em;
    }

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
      font-weight: 700;
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
      color: #dcfce7;
      font-weight: 500;
    }

    .body {
      padding: 40px 48px;
      flex: 1;
      position: relative;
    }

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
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 10px;
    }

    .meta-block p {
      font-size: 13px;
      color: #111827;
      font-weight: 500;
      margin-bottom: 3px;
    }

    .meta-block p.muted {
      font-size: 12px;
      color: #6b7280;
      font-weight: 400;
    }

    .address-line {
      font-size: 12px;
      color: #4b5563;
      line-height: 1.7;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
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
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
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
      color: #111827;
      vertical-align: middle;
    }

    tbody td.right { text-align: right; }
    tbody td.muted { color: #6b7280; }

    .item-name {
      font-weight: 600;
    }

    .item-qty {
      display: inline-block;
      background: #f0f0ec;
      color: #555555;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
    }

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
      color: #6b7280;
      min-width: 90px;
      text-align: right;
    }

    .totals-row .value {
      font-size: 13px;
      color: #111827;
      min-width: 120px;
      text-align: right;
      font-weight: 600;
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
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.04em;
    }

    .totals-row.grand .value {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
    }

    .payment-row {
      margin-top: 32px;
      padding: 16px 20px;
      background: #f7f7f5;
      border-radius: 10px;
      border: 1px solid #e8e8e4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .payment-row h4 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .payment-row p {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }

    .payment-info-secondary {
      margin-top: 6px;
      font-size: 12px !important;
      font-weight: 400 !important;
      color: #6b7280 !important;
    }

    .paid-badge,
    .badge-success,
    .badge-warning,
    .badge-danger {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 99px;
    }

    .badge-success {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .badge-warning {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .badge-danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .paid-badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .footer {
      margin-top: auto;
      padding: 24px 48px;
      border-top: 1px solid #e8e8e4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .footer p {
      font-size: 11px;
      color: #9ca3af;
    }

    .footer .brand-mark {
      font-size: 12px;
      font-weight: 700;
      color: #d1d5db;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

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

    <div class="header">
      <div class="header-left">
        ${
          logo
            ? `<img src="${logo}" alt="Newmark Prime Meat" class="logo-img" />`
            : `<div class="logo-fallback">
                <div class="brand-name">NEWMARK PRIME MEAT</div>
                <div class="brand-sub">Best meat supplier in Nairobi</div>
              </div>`
        }
      </div>
      <div class="header-right">
        <div class="receipt-label">Receipt</div>
        <div class="receipt-number">#${receiptNumber}</div>
      </div>
    </div>

    <div class="status-band">
      <div class="status-paid">
        <div class="status-dot"></div>
        Payment confirmed
      </div>
      <div class="status-date">${formatDate(paidAt)}</div>
    </div>

    <div class="body">
      <div class="watermark">PAID</div>

      <div class="meta-grid">
        <div class="meta-block">
          <h4>Billed to</h4>
          <p>${customerName}</p>
          <p class="muted">${customerEmail}</p>
          <p class="muted">${customerPhone}</p>
        </div>

        <div class="meta-block">
          <h4>${isPickup ? "Pickup details" : "Delivery address"}</h4>
          ${deliveryBlock}
        </div>

        <div class="meta-block">
          <h4>Order date</h4>
          <p>${formatDate(order.createdAt)}</p>
          <p class="muted">Order #${receiptNumber}</p>
        </div>

        <div class="meta-block">
          <h4>Order status</h4>
          <p>${humanizeStatus(order.orderStatus)}</p>
          <p class="muted">Payment ${paymentStatus === "paid" ? "received" : humanizeStatus(paymentStatus).toLowerCase()}</p>
        </div>
      </div>

      <div class="section-label">Order items</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit price</th>
            <th class="right">Qty</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || [])
            .map(
              (item) => `
            <tr>
              <td class="item-name">${safe(item.product?.name || item.name || "Meat")}</td>
              <td class="muted">${ksh(item.price)}/kg</td>
              <td class="right"><span class="item-qty">${Number(item.quantity || 0).toFixed(2)} kg</span></td>
              <td class="right">${ksh(Number(item.price || 0) * Number(item.quantity || 0))}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${ksh(subtotal)}</span>
        </div>
        <div class="totals-row ${shippingFee === 0 ? "free" : ""}">
          <span class="label">${isPickup ? "Pickup" : "Delivery"}</span>
          <span class="value">${shippingFee === 0 ? "Free" : ksh(shippingFee)}</span>
        </div>
        <div class="totals-row grand">
          <span class="label">Total paid</span>
          <span class="value">${ksh(total)}</span>
        </div>
      </div>

      <div class="payment-row">
        <div>
          <h4>Payment method</h4>
          <p>${paymentMethod}</p>
          <p class="payment-info-secondary">Reference: ${safe(receiptRef)}</p>
        </div>
        <div class="${paymentBadgeClass}">
          <div class="paid-badge-dot"></div>
          ${paidLabel}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for shopping with Newmark Prime Meat · For support, contact info@newmarkprimemeat.com</p>
      <div class="brand-mark">NEWMARK PRIME MEAT</div>
    </div>

  </div>
</body>
</html>`;
}

// ── GENERATE PDF BUFFER ──────────────────────────────────────────────────────
async function generateReceiptBuffer(order) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  });

  try {
    const page = await browser.newPage();
    const html = generateReceiptHTML(order);

    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateReceiptBuffer };
