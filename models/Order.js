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
      firstName: { type: String, required: true },
      lastName: { type: String },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    shippingAddress: {
      street: String,
      city: String,
      postalCode: { type: String },
      deliveryNotes: { type: String },
      country: { type: String, default: "Kenya" },
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
      // M-Pesa fields
      phone: { type: String },
      merchantRequestID: { type: String },
      checkoutRequestID: { type: String, index: true },
      mpesaReceiptNumber: { type: String },
      transactionDate: { type: String },
      resultCode: { type: Number },
      resultDesc: { type: String },
      callbackRaw: { type: mongoose.Schema.Types.Mixed },

      // Paystack card fields
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
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    notes: String,
  },
  { timestamps: true },
);

// ✅ Both hooks are async with NO next() parameter.
// Mixing async + next() causes "next is not a function" on Order.create()
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
