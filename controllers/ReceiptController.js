const Order = require("../models/Order");
const { generateReceiptBuffer } = require("../utils/recieptBuilder");

const generateReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    console.log("📄 Generating receipt for order:", order.orderNumber);

    const pdfBuffer = await generateReceiptBuffer(order);

    console.log("📦 Buffer size:", pdfBuffer.length); // 👈 if this is very small = blank

    if (!pdfBuffer || pdfBuffer.length < 1000) {
      console.error("❌ PDF buffer is suspiciously small:", pdfBuffer.length);
      return res.status(500).json({ message: "PDF generation failed" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length); // 👈 add this
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${orderId}.pdf`,
    );
    res.send(pdfBuffer); // ✅ send() instead of end()
  } catch (err) {
    console.error("Receipt generation error:", err);
    res.status(500).json({ message: "Error generating receipt" });
  }
};

module.exports = { generateReceipt };
