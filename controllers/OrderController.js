const Product = require("../models/Product");
const Order = require("../models/Order");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { calculateShippingFee } = require("../utils/shipping");

exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, customer, paymentMethod, fulfillmentMethod, shippingAddress } =
    req.body;

  const { fullName, phone, email } = customer || {};

  if (!items || items.length === 0) {
    return next(new AppError("Order must contain at least one item", 400));
  }

  if (!fullName || !phone) {
    return next(new AppError("Full name and phone number are required", 400));
  }

  const finalFulfillmentMethod = fulfillmentMethod || "home_delivery";

  if (
    finalFulfillmentMethod === "home_delivery" &&
    (!shippingAddress || !shippingAddress.location)
  ) {
    return next(new AppError("Location is required for home delivery", 400));
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return next(new AppError(`Product ${item.productId} not found`, 404));
    }

    if (product.stockkg === 0) {
      return next(new AppError(`${product.name} is out of stock`, 400));
    }

    if (product.stockkg < item.quantity) {
      return next(
        new AppError(
          `Only ${product.stockkg} units of ${product.name} available`,
          400,
        ),
      );
    }

    const itemTotal = product.pricePerKg * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: product.pricePerKg,
    });
  }

  // You can later make this dynamic
  // const shippingFee = finalFulfillmentMethod === "home_delivery" ? 150 : 0;

  const { shippingFee, distanceKm } = calculateShippingFee(
    shippingAddress?.latitude,
    shippingAddress?.longitude,
    finalFulfillmentMethod,
  );

  const savedEmail = email || req.user?.email || "";

  const order = await Order.create({
    customer: {
      fullName,
      phone,
      email: savedEmail,
    },
    items: orderItems,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    fulfillment: {
      method: finalFulfillmentMethod,
    },
    shippingAddress: {
      location:
        finalFulfillmentMethod === "home_delivery"
          ? shippingAddress?.location || ""
          : "",
      additionalInfo: shippingAddress?.additionalInfo || "",
      latitude:
        finalFulfillmentMethod === "home_delivery"
          ? shippingAddress?.latitude
          : undefined,
      longitude:
        finalFulfillmentMethod === "home_delivery"
          ? shippingAddress?.longitude
          : undefined,
      distanceKm:
        finalFulfillmentMethod === "home_delivery" &&
        Number.isFinite(Number(distanceKm))
          ? Number(distanceKm)
          : 0,
    },
    orderStatus: "pending_payment",
    payment: {
      status: "pending",
      method: paymentMethod || "mpesa",
    },
  });
  res.status(201).json({
    status: "success",
    message: "Order created successfully",
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        customer: order.customer,
        fulfillment: order.fulfillment,
        shippingAddress: order.shippingAddress,
        shippingFee: order.shippingFee,
        subtotal: order.subtotal,
        total: order.total,
        orderStatus: order.orderStatus,
        payment: order.payment,
        createdAt: order.createdAt,
      },
    },
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId).lean();

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  const isAdmin = req.user?.role === "admin";
  const userEmail = req.user?.email;

  if (!isAdmin && order.customer?.email !== userEmail) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ "customer.email": req.user.email })
    .sort({ createdAt: -1 })
    .select(
      "orderNumber total subtotal shippingFee orderStatus payment createdAt items shippingAddress",
    );

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .select(
      "orderNumber subtotal shippingFee total orderStatus payment createdAt items customer fulfillment shippingAddress",
    );

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders },
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending_payment",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "payment_failed",
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400,
      ),
    );
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { orderStatus: status },
    { new: true, runValidators: true },
  ).lean();

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.json({
    status: "success",
    message: "Order status updated successfully",
    data: { order },
  });
});

exports.cancelUnpaidOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Optional ownership check
  if (order.customer?.email !== req.user.email) {
    return next(new AppError("You are not allowed to cancel this order", 403));
  }

  if (order.payment?.status === "paid") {
    return next(new AppError("Paid orders cannot be cancelled here", 400));
  }

  if (
    order.orderStatus === "cancelled" ||
    order.orderStatus === "payment_failed"
  ) {
    return res.status(200).json({
      status: "success",
      message: "Order already closed",
      data: { order },
    });
  }

  order.orderStatus = "cancelled";
  order.payment.status = "failed";
  order.payment.failureReason = "Customer cancelled before payment";
  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order cancelled successfully",
    data: { order },
  });
});

exports.getButcherOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    orderStatus: {
      $in: ["confirmed", "processing", "shipped", "ready_for_pickup"],
    },
  })
    .sort({ createdAt: -1 })
    .select(
      "orderNumber subtotal shippingFee total orderStatus payment createdAt items customer fulfillment shippingAddress",
    );

  const pendingOrders = orders.filter((order) =>
    ["confirmed", "processing"].includes(order.orderStatus),
  );

  const completedOrders = orders.filter((order) =>
    ["shipped", "ready_for_pickup"].includes(order.orderStatus),
  );

  res.status(200).json({
    status: "success",
    data: {
      pendingOrders,
      completedOrders,
    },
  });
});

exports.markButcherOrderReady = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (!["confirmed", "processing"].includes(order.orderStatus)) {
    return next(
      new AppError(
        "Only confirmed or processing orders can be marked ready",
        400,
      ),
    );
  }

  order.orderStatus =
    order.fulfillment?.method === "pickup" ? "ready_for_pickup" : "shipped";

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order marked as ready",
    data: { order },
  });
});
