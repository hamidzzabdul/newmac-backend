const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    customer: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true }, // optional now
    },

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    fulfillment: {
      method: {
        type: String,
        enum: ["home_delivery", "pickup"],
        required: true,
        default: "home_delivery",
      },
    },

    shippingAddress: {
      location: { type: String, trim: true },
      additionalInfo: { type: String, trim: true },

      latitude: { type: Number },
      longitude: { type: Number },
      distanceKm: { type: Number },
    },

    payment: {
      method: {
        type: String,
        enum: ["mpesa", "card", "cod"],
        default: "mpesa",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
        index: true,
      },

      phone: { type: String },
      merchantRequestID: { type: String },
      checkoutRequestID: { type: String, index: true },
      mpesaReceiptNumber: { type: String },
      transactionDate: { type: String },
      resultCode: { type: Number },
      resultDesc: { type: String },
      callbackRaw: { type: mongoose.Schema.Types.Mixed },

      card: {
        provider: { type: String },
        paymentIntentId: { type: String },
        accessCode: { type: String },
        chargeId: { type: String },
        last4: { type: String },
        brand: { type: String },
      },

      paidAt: { type: Date },
      failureReason: { type: String },
    },

    orderStatus: {
      type: String,
      enum: [
        "pending_payment",
        "confirmed",
        "processing",
        "shipped",
        "ready_for_pickup",
        "delivered",
        "picked_up",
        "cancelled",
        "payment_failed",
      ],
      default: "pending_payment",
      index: true,
    },

    notes: String,
  },
  { timestamps: true },
);

orderSchema.pre("validate", async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
});

orderSchema.pre("save", async function () {
  this.total = this.subtotal + this.shippingFee;
});

module.exports = mongoose.model("Order", orderSchema);
