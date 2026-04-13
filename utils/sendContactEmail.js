const resend = require("./resend");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async function sendContactEmail({
  name,
  email,
  phone,
  subject,
  message,
}) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "-");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#dc2626;color:#ffffff;padding:10px 16px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.08em;">
              CONTACT FORM
            </div>
          </div>

          <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.3;color:#111827;text-align:center;">
            New Customer Message
          </h1>

          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            <tr>
              <td style="padding:10px 0;font-weight:700;width:120px;">Name</td>
              <td style="padding:10px 0;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-weight:700;">Email</td>
              <td style="padding:10px 0;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-weight:700;">Phone</td>
              <td style="padding:10px 0;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-weight:700;">Subject</td>
              <td style="padding:10px 0;">${safeSubject}</td>
            </tr>
          </table>

          <div style="margin-top:24px;padding:18px 20px;background:#fff5f5;border:1px solid #fecaca;border-radius:14px;">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;">
              Message
            </div>
            <div style="font-size:14px;line-height:1.7;color:#374151;">
              ${safeMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM,
    to: process.env.CONTACT_RECEIVER_EMAIL,
    replyTo: email,
    subject: `Contact Form: ${subject}`,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send contact email");
  }
};
