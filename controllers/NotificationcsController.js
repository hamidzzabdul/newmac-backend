const Order = require("../models/Order");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");

const getPaymentMethodLabel = (method) => {
  if (method === "mpesa") return "M-Pesa";
  if (method === "card") return "Card";
  if (method === "cod") return "Cash on Delivery";
  return "Payment";
};

const buildNotificationsFromOrders = (orders) => {
  const notifications = [];

  orders.forEach((order) => {
    const firstItemName = order.items?.[0]?.name || "Order item";
    const extraItems =
      order.items?.length > 1 ? ` +${order.items.length - 1} more` : "";

    notifications.push({
      id: `order-${order._id}`,
      title: "New order received",
      desc: `${order.orderNumber} · KSh ${Number(order.total || 0).toLocaleString()} · ${firstItemName}${extraItems}`,
      type: "order",
      unread: order.orderStatus === "pending",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: {
        name: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
        email: order.customer?.email || "",
        phone: order.customer?.phone || "",
      },
    });

    if (order.payment?.status === "paid") {
      notifications.push({
        id: `payment-${order._id}`,
        title: "Payment confirmed",
        desc: `${getPaymentMethodLabel(order.payment.method)} payment received for ${order.orderNumber}`,
        type: "payment",
        unread: false,
        createdAt: order.payment.paidAt || order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: {
          name: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
          email: order.customer?.email || "",
          phone: order.customer?.phone || "",
        },
      });
    }

    if (order.payment?.status === "failed") {
      notifications.push({
        id: `failed-${order._id}`,
        title: "Payment failed",
        desc:
          order.payment?.failureReason ||
          `Payment for ${order.orderNumber} was not completed`,
        type: "failed",
        unread: true,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
        customer: {
          name: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
          email: order.customer?.email || "",
          phone: order.customer?.phone || "",
        },
      });
    }

    if (order.orderStatus === "confirmed") {
      notifications.push({
        id: `confirmed-${order._id}`,
        title: "Order confirmed",
        desc: `${order.orderNumber} has been confirmed`,
        type: "info",
        unread: false,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (order.orderStatus === "processing") {
      notifications.push({
        id: `processing-${order._id}`,
        title: "Order processing",
        desc: `${order.orderNumber} is being prepared`,
        type: "info",
        unread: false,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (order.orderStatus === "shipped") {
      notifications.push({
        id: `shipped-${order._id}`,
        title: "Order shipped",
        desc: `${order.orderNumber} has been dispatched`,
        type: "info",
        unread: false,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (order.orderStatus === "delivered") {
      notifications.push({
        id: `delivered-${order._id}`,
        title: "Order delivered",
        desc: `${order.orderNumber} has been delivered successfully`,
        type: "info",
        unread: false,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }

    if (order.orderStatus === "cancelled") {
      notifications.push({
        id: `cancelled-${order._id}`,
        title: "Order cancelled",
        desc: `${order.orderNumber} was cancelled`,
        type: "failed",
        unread: true,
        createdAt: order.updatedAt || order.createdAt,
        updatedAt: order.updatedAt,
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
    }
  });

  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

exports.getAdminNotifications = catchAsync(async (req, res, next) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  const type = req.query.type || "all";

  const orders = await Order.find()
    .select(
      "_id orderNumber customer items total payment orderStatus createdAt updatedAt",
    )
    .sort({ createdAt: -1 })
    .limit(100);

  if (!orders) {
    return next(new AppError("No orders found", 404));
  }

  let notifications = buildNotificationsFromOrders(orders);

  if (type !== "all") {
    notifications = notifications.filter((n) => n.type === type);
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  res.status(200).json({
    status: "success",
    results: notifications.slice(0, limit).length,
    data: {
      notifications: notifications.slice(0, limit),
      unreadCount,
    },
  });
});
