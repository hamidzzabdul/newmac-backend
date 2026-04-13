const express = require("express");
const sendContactEmail = require("../utils/sendContactEmail");

const router = express.Router();

router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    await sendContactEmail({
      name,
      email,
      phone,
      subject,
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send message.",
    });
  }
});

module.exports = router;
