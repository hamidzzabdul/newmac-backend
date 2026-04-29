const axios = require("axios");
const crypto = require("crypto");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Order = require("../models/Order");
const { sendReceiptEmail } = require("../utils/sendReceiptEmail");

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

function paystackHeader() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

function toKobo(amountInKES) {
  return Math.round(amountInKES * 100);
}

function getOrderEmail(order) {
  if (order?.customer?.email && order.customer.email.trim()) {
    return order.customer.email.trim();
  }
  return null;
}

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

exports.initalizePayment = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }
  const isAdmin = req.user?.role === "admin";

  if (!isAdmin && order.customer?.email !== req.user?.email) {
    return next(new AppError("You are not allowed to pay for this order", 403));
  }

  if (order.payment?.status === "paid") {
    return next(new AppError("This order is already paid", 400));
  }

  if (order.orderStatus === "cancelled") {
    return next(new AppError("Cancelled orders cannot be paid", 400));
  }

  if (
    order.payment?.card?.paymentIntentId &&
    order.payment?.status === "pending" &&
    order.payment?.card?.accessCode
  ) {
    return res.status(200).json({
      status: "success",
      data: {
        authorizationUrl: `https://checkout.paystack.com/${order.payment.card.accessCode}`,
        accessCode: order.payment.card.accessCode,
        reference: order.payment.card.paymentIntentId,
      },
    });
  }

  const customerEmail = getOrderEmail(order);

  if (!customerEmail) {
    return next(new AppError("No customer email found for this order", 400));
  }

  const reference = `${order.orderNumber}-${Date.now()}`;

  const payload = {
    email: customerEmail,
    amount: toKobo(order.total),
    currency: "KES",
    reference,
    channels: ["card", "mobile_money"],
    metadata: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      customerName: order.customer?.fullName || "Customer",
      phone: order.customer?.phone || "",
      fulfillmentMethod: order.fulfillment?.method || "home_delivery",
    },
    callback_url: process.env.PAYSTACK_CALLBACK_URL,
  };

  let paystackRes;
  try {
    paystackRes = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      { headers: paystackHeader() },
    );
  } catch (err) {
    console.error(
      "Paystack initialize error:",
      err?.response?.data || err.message,
    );

    const message =
      err?.response?.data?.message || "Failed to initialize payment";
    const statusCode =
      err?.response?.status && err.response.status < 500
        ? err.response.status
        : 502;

    return next(new AppError(message, statusCode));
  }

  const data = paystackRes.data;

  if (!data.status) {
    return next(new AppError("Failed to initialize payment", 502));
  }

  order.payment.method = "card";
  order.payment.status = "pending";
  order.payment.card = {
    provider: "paystack",
    paymentIntentId: data.data.reference,
    accessCode: data.data.access_code,
    authorizationUrl: data.data.authorization_url,
  };

  if (!order.customer.email) {
    order.customer.email = customerEmail;
  }

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

exports.verifyTransaction = catchAsync(async (req, res, next) => {
  const { id: orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

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
    sendReceiptEmail(order).catch((err) =>
      console.error("Receipt email failed:", err),
    );
  } else if (tx.status === "failed") {
    order.payment.status = "failed";
    order.payment.failureReason = tx.gateway_response;
    order.orderStatus = "payment_failed";
    await order.save();
  }

  res.status(200).json({
    status: "success",
    data: {
      paystackStatus: tx.status,
      orderStatus: order.orderStatus,
      paymentStatus: order.payment.status,
      amount: tx.amount / 100,
      paidAt: tx.paid_at,
    },
  });
});

exports.paystackWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  if (!signature) {
    return res.status(400).send("Missing signature");
  }

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());

  res.status(200).send("ok");

  if (event.event !== "charge.success") return;

  const tx = event.data;

  const order = await Order.findOne({
    "payment.card.paymentIntentId": tx.reference,
  });

  if (!order) return;
  if (order.payment.status === "paid") return;

  await markOrderPaid(order, tx);

  sendReceiptEmail(order).catch((err) =>
    console.error("Receipt email failed:", err),
  );
});
