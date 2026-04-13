const Product = require("../models/Product");
const Order = require("../models/Order");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, shippingAddress, customer, paymentMethod } = req.body;
  const { firstName, email, phone } = customer;

  if (!items || items.length === 0) {
    return next(new AppError("Order must contain at least one item", 400));
  }

  if (!firstName || !email || !phone) {
    return next(new AppError("Customer information is required", 400));
  }

  if (!shippingAddress || !shippingAddress.city || !shippingAddress.street) {
    return next(new AppError("Shipping address is required", 400));
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

  const shippingFee = 0;

  const order = await Order.create({
    customer: { firstName, email, phone },
    items: orderItems,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee, // ✅ pass total explicitly so pre("save") has it
    shippingAddress,
    orderStatus: "pending",
    payment: { status: "pending", method: paymentMethod },
  });

  res.status(201).json({
    status: "success",
    message: "Order created successfully",
    data: {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      },
    },
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId).lean();
  if (!order) return next(new AppError("Order not found", 404));

  res.json({ status: "success", data: { order } });
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
    // ✅ Select the full payment object (not just payment.status)
    // so the frontend gets method, paidAt, status, etc.
    .select("orderNumber total orderStatus payment createdAt items customer");

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
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "confirmed",
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

  if (!order) return next(new AppError("Order not found", 404));

  res.json({
    status: "success",
    message: "Order status updated successfully",
    data: { order },
  });
});
