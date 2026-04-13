const resend = require("./resend");

module.exports = async function sendOTPEmail({
  email,
  name,
  otp,
  purpose = "signup",
}) {
  const subject =
    purpose === "reset" ? "Reset your password" : "Verify your account";

  const heading =
    purpose === "reset" ? "Password Reset Code" : "Account Verification Code";

  const intro =
    purpose === "reset"
      ? "Use the code below to reset your password."
      : "Use the code below to verify your account.";

  const html = `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#dc2626;color:#ffffff;padding:10px 16px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.08em;">
              SECURE OTP
            </div>
          </div>

          <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#111827;text-align:center;">
            ${heading}
          </h1>

          <p style="margin:0 0 8px 0;color:#4b5563;font-size:15px;text-align:center;">
            Hello ${name || "there"},
          </p>

          <p style="margin:0 0 24px 0;color:#4b5563;font-size:15px;text-align:center;">
            ${intro}
          </p>

          <div style="margin:0 auto 24px auto;max-width:280px;background:#fff5f5;border:1px solid #fecaca;border-radius:14px;padding:18px 20px;text-align:center;">
            <div style="font-size:32px;line-height:1;font-weight:800;letter-spacing:10px;color:#b91c1c;">
              ${otp}
            </div>
          </div>

          <p style="margin:0 0 10px 0;color:#6b7280;font-size:14px;text-align:center;">
            This code expires in <strong>10 minutes</strong>.
          </p>

          <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send OTP email");
  }
};
