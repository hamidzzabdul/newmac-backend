const { Resend } = require("resend");
const { generateReceiptBuffer } = require("./recieptBuilder");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendReceiptEmail(order) {
  if (!order?.customer?.email) {
    throw new Error("Customer email is missing");
  }

  const pdfBuffer = await generateReceiptBuffer(order);

  if (!pdfBuffer || pdfBuffer.length < 1000) {
    throw new Error("Generated receipt PDF is invalid or too small");
  }

  const customerName =
    order.customer.firstName || order.customer.name || "Customer";

  const total =
    typeof order.total === "number"
      ? order.total.toLocaleString()
      : Number(order.total || 0).toLocaleString();

  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111827;">
      <h2 style="color: #1A1A2E;">Hi ${customerName},</h2>
      <p>Thank you for your order from <strong>NewMark Prime Meat</strong>.</p>
      <p>Your payment was successful. Your receipt is attached to this email.</p>

      <div style="background: #f4f6f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Order:</strong> ${order.orderNumber}</p>
        <p style="margin: 8px 0 0;"><strong>Total:</strong> KSh ${total}</p>
        <p style="margin: 8px 0 0;">
          <strong>Status:</strong>
          <span style="color: #16A34A; font-weight: bold;">PAID</span>
        </p>
      </div>

      <p>If you have any questions, just reply to this email.</p>
      <p style="color: #6B7280; font-size: 13px;">— The NewMark Team</p>
    </div>
  `;

  const text = `Hi ${customerName},

Thank you for your order from NewMark Prime Meat.

Your payment was successful.
Order: ${order.orderNumber}
Total: KSh ${total}
Status: PAID

Your receipt is attached.

— The NewMark Team`;

  const { data, error } = await resend.emails.send({
    from: "NewMark <info@newmarkprimemeat.com>",
    to: order.customer.email,
    replyTo: "info@newmarkprimemeat.com",
    subject: `Your Receipt – Order ${order.orderNumber}`,
    html,
    text,
    attachments: [
      {
        filename: `receipt-${order.orderNumber}.pdf`,
        content: pdfBase64,
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Failed to send receipt email");
  }

  console.log("✅ Email sent via Resend:", {
    id: data?.id,
    to: order.customer.email,
    orderNumber: order.orderNumber,
    pdfSize: pdfBuffer.length,
  });

  return data;
}

module.exports = { sendReceiptEmail };
