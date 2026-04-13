const axios = require("axios");
const crypto = require("crypto");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Order = require("../models/Order");
const { sendReceiptEmail } = require("../utils/sendReceiptEmail");

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper functions
function paystackHeader() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

// Paystack works in kobo, so we need to convert the amount from KES to Kobo *100
function toKobo(amountInKES) {
  return Math.round(amountInKES * 100);
}

// ── Helper: mark an order as paid from a Paystack tx object ──────────────────
// Shared between verifyTransaction and paystackWebhook so logic is never duplicated
async function markOrderPaid(order, tx) {
  order.payment.status = "paid";
  order.payment.paidAt = new Date(tx.paid_at);
  order.payment.card = {
    provider: "paystack",
    paymentIntentId: tx.reference,
    chargeId: String(tx.id),
    last4: tx.authorization?.last4 || null,
    brand: tx.authorization?.brand || null,
  };
  order.orderStatus = "confirmed";
  await order.save();
}

// ── Initialize a payment ─────────────────────────────────────────────────────
exports.initalizePayment = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Already paid
  if (order.payment?.status === "paid") {
    return next(new AppError("Order already paid", 400));
  }

  // Prevent duplicate initialization — but allow re-init if previous one failed
  if (
    order.payment?.card?.paymentIntentId &&
    order.payment?.status === "pending"
  ) {
    // Return the existing access code so the frontend can reuse it
    return res.status(200).json({
      status: "success",
      data: {
        accessCode: order.payment.card.accessCode,
        reference: order.payment.card.paymentIntentId,
      },
    });
  }

  // Generate unique reference
  const reference = `${order.orderNumber}-${Date.now()}`;

  const payload = {
    email: order.customer.email,
    amount: toKobo(order.total),
    currency: "KES",
    reference,
    channels: ["card", "mobile_money"],
    metadata: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      customerName: order.customer.firstName,
      phone: order.customer.phone,
    },
    callback_url: process.env.PAYSTACK_CALLBACK_URL,
  };

  // Call Paystack
  const { data } = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    payload,
    { headers: paystackHeader() },
  );

  if (!data.status) {
    return next(new AppError("Failed to initialize payment", 502));
  }

  // Save payment details — accessCode is now stored so we can reuse it
  order.payment.method = "card";
  order.payment.status = "pending";
  order.payment.card = {
    provider: "paystack",
    paymentIntentId: data.data.reference,
    accessCode: data.data.access_code,
  };

  await order.save();

  res.status(200).json({
    status: "success",
    data: {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    },
  });
});

// ── Verify transaction (manual polling / post-redirect fallback) ──────────────
// Call this from your frontend's callback/redirect page IMMEDIATELY after
// Paystack redirects back so the user sees the correct status right away,
// without waiting for the webhook.
exports.verifyTransaction = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Already confirmed by webhook — just return current state
  if (order.payment.status === "paid") {
    return res.status(200).json({
      status: "success",
      data: {
        paystackStatus: "success",
        orderStatus: order.orderStatus,
        paymentStatus: order.payment.status,
        amount: order.total,
        paidAt: order.payment.paidAt,
      },
    });
  }

  const reference = order.payment?.card?.paymentIntentId;
  if (!reference) {
    return next(new AppError("No payment reference found for this order", 400));
  }

  const { data } = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeader() },
  );

  if (!data.status) {
    return next(new AppError("Could not verify transaction", 502));
  }

  const tx = data.data;

  if (tx.status === "success") {
    await markOrderPaid(order, tx);
    // Send receipt — don't await, fire and forget
    sendReceiptEmail(order).catch((err) =>
      console.error("Receipt email failed:", err),
    );
  } else if (tx.status === "failed") {
    order.payment.status = "failed";
    order.payment.failureReason = tx.gateway_response;
    await order.save();
  }

  res.status(200).json({
    status: "success",
    data: {
      paystackStatus: tx.status,
      orderStatus: order.orderStatus,
      paymentStatus: order.payment.status,
      amount: tx.amount / 100, // back to KES
      paidAt: tx.paid_at,
    },
  });
});

// ── Paystack webhook ──────────────────────────────────────────────────────────
exports.paystackWebhook = catchAsync(async (req, res) => {
  console.log("webhook hit 💥");
  const signature = req.headers["x-paystack-signature"];

  if (!signature) {
    console.error("❌ Missing Paystack signature header");
    return res.status(400).send("Missing signature");
  }

  // req.body is a raw Buffer — this is what Paystack signed
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body) // Buffer, not parsed object
    .digest("hex");

  if (hash !== signature) {
    console.error("❌ Invalid Paystack signature");
    console.error("   Expected:", hash);
    console.error("   Received:", signature);
    return res.status(400).send("Invalid signature");
  }

  // Now parse it
  const event = JSON.parse(req.body.toString());
  console.log("✅ Webhook event received:", event.event);

  // Acknowledge immediately — Paystack expects a fast 200
  // We process async below but the response is already sent
  res.status(200).send("ok");

  if (event.event !== "charge.success") {
    console.log("ℹ️  Ignoring event:", event.event);
    return;
  }

  const tx = event.data;

  const order = await Order.findOne({
    "payment.card.paymentIntentId": tx.reference,
  });

  if (!order) {
    console.error("⚠️  No order found for reference:", tx.reference);
    return;
  }

  if (order.payment.status === "paid") {
    console.log(
      `ℹ️  Order ${order.orderNumber} already marked as paid — skipping`,
    );
    return;
  }

  await markOrderPaid(order, tx);
  console.log(`✅ Order ${order.orderNumber} marked as paid via webhook`);

  sendReceiptEmail(order).catch((err) =>
    console.error("Receipt email failed:", err),
  );
});
