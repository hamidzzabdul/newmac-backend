const Order = require("../models/Order");
const { generateReceiptBuffer } = require("../utils/recieptBuilder");

const generateReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("📄 Generating receipt for order:", order.orderNumber);

    const pdfBuffer = await generateReceiptBuffer(order);

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 1000) {
      console.error(
        "❌ PDF buffer is invalid:",
        pdfBuffer ? pdfBuffer.length : "undefined",
      );
      return res.status(500).json({ message: "PDF generation failed" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${order.orderNumber}.pdf`,
    );

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Receipt generation error:", err);
    return res.status(500).json({ message: "Error generating receipt" });
  }
};

module.exports = { generateReceipt };
